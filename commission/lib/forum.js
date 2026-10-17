const c=require('./core');const crypto=require('node:crypto');
const codes={pending:'p',accepted:'a',rejected:'r',cancelled:'c'};
function ownerKey(id){return crypto.createHash('sha256').update(id).digest('base64url').slice(0,22);}
function legacyThreadName(m){const title=m.title.replace(/[\r\n]/g,' ').slice(0,43).replace(/[\uD800-\uDBFF]$/,'');const data=[ownerKey(m.owner),m.created.toString(36),codes[m.status],title].join('.');const signature=crypto.createHmac('sha256',process.env.SESSION_SECRET).update(data).digest('base64url').slice(0,16);return 'a1.'+[ownerKey(m.owner),m.created.toString(36),codes[m.status],signature].join('.')+' '+title;}
const labels={pending:'검토대기',accepted:'수락',rejected:'거절완료',cancelled:'취소'};
const record=Symbol('verified ARAM starter');
function threadName(m){return ('['+(m.status==='accepted'?(m.deadline||'일정 협의'):labels[m.status])+'] '+m.title.replace(/[\r\n]/g,' ')).slice(0,100).replace(/[\uD800-\uDBFF]$/,'');}
function decode(ch){if(ch[record]){const m=ch[record].meta;return {ownerKey:ownerKey(m.owner),title:m.title,kind:m.kind,created:m.created,status:m.status,forum:true,movedTo:m.movedTo,movedFrom:m.movedFrom,copying:m.copying};}if(ch.guild_id&&ch.guild_id!==process.env.DISCORD_GUILD_ID||ch.parent_id!==process.env.DISCORD_FORUM_ID||ch.type!==11)return null;const match=ch.name?.match(/^a1\.([\w-]{22})\.([a-z0-9]+)\.([parc])\.([\w-]{16}) (.*)$/);if(!match)return null;const [,key,time,code,sig,title]=match;const expected=crypto.createHmac('sha256',process.env.SESSION_SECRET).update([key,time,code,title].join('.')).digest('base64url').slice(0,16);if(!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return null;return {ownerKey:key,title,created:parseInt(time,36),status:Object.keys(codes).find(k=>codes[k]===code),forum:true};}
function parents(){return [process.env.DISCORD_FORUM_ID,process.env.DISCORD_ACCEPTED_FORUM_ID,process.env.DISCORD_REJECTED_FORUM_ID].filter(Boolean);}
async function hydrate(channel){
 if(!parents().includes(channel.parent_id)||channel.type!==11||channel.guild_id&&channel.guild_id!==process.env.DISCORD_GUILD_ID)throw new c.HttpError(404,'신청을 찾을 수 없습니다.');
 const initial=await c.discord('/channels/'+channel.id+'/messages/'+channel.id);
 const meta=c.verify(initial.embeds?.[1]?.footer?.text?.replace(/^ARAM_META:/,''));
 if(!meta||typeof meta.owner!=='string'||typeof meta.title!=='string'||!Number.isFinite(meta.created)||!codes[meta.status]||meta.bot!==process.env.DISCORD_CLIENT_ID||initial.author?.id!==meta.bot||initial.id!==channel.id)throw new c.HttpError(404,'신청 정보를 확인할 수 없습니다.');
 const legacy=decode(channel);if(legacy){if(legacy.ownerKey!==ownerKey(meta.owner))throw new c.HttpError(404,'신청 정보를 확인할 수 없습니다.');if(meta.schema!==2)meta.status=legacy.status;}
 Object.defineProperty(channel,record,{value:{meta,initial},configurable:true});return channel;
}
async function resolve(channels){for(let offset=0;offset<channels.length;offset+=4)await Promise.all(channels.slice(offset,offset+4).map(async ch=>{if(decode(ch)||!parents().includes(ch.parent_id))return;try{await hydrate(ch);}catch(e){if(e.status!==404)throw e;}}));return channels;}
async function list(){const active=await c.discord('/guilds/'+process.env.DISCORD_GUILD_ID+'/threads/active');let threads=active.threads||[];for(const parent of parents()){let before='';for(let page=0;page<20;page++){
 const batch=await c.discord('/channels/'+parent+'/threads/archived/public?limit=100'+(before?'&before='+encodeURIComponent(before):''));threads.push(...batch.threads||[]);if(!batch.has_more)break;if(page===19)throw new c.HttpError(503,'접수 이력이 많습니다.');const last=batch.threads?.at(-1)?.thread_metadata?.archive_timestamp;if(!last||last===before)throw new c.HttpError(502,'이력 목록을 불러오지 못했습니다.');before=last;
 }}return resolve([...new Map(threads.map(t=>[t.id,t])).values()]);}
function owns(s,m){return s.staff||m.ownerKey===ownerKey(s.id);}
async function details(channel){await hydrate(channel);return {channel,meta:{...channel[record].meta},initial:channel[record].initial};}
async function get(id,s){if(!/^\d{17,20}$/.test(id))throw new c.HttpError(404,'신청을 찾을 수 없습니다.');let channel=await hydrate(await c.discord('/channels/'+id));if(channel[record].meta.movedTo){if(!owns(s,decode(channel)))throw new c.HttpError(404,'신청을 찾을 수 없습니다.');channel=await hydrate(await c.discord('/channels/'+channel[record].meta.movedTo));}if(channel[record].meta.copying)throw new c.HttpError(409,'포럼 이동 처리 중입니다. 잠시 후 다시 확인해주세요.');const short=decode(channel);if(!owns(s,short))throw new c.HttpError(404,'신청을 찾을 수 없습니다.');return {channel,meta:{...channel[record].meta,detail:channel.id},initial:channel[record].initial};}
async function validateForum(botId,owners){const forum=await c.discord('/channels/'+process.env.DISCORD_FORUM_ID);if(forum.guild_id!==process.env.DISCORD_GUILD_ID||forum.type!==15)throw new c.HttpError(503,'신청 포럼 설정을 확인해주세요.');return forum;}
function tagsFor(parent,kind){const tag=(parent.available_tags||[]).find(t=>t.name.trim()===kind&&!t.moderated);if(!tag)throw new c.HttpError(503,'포럼의 '+kind+' 태그 설정을 확인해주세요.');return [tag.id];}
module.exports={tagsFor,ownerKey,threadName,legacyThreadName,hydrate,decode,list,owns,get,validateForum,labels,parents,details};
