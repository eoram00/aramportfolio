export default async function(){
 const secret=process.env.CRON_SECRET;
 if(!secret||secret.length<32||!process.env.DISCORD_BOT_TOKEN)return new Response(null,{status:204});
 const url=new URL('/.netlify/functions/cleanup-background',process.env.APP_URL);
 if(url.protocol!=='https:')throw new Error('Cleanup requires HTTPS APP_URL');
 const response=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+secret},signal:AbortSignal.timeout(12000),redirect:'error'});
 if(response.status!==202)throw new Error('Cleanup dispatch failed');
 return new Response(null,{status:204});
}
export const config={schedule:'0 18 * * *'};
