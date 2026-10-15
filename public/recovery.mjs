import {validateLife} from './royal-life.mjs';
import {analyzeBirth,validChart} from './saju.mjs';
import {TYPES,OFFICES,RANKS,temperamentOffice,applyDestiny,FRAMES,DECOR} from './model.mjs';
const MAX_JSON=512000,MAX_TOKEN=120000,MAX_PEOPLE=500;
const validId=id=>typeof id==='string'&&id.length>0&&id.length<=80&&/^[a-zA-Z0-9_-]+$/.test(id)&&!['__proto__','constructor','prototype'].includes(id);
const fail=()=>{throw Error('복구 정보가 손상되었거나 지원하지 않는 형식입니다. 원본 복구 링크를 다시 확인해주세요.');};
export function validateWorld(raw){
 if(!raw||raw.version!==1||!raw.people||typeof raw.people!=='object'||Array.isArray(raw.people)||!Array.isArray(raw.events))fail();
 const entries=Object.entries(raw.people);if(!entries.length||entries.length>MAX_PEOPLE||!validId(raw.activeId))fail();
 const people=Object.create(null);
 for(const [id,p] of entries){
  if(!validId(id)||!p||p.id!==id||typeof p.name!=='string'||!p.name.trim()||[...p.name].length>12||!['M','F'].includes(p.gender)||!Number.isInteger(p.type)||!TYPES[p.type]||typeof p.isKing!=='boolean'||!Number.isInteger(p.bows)||p.bows<0||p.bows>999999||!Number.isInteger(p.grantedRank)||p.grantedRank<0||p.grantedRank>=RANKS.length||!Number.isInteger(p.office)||!OFFICES[p.office]||!Number.isFinite(p.joined)||p.joined<0)fail();
  if(p.loyalIds!==undefined&&(!Array.isArray(p.loyalIds)||p.loyalIds.length>2||new Set(p.loyalIds).size!==p.loyalIds.length||p.loyalIds.some(id=>!validId(id))))fail();
  const scores=p.scores??[],answers=p.answers??[];
  if(!Array.isArray(scores)||![0,5].includes(scores.length)||scores.some(x=>!Number.isFinite(x)||x<0||x>100)||!Array.isArray(answers)||![0,10].includes(answers.length)||answers.some(x=>!Number.isInteger(x)||x<0||x>3))fail();
  for(const ref of [p.inviterId,p.liegeId])if(ref!==null&&!validId(ref))fail();
  const bounded=(value,fallback,max=999999999)=>{const v=value===undefined?fallback:value;if(!Number.isSafeInteger(v)||v<0||v>max)fail();return v;};
  const oldBows=entries.reduce((sum,[,q])=>sum+(!q?.isKing&&q?.liegeId===id&&Number.isInteger(q.bows)?q.bows:0),0);
  const half=(v,fallback,max=999999999)=>{v=v===undefined?fallback:v;if(!Number.isFinite(v)||v<0||v>max||!Number.isInteger(v*2))fail();return v;};
  const totalBows=half(p.totalBows,p.isKing?oldBows:0),gold=bounded(p.gold,p.isKing?Math.floor(oldBows/10):0);
  const cosmetic=(catalog,owned,selected)=>{const ids=catalog.map(x=>x.id),list=owned===undefined?['plain']:owned,pick=selected===undefined?'plain':selected;if(!Array.isArray(list)||list.length>ids.length||new Set(list).size!==list.length||!list.includes('plain')||list.some(x=>!ids.includes(x))||!list.includes(pick))fail();return {owned:[...list],selected:pick};};
  const frame=cosmetic(FRAMES,p.ownedFrames,p.frame),decor=cosmetic(DECOR,p.ownedDecor,p.decor);
  if(p.recruitChoice!==undefined&&!['stay','pending'].includes(p.recruitChoice))fail();
  const tributeDay=p.tributeDay??'';if(typeof tributeDay!=='string'||(tributeDay!==''&&!/^\d{4}-\d{2}-\d{2}$/.test(tributeDay)))fail();
  let summons=null;if(p.summons!=null){const q=p.summons;if(!validId(q.fromId)||!Number.isFinite(q.at)||q.at<0||typeof q.read!=='boolean')fail();summons={fromId:q.fromId,at:q.at,count:bounded(q.count,1,999999),read:q.read};if(summons.count<1)fail();}
  let natal=null;if(p.birth!=null){try{natal=analyzeBirth(p.birth,p.gender);}catch{fail();}}
  const chart=natal?.chart||p.chart||null;if(chart&&!validChart(chart))fail();

  const seen=p.tutorialSeen;if(seen!==undefined&&(!seen||typeof seen!=='object'||Array.isArray(seen)||typeof seen.subject!=='boolean'||typeof seen.king!=='boolean'))fail();
  const tutorialSeen={subject:seen?.subject??false,king:seen?.king??false};
  if(p.wasLoyal!==undefined&&typeof p.wasLoyal!=='boolean')fail();
  const peakNetwork=bounded(p.peakNetwork,0,500);
  people[id]={id,name:p.name.trim(),gender:p.gender,type:natal?.type??p.type,birth:natal?.birth||null,chart:chart?{ds:chart.ds,db:chart.db,cnt:[...chart.cnt],unknownTime:chart.unknownTime,boundary:chart.boundary}:null,inheritedBows:half(p.inheritedBows,0),peakNetwork,isKing:p.isKing,bows:p.bows,grantedRank:p.grantedRank,office:temperamentOffice(natal?.type??p.type,chart),officeSource:'temperament',loyalIds:p.loyalIds?[...p.loyalIds]:[],houseOffice:bounded(p.houseOffice,0,3),recruitChoice:p.recruitChoice??'stay',gold,totalBows,tributeRemainder:half(p.tributeRemainder,p.totalBows===undefined&&p.isKing?oldBows%10:0,9.5),tributeDay,tributeToday:bounded(p.tributeToday,0,100),frame:frame.selected,ownedFrames:frame.owned,decor:decor.selected,ownedDecor:decor.owned,summons,favorCount:bounded(p.favorCount,p.grantedRank>0?1:0),wasLoyal:p.wasLoyal??false,tutorialSeen,joined:p.joined,scores:natal?[...natal.scores]:[...scores],answers:natal?[]:[...answers],inviterId:p.inviterId,liegeId:p.liegeId,external:!!p.external};applyDestiny(people[id]);
 }
 if(!people[raw.activeId])fail();
 for(const p of Object.values(people)){
  p.peakNetwork=Math.max(p.peakNetwork,Object.values(people).filter(q=>q.inviterId===p.id).length);if(p.inheritedBows>p.totalBows)fail();
  if(p.inviterId&&!people[p.inviterId]||p.isKing&&p.liegeId!==null||!p.isKing&&(!p.liegeId||!people[p.liegeId]||p.inviterId!==p.liegeId))fail();
  if(!p.isKing&&p.loyalIds.length)fail();for(const id of p.loyalIds){const q=people[id];if(!q||q.isKing||q.liegeId!==p.id)fail();}
  if(p.summons&&(!people[p.summons.fromId]?.isKing||p.liegeId!==p.summons.fromId||p.isKing))fail();
  const seen=new Set([p.id]);let a=p;while(a.inviterId){if(seen.has(a.inviterId))fail();seen.add(a.inviterId);a=people[a.inviterId];if(!a)fail();}
 }
 const events=raw.events.slice(0,60).map(e=>{if(!e||typeof e.text!=='string'||e.text.length>240||!Number.isFinite(e.at)||e.at<0)fail();return {text:e.text,at:e.at};});
 return {version:1,people,activeId:raw.activeId,events,...validateLife(raw,people)};
}
const b64=bytes=>{let s='';for(let i=0;i<bytes.length;i+=8000)s+=String.fromCharCode(...bytes.subarray(i,i+8000));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');};
const unb64=s=>{if(!/^[A-Za-z0-9_-]+$/.test(s)||s.length>MAX_TOKEN)fail();try{return Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));}catch{fail();}};
async function readBounded(stream){const reader=stream.getReader(),chunks=[];let total=0;try{for(;;){const {value,done}=await reader.read();if(done)break;total+=value.length;if(total>MAX_JSON){await reader.cancel();throw Error('복구 정보가 너무 큽니다.');}chunks.push(value);}}finally{reader.releaseLock();}const out=new Uint8Array(total);let at=0;for(const c of chunks){out.set(c,at);at+=c.length;}return out;}
export function makeBackup(world,now=Date.now()){return {format:'naegawang-backup',version:2,savedAt:now,world:validateWorld(world)};}
export async function makeRecoveryLink(world,base,{compress=true,now=Date.now()}={}){
 const packet=makeBackup(world,now),bytes=new TextEncoder().encode(JSON.stringify(packet));if(bytes.length>MAX_JSON)throw Error('기록이 많습니다. 백업 파일로 보관해주세요.');
 let data=bytes,mode='j';if(compress&&typeof CompressionStream==='function'){data=new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer());mode='z';}
 const token='NGW2.'+mode+'.'+b64(data);if(token.length>MAX_TOKEN)throw Error('복구 링크가 너무 깁니다. 백업 파일로 보관해주세요.');
 const u=new URL(base);u.search='';u.hash='restore='+token;return {url:u.href,packet,length:u.href.length};
}
export async function readRecovery(input){
 if(typeof input!=='string'||input.length>MAX_JSON*2)fail();let text=input.trim(),packet;
 if(text.startsWith('{')){if(new TextEncoder().encode(text).length>MAX_JSON)fail();try{packet=JSON.parse(text);}catch{fail();}}
 else {let token=text;if(!text.startsWith('NGW2.')){try{token=new URL(text).hash.slice(1);token=new URLSearchParams(token).get('restore');}catch{fail();}}if(typeof token!=='string'||token.length>MAX_TOKEN)fail();const m=token.match(/^NGW2\.([jz])\.([A-Za-z0-9_-]+)$/);if(!m)fail();let bytes=unb64(m[2]);if(m[1]==='z'){if(typeof DecompressionStream!=='function')throw Error('이 브라우저는 압축 복구를 지원하지 않습니다. 최신 브라우저에서 열거나 백업 파일을 사용해주세요.');try{bytes=await readBounded(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate')));}catch{fail();}}if(bytes.length>MAX_JSON)fail();try{packet=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{fail();}}
 if(!packet||packet.format!=='naegawang-backup'||packet.version!==2||!Number.isFinite(packet.savedAt)||packet.savedAt<0)fail();return {...packet,world:validateWorld(packet.world)};
}
