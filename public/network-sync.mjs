// Serialize this browser's commands. The server retries CAS against other players.
export function createNetworkSync({fetcher,onWorld=()=>{},onStatus=()=>{},storage=globalThis.localStorage}={}){
 let state=null,chain=Promise.resolve(),busy=0;
 const KEY='naegawang.network-outbox.v1';
 const scope=()=>state?.world?.activeId;
 async function request(method,payload){
  const r=await fetcher('/api/network',{method,headers:payload?{'Content-Type':'application/json'}:{},...(payload?{body:JSON.stringify(payload)}:{})});
  let data;try{data=await r.json();}catch{throw Error('천하의 응답을 읽지 못했습니다.');}
  if(!r.ok)throw Object.assign(Error(data.error||'천하에 연결하지 못했습니다.'),{status:r.status});return data;
 }
 function accept(data,notify=true){if(data.shared===true&&data.world){state=data;if(notify)onWorld(data);}return data;}
 function readQueue(){try{const x=JSON.parse(storage.getItem(KEY)||'[]');return Array.isArray(x)?x:[];}catch{return [];}}
 function writeQueue(q){storage.setItem(KEY,JSON.stringify(q));}
 async function drain(){
  let q=readQueue();for(const entry of q.filter(x=>x.actorId===scope())){
   try{const data=await request('POST',entry.command);accept(data);q=readQueue().filter(x=>x.command.opId!==entry.command.opId);writeQueue(q);}
   catch(e){if(e.status>=400&&e.status<500&&e.status!==409){writeQueue(readQueue().filter(x=>x.command.opId!==entry.command.opId));}throw e;}
  }
 }
 function serialized(fn){busy++;const job=chain.catch(()=>{}).then(fn);chain=job.finally(()=>{busy--;});chain.catch(()=>{});return job;}
 return {
  get active(){return !!state?.world;},get state(){return state;},get busy(){return busy>0;},get hasPending(){return readQueue().some(x=>x.actorId===scope());},
  async load(){return serialized(async()=>{const data=await request('GET');if(!data.shared)state=null;accept(data);if(data.shared&&data.world){await drain();onStatus('saved');}return state||data;});},
  register(payload){return serialized(async()=>{onStatus('saving');try{const data=await request('POST',{...payload,type:'register'});accept(data);onStatus('saved');return data;}catch(e){onStatus('error',e.message);throw e;}});},
  command(command){return serialized(async()=>{onStatus('saving');const cmd={...command,opId:crypto.randomUUID()};writeQueue([...readQueue(),{actorId:scope(),command:cmd}]);try{await drain();onStatus('saved');return state;}catch(e){onStatus('error',e.message);throw e;}});},
  async refresh(){if(busy)return state;return serialized(async()=>{try{await drain();const data=await request('GET');if(data.world&&(!state||data.revision>=state.revision))accept(data);onStatus('saved');return state;}catch(e){onStatus('error',e.message);throw e;}});},
  async flush(){await chain;return this.refresh();},
 };
}
