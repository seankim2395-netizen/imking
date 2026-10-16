import {validateName} from './shared/name-policy.mjs';
// One canonical graph per connected invitation tree. All mutations are commands
// applied to the latest graph with compare-and-swap, never client world uploads.
import {guestOwner,guestId} from './guest-api.mjs';
import {newWorld,addPerson,setBirth,bow,grant,appointLoyal,dismissLoyal,assignHousehold,chooseStay,becomeKing,expelSubject,royalShop,royalNudge,acknowledgeNudge} from './shared/model.mjs';
import {openCouncil,voteCouncil,closeCouncil} from './shared/royal-life.mjs';
import {validateWorld} from './shared/recovery.mjs';
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store','Vary':'Authorization','X-Content-Type-Options':'nosniff'}});
const unpack=row=>row?JSON.parse(row.world_json):null;
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
const validCode=s=>typeof s==='string'&&/^[a-zA-Z0-9_-]{20,80}$/.test(s);
const memberKey=owner=>'member:'+owner;
const graphKey=id=>'graph:'+id;
async function binding(store,owner){return unpack(await store.read(memberKey(owner)));}
async function snapshot(store,member){
 const row=await store.read(graphKey(member.networkId));if(!row)fail('연결된 천하를 찾지 못했습니다.',404);
 const graph=unpack(row);if(graph.owners[member.personId]!==member.owner)fail('이 인물의 접속 권한을 확인해주세요.',403);
 const code=graph.invites[member.personId];if(code&&!await store.read('invite:'+code))await createOnce(store,'invite:'+code,{networkId:member.networkId,personId:member.personId});
 const world=structuredClone(graph.world);world.activeId=member.personId;
 for(const p of Object.values(world.people)){if(p.id!==member.personId){p.birth=null;p.scores=[];p.answers=[];}}
 return {world,revision:row.revision,updatedAt:row.updated_at,shared:true,invite:{code:graph.invites[member.personId],id:member.personId,name:world.people[member.personId].name,gender:world.people[member.personId].gender,isKing:world.people[member.personId].isKing}};
}
async function createOnce(store,key,value){await store.write(key,value,0);return unpack(await store.read(key));}
async function updateGraph(store,id,change){
 for(let attempt=0;attempt<12;attempt++){
  const row=await store.read(graphKey(id));if(!row)fail('초대한 천하를 찾지 못했습니다.',404);
  const graph=unpack(row);const result=change(graph);
  if(result?.unchanged)return result;
  // Keep the graph bounded before its JSON exceeds the storage service limit.
  if(new TextEncoder().encode(JSON.stringify(graph)).length>8000000)fail('천하 기록 보관함이 가득 찼습니다. 잠시 후 다시 시도해주세요.',413);
  if(await store.write(graphKey(id),graph,row.revision))return result;
 }
 fail('입궐과 활동이 몰리고 있습니다. 잠시 후 다시 시도해주세요.',409);
}
function seedWorld(previous,id){
 if(!previous)return null;
 let world;try{world=validateWorld(previous);}catch(e){fail(e.message);}const active=world.people[world.activeId];
 // Existing private backups may contain portraits copied from an old invite.
 // Keep them as historical nodes; only this browser's actual actor is owned.
 for(const p of Object.values(world.people)){validateName(p.name);p.external=p.id!==active.id;if(p.external){p.birth=null;p.scores=[];p.answers=[];}}
 return {world,personId:active.id};
}
async function enter(store,privateStore,owner,id,payload){
 const old=await binding(store,owner);if(old){const row=unpack(await store.read(graphKey(old.networkId)));if(row&&row.owners[old.personId]===owner)return snapshot(store,{...old,owner});return resumeEntry(store,privateStore,owner,id,payload,old);}
 const inviteCode=payload.inviteCode;
 let invitation=null;
 if(inviteCode){if(!validCode(inviteCode))fail('초대 링크를 다시 확인해주세요.');invitation=unpack(await store.read('invite:'+inviteCode));if(!invitation)fail('초대장을 찾지 못했습니다. 새 초대 링크를 받아주세요.',404);}
 else if(payload.legacyInviterId){invitation=unpack(await store.read('person:'+payload.legacyInviterId));if(!invitation)fail('이전 초대장입니다. 초대한 분에게 새 초대 링크를 받아주세요.',409);}
 const networkId=invitation?.networkId||id;
 // Bind before graph mutation so retries, two tabs and a lost HTTP response
 // cannot put the same browser into two separate invitation trees.
 const member=await createOnce(store,memberKey(owner),{networkId,personId:id});
 if(member.networkId!==networkId)return resumeEntry(store,privateStore,owner,id,payload,member);
 return resumeEntry(store,privateStore,owner,id,payload,member,invitation);
}
async function resumeEntry(store,privateStore,owner,id,payload,member,invitation=null){
 let row=await store.read(graphKey(member.networkId));
 if(!row){
  if(member.networkId!==id)fail('초대한 천하가 준비되지 않았습니다. 다시 시도해주세요.',409);
  const previous=unpack(await privateStore?.read(owner));
  const seed=seedWorld(previous,id);
  const world=seed?.world||newWorld();
  if(!seed){if(!payload.birth)fail('이름과 사주 정보를 입력해주세요.');try{const p=addPerson(world,{id,name:payload.name,gender:payload.gender,birth:payload.birth,type:0});world.activeId=p.id;}catch(e){fail(e.message);}}
  const personId=seed?.personId||id;
  await createOnce(store,graphKey(member.networkId),{world,owners:{[personId]:owner},invites:{[personId]:crypto.randomUUID()},receipts:{}});
  if(member.personId!==personId){const mr=await store.read(memberKey(owner));await store.write(memberKey(owner),{...member,personId},mr.revision);member={...member,personId};}
 }else{
  const graph=unpack(row);
  const owned=Object.entries(graph.owners).find(([,value])=>value===owner)?.[0];
  if(owned){member={...member,personId:owned};}
  else{
   if(!invitation){const code=payload.inviteCode;invitation=code?unpack(await store.read('invite:'+code)):payload.legacyInviterId?unpack(await store.read('person:'+payload.legacyInviterId)):null;}
   if(!invitation||invitation.networkId!==member.networkId)fail('입궐을 마치려면 같은 초대 링크로 다시 시도해주세요.',409);
   if(!payload.birth)fail('이름과 사주 정보를 입력해주세요.');
   const code=crypto.randomUUID();
   await updateGraph(store,member.networkId,g=>{
    if(g.owners[id]===owner)return {unchanged:true};
    if(g.world.people[id])fail('이미 등록된 인물입니다. 복구 링크를 확인해주세요.',409);
    if(!g.owners[invitation.personId])fail('초대한 인물의 연결을 확인해주세요.',409);
    try{addPerson(g.world,{id,name:payload.name,gender:payload.gender,birth:payload.birth,type:0,inviterId:invitation.personId});}catch(e){fail(e.message);}
    g.owners[id]=owner;g.invites[id]=code;
   });
  }
 }
 // Recover a partial registration after an interrupted response.
 const latest=unpack(await store.read(graphKey(member.networkId)));
 const personId=Object.entries(latest.owners).find(([,value])=>value===owner)?.[0];if(!personId)fail('입궐 기록을 확인하지 못했습니다.',409);
 const bound=await store.read(memberKey(owner));if(unpack(bound).personId!==personId)await store.write(memberKey(owner),{networkId:member.networkId,personId},bound.revision);
 member={networkId:member.networkId,personId,owner};
 await createOnce(store,'invite:'+latest.invites[personId],{networkId:member.networkId,personId});
 await createOnce(store,'person:'+personId,{networkId:member.networkId,personId});
 return snapshot(store,member);
}
export function applyNetworkCommand(world,actorId,cmd){
 const p=world.people[actorId];if(!p||p.external)fail('본인 인물로만 활동할 수 있습니다.',403);
 const target=cmd.targetId;
 try{switch(cmd.type){
  case 'bow':{const count=cmd.count??1;if(!Number.isInteger(count)||count<1||count>100)fail('경배 횟수를 확인해주세요.');for(let i=0;i<count;i++)bow(world,actorId,p.liegeId);break;}
  case 'grant':grant(world,actorId,target,cmd.rank);break;
  case 'loyal-appoint':appointLoyal(world,actorId,target);break;
  case 'loyal-dismiss':dismissLoyal(world,actorId,target);break;
  case 'subject-expel':if(!p.isKing||!world.people[target]||world.people[target].isKing||world.people[target].liegeId!==actorId)fail('왕은 자신의 직속 신하만 목록에서 삭제할 수 있습니다.',403);expelSubject(world,actorId,target);break;
  case 'house-role':assignHousehold(world,actorId,target,cmd.office);break;
  case 'reign-stay':chooseStay(world,actorId);break;
  case 'reign-independent':becomeKing(world,actorId);break;
  case 'shop-equip':royalShop(world,actorId,cmd.kind,cmd.itemId);break;
  case 'royal-nudge':royalNudge(world,actorId,target);break;
  case 'nudge-ack':acknowledgeNudge(world,actorId);break;
  case 'birth':if(typeof cmd.name!=='string'||!cmd.name.trim()||[...cmd.name].length>12||!['M','F'].includes(cmd.gender))fail('이름과 성별을 확인해주세요.');setBirth(world,actorId,cmd.birth,{name:cmd.name,gender:cmd.gender});break;
  case 'tutorial':if(!['king','subject'].includes(cmd.role))fail('안내 종류를 확인해주세요.');p.tutorialSeen[cmd.role]=true;break;
  case 'life-council-open':return openCouncil(world,actorId,cmd.agendaId).id;
  case 'life-council-custom-open':return openCouncil(world,actorId,cmd.agenda).id;
  case 'life-council-vote':voteCouncil(world,actorId,cmd.councilId,cmd.choice);break;
  case 'life-council-close':return closeCouncil(world,actorId,cmd.councilId)?.id;
  default:fail('지원하지 않는 활동입니다.');
 }}catch(e){if(e.status)throw e;fail(e.message);}
}
export async function handleNetwork(request,store,{privateStore}={}){
 try{
  const token=request.headers.get('authorization')?.replace(/^Bearer /,''),owner=await guestOwner(token),id=guestId(token);
  if(!owner)return json({error:'접속 정보를 확인해주세요.'},401);
  const member=await binding(store,owner);
  if(request.method==='GET'){
   if(!member)return json({world:null,shared:false,revision:0});
   const row=unpack(await store.read(graphKey(member.networkId)));
   if(!row||!Object.values(row.owners).includes(owner))return json({world:null,shared:false,revision:0,pending:true});
   const personId=Object.entries(row.owners).find(([,v])=>v===owner)[0];
   return json(await snapshot(store,{...member,personId,owner}));
  }
  if(request.method!=='POST')return json({error:'지원하지 않는 요청입니다.'},405);
  if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'게임에서 시작한 요청만 허용합니다.'},403);
  if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'JSON 요청이 필요합니다.'},415);
  const raw=await request.text();if(new TextEncoder().encode(raw).length>50000)return json({error:'요청이 너무 큽니다.'},413);
  let payload;try{payload=JSON.parse(raw);}catch{return json({error:'요청을 확인해주세요.'},400);}
  if(payload?.type==='register'){if(payload.name!==undefined){try{validateName(payload.name);}catch(e){fail(e.message);}}return json(await enter(store,privateStore,owner,id,payload));}
  if(!member)return json({error:'먼저 왕실에 입장해주세요.'},409);
  if(!validCode(payload?.opId))return json({error:'활동 번호를 확인해주세요.'},400);
  let resultId=null;
  await updateGraph(store,member.networkId,g=>{
   if(g.owners[member.personId]!==owner)fail('본인 인물로만 활동할 수 있습니다.',403);
   const receipts=g.receipts[owner]||[];const seen=receipts.find(r=>r.id===payload.opId);
   if(seen){resultId=seen.resultId;return {unchanged:true};}
   resultId=applyNetworkCommand(g.world,member.personId,payload)||null;
   g.receipts[owner]=[...receipts,{id:payload.opId,resultId}].slice(-256);
  });
  return json({...await snapshot(store,{...member,owner}),resultId});
 }catch(e){return json({error:e.status?e.message:'천하 저장소에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.'},e.status||503);}
}
