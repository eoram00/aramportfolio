const c=require('./core');const crypto=require('node:crypto');
function providers(){return {discord:!!(process.env.DISCORD_CLIENT_ID&&process.env.DISCORD_CLIENT_SECRET),google:!!(process.env.GOOGLE_CLIENT_ID&&process.env.GOOGLE_CLIENT_SECRET)};}
async function auth(req,res,url,path){
 const match=path.match(/^\/api\/auth\/(discord|google)\/(login|callback)$/);const legacy=path==='/api/auth/login'||path==='/api/auth/callback';if(!match&&!legacy)return false;
 const provider=match?match[1]:'discord',action=match?match[2]:path.endsWith('callback')?'callback':'login';if(!providers()[provider])throw new c.HttpError(503,'해당 로그인 연결을 준비 중입니다.');
 const callback=c.config().origin+'/api/auth/'+provider+'/callback';const id=process.env[provider==='google'?'GOOGLE_CLIENT_ID':'DISCORD_CLIENT_ID'];const secret=process.env[provider==='google'?'GOOGLE_CLIENT_SECRET':'DISCORD_CLIENT_SECRET'];
 function redirect(target){res.statusCode=302;res.setHeader('Location',target);res.end();}
 if(action==='login'){
  const state=c.sign({provider,nonce:crypto.randomBytes(24).toString('hex'),exp:Date.now()+600000});res.setHeader('Set-Cookie',c.cookie('aram_oauth',state,600));
  const params=new URLSearchParams({client_id:id,redirect_uri:callback,response_type:'code',scope:provider==='google'?'openid email profile':'identify',state});
  if(provider==='google')params.set('prompt','select_account');
  redirect((provider==='google'?'https://accounts.google.com/o/oauth2/v2/auth?':'https://discord.com/oauth2/authorize?')+params);return true;
 }
 const state=url.searchParams.get('state'),decoded=c.verify(state);if(!state||state!==c.cookies(req).aram_oauth||decoded?.provider!==provider||decoded.exp<Date.now()||!url.searchParams.get('code'))throw new c.HttpError(400,'로그인 인증이 만료됐습니다. 다시 로그인해주세요.');
 const response=await fetch(provider==='google'?'https://oauth2.googleapis.com/token':'https://discord.com/api/v10/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:id,client_secret:secret,grant_type:'authorization_code',code:url.searchParams.get('code'),redirect_uri:callback}),signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw new c.HttpError(401,'로그인을 완료하지 못했습니다.');const token=await response.json();
 const identity=await fetch(provider==='google'?'https://openidconnect.googleapis.com/v1/userinfo':'https://discord.com/api/v10/users/@me',{headers:{Authorization:'Bearer '+token.access_token},signal:AbortSignal.timeout(12000)});
 if(!identity.ok)throw new c.HttpError(401,'계정을 확인하지 못했습니다.');const user=await identity.json();
 if(provider==='google'&&(user.email_verified!==true||!user.sub))throw new c.HttpError(401,'인증된 Google 계정이 필요합니다.');
 const session={id:provider==='google'?'google:'+user.sub:user.id,provider,name:provider==='google'?(user.name||'Google 사용자'):(user.global_name||user.username),csrf:crypto.randomBytes(24).toString('hex'),exp:Date.now()+7*86400000};
 res.setHeader('Set-Cookie',[c.cookie('aram_oauth','',0),c.cookie('aram_session',c.sign(session),7*86400)]);redirect('/');return true;
}
module.exports={auth,providers};
