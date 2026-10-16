import test from 'node:test';
import assert from 'node:assert/strict';
import {handleGuestSession,guestOwner} from '../supabase/functions/_shared/lib/guest-api.mjs';
import {handleNetwork} from '../supabase/functions/_shared/lib/network-api.mjs';
import {newWorld,addPerson} from '../supabase/functions/_shared/lib/shared/model.mjs';
import {validateWorld} from '../supabase/functions/_shared/lib/shared/recovery.mjs';
import {createNetworkSync} from '../public/network-sync.mjs';
function store(){const rows=new Map();return {rows,async read(k){return structuredClone(rows.get(k)||null);},async write(k,v,rev){const prev=rows.get(k);if((prev?.revision||0)!==rev)return null;const row={world_json:JSON.stringify(v),revision:rev+1,updated_at:Date.now()};rows.set(k,row);return row;},async exists(k){return rows.has(k);}};}
const birth={date:'1990-05-10',time:'12:30',cal:'solar',city:'서울'};
function req(path,token,{method='GET',body,origin='https://game.test'}={}){return new Request('https://game.test'+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(method==='POST'?{Origin:origin,'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});}
async function actor(){return (await handleGuestSession(req('/api/session',null,{method:'POST',body:{}}))).json();}
async function api(s,a,body,options={}){const r=await handleNetwork(req('/api/network',a.token,{...(body?{method:'POST',body}:{}),...options}),s,options);return {status:r.status,...await r.json()};}
async function join(s,a,code,name='사람'){const r=await api(s,a,{type:'register',name,gender:'M',birth,...(code?{inviteCode:code}:{})});assert.equal(r.status,200,JSON.stringify(r));return r;}
async function command(s,a,type,args={},opId=crypto.randomUUID()){return api(s,a,{type,...args,opId});}
async function chain(){const s=store(),a=await actor(),b=await actor(),c=await actor(),d=await actor();const wa=await join(s,a,null,'A');const wb=await join(s,b,wa.invite.code,'B');const wc=await join(s,c,wb.invite.code,'C');const wd=await join(s,d,wc.invite.code,'D');return {s,a,b,c,d,wa,wb,wc,wd};}
test('four separate browsers share the complete invitation tree and branches',async()=>{
 const {s,a,b,c,d,wa,wb}=await chain();const e=await actor();await join(s,e,wa.invite.code,'E');const f=await actor();await join(s,f,wb.invite.code,'F');
 for(const actor of [a,b,c,d,e,f]){const r=await api(s,actor);assert.equal(r.status,200);assert.equal(Object.keys(r.world.people).length,6);assert.equal(r.world.activeId,actor.id);assert.equal(r.world.people[b.id].inviterId,a.id);assert.equal(r.world.people[c.id].inviterId,b.id);assert.equal(r.world.people[d.id].inviterId,c.id);assert.equal(r.world.people[e.id].inviterId,a.id);assert.equal(r.world.people[f.id].inviterId,b.id);validateWorld(r.world);}
});
test('independence preserves every invitation edge and shared descendants',async()=>{
 const {s,a,b,c,d,wb}=await chain();const r=await command(s,b,'reign-independent');assert.equal(r.status,200);assert.equal(r.world.people[b.id].isKing,true);assert.equal(r.world.people[b.id].inviterId,a.id);assert.equal(r.world.people[c.id].liegeId,b.id);
 const e=await actor();await join(s,e,wb.invite.code,'E');for(const actor of [a,c,d]){const r=await api(s,actor);assert.equal(r.world.people[b.id].isKing,true);assert.equal(r.world.people[e.id].inviterId,b.id);validateWorld(r.world);}
});
test('server uses current inviter status, not the old invitation portrait',async()=>{const {s,b,wb}=await chain();await command(s,b,'reign-independent');const e=await actor();const r=await join(s,e,wb.invite.code,'E');assert.equal(r.world.people[e.id].liegeId,b.id);assert.equal(r.world.people[b.id].isKing,true);});
test('simultaneous joins and bows retain all people, totals and half tributes',async()=>{
 const s=store(),a=await actor(),wa=await join(s,a),kids=await Promise.all(Array.from({length:5},()=>actor()));await Promise.all(kids.map(x=>join(s,x,wa.invite.code)));
 await Promise.all(kids.map(x=>command(s,x,'bow',{count:20})));const r=await api(s,a);assert.equal(Object.keys(r.world.people).length,6);assert.equal(r.world.people[a.id].totalBows,100);assert.equal(r.world.people[a.id].gold,10);
 const b=kids[0],wb=await api(s,b),c=await actor();await join(s,c,wb.invite.code);await command(s,b,'reign-independent');await command(s,c,'bow',{count:20});const final=await api(s,a);assert.equal(final.world.people[a.id].totalBows,110);assert.equal(final.world.people[b.id].totalBows,20);assert.equal(final.world.people[a.id].inheritedBows,10);
});
test('retrying an operation or registration does not duplicate money or people',async()=>{const {s,a,b,wa}=await chain();const id=crypto.randomUUID();await command(s,b,'bow',{count:10},id);await command(s,b,'bow',{count:10},id);const r=await api(s,a);assert.equal(r.world.people[a.id].totalBows,10);const retry=await join(s,b,wa.invite.code);assert.equal(Object.keys(retry.world.people).length,4);});
test('unrelated browser cannot read or mutate a graph with a guessed ID or actor override',async()=>{const {s,a,b}=await chain(),other=await actor();const empty=await api(s,other);assert.equal(empty.world,null);const bad=await command(s,other,'bow',{actorId:b.id});assert.equal(bad.status,409);const target=await command(s,b,'grant',{actorId:a.id,targetId:a.id,rank:5});assert.equal(target.status,400);const after=await api(s,a);assert.equal(after.world.people[a.id].grantedRank,0);assert.equal((await api(s,a,{type:'bow',opId:crypto.randomUUID()},{origin:'https://evil.test'})).status,403);});
test('shared snapshots keep raw birth information and owner credentials private',async()=>{const {s,a,b}=await chain();const r=await api(s,b);assert.equal(r.world.people[a.id].birth,null);assert.deepEqual(r.world.people[a.id].scores,[]);assert.ok(r.world.people[b.id].birth);assert.ok(r.world.people[a.id].chart);const serialized=JSON.stringify(r);assert.ok(!serialized.includes(await guestOwner(a.token)));assert.ok(!serialized.includes(a.token));assert.ok(!serialized.includes('receipts'));});
test('existing private world migrates with its actor, stable graph and historical edges',async()=>{const s=store(),privateStore=store(),a=await actor();const world=newWorld();addPerson(world,{id:'old-king',name:'기존왕',gender:'M',type:0,birth});addPerson(world,{id:'old-subject',name:'옛지인',gender:'F',type:0,inviterId:'old-king'});world.activeId='old-king';world.people['old-king'].gold=123;await privateStore.write(await guestOwner(a.token),world,0);const r=await api(s,a,{type:'register'},{privateStore});assert.equal(r.status,200,JSON.stringify(r));assert.equal(r.world.activeId,'old-king');assert.equal(r.world.people['old-king'].gold,123);assert.equal(r.world.people['old-subject'].inviterId,'old-king');const child=await actor();await join(s,child,r.invite.code);const latest=await api(s,a);assert.equal(latest.world.activeId,'old-king');assert.equal(latest.world.people[child.id].inviterId,'old-king');});
test('shared council votes are actual separate people and only its king can close it',async()=>{const {s,a,b,c}=await chain();const opened=await command(s,a,'life-council-open',{agendaId:'agenda-01'});assert.equal(opened.status,200);const id=opened.resultId;assert.ok(id);assert.equal((await command(s,b,'life-council-vote',{councilId:id,choice:1})).status,200);assert.equal((await command(s,c,'life-council-vote',{councilId:id,choice:1})).status,400);assert.equal((await command(s,b,'life-council-close',{councilId:id})).status,400);const closed=await command(s,a,'life-council-close',{councilId:id});assert.equal(closed.status,200);assert.ok(closed.resultId);const r=await api(s,b);assert.equal(r.world.councils[0].votes[b.id],1);assert.ok(r.world.councils[0].closedAt);validateWorld(r.world);});
test('partial registration retries after missing birth without creating another membership',async()=>{const s=store(),a=await actor();assert.equal((await api(s,a,{type:'register'})).status,400);const r=await join(s,a);assert.equal(r.world.activeId,a.id);assert.equal(Object.keys(r.world.people).length,1);});
function disk(){const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};}
test('outbox retries a lost response using the same operation id after reload',async()=>{
 const {s,a,b}=await chain(),storage=disk();let lose=false;const fetcher=async(path,options={})=>{const r=await handleNetwork(req(path,b.token,{method:options.method,body:options.body?JSON.parse(options.body):undefined}),s);if(lose&&options.method==='POST'){lose=false;throw Error('lost response');}return r;};
 const sync=createNetworkSync({fetcher,storage});await sync.load();lose=true;await assert.rejects(sync.command({type:'bow',count:10}));assert.equal(sync.hasPending,true);const second=createNetworkSync({fetcher,storage});await second.load();assert.equal(second.hasPending,false);assert.equal((await api(s,a)).world.people[a.id].totalBows,10);
});

test('storage failures do not expose internal errors to players',async()=>{const a=await actor(),broken={async read(){throw Error('private-service-secret');}};const r=await api(broken,a);assert.equal(r.status,503);assert.ok(!JSON.stringify(r).includes('private-service-secret'));});

test('king expels only a direct subject, preserves descendants and private return access, and retries once',async()=>{
 const {s,a,b,c,d,wb}=await chain();
 await command(s,a,'loyal-appoint',{targetId:b.id});await command(s,a,'royal-nudge',{targetId:b.id});await command(s,b,'bow',{count:12});
 const before=await api(s,b),kingBefore=before.world.people[a.id],op=crypto.randomUUID();
 const out=await command(s,a,'subject-expel',{targetId:b.id},op);assert.equal(out.status,200);
 assert.equal(out.world.people[b.id].isKing,true);assert.equal(out.world.people[b.id].liegeId,null);assert.equal(out.world.people[b.id].inviterId,a.id);
 assert.equal(out.world.people[c.id].liegeId,b.id);assert.equal(out.world.people[d.id].liegeId,c.id);assert.equal(out.world.people[b.id].summons,null);assert.ok(!out.world.people[a.id].loyalIds.includes(b.id));
 assert.equal(out.world.people[a.id].totalBows,kingBefore.totalBows);assert.equal(out.world.people[a.id].gold,kingBefore.gold);assert.equal(out.world.people[b.id].bows,12);assert.equal(out.world.people[b.id].birth,null);validateWorld(out.world);
 const again=await command(s,a,'subject-expel',{targetId:b.id},op);assert.equal(again.status,200);assert.equal(again.revision,out.revision);assert.equal(again.world.events.length,out.world.events.length);
 const own=await api(s,b);assert.equal(own.world.activeId,b.id);assert.equal(own.world.people[b.id].isKing,true);assert.deepEqual(own.world.people[b.id].birth,before.world.people[b.id].birth);assert.equal(own.invite.code,wb.invite.code);validateWorld(own.world);
 const e=await actor();const joined=await join(s,e,wb.invite.code,'새신하');assert.equal(joined.world.people[e.id].liegeId,b.id);assert.equal(joined.world.people[e.id].inviterId,b.id);
});
test('expulsion works without recruits and cannot target another country, a nested household, self or a king',async()=>{
 const {s,a,b,c,d,wa}=await chain();const outsider=await actor();await join(s,outsider,null,'다른왕');const empty=await actor();await join(s,empty,wa.invite.code,'외톨이');
 const initial=await api(s,a);
 for(const [actor,target] of [[b,c.id],[a,c.id],[outsider,b.id],[a,a.id],[a,outsider.id],[a,'missing-person']]){
  const result=await command(s,actor,'subject-expel',{targetId:target});assert.equal(result.status,403);assert.equal((await api(s,a)).revision,initial.revision);
 }
 const result=await command(s,a,'subject-expel',{targetId:empty.id});assert.equal(result.status,200);assert.equal(result.world.people[empty.id].isKing,true);validateWorld(result.world);
 const rejected=await command(s,a,'subject-expel',{targetId:empty.id});assert.equal(rejected.status,403);assert.equal((await api(s,a)).revision,result.revision);
});
test('racing independence and expulsion leave one consistent country and intact invitation edges',async()=>{
 const {s,a,b,c,d}=await chain();const results=await Promise.all([command(s,a,'subject-expel',{targetId:b.id}),command(s,b,'reign-independent')]);assert.ok(results.some(x=>x.status===200));
 for(const actor of [a,b,c,d]){const out=await api(s,actor);assert.equal(out.world.people[b.id].isKing,true);assert.equal(out.world.people[b.id].inviterId,a.id);assert.equal(out.world.people[c.id].liegeId,b.id);assert.equal(out.world.people[d.id].liegeId,c.id);validateWorld(out.world);}
});
