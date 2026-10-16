import privacy from '../../lib/privacy.js';
export default async function(request){
 if(!privacy.cronAuthorized({headers:Object.fromEntries(request.headers)}))return;
 const result=await privacy.cleanup();
 console.log(JSON.stringify({event:'request-cleanup',...result}));
 if(result.failed||result.remaining)throw new Error('Cleanup requires retry; see counts');
}
export const config={background:true};
