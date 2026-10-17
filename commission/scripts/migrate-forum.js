// Run with --env-file=.env.netlify after the matching website deployment is live.
const c=require('../lib/core'),forum=require('../lib/forum'),management=require('../lib/request-management');
(async()=>{
 const channels=await forum.list();let updated=0,moved=0,skipped=0;
 for(const channel of channels){
  const short=forum.decode(channel);if(!short||short.movedTo||short.copying){skipped++;continue;}
  const {meta,initial}=await forum.get(channel.id,{staff:true});
  require('../lib/privacy').checkExpiry(meta);
  const fields=initial.embeds[0].fields||[];
  if(!fields.some(f=>f.name==='Discord 사용자 ID'||f.name==='Google 이메일')){
   const session={id:meta.owner};if(!meta.owner.startsWith('google:')){try{const user=await c.discord('/users/'+meta.owner);session.contact={username:user.username};}catch{}}
   initial.embeds[0].fields=[...fields,...management.contactFields(session)];
  }
  meta.deadline=meta.deadline||fields.find(f=>f.name==='희망 일정')?.value||'일정 협의';
  await management.save(channel,meta,initial);
  const destination=await management.move(channel,meta,initial);updated++;if(destination!==channel.id)moved++;
 }
 console.log(JSON.stringify({updated,moved,skipped}));
})().catch(e=>{console.error('Migration stopped:',e.status||'',e.message);process.exitCode=1;});
