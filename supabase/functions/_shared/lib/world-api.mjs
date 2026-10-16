import {validateName} from './shared/name-policy.mjs';
// Endpoint logic is separated from the platform adapter for focused tests.
import {validateWorld} from './shared/recovery.mjs';
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'}});
export async function handleWorld(request,store,{owner:resolvedOwner}={}){
 const owner=resolvedOwner||request.headers.get('oai-authenticated-user-id');if(!owner)return json({error:'같은 ChatGPT 계정으로 로그인해주세요.',code:'signin_required'},401);
 if(request.method==='GET'){const row=await store.read(owner);if(!row)return json({world:null,revision:0,updatedAt:null});return json({world:validateWorld(JSON.parse(row.world_json)),revision:row.revision,updatedAt:row.updated_at});}
 if(!['PUT','DELETE'].includes(request.method))return json({error:'지원하지 않는 요청입니다.'},405);
 const origin=request.headers.get('origin');if(origin!==new URL(request.url).origin)return json({error:'사이트에서 시작한 저장 요청만 허용됩니다.'},403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'JSON 요청이 필요합니다.'},415);
 if(Number(request.headers.get('content-length')||0)>600000)return json({error:'왕실 기록이 너무 큽니다.'},413);
 let payload;try{const raw=await request.text();if(new TextEncoder().encode(raw).length>600000)return json({error:'왕실 기록이 너무 큽니다.'},413);payload=JSON.parse(raw);}catch{return json({error:'저장 요청을 읽을 수 없습니다.'},400);}
 if(!Number.isInteger(payload?.revision)||payload.revision<0)return json({error:'저장 기준이 올바르지 않습니다.'},400);
 if(request.method==='DELETE'){const row=await store.remove(owner,payload.revision);if(!row&&await store.exists(owner))return json({error:'다른 기기에서 기록이 변경되었습니다.',code:'revision_conflict'},409);return json({deleted:true,revision:0});}
 let world;try{world=validateWorld(payload.world);for(const p of Object.values(world.people))p.name=validateName(p.name);}catch(e){return json({error:e.message},400);}
 const row=await store.write(owner,world,payload.revision);if(!row)return json({error:'다른 기기의 새 기록이 있습니다. 최신 왕실을 먼저 불러오세요.',code:'revision_conflict'},409);
 return json({revision:row.revision,updatedAt:row.updated_at});
}
