export function createApiTransport({apiBase,fetcher=globalThis.fetch}){
 const base=new URL(apiBase);
 if(base.protocol!=='https:')throw Error('저장 서버에는 HTTPS 주소가 필요합니다.');
 return function(url,options={}){
  if(!['/api/session','/api/world','/api/network'].includes(url))throw Error('알 수 없는 저장 요청입니다.');
  const headers=new Headers(options.headers);headers.delete('X-Naegawang-Legacy');
  const endpoint=new URL(base.href.replace(/\/$/,'')+'/'+url.slice('/api/'.length));
  return fetcher(endpoint,{...options,headers,credentials:'omit',mode:'cors',cache:'no-store',redirect:'error'});
 };
}
