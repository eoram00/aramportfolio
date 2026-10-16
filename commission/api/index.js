const c=require('../lib/core');
const crypto=require('node:crypto');
const labels={pending:'검토 대기',accepted:'접수 수락',rejected:'접수 거부',cancelled:'신청 취소'};
function json(res,status,data){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data));}
function redirect(res,url){res.statusCode=302;res.setHeader('Location',url);res.end();}
async function notify(meta,channelId,content){try{const dm=await c.discord('/users/@me/channels','POST',{recipient_id:meta.owner});await c.message(dm.id,{content:content+'\n'+c.config().origin+'/?request='+channelId});return true;}catch{return false;}}
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 try{
  const url=new URL(req.url,'http://local');const path=(url.searchParams.has('route')?'/api/'+url.searchParams.get('route'):url.pathname).replace(/\/$/,'');
  if(path==='/api/session'&&req.method==='GET'){
   if(!c.ready())return json(res,200,{ready:false,user:null});
   try{const s=c.session(req);return json(res,200,{ready:true,user:{id:s.id,name:s.name,staff:s.staff},csrf:s.csrf});}catch(e){if(e.status!==401)throw e;return json(res,200,{ready:true,user:null});}
  }
  c.config();
  if(path==='/api/auth/login'&&req.method==='GET'){
   const state=c.sign({nonce:crypto.randomBytes(24).toString('hex'),exp:Date.now()+600000});
   res.setHeader('Set-Cookie',c.cookie('aram_oauth',state,600));
   return redirect(res,'https://discord.com/oauth2/authorize?'+new URLSearchParams({client_id:process.env.DISCORD_CLIENT_ID,redirect_uri:c.config().origin+'/api/auth/callback',response_type:'code',scope:'identify',state}));
  }
  if(path==='/api/auth/callback'&&req.method==='GET'){
   const state=url.searchParams.get('state');const decoded=c.verify(state);
   if(!state||state!==c.cookies(req).aram_oauth||!decoded||decoded.exp<Date.now()||!url.searchParams.get('code'))throw new c.HttpError(400,'로그인 인증이 만료됐습니다. 다시 로그인해주세요.');
   const r=await fetch('https://discord.com/api/v10/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:process.env.DISCORD_CLIENT_ID,client_secret:process.env.DISCORD_CLIENT_SECRET,grant_type:'authorization_code',code:url.searchParams.get('code'),redirect_uri:c.config().origin+'/api/auth/callback'}),signal:AbortSignal.timeout(12000)});
   if(!r.ok)throw new c.HttpError(401,'디스코드 로그인을 완료하지 못했습니다.');
   const token=await r.json();const identity=await fetch('https://discord.com/api/v10/users/@me',{headers:{Authorization:'Bearer '+token.access_token},signal:AbortSignal.timeout(12000)});
   if(!identity.ok)throw new c.HttpError(401,'계정 정보를 확인하지 못했습니다.');const user=await identity.json();
   res.setHeader('Set-Cookie',[c.cookie('aram_oauth','',0),c.cookie('aram_session',c.sign({id:user.id,name:user.global_name||user.username,csrf:crypto.randomBytes(24).toString('hex'),exp:Date.now()+7*86400000}),7*86400)]);return redirect(res,'/');
  }
  const s=c.session(req);
  if(req.method==='POST')c.csrf(req,s);
  if(path==='/api/auth/logout'&&req.method==='POST'){res.setHeader('Set-Cookie',c.cookie('aram_session','',0));return json(res,200,{ok:true});}
  if(path==='/api/requests'&&req.method==='GET'){
   const channels=await c.discord('/guilds/'+process.env.DISCORD_GUILD_ID+'/channels');
   return json(res,200,{requests:channels.map(ch=>({id:ch.id,...c.metadata(ch)})).filter(m=>m.owner&&(s.staff||m.owner===s.id)).sort((a,b)=>b.created-a.created).map(({id,title,kind,status,created})=>({id,title,kind,status,created}))});
  }
  if(path==='/api/requests'&&req.method==='POST'){
   const b=await c.body(req);const title=c.text(b.title,2,90,'프로젝트명');const kind=c.text(b.kind,2,30,'작업 종류');if(!['썸네일','모션 그래픽','3D 비주얼','기타'].includes(kind))throw new c.HttpError(400,'작업 종류를 선택해주세요.');
   const description=c.text(b.description,20,3000,'작업 내용');const budget=c.text(b.budget,1,80,'예산');const deadline=c.text(b.deadline,1,80,'희망 일정');
   const reference=typeof b.reference==='string'?b.reference.trim():'';if(reference.length>500||reference&&!/^https?:\/\//i.test(reference))throw new c.HttpError(400,'참고 링크는 http 또는 https 주소로 입력해주세요.');
   if(b.consent!==true)throw new c.HttpError(400,'접수 정보 이용에 동의해주세요.');
   const channels=await c.discord('/guilds/'+process.env.DISCORD_GUILD_ID+'/channels');
   if(channels.filter(ch=>{const m=c.metadata(ch);return m&&m.owner===s.id&&['pending','accepted'].includes(m.status);}).length>=2)throw new c.HttpError(409,'진행 중인 신청은 두 건까지 가능합니다. 기존 신청에서 문의해주세요.');
   const category=channels.find(ch=>ch.id===process.env.DISCORD_CATEGORY_ID&&ch.type===4);if(!category)throw new c.HttpError(503,'접수 채널 설정을 확인해주세요.');
   const bot=await c.discord('/users/@me');const owners=c.config().owners;if(!owners.length)throw new c.HttpError(503,'관리자 설정을 확인해주세요.');
   const meta={owner:s.id,bot:bot.id,title,kind,status:'pending',created:Date.now()};
   const perms=[{id:process.env.DISCORD_GUILD_ID,type:0,deny:'1024',allow:'0'},...[...new Set([bot.id,...owners])].map(id=>({id,type:1,allow:'85008',deny:'0'}))];
   const channel=await c.discord('/guilds/'+process.env.DISCORD_GUILD_ID+'/channels','POST',{name:'request-'+crypto.randomBytes(4).toString('hex'),type:0,parent_id:category.id,topic:c.topic(meta),permission_overwrites:perms});
   try{
    const initial=await c.message(channel.id,{content:owners.map(id=>'<@'+id+'>').join(' ')+' 새 작업 신청',allowed_mentions:{users:owners},embeds:[{title,description,color:11590895,fields:[{name:'신청자',value:s.name+' ('+s.id+')'},{name:'종류',value:kind,inline:true},{name:'예산',value:budget,inline:true},{name:'희망 일정',value:deadline,inline:true},...(reference?[{name:'참고 링크',value:reference}]:[])],footer:{text:'ARAM · WEBSITE REQUEST'},timestamp:new Date().toISOString()}],components:[{type:1,components:[{type:2,style:5,label:'신청 관리 · 연락하기',url:c.config().origin+'/?request='+channel.id}]}]});
    meta.detail=initial.id;await c.discord('/channels/'+channel.id,'PATCH',{topic:c.topic(meta)});
   }catch(e){try{await c.discord('/channels/'+channel.id,'DELETE');}catch{}throw e;}
   return json(res,201,{id:channel.id});
  }
  const match=path.match(/^\/api\/requests\/(\d{17,20})(?:\/(messages|status))?$/);
  if(match){
   const {channel,meta}=await c.getRequest(match[1],s);
   if(!match[2]&&req.method==='GET'){
    const first=meta.detail?await c.discord('/channels/'+channel.id+'/messages/'+meta.detail):null;
    const messages=await c.discord('/channels/'+channel.id+'/messages?limit=100');
    const conversation=messages.filter(m=>m.author.id===meta.bot&&m.embeds?.[0]?.footer?.text==='ARAM · MESSAGE').reverse().map(m=>({id:m.id,author:m.embeds[0].author?.name||'ARAM',content:m.embeds[0].description,created:m.timestamp}));
    return json(res,200,{id:channel.id,title:meta.title,kind:meta.kind,status:meta.status,created:meta.created,details:first?.embeds?.[0]||null,messages:conversation,staff:s.staff});
   }
   if(match[2]==='messages'&&req.method==='POST'){
    if(['rejected','cancelled'].includes(meta.status))throw new c.HttpError(409,'종료된 신청에는 메시지를 보낼 수 없습니다.');
    const b=await c.body(req);const content=c.text(b.content,1,1800,'메시지');
    await c.message(channel.id,{embeds:[{author:{name:(s.staff?'ARAM / ':'신청자 / ')+s.name},description:content,color:s.staff?11590895:6977690,footer:{text:'ARAM · MESSAGE'},timestamp:new Date().toISOString()}]});
    const notified=s.staff?await notify(meta,channel.id,'ARAM에서 신청에 새 메시지를 보냈습니다.'):false;return json(res,201,{ok:true,notified});
   }
   if(match[2]==='status'&&req.method==='POST'){
    const b=await c.body(req);if(!c.statusAllowed(meta.status,b.status,s.staff))throw new c.HttpError(409,'현재 신청 상태에서는 이 작업을 할 수 없습니다.');
    const note=b.note?c.text(b.note,1,800,'사유'):'';
    meta.status=b.status;await c.discord('/channels/'+channel.id,'PATCH',{topic:c.topic(meta)});
    await c.message(channel.id,{embeds:[{description:labels[meta.status]+(note?'\n'+note:''),color:11590895,author:{name:s.staff?'ARAM':'신청자'},footer:{text:'ARAM · MESSAGE'},timestamp:new Date().toISOString()}]});
    if(s.staff)await notify(meta,channel.id,'신청 상태가 '+labels[meta.status]+' 상태로 변경됐습니다.');return json(res,200,{ok:true,status:meta.status});
   }
  }
  throw new c.HttpError(404,'페이지를 찾을 수 없습니다.');
 }catch(e){json(res,e.status||500,{error:e.status?e.message:'처리 중 문제가 생겼습니다. 잠시 후 다시 시도해주세요.'});}
};
