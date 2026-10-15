// Cross-origin adapter for the existing NG1 possession-token API.
// Origin is checked before adapting the URL for the same-origin core handler.
export function createHandler({origins,handleGuestSession,handleGuestWorld,store,handleNetwork,networkStore}){
 const allowed=new Set(origins.map(x=>new URL(x).origin));
 const methods={session:['POST'],world:['GET','PUT','DELETE'],network:['GET','POST']};
 return async function(request){
  const origin=request.headers.get('origin');
  const headers={'Cache-Control':'private, no-store','Vary':'Origin, Authorization','X-Content-Type-Options':'nosniff'};
  const reply=(body,status)=>Response.json(body,{status,headers});
  if(!origin||!allowed.has(origin))return reply({error:'허용된 게임 주소에서 접속해주세요.'},403);
  headers['Access-Control-Allow-Origin']=origin;
  const path=new URL(request.url).pathname;
  const kind=/\/royal-api\/(session|world|network)$/.exec(path)?.[1];
  if(!kind)return reply({error:'요청 주소를 찾지 못했습니다.'},404);
  if(request.method==='OPTIONS'){
   if(!methods[kind].includes(request.headers.get('access-control-request-method')))return reply({error:'지원하지 않는 요청입니다.'},405);
   const requested=(request.headers.get('access-control-request-headers')||'').toLowerCase().split(',').map(x=>x.trim()).filter(Boolean);
   if(requested.some(x=>!['authorization','content-type'].includes(x)))return reply({error:'지원하지 않는 요청 헤더입니다.'},403);
   return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':methods[kind].join(', '),'Access-Control-Allow-Headers':'authorization, content-type','Access-Control-Max-Age':'600'}});
  }
  if(!methods[kind].includes(request.method))return reply({error:'지원하지 않는 요청입니다.'},405);
  try{
   const adapted=new Request(new URL('/api/'+kind,origin),{method:request.method,headers:request.headers,...(request.method!=='GET'?{body:request.body,duplex:'half'}:{})});
   const result=kind==='session'?await handleGuestSession(adapted):kind==='network'?await handleNetwork(adapted,networkStore,{privateStore:store}):await handleGuestWorld(adapted,store);
   for(const [key,value]of Object.entries(headers))result.headers.set(key,value);
   return result;
  }catch{return reply({error:'왕실 저장소에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.'},503);}
 };
}
