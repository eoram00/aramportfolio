const crypto=require('node:crypto'),c=require('./core');
async function store(){const {getStore}=await import('@netlify/blobs');return getStore({name:'aram-request-locks',consistency:'strong'});}
async function withLock(id,work,injected){
 // Local scripts are run by the operator; deployed HTTP and background functions share a durable lock.
 if(!injected&&process.env.NETLIFY!=='true')return work();
 const blobs=injected||await store(),key=crypto.createHash('sha256').update(id).digest('hex');
 const current=await blobs.getWithMetadata(key,{type:'json'}),now=Date.now();
 if(current&&current.data.expires>now)throw new c.HttpError(409,'이 신청을 처리 중입니다. 잠시 후 다시 확인해주세요.');
 const token=crypto.randomBytes(16).toString('hex'),expires=now+20*60000;
 const claim=await blobs.setJSON(key,{token,expires},{...(current?{onlyIfMatch:current.etag}:{onlyIfNew:true})});
 if(!claim.modified)throw new c.HttpError(409,'다른 처리가 먼저 시작됐습니다. 잠시 후 다시 확인해주세요.');
 try{return await work();}finally{
  // Functions end within 15 minutes. Never delete a lease near/after expiry, when another worker could own it.
  if(Date.now()+30000<expires)await blobs.delete(key);
 }
}
module.exports={withLock};
