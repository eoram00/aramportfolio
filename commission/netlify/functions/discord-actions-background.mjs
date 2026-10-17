import interactions from '../../lib/interactions.js';
export const config={background:true};
export default async function(request){
 const chunks=[];let size=0;for await(const part of request.body||[]){size+=part.byteLength;if(size>32000)return;chunks.push(Buffer.from(part));}const raw=Buffer.concat(chunks);
 if(!interactions.validSignature(raw,request.headers.get('x-signature-ed25519'),request.headers.get('x-signature-timestamp')))return;
 let event;try{event=JSON.parse(raw);}catch{return;}
 if(interactions.response(event).type!==5)return;
 await interactions.processSubmission(event);
}
