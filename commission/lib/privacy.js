const c=require('./core');
const settings=require('../privacy-settings.json');
const DAY=86400000;
function notice(){return {...settings,reviewed:settings.reviewed===true&&settings.transfers.every(t=>t.verified===true)};}
function ready(){return notice().reviewed&&typeof process.env.CRON_SECRET==='string'&&process.env.CRON_SECRET.length>=32;}
function checkExpiry(meta){if(!Number.isFinite(meta.created)||meta.created+settings.retentionDays*DAY<=Date.now())throw new c.HttpError(410,'보관 기간이 끝난 신청입니다. 삭제는 일일 정리 작업에서 처리됩니다.');}
function consent(b){if(b.policyVersion!==settings.version||b.consent!==true||b.transferConsent!==true||b.ageConfirmed!==true)throw new c.HttpError(400,'현재 개인정보 안내와 국외 이전 내용을 확인하고 만 14세 이상 여부 및 필수 동의를 체크해주세요.');}
async function erase(id,session){const forum=require('./forum');await forum.get(id,session);await c.discord('/channels/'+id,'DELETE');}
async function cleanup(){const forum=require('./forum');const channels=await forum.list();let deleted=0,failed=0,remaining=0;const deadline=Date.now()+40000;for(const channel of channels){const meta=forum.decode(channel);if(!meta||meta.created+settings.retentionDays*DAY>Date.now())continue;if(deleted+failed>=25||Date.now()>deadline){remaining++;continue;}try{await c.discord('/channels/'+channel.id,'DELETE');deleted++;}catch{failed++;}}return {deleted,failed,remaining};}
function cronAuthorized(req){const secret=process.env.CRON_SECRET;const actual=req.headers.authorization||'';if(!secret||secret.length<32||actual.length!==('Bearer '+secret).length)return false;return require('node:crypto').timingSafeEqual(Buffer.from(actual),Buffer.from('Bearer '+secret));}
module.exports={notice,ready,consent,checkExpiry,erase,cleanup,cronAuthorized};
