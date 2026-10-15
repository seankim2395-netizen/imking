import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHandler} from '../supabase/functions/_shared/handler.mjs';
import {createSupabaseStore} from '../supabase/functions/_shared/store.mjs';
import {handleNetwork} from '../supabase/functions/_shared/lib/network-api.mjs';
import {handleGuestSession,handleGuestWorld,guestOwner} from '../supabase/functions/_shared/lib/guest-api.mjs';
import {newWorld,addPerson} from '../public/model.mjs';
import {buildPublic} from '../scripts/build.mjs';
import {createApiTransport} from '../public/browser-transport.mjs';

const origin='https://example.github.io', endpoint='https://abcdefghijklmnopqrst.supabase.co/functions/v1/royal-api';
function memoryStore(){const rows=new Map();return {
 async read(id){return rows.get(id)||null;},async exists(id){return rows.has(id);},
 async write(id,world,expected){const old=rows.get(id);if((old?.revision||0)!==expected)return null;const row={world_json:JSON.stringify(world),revision:expected+1,updated_at:Date.now()};rows.set(id,row);return row;},
 async remove(id,expected){if(rows.get(id)?.revision!==expected)return null;rows.delete(id);return {revision:expected};},
};}
function request(path,{method='GET',token,body,from=origin,headers={}}={}){return new Request(endpoint+'/'+path,{method,headers:{Origin:from,...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});}
const make=store=>createHandler({origins:[origin],handleGuestSession,handleGuestWorld,store});
async function session(handler){const r=await handler(request('session',{method:'POST',body:{}}));assert.equal(r.status,200);return (await r.json()).token;}
function world(){const w=newWorld(),p=addPerson(w,{id:crypto.randomUUID(),name:'검증왕',gender:'M',type:0});w.activeId=p.id;return w;}

test('cross-origin session, save, latest recovery, isolation and revision conflicts',async()=>{
 const handler=make(memoryStore()),one=await session(handler),two=await session(handler);
 const saved=await handler(request('world',{method:'PUT',token:one,body:{revision:0,world:world()}}));assert.equal(saved.status,200);assert.equal(saved.headers.get('access-control-allow-origin'),origin);
 const recovered=await (await handler(request('world',{token:one}))).json();assert.equal(recovered.revision,1);assert.equal(recovered.world.people[recovered.world.activeId].name,'검증왕');
 assert.equal((await (await handler(request('world',{token:two}))).json()).world,null);
 assert.equal((await handler(request('world',{method:'PUT',token:one,body:{revision:0,world:world()}}))).status,409);
 assert.equal((await handler(request('world',{token:'NG1.invalid'}))).status,401);
 assert.equal((await handler(request('world',{method:'DELETE',token:two,body:{revision:1}}))).status,200);
 assert.equal((await (await handler(request('world',{token:one}))).json()).revision,1);
 const latest=world();latest.people[latest.activeId].name='최신왕';
 assert.equal((await handler(request('world',{method:'PUT',token:one,body:{revision:1,world:latest}}))).status,200);
 const sameLink=await (await handler(request('world',{token:one}))).json();assert.equal(sameLink.world.people[sameLink.world.activeId].name,'최신왕');
 assert.equal((await handler(request('world',{method:'DELETE',token:one,body:{revision:1}}))).status,409);
 assert.equal((await handler(request('world',{method:'DELETE',token:one,body:{revision:2}}))).status,200);
});
test('CORS only accepts configured origins, methods and headers',async()=>{
 const handler=make(memoryStore());
 assert.equal((await handler(request('session',{method:'POST',from:'https://other.example',body:{}}))).status,403);
 assert.equal((await handler(new Request(endpoint+'/world'))).status,403);
 const options=await handler(request('world',{method:'OPTIONS',headers:{'Access-Control-Request-Method':'PUT','Access-Control-Request-Headers':'authorization,content-type'}}));assert.equal(options.status,204);assert.equal(options.headers.get('access-control-allow-origin'),origin);
 assert.equal((await handler(request('world',{method:'OPTIONS',headers:{'Access-Control-Request-Method':'PUT','Access-Control-Request-Headers':'x-spoofed-owner'}}))).status,403);
 assert.equal((await handler(request('session',{method:'GET'}))).status,405);
 assert.equal((await handler(request('other'))).status,404);
});
test('malformed and oversized data is rejected; service errors reveal no secrets',async()=>{
 const handler=make(memoryStore()),token=await session(handler);
 assert.equal((await handler(request('world',{method:'PUT',token,body:{revision:0,world:{}}}))).status,400);
 assert.equal((await handler(request('world',{method:'PUT',token,body:{revision:0,world:world(),padding:'x'.repeat(600001)}}))).status,413);
 const broken=make({async read(){throw Error('private-service-key');}});const r=await broken(request('world',{token}));assert.equal(r.status,503);assert.ok(!(await r.text()).includes('private-service-key'));
});
test('REST store scopes every query and atomically compares revisions',async()=>{
 const calls=[],owner=await guestOwner('NG1.12345678-1234-4234-8234-123456789abc.'+'a'.repeat(64));
 const store=createSupabaseStore({url:'https://abcdefghijklmnopqrst.supabase.co',serviceKey:'server-secret',fetcher:async(url,options)=>{calls.push({url:new URL(url),...options});return Response.json([{revision:1,updated_at:42,world_json:'{}'}]);}});
 await store.read(owner);await store.write(owner,world(),0);await store.write(owner,world(),7);await store.remove(owner,8);
 assert.equal(calls[0].url.searchParams.get('owner_id'),'eq.'+owner);
 assert.equal(calls[1].method,'POST');assert.match(calls[1].headers.Prefer,/ignore-duplicates/);assert.equal(JSON.parse(calls[1].body).owner_id,owner);
 assert.equal(calls[2].method,'PATCH');assert.equal(calls[2].url.searchParams.get('revision'),'eq.7');assert.equal(JSON.parse(calls[2].body).revision,8);
 assert.equal(calls[3].url.searchParams.get('revision'),'eq.8');assert.equal(calls[3].url.searchParams.get('owner_id'),'eq.'+owner);
 assert.ok(calls.every(x=>x.headers.Authorization==='Bearer server-secret'));
});
test('browser API transport strips legacy identity and rejects unapproved routes',async()=>{
 const calls=[],transport=createApiTransport({apiBase:endpoint,fetcher:async(url,options)=>{calls.push({url:String(url),...options});return Response.json({});}});
 await transport('/api/world',{headers:{Authorization:'Bearer NG1.private','X-Naegawang-Legacy':'1'},credentials:'same-origin'});
 assert.equal(calls[0].url,endpoint+'/world');assert.equal(calls[0].credentials,'omit');assert.equal(calls[0].mode,'cors');assert.equal(calls[0].headers.get('x-naegawang-legacy'),null);assert.equal(calls[0].headers.get('authorization'),'Bearer NG1.private');
 assert.throws(()=>transport('https://other.example/steal'));
});
test('public build retains all game assets and rewrites metadata including repository paths',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'imking-deploy-'));
 try{
  await buildPublic({outputDir:dir,siteUrl:origin+'/imking/',projectRef:'abcdefghijklmnopqrst'});
  for(const file of ['index.html','invite.html']){const html=await readFile(join(dir,file),'utf8');assert.ok(html.includes(origin+'/imking/assets/share-preview.jpg'));assert.ok(!html.includes('chatgpt.site'));}
  const app=await readFile(join(dir,'app.mjs'),'utf8');assert.ok(app.includes('fetcher:deploymentFetch'));assert.ok(!app.includes('사이트도 현재 소유자 전용입니다'));
  const config=await readFile(join(dir,'deployment-config.mjs'),'utf8');assert.ok(config.includes(endpoint));assert.ok(!config.includes('service_role'));
  assert.ok((await readFile(join(dir,'assets/share-preview.jpg'))).length>0);
  assert.ok((await readFile(join(dir,'vendor/atelier-manse.mjs'))).length>0);
  const schema=await readFile(new URL('../supabase/migrations/20261015094857_imking_worlds.sql',import.meta.url),'utf8');assert.match(schema,/enable row level security/);assert.match(schema,/from public, anon, authenticated/);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('cross-origin shared invitations join the same graph and private birthdays are redacted',async()=>{
 const store=memoryStore(),networkStore=memoryStore();const handler=createHandler({origins:[origin],handleGuestSession,handleGuestWorld,handleNetwork,store,networkStore});
 const a=await session(handler),b=await session(handler),birth={date:'1990-05-10',time:'12:30',cal:'solar',city:'서울'};
 const reg=async(token,code,name)=>{const r=await handler(request('network',{method:'POST',token,body:{type:'register',name,gender:'M',birth,inviteCode:code}}));assert.equal(r.status,200,await r.clone().text());assert.equal(r.headers.get('access-control-allow-origin'),origin);return r.json();};
 const wa=await reg(a,null,'A');const wb=await reg(b,wa.invite.code,'B');assert.equal(Object.keys(wb.world.people).length,2);assert.equal(wb.world.people[wa.world.activeId].birth,null);
 const latest=await (await handler(request('network',{token:a}))).json();assert.equal(Object.keys(latest.world.people).length,2);
 const preflight=await handler(request('network',{method:'OPTIONS',headers:{'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,content-type'}}));assert.equal(preflight.status,204);
});
