const c=require('./core'),forum=require('./forum'),privacy=require('./privacy');
function controls(status,id){
 const buttons=[['accepted','수락','✅',3],['rejected','거절','✖️',4],['cancelled','취소','↩️',2]].map(([next,label,emoji,style])=>({type:2,style,label,emoji:{name:emoji},custom_id:'aram:'+next+':'+status,disabled:!c.statusAllowed(status,next,true)}));
 if(['accepted','rejected'].includes(status))buttons.push({type:2,style:2,label:'이동 재시도',custom_id:'aram-retry:'+status});
 if(id)buttons.push({type:2,style:5,label:'신청 관리 · 연락하기',url:c.config().origin+'/?request='+id});
 return [{type:1,components:buttons}];
}
function contactFields(s){
 if(s.id.startsWith('google:'))return [{name:'Google 이메일',value:s.contact?.email||'기존 로그인: 이메일 미수집 · 다시 로그인 후 새 신청에 표시됩니다.'}];
 return [{name:'Discord 사용자명',value:s.contact?.username||'기존 로그인: 사용자명 미수집'},{name:'Discord 사용자 ID',value:s.id}];
}
async function save(channel,meta,initial){
 const updated={...meta,schema:2};delete updated.detail;
 await c.discord('/channels/'+channel.id+'/messages/'+channel.id,'PATCH',{embeds:[initial.embeds[0],{description:'접수 관리 기록',footer:{text:'ARAM_META:'+c.sign(updated)}}],components:controls(meta.status,channel.id),allowed_mentions:{parse:[]}});
 await c.discord('/channels/'+channel.id,'PATCH',{name:forum.threadName(meta),archived:false});
}
async function move(channel,meta,initial){
 const destination=meta.status==='accepted'?process.env.DISCORD_ACCEPTED_FORUM_ID:meta.status==='rejected'?process.env.DISCORD_REJECTED_FORUM_ID:null;
 if(!destination||destination===channel.parent_id)return channel.id;
 const parent=await c.discord('/channels/'+destination);if(parent.guild_id!==process.env.DISCORD_GUILD_ID||parent.type!==15)throw new c.HttpError(503,'이동할 포럼 설정을 확인해주세요.');
 // Keep the source until all history is copied, so a failure never destroys a request.
 const history=[];let before='';for(let page=0;page<20;page++){
  const batch=await c.discord('/channels/'+channel.id+'/messages?limit=100'+(before?'&before='+before:''));history.push(...batch.filter(m=>m.id!==channel.id));if(batch.length<100)break;if(page===19)throw new c.HttpError(503,'대화가 많아 자동 이동을 완료할 수 없습니다.');before=batch.at(-1).id;
 }
 let copy={...meta,schema:2,movedFrom:channel.id,copying:true};delete copy.detail;delete copy.movedTo;delete copy.transferTo;
 let created;
 const existingId=meta.transferTo||(await forum.list()).find(ch=>{const m=forum.decode(ch);return ch.parent_id===destination&&m?.movedFrom===channel.id&&m.status===meta.status&&m.copying;})?.id;
 if(existingId){const previous=await forum.details(await c.discord('/channels/'+existingId));if(previous.channel.parent_id!==destination||previous.meta.movedFrom!==channel.id||previous.meta.owner!==meta.owner)throw new c.HttpError(409,'이동 기록을 확인해주세요.');created=previous.channel;copy={...previous.meta};}
 else created=await c.discord('/channels/'+destination+'/threads','POST',{name:forum.threadName(copy),auto_archive_duration:10080,applied_tags:forum.tagsFor(parent,copy.kind),message:{content:'이전 신청의 내용과 처리 이력을 이어받았습니다.',allowed_mentions:{parse:[]},embeds:[initial.embeds[0],{description:'접수 관리 기록',footer:{text:'ARAM_META:'+c.sign(copy)}}],components:controls(copy.status)}});
 meta.transferTo=created.id;await save(channel,meta,initial);
 try{
  for(const message of history.reverse()){
   if(copy.copyCursor&&BigInt(message.id)<=BigInt(copy.copyCursor))continue;
   const embeds=(message.embeds||[]).filter(e=>!e.footer?.text?.startsWith('ARAM_META:')).map(e=>{const {type,provider,video,...rest}=e;return rest;});
   const attachments=(message.attachments||[]).map(a=>'첨부: '+a.url).join('\n');
   const text=[message.content,attachments].filter(Boolean).join('\n').slice(0,1900);
   if(!text&&!embeds.length)continue;
   await c.message(created.id,{nonce:message.id,enforce_nonce:true,...(text?{content:text}:{}),...(embeds.length?{embeds}:{} )});
   copy.copyCursor=message.id;await c.discord('/channels/'+created.id+'/messages/'+created.id,'PATCH',{embeds:[initial.embeds[0],{description:'접수 관리 기록',footer:{text:'ARAM_META:'+c.sign(copy)}}]});
  }
  delete copy.copying; // Keep the cursor so a delayed source-redirect retry never recopies history.
  await save(created,copy,initial);
  const source={...meta,schema:2,movedTo:created.id};delete source.detail;
  await c.discord('/channels/'+channel.id+'/messages/'+channel.id,'PATCH',{embeds:[initial.embeds[0],{description:'이동된 신청',footer:{text:'ARAM_META:'+c.sign(source)}}],components:[{type:1,components:[{type:2,style:5,label:'이동한 신청 열기',url:'https://discord.com/channels/'+process.env.DISCORD_GUILD_ID+'/'+created.id}]}]});
  await c.message(channel.id,{content:'이 신청은 <#'+created.id+'> 포럼 글로 이동했습니다. 이후 답변은 이동한 글에서 이어주세요.'});
  await c.discord('/channels/'+channel.id,'PATCH',{name:('[이동됨] '+meta.title).slice(0,100),archived:true,locked:true});
  return created.id;
 }catch(e){throw new c.HttpError(502,'처리 상태는 저장했지만 포럼 이동을 완료하지 못했습니다. 관리자에게 문의해주세요.');}
}
async function changeUnlocked(id,session,next,note='',expected,interactionId,deadline){
 const {channel,meta,initial}=await forum.get(id,session);privacy.checkExpiry(meta);
 if(interactionId&&meta.lastInteraction===interactionId){await move(channel,meta,initial);return meta.status;}
 if(session.staff&&meta.status===next&&['accepted','rejected'].includes(next)){await move(channel,meta,initial);return next;}
 if(expected&&expected!==meta.status||!c.statusAllowed(meta.status,next,session.staff))throw new c.HttpError(409,'이미 처리되었거나 현재 상태에서 할 수 없는 작업입니다.');
 if(note)note=c.text(note,1,800,'사유');
 meta.status=next;meta.deadline=deadline?c.text(deadline,1,80,'마감기한'):meta.deadline||initial.embeds?.[0]?.fields?.find(f=>f.name==='희망 일정')?.value||'일정 협의';if(interactionId)meta.lastInteraction=interactionId;
 await save(channel,meta,initial);
 await c.message(channel.id,{embeds:[{description:forum.labels[next]+(note?'\n'+note:''),color:11590895,author:{name:session.staff?'ARAM':'신청자'},footer:{text:'ARAM · MESSAGE'},timestamp:new Date().toISOString()}]});
 await move(channel,meta,initial);return next;
}
async function change(id,session,...args){const {channel,meta}=await forum.get(id,session);require('./privacy').checkExpiry(meta);return require('./request-lock').withLock(meta.movedFrom||channel.id,()=>changeUnlocked(id,session,...args));}
module.exports={controls,contactFields,save,change,move};
