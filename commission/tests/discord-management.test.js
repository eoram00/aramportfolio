const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
Object.assign(process.env,{APP_URL:'https://example.netlify.app',DISCORD_CLIENT_ID:'111111111111111111',DISCORD_CLIENT_SECRET:'test',DISCORD_BOT_TOKEN:'test',DISCORD_GUILD_ID:'222222222222222222',DISCORD_FORUM_ID:'333333333333333333',DISCORD_OWNER_IDS:'444444444444444444',SESSION_SECRET:'test-secret-that-is-at-least-32-characters',CRON_SECRET:'test-cron-that-is-at-least-32-characters'});
const policy=require('../privacy-settings.netlify.json');
const c=require('../lib/core'),forum=require('../lib/forum');
const channelId='555555555555555555',bot=process.env.DISCORD_CLIENT_ID;
test('readable titles keep ownership in signed starter metadata, never trust title alone',async()=>{
 const meta={owner:'google:123',bot,title:'멋진 프로젝트',kind:'영상',status:'pending',created:Date.now()};
 assert.equal(forum.threadName(meta),'[검토대기] 멋진 프로젝트');
 const channel={id:channelId,type:11,guild_id:process.env.DISCORD_GUILD_ID,parent_id:process.env.DISCORD_FORUM_ID,name:forum.threadName(meta)};
 const original=c.discord;c.discord=async()=>({id:channelId,author:{id:bot},embeds:[{}, {footer:{text:'ARAM_META:'+c.sign(meta)}}]});
 try{await forum.hydrate(channel);assert.equal(forum.decode(channel).ownerKey,forum.ownerKey(meta.owner));assert.equal(forum.owns({id:'other'},forum.decode(channel)),false);const forged={...channel};c.discord=async()=>({author:{id:'other'},embeds:[{},{footer:{text:'ARAM_META:'+c.sign(meta)}}]});await assert.rejects(forum.hydrate(forged),{status:404});}finally{c.discord=original;}
});
test('acceptance and rejection copy tagged history to the configured forum and archive the source',async()=>{
 const management=require('../lib/request-management');const previous={get:forum.get,discord:c.discord,message:c.message};
 process.env.DISCORD_ACCEPTED_FORUM_ID='777777777777777777';process.env.DISCORD_REJECTED_FORUM_ID='888888888888888888';
 try{for(const status of ['accepted','rejected']){
  const calls=[],meta={schema:2,owner:'google:123',bot,title:'영상 작업',kind:'영상',status:'pending',created:Date.now()},initial={embeds:[{title:'영상 작업',fields:[{name:'희망 일정',value:'협의'}]}]},channel={id:channelId,parent_id:process.env.DISCORD_FORUM_ID};
  forum.get=async()=>({channel,meta,initial});c.message=async(id,payload)=>{calls.push({id,payload});return {};};
  c.discord=async(path,method,payload)=>{calls.push({path,method,payload});if(path.includes('/messages?'))return [{id:'666666666666666666',embeds:[{description:'이전 대화',footer:{text:'ARAM · MESSAGE'}}]}];if(method==='POST'&&path.endsWith('/threads'))return {id:'999999999999999999',parent_id:status==='accepted'?process.env.DISCORD_ACCEPTED_FORUM_ID:process.env.DISCORD_REJECTED_FORUM_ID};if(method==='GET'||!method)return {guild_id:process.env.DISCORD_GUILD_ID,type:15,available_tags:[{id:'video-tag',name:'영상'}]};return {};};
  await management.change(channelId,{staff:true},status,'처리 안내','pending','interaction-'+status,'2026.10.25');
  const post=calls.find(x=>x.path?.endsWith('/threads'));assert.deepEqual(post.payload.applied_tags,['video-tag']);assert.equal(post.payload.name,status==='accepted'?'[2026.10.25] 영상 작업':'[거절완료] 영상 작업');assert.ok(calls.some(x=>x.payload?.archived===true&&x.payload?.locked===true));assert.ok(calls.some(x=>x.id==='999999999999999999'&&x.payload.embeds?.[0]?.description==='이전 대화'));
  const before=calls.length;await assert.rejects(management.change(channelId,{staff:true},status==='accepted'?'rejected':'accepted','다시','pending','another'),{status:409});assert.equal(calls.length,before);
 }}finally{forum.get=previous.get;c.discord=previous.discord;c.message=previous.message;delete process.env.DISCORD_ACCEPTED_FORUM_ID;delete process.env.DISCORD_REJECTED_FORUM_ID;}
});
test('durable conditional lock allows one worker and releases after failure',async()=>{
 const {withLock}=require('../lib/request-lock');const records=new Map();let serial=0;
 const blobs={getWithMetadata:async key=>records.get(key)||null,setJSON:async(key,data,options)=>{const old=records.get(key);if(options.onlyIfNew&&old||options.onlyIfMatch&&old?.etag!==options.onlyIfMatch)return {modified:false};const etag=String(++serial);records.set(key,{data,etag});return {modified:true,etag};},delete:async key=>records.delete(key)};
 let release,entered;const waiting=new Promise(resolve=>{entered=resolve;});const first=withLock(channelId,async()=>{entered();await new Promise(resolve=>{release=resolve;});},blobs);await waiting;
 await assert.rejects(withLock(channelId,async()=>assert.fail('second worker ran'),blobs),{status:409});release();await first;
 await assert.rejects(withLock(channelId,async()=>{throw Error('failed');},blobs),/failed/);assert.equal(records.size,0);
});
test('interaction signature, admin authorization and modal are enforced',async()=>{
 const interactions=require('../lib/interactions');const {publicKey,privateKey}=crypto.generateKeyPairSync('ed25519');process.env.DISCORD_PUBLIC_KEY=publicKey.export({type:'spki',format:'der'}).subarray(-32).toString('hex');
 const raw=JSON.stringify({type:1}),timestamp=String(Math.floor(Date.now()/1000));const signature=crypto.sign(null,Buffer.from(timestamp+raw),privateKey).toString('hex');
 assert.equal(interactions.validSignature(raw,signature,timestamp),true);assert.equal(interactions.validSignature(raw+' ',signature,timestamp),false);assert.equal(interactions.validSignature(raw,signature,'1'),false);
 const event={type:3,application_id:bot,guild_id:process.env.DISCORD_GUILD_ID,channel_id:channelId,member:{user:{id:process.env.DISCORD_OWNER_IDS}},message:{author:{id:bot}},data:{custom_id:'aram:accepted:pending'}};
 assert.equal(interactions.response(event).type,9);assert.match(interactions.response(event).data.custom_id,/accepted/);
 assert.equal(interactions.response({...event,member:{user:{id:'999999999999999999'}}}).data.flags,64);
 assert.notEqual(interactions.response({...event,guild_id:'wrong'}).type,9);
});
test('request records contain provider contact and Discord action buttons',async()=>{
 const api=require('../api/index');const original=c.discord,calls=[];c.discord=async(path,method,payload)=>{calls.push({path,method,payload});if(path.includes('/threads/'))return {threads:[],has_more:false};if(path==='/users/@me')return {id:bot};if(path==='/channels/'+process.env.DISCORD_FORUM_ID)return {id:process.env.DISCORD_FORUM_ID,guild_id:process.env.DISCORD_GUILD_ID,type:15,available_tags:[{id:'tag',name:'영상'}]};if(path.endsWith('/threads'))return {id:channelId};return {id:'666666666666666666'};};
 const session=c.sign({id:'google:123',name:'신청자',contact:{provider:'google',email:'requester@example.com'},csrf:'csrf',privacyVersion:policy.version,exp:Date.now()+60000});
 const res={headers:{},setHeader(k,v){this.headers[k]=v;},end(v){this.data=JSON.parse(v);}};
 try{await api({url:'/api/requests',method:'POST',headers:{origin:process.env.APP_URL,'x-csrf-token':'csrf',cookie:'aram_session='+session},body:{title:'테스트 프로젝트',kind:'영상',description:'작업 내용을 충분히 작성한 테스트 신청입니다.',budget:'협의',deadline:'협의',consent:true,transferConsent:true,ageConfirmed:true,policyVersion:policy.version}},res);assert.equal(res.statusCode,201);const post=calls.find(x=>x.path.endsWith('/threads')&&x.payload);assert.equal(post.payload.name,'[검토대기] 테스트 프로젝트');assert.ok(post.payload.message.embeds[0].fields.some(x=>x.value==='requester@example.com'));assert.ok(post.payload.message.components[0].components.some(x=>x.custom_id==='aram:accepted:pending'));}finally{c.discord=original;}
});
