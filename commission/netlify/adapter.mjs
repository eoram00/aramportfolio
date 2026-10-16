export async function nodeResponse(handler, request) {
 const headers=new Headers();let status=200,body=null;
 const chunks=[];let size=0;
 if(request.body)for await(const chunk of request.body){size+=chunk.byteLength;if(size>16000)return Response.json({error:'내용이 너무 깁니다.'},{status:413,headers:{'Cache-Control':'no-store'}});chunks.push(Buffer.from(chunk));}
 const incoming={url:request.url,method:request.method,headers:Object.fromEntries(request.headers),async *[Symbol.asyncIterator](){if(chunks.length)yield Buffer.concat(chunks);}};
 const outgoing={get statusCode(){return status;},set statusCode(value){status=value;},setHeader(name,value){headers.delete(name);for(const item of Array.isArray(value)?value:[value])headers.append(name,String(item));},end(value){body=value??null;}};
 await handler(incoming,outgoing);
 return new Response(body,{status,headers});
}
