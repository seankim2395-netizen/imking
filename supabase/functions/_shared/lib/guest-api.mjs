// Portable anonymous identity: random possession token, no personal-data lookup.
import {handleWorld} from './world-api.mjs';
const TOKEN=/^NG1\.([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.([0-9a-f]{64})$/;
export const guestId=token=>typeof token==='string'?TOKEN.exec(token)?.[1]||null:null;
const response=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store','Vary':'Authorization','X-Content-Type-Options':'nosniff'}});
export async function guestOwner(token){if(!guestId(token))return null;const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));return 'guest-v1-'+Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');}
export async function handleGuestSession(request){
 if(request.method!=='POST')return response({error:'지원하지 않는 요청입니다.'},405);
 if(request.headers.get('origin')!==new URL(request.url).origin)return response({error:'사이트에서 시작한 접속만 허용합니다.'},403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return response({error:'JSON 요청이 필요합니다.'},415);
 const id=crypto.randomUUID(),secret=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
 return response({version:1,id,token:`NG1.${id}.${secret}`});
}
export async function handleGuestWorld(request,store,{legacyOwner=null}={}){
 const token=request.headers.get('authorization')?.replace(/^Bearer /,''),owner=await guestOwner(token);
 if(!owner)return response({error:'이 브라우저의 접속 정보를 확인하지 못했습니다. 복구 링크나 백업을 확인해주세요.',code:'guest_session_required'},401);
 // One-time migration is possible only inside the Sites adapter with its trusted
 // request identity. The standalone Worker never accepts a legacy owner header.
 if(request.method==='GET'&&legacyOwner&&request.headers.get('x-naegawang-legacy')==='1'&&!await store.exists(owner)){
  const row=await store.read(legacyOwner);if(row){const {validateWorld}=await import('./shared/recovery.mjs');await store.write(owner,validateWorld(JSON.parse(row.world_json)),0);}
 }
 const result=await handleWorld(request,store,{owner});result.headers.set('Vary','Authorization');return result;
}
