const crypto=require('node:crypto'),c=require('./core'),management=require('./request-management');
function validSignature(raw,signature,timestamp){try{
 if(!/^[a-f0-9]{128}$/i.test(signature||'')||!/^\d{10}$/.test(timestamp||'')||Math.abs(Date.now()/1000-Number(timestamp))>300||!/^[a-f0-9]{64}$/i.test(process.env.DISCORD_PUBLIC_KEY||''))return false;
 const key=crypto.createPublicKey({key:Buffer.concat([Buffer.from('302a300506032b6570032100','hex'),Buffer.from(process.env.DISCORD_PUBLIC_KEY,'hex')]),format:'der',type:'spki'});
 return crypto.verify(null,Buffer.concat([Buffer.from(timestamp),Buffer.from(raw)]),key,Buffer.from(signature,'hex'));
 }catch{return false;}}
function allowed(event){return event.application_id===process.env.DISCORD_CLIENT_ID&&event.guild_id===process.env.DISCORD_GUILD_ID&&/^\d{17,20}$/.test(event.channel_id||'')&&(process.env.DISCORD_OWNER_IDS||'').split(',').map(s=>s.trim()).includes(event.member?.user?.id);}
function privateReply(content){return {type:4,data:{content,flags:64,allowed_mentions:{parse:[]}}};}
function response(event){
 if(event.type===1)return {type:1};
 if(!allowed(event))return privateReply('지정된 관리자만 신청을 처리할 수 있습니다.');
 if(event.type===3){
  if(/^aram-retry:(accepted|rejected)$/.test(event.data?.custom_id||'')&&event.message?.author?.id===process.env.DISCORD_CLIENT_ID)return {type:5,data:{flags:64}};
  const match=event.data?.custom_id?.match(/^aram:(accepted|rejected|cancelled):(pending|accepted)$/);
  if(!match||event.message?.author?.id!==process.env.DISCORD_CLIENT_ID||!c.statusAllowed(match[2],match[1],true))return privateReply('사용할 수 없는 버튼입니다.');
  const names={accepted:'수락 안내',rejected:'거부 사유',cancelled:'취소 사유'};
  return {type:9,data:{custom_id:'aram-modal:'+match[1]+':'+match[2]+':'+event.channel_id,title:names[match[1]],components:[...(match[1]==='accepted'?[{type:18,label:'마감기한 (비워두면 신청 일정 유지)',component:{type:4,custom_id:'deadline',style:1,required:false,max_length:80,placeholder:'예: 2026.10.25'}}]:[]),{type:18,label:names[match[1]],component:{type:4,custom_id:'note',style:2,required:match[1]!=='accepted',max_length:800,placeholder:'신청자에게 전달할 내용을 적어주세요.'}}]}};
 }
 if(event.type===5&&/^aram-modal:(accepted|rejected|cancelled):(pending|accepted):\d{17,20}$/.test(event.data?.custom_id||''))return {type:5,data:{flags:64}};
 return privateReply('지원하지 않는 작업입니다.');
}
function noteValue(components,key='note'){for(const item of components||[]){if(item.custom_id===key&&typeof item.value==='string')return item.value;if(item.component){const value=noteValue([item.component],key);if(value!==undefined)return value;}if(item.components){const value=noteValue(item.components,key);if(value!==undefined)return value;}}}
async function processSubmission(event){
 let content;
 try{
  if(!allowed(event))throw new c.HttpError(403,'관리자 확인에 실패했습니다.');
  const retry=event.data.custom_id.match(/^aram-retry:(accepted|rejected)$/);
  const match=retry?['',retry[1],retry[1],event.channel_id]:event.data.custom_id.match(/^aram-modal:(accepted|rejected|cancelled):(pending|accepted):(\d{17,20})$/);
  if(!match||match[3]!==event.channel_id)throw new c.HttpError(400,'신청을 확인할 수 없습니다.');
  const note=(noteValue(event.data.components)||'').trim();if(!retry&&match[1]!=='accepted'&&!note)throw new c.HttpError(400,'사유를 입력해주세요.');
  await management.change(match[3],{id:event.member.user.id,staff:true},match[1],note,match[2],event.id,noteValue(event.data.components,'deadline'));
  content='처리 완료. 포럼과 사이트 신청 상태에 반영했습니다.';
 }catch(e){content=e.status?e.message:'처리 중 오류가 발생했습니다. 포럼 상태를 확인한 뒤 다시 시도해주세요.';}
 const r=await fetch('https://discord.com/api/v10/webhooks/'+event.application_id+'/'+event.token+'/messages/@original',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({content,allowed_mentions:{parse:[]}}),signal:AbortSignal.timeout(12000)});
 if(!r.ok)console.error('Discord interaction reply failed:',r.status);
}
async function failSubmission(event){
 try{await fetch('https://discord.com/api/v10/webhooks/'+event.application_id+'/'+event.token+'/messages/@original',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:'작업 서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.',allowed_mentions:{parse:[]}}),signal:AbortSignal.timeout(12000)});}catch{console.error('Discord worker dispatch failed');}
}
module.exports={validSignature,response,processSubmission,failSubmission};
