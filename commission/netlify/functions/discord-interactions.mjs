import interactions from '../../lib/interactions.js';
export default async function(request,context){
 if(request.method!=='POST')return new Response('Method not allowed',{status:405});
 const chunks=[];let size=0;for await(const part of request.body||[]){size+=part.byteLength;if(size>32000)return new Response('Too large',{status:413});chunks.push(Buffer.from(part));}const raw=Buffer.concat(chunks);
 if(!interactions.validSignature(raw,request.headers.get('x-signature-ed25519'),request.headers.get('x-signature-timestamp')))return new Response('Invalid signature',{status:401});
 let event;try{event=JSON.parse(raw);}catch{return new Response('Invalid JSON',{status:400});}
 const reply=interactions.response(event);
 if(reply.type===5){
  if(!context?.waitUntil)return new Response('Background processing unavailable',{status:503});
  // Discord gets an immediate acknowledgement; history copying runs in a long-lived worker.
  context.waitUntil(fetch(new URL('/.netlify/functions/discord-actions-background',process.env.APP_URL),{method:'POST',headers:{'x-signature-ed25519':request.headers.get('x-signature-ed25519'),'x-signature-timestamp':request.headers.get('x-signature-timestamp')},body:raw,redirect:'error',signal:AbortSignal.timeout(12000)}).then(async r=>{if(r.status!==202)throw new Error('Action worker unavailable');}).catch(async()=>{await interactions.failSubmission(event);}));
 }
 return Response.json(reply,{headers:{'Cache-Control':'no-store'}});
}
