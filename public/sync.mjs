export function createSync({fetcher=globalThis.fetch,onStatus=()=>{},onConflict=()=>{},onSaved=()=>{},wait=350}={}){
 let revision=0,ready=false,pending=null,inflight=null,timer=null,paused=false,status='loading';
 const notify=(s,detail={})=>{status=s;onStatus(s,detail);};
 async function request(method,data){const r=await fetcher('/api/world',{method,credentials:'same-origin',cache:'no-store',keepalive:method==='PUT'&&JSON.stringify(data||{}).length<50000,headers:method==='GET'?{}:{'Content-Type':'application/json'},...(data?{body:JSON.stringify(data)}:{})});let body;try{body=await r.json();}catch{throw Error('서버 응답을 읽을 수 없습니다.');}if(!r.ok){const e=Error(body.error||'왕실 저장에 실패했습니다.');e.status=r.status;e.code=body.code;throw e;}return body;}
 async function load(){notify('loading');try{const data=await request('GET');revision=data.revision;ready=true;paused=false;pending=null;notify('saved',{updatedAt:data.updatedAt});return data;}catch(e){notify(e.status===401?'signin':'error',{message:e.message});throw e;}}
 function setRevision(v){revision=v;ready=true;paused=false;}
 function schedule(world){pending=JSON.parse(JSON.stringify(world));if(!ready||paused){notify(paused?'conflict':'pending');return;}notify('pending');clearTimeout(timer);timer=setTimeout(()=>flush().catch(()=>{}),wait);}
 async function flush(){clearTimeout(timer);if(inflight){await inflight;if(pending&&!paused)return flush();return;}if(!pending)return;if(!ready||paused)throw Error(paused?'다른 기기의 최신 기록을 먼저 불러오세요.':'서버 저장 연결을 먼저 확인해주세요.');
  const data=pending;pending=null;notify('saving');inflight=(async()=>{try{const r=await request('PUT',{revision,world:data});revision=r.revision;onSaved(r,data);notify('saved',{updatedAt:r.updatedAt});}catch(e){if(!pending)pending=data;if(e.status===409){paused=true;notify('conflict');onConflict(e);}else notify(e.status===401?'signin':'error',{message:e.message});throw e;}finally{inflight=null;}})();await inflight;if(pending&&!paused)return flush();
 }
 async function remove(){await flush();const r=await request('DELETE',{revision});revision=0;pending=null;notify('saved');return r;}
 return {load,schedule,flush,setRevision,remove,pause(){paused=true;notify('conflict');},get revision(){return revision;},get status(){return status;},get ready(){return ready;},get hasPending(){return !!pending;}};
}
