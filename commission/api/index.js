const auth=require('../lib/auth');
const forum=require('../lib/forum');
const c=require('../lib/core');
const privacy=require('../lib/privacy');
const labels={pending:'검토 대기',accepted:'접수 수락',rejected:'접수 거부',cancelled:'신청 취소'};
function json(res,status,data){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data));}
function redirect(res,url){res.statusCode=302;res.setHeader('Location',url);res.end();}
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 try{
  const url=new URL(req.url,'http://local');const path=(url.searchParams.has('route')?'/api/'+url.searchParams.get('route'):url.pathname).replace(/\/$/,'');
  if(path==='/api/privacy'&&req.method==='GET')return json(res,200,privacy.notice());
  if(path==='/api/privacy/cleanup'&&req.method==='GET'){
   if(!privacy.cronAuthorized(req))throw new c.HttpError(401,'인증이 필요합니다.');
   const result=await privacy.cleanup();return json(res,result.failed||result.remaining?503:200,result);
  }
  if(path==='/api/session'&&req.method==='GET'){
   if(!c.ready())return json(res,200,{ready:false,user:null,providers:auth.providers()});
   try{const s=c.session(req);return json(res,200,{ready:true,user:{id:s.id,name:s.name,staff:s.staff},csrf:s.csrf,providers:auth.providers()});}catch(e){if(e.status!==401)throw e;return json(res,200,{ready:true,user:null,providers:auth.providers()});}
  }
  c.config();
  if(await auth.auth(req,res,url,path))return;
  const s=c.session(req);
  if(req.method==='POST')c.csrf(req,s);
  if(path==='/api/auth/logout'&&req.method==='POST'){res.setHeader('Set-Cookie',c.cookie('aram_session','',0));return json(res,200,{ok:true});}
  if(path==='/api/requests'&&req.method==='GET'){
   const channels=await forum.list();
   return json(res,200,{requests:channels.map(ch=>({id:ch.id,...forum.decode(ch)})).filter(m=>m.ownerKey&&forum.owns(s,m)&&m.created+privacy.notice().retentionDays*86400000>Date.now()).sort((a,b)=>b.created-a.created).map(({id,title,kind,status,created})=>({id,title,kind,status,created}))});
  }
  if(path==='/api/requests'&&req.method==='POST'){
   const b=await c.body(req);const title=c.text(b.title,2,90,'프로젝트명');const kind=c.text(b.kind,2,30,'작업 종류');if(!['썸네일','애니메이션','영상','기타'].includes(kind))throw new c.HttpError(400,'작업 종류를 선택해주세요.');
   const description=c.text(b.description,20,3000,'작업 내용');const budget=c.text(b.budget,1,80,'예산');const deadline=c.text(b.deadline,1,80,'희망 일정');
   const reference=typeof b.reference==='string'?b.reference.trim():'';if(reference.length>500||reference&&!/^https?:\/\//i.test(reference))throw new c.HttpError(400,'참고 링크는 http 또는 https 주소로 입력해주세요.');
   privacy.consent(b);
   const channels=await forum.list();
   if(channels.filter(ch=>{const m=forum.decode(ch);return m&&m.ownerKey===forum.ownerKey(s.id)&&['pending','accepted'].includes(m.status);}).length>=2)throw new c.HttpError(409,'진행 중인 신청은 두 건까지 가능합니다.');
   const bot=await c.discord('/users/@me'),owners=c.config().owners;if(!owners.length)throw new c.HttpError(503,'관리자 설정을 확인해주세요.');
   const parent=await forum.validateForum(bot.id,owners);
   const meta={owner:s.id,bot:bot.id,title,kind,status:'pending',created:Date.now(),consent:{version:privacy.notice().version,acceptedAt:Date.now(),collection:true,transfer:true,age14:true}};
   const initial={content:owners.map(id=>'<@'+id+'>').join(' ')+' 새 작업 신청',allowed_mentions:{parse:[],users:owners},embeds:[{title,description,color:11590895,fields:[{name:'신청자',value:s.name},{name:'종류',value:kind,inline:true},{name:'예산',value:budget,inline:true},{name:'희망 일정',value:deadline,inline:true},...(reference?[{name:'참고 링크',value:reference}]:[])],footer:{text:'ARAM · WEBSITE REQUEST'},timestamp:new Date().toISOString()},{description:'접수 관리 기록',footer:{text:'ARAM_META:'+c.sign(meta)}}]};
   const tags=forum.tagsFor(parent,kind);
   const channel=await c.discord('/channels/'+parent.id+'/threads','POST',{name:forum.threadName(meta),auto_archive_duration:10080,applied_tags:tags,message:initial});
   await c.message(channel.id,{content:'접수 관리 화면에서 수락·거부·취소·연락을 진행해주세요.',components:[{type:1,components:[{type:2,style:5,label:'신청 관리 · 연락하기',url:c.config().origin+'/?request='+channel.id}]}]});
   return json(res,201,{id:channel.id});
  }
  const match=path.match(/^\/api\/requests\/(\d{17,20})(?:\/(messages|status))?$/);
  if(match){
   if(!match[2]&&req.method==='DELETE'){c.csrf(req,s);await privacy.erase(match[1],s);return json(res,200,{ok:true});}
   const {channel,meta,initial}=await forum.get(match[1],s);
   privacy.checkExpiry(meta);
   if(!match[2]&&req.method==='GET'){
    const first=initial||(meta.detail?await c.discord('/channels/'+channel.id+'/messages/'+meta.detail):null);
    const messages=await c.discord('/channels/'+channel.id+'/messages?limit=100');
    const conversation=messages.filter(m=>m.author.id===meta.bot&&m.embeds?.[0]?.footer?.text==='ARAM · MESSAGE').reverse().map(m=>({id:m.id,author:m.embeds[0].author?.name||'ARAM',content:m.embeds[0].description,created:m.timestamp}));
    return json(res,200,{id:channel.id,title:meta.title,kind:meta.kind,status:meta.status,created:meta.created,expires:meta.created+privacy.notice().retentionDays*86400000,details:first?.embeds?.[0]||null,messages:conversation,staff:s.staff});
   }
   if(match[2]==='messages'&&req.method==='POST'){
    if(['rejected','cancelled'].includes(meta.status))throw new c.HttpError(409,'종료된 신청에는 메시지를 보낼 수 없습니다.');
    if(channel.thread_metadata?.archived)await c.discord('/channels/'+channel.id,'PATCH',{archived:false});
    const b=await c.body(req);const content=c.text(b.content,1,1800,'메시지');
    await c.message(channel.id,{embeds:[{author:{name:(s.staff?'ARAM / ':'신청자 / ')+s.name},description:content,color:s.staff?11590895:6977690,footer:{text:'ARAM · MESSAGE'},timestamp:new Date().toISOString()}]});
    return json(res,201,{ok:true});
   }
   if(match[2]==='status'&&req.method==='POST'){
    const b=await c.body(req);if(!c.statusAllowed(meta.status,b.status,s.staff))throw new c.HttpError(409,'현재 신청 상태에서는 이 작업을 할 수 없습니다.');
    const note=b.note?c.text(b.note,1,800,'사유'):'';
    meta.status=b.status;await c.discord('/channels/'+channel.id,'PATCH',{name:forum.threadName(meta),archived:false});
    await c.message(channel.id,{embeds:[{description:labels[meta.status]+(note?'\n'+note:''),color:11590895,author:{name:s.staff?'ARAM':'신청자'},footer:{text:'ARAM · MESSAGE'},timestamp:new Date().toISOString()}]});
    return json(res,200,{ok:true,status:meta.status});
   }
  }
  throw new c.HttpError(404,'페이지를 찾을 수 없습니다.');
 }catch(e){json(res,e.status||500,{error:e.status?e.message:'처리 중 문제가 생겼습니다. 잠시 후 다시 시도해주세요.'});}
};
