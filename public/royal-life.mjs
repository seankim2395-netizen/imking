import {COUNCIL_AGENDAS,NEWS_COPY} from './royal-content.mjs';
export const MAX_NEWS=200,MAX_COUNCILS=60;
export const COUNCIL_LIMITS={question:100,answer:60,minAnswers:2,maxAnswers:6};
export function validateCustomAgenda(raw){
 const clean=(value,max,label)=>{if(typeof value!=='string')throw Error(label+'을 입력해주세요.');const text=value.normalize('NFC').trim();if(!text||text.length>max||/[\p{Cc}\p{Cf}]/u.test(text))throw Error(label+'은 1~'+max+'자로 입력해주세요.');return text;};
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('질문과 답변 선택지를 입력해주세요.');
 const title=clean(raw.title,COUNCIL_LIMITS.question,'질문');
 if(!Array.isArray(raw.options)||raw.options.length<COUNCIL_LIMITS.minAnswers||raw.options.length>COUNCIL_LIMITS.maxAnswers)throw Error('답변 선택지는 2~6개로 작성해주세요.');
 const options=raw.options.map(s=>clean(s,COUNCIL_LIMITS.answer,'답변 선택지'));
 if(new Set(options.map(s=>s.normalize('NFKC').replace(/\s+/gu,'').toLowerCase())).size!==options.length)throw Error('답변 선택지는 서로 다르게 작성해주세요.');
 return {title,options};
}
export function councilAgenda(c){
 if(c?.agendaId==='custom'){const agenda=validateCustomAgenda(c.customAgenda);return {...agenda,category:'직접 만든 설문',remarks:agenda.options.map(s=>'「'+s+'」 의견을 아뢰었습니다.')};}
 return COUNCIL_AGENDAS.find(a=>a.id===c?.agendaId);
}
export const NEWS_SECTIONS={founding:'개국',arrival:'입궐',household:'집안',loyal:'인사',dismiss:'인사',independence:'외교',favor:'총애',bow:'경배','royal-bow':'경배',frame:'치장',decor:'경제',council:'어전회의'};
const label=p=>p.name+(p.isKing?(p.gender==='F'?'여왕':'왕'):'');
export function countryOf(db,id){let p=db.people[id];const seen=new Set();while(p&&!p.isKing&&!seen.has(p.id)){seen.add(p.id);p=db.people[p.liegeId];}return p?.isKing?p:null;}
const setup=db=>{db.news??=[];db.councils??=[];db.lifeSeq??=0;};
const nextId=(db,prefix)=>prefix+'-'+(++db.lifeSeq);
const hash=s=>[...s].reduce((v,c)=>(v*31+c.charCodeAt(0))>>>0,0);
const fill=(s,values)=>s.replace(/\{(\w+)\}/g,(_,key)=>String(values[key]??''));
function portrait(db,p){const king=countryOf(db,p.id);return {id:p.id,name:p.name,gender:p.gender,type:p.type,isKing:p.isKing,dependent:!p.isKing&&!!p.liegeId&&!db.people[p.liegeId]?.isKing,frame:king?.frame||'plain',decor:king?.decor||'plain'};}
export function publishNews(db,kind,data={},at=Date.now()){
 setup(db);const king=db.people[data.kingId],actor=db.people[data.actorId],target=db.people[data.targetId]||actor||king;if(!king||!target||!Object.hasOwn(NEWS_SECTIONS,kind))return null;
 const key=data.key||[kind,king.id,target.id,data.count??data.item??''].join(':');if(db.news.some(x=>x.key===key)||db.news.length>=MAX_NEWS)return null;
 const seq=nextId(db,'news'),values={king:label(king),name:label(target),value:data.count??'',item:data.item||''};let headline,body,quote,council=null;
 if(kind==='council'){const c=data.council,agenda=councilAgenda(c),counts=agenda.options.map((_,i)=>Object.values(c.votes).filter(v=>v===i).length),total=counts.reduce((a,b)=>a+b,0),max=Math.max(...counts),winners=counts.map((n,i)=>n===max?i:-1).filter(i=>i>=0),result=winners.map(i=>agenda.options[i]).join(' · ');headline=`어전회의 결론, 「${result.length>140?result.slice(0,139)+'…':result}」 ${winners.length>1?'공동 최다표':'최다표'}`;body=`「${agenda.title}」 안건에 ${total}명이 참여했다. ${result} ${max}표. 투표는 금화·관직·총애를 자동으로 바꾸지 않는다.`;quote=winners.length===1?agenda.remarks[winners[0]]:'의견은 갈렸으나 회의록은 하나로 남겼다.';council={title:agenda.title,options:[...agenda.options],counts,total,kingVoted:Object.hasOwn(c.votes,king.id)};
 }else{const options=NEWS_COPY[kind],copy=options[hash(key)%options.length];[headline,body,quote]=copy.map(s=>fill(s,values));}
 const portraits=[king,target].filter((p,i,list)=>list.findIndex(x=>x.id===p.id)===i).map(p=>portrait(db,p));
 const paper={id:seq,key,kind,at,countryIds:[...new Set([king.id,data.relatedKingId].filter(id=>db.people[id]))],headline,body,quote,portraits,stats:{bows:king.totalBows||0,gold:king.gold||0,network:Object.values(db.people).filter(p=>p.inviterId===king.id).length},council};db.news.unshift(paper);return paper;
}
export function recordBowMilestones(db,p,king,before,now){
 if([1,10,50,100,300,500,1000].includes(p.bows))publishNews(db,'bow',{kingId:king.id,targetId:p.id,count:p.bows},now);
 for(const count of [100,500,1000,3000,10000])if(before<count&&king.totalBows>=count)publishNews(db,'royal-bow',{kingId:king.id,count},now);
}
export function newsFor(db,personId){const king=countryOf(db,personId);return (db.news||[]).filter(x=>x.countryIds.includes(king?.id)||x.portraits.some(p=>p.id===personId));}
export function openCouncil(db,kingId,agendaId,now=Date.now()){
 setup(db);const king=db.people[kingId];if(!king?.isKing||king.external)throw Error('자기 나라의 왕만 어전회의를 열 수 있습니다.');const customAgenda=typeof agendaId==='object'?validateCustomAgenda(agendaId):null;if(!customAgenda&&!COUNCIL_AGENDAS.some(a=>a.id===agendaId))throw Error('회의 안건을 확인해주세요.');if(db.councils.some(c=>c.kingId===kingId&&c.closedAt===null))throw Error('열려 있는 회의를 먼저 마감해주세요.');
 if(db.councils.length>=MAX_COUNCILS){const i=db.councils.findLastIndex(c=>c.closedAt!==null&&c.paperId&&db.news.some(n=>n.id===c.paperId));if(i<0)throw Error('회의 보관함이 가득 찼습니다. 기존 회의 결과를 먼저 확인해주세요.');db.councils.splice(i,1);}
 const eligible=[kingId,...Object.values(db.people).filter(p=>!p.isKing&&!p.external&&p.liegeId===kingId).map(p=>p.id)];const council={id:nextId(db,'council'),kingId,agendaId:customAgenda?'custom':agendaId,...(customAgenda?{customAgenda}:{}),openedAt:now,closedAt:null,eligible,votes:{},paperId:null};db.councils.unshift(council);return council;
}
export function canVoteCouncil(db,c,actorId){const p=db.people[actorId];return !!p&&!p.external&&c?.closedAt===null&&c.eligible.includes(actorId)&&(actorId===c.kingId||!p.isKing&&p.liegeId===c.kingId);}
export function voteCouncil(db,actorId,councilId,choice){const c=(db.councils||[]).find(c=>c.id===councilId),agenda=councilAgenda(c);if(!canVoteCouncil(db,c,actorId))throw Error('이 회의에 참여할 수 있는 왕과 직속 신하만 투표할 수 있습니다.');if(!Number.isInteger(choice)||!agenda.options[choice])throw Error('선택지를 확인해주세요.');c.votes[actorId]=choice;return c;}
export function closeCouncil(db,actorId,councilId,now=Date.now()){const c=(db.councils||[]).find(c=>c.id===councilId);if(!c||c.kingId!==actorId||!db.people[actorId]?.isKing||c.closedAt!==null)throw Error('회의를 연 왕만 마감할 수 있습니다.');if(!Object.keys(c.votes).length)throw Error('한 표 이상 모이면 결과를 발행할 수 있습니다.');const paper=publishNews(db,'council',{kingId:c.kingId,council:c,key:'council:'+c.id},now);c.closedAt=now;c.paperId=paper?.id||null;db.events.unshift({text:'어전회의 마감 · '+councilAgenda(c).title,at:now});db.events=db.events.slice(0,60);return paper;}
export function relationshipTitles(db,aId,bId){const a=db.people[aId],b=db.people[bId];if(!a||!b||aId===bId)return [];const out=[],add=(name,reason)=>out.push({name,reason});let parent,child;if(b.inviterId===aId){parent=a;child=b;}else if(a.inviterId===bId){parent=b;child=a;}
 if(parent&&child){if(child.isKing&&child.wasLoyal)add('크게 키웠더니 옆 나라','충신으로 함께한 뒤 자기 나라를 세웠습니다.');if(child.favorCount>=2)add('누가 봐도 낙하산','왕의 특별 총애를 두 번 이상 받았습니다.');if(child.bows>=300)add('무릎으로 맺은 인연','두 사람 사이에 경배 300회 이상이 쌓였습니다.');if((parent.loyalIds||[]).includes(child.id))add('전하의 오른팔','왕이 직접 지명한 두 충신 중 한 자리입니다.');if(child.isKing)add('각자 왕관, 같은 시작','독립해도 초대한 인연은 이어집니다.');const first=Object.values(db.people).filter(p=>p.inviterId===parent.id).sort((p,q)=>p.joined-q.joined)[0];if(first?.id===child.id)add('개국 때부터 알던 사이','초대의 첫 장을 함께 열었습니다.');if(child.bows>=100)add('절로 친해진 사이','경배 100회 이상을 함께 기록했습니다.');if(!parent.isKing&&!child.isKing)add('밥줄로 이어진 사이','한 집안의 가장과 직속 식솔로 이어져 있습니다.');if(child.summons?.count>=3)add('전교까지 익숙한 사이','경배 독촉 전교도 세 번 이상 주고받았습니다.');if(child.bows>=1)add('굽신부터 튼 사이','처음 올린 경배가 인연의 기록으로 남았습니다.');if(!out.length)add('초대장으로 맺은 인연','한 번의 초대가 두 사람을 이어주었습니다.');
 }else if(a.inviterId&&a.inviterId===b.inviterId)add(a.isKing&&b.isKing?'옆 나라 동기':'한솥밥 동기','같은 초대자로부터 각자의 이야기가 시작됐습니다.');else add('지도에서 만난 인연','서로의 나라를 구경하며 가까워질 수 있습니다.');return out.slice(0,3);
}
export function kingdomReputation(db,kingId){const k=db.people[kingId];if(!k?.isKing)return [];const all=Object.values(db.people),sub=all.filter(p=>!p.isKing&&p.liegeId===kingId),ind=all.filter(p=>p.isKing&&p.inviterId===kingId),fav=sub.filter(p=>p.favorCount>0||p.grantedRank>0),loyal=(k.loyalIds||[]).filter(id=>sub.some(p=>p.id===id)),polls=(db.councils||[]).filter(c=>c.kingId===kingId&&c.closedAt!==null),out=[];const add=(name,reason)=>out.push({name,reason});
 if(ind.length>=2)add('인재 배출 명문국',`독립한 군주 ${ind.length}명. 잘 키워 옆 나라로 보냈습니다.`);
 if(loyal.length===2&&sub.length<=3)add('세 사람이 운영하는 조정',`왕과 충신 두 명이 중심인 ${sub.length}신하의 작은 조정입니다.`);
 if(sub.length>=2&&fav.length>=2&&fav.length/sub.length>=.5)add('인맥이 따뜻한 나라',`직속 신하 ${sub.length}명 중 ${fav.length}명이 특별 총애를 받았습니다.`);
 if(k.gold>=300&&k.decor==='plain')add('국고 문단속 철저국',`소박한 편전에 금화 ${k.gold.toLocaleString('ko-KR')}개를 보관 중입니다.`);
 if(k.decor==='palace')add('보여주는 행정의 나라','황금 대전을 장만해 취향을 천하에 공개했습니다.');
 if(k.totalBows>=1000)add('무릎 소리 끊이지 않는 나라',`누적 경배 ${k.totalBows.toLocaleString('ko-KR')}회가 모였습니다.`);
 if(polls.length>=3)add('말이 많아도 회의는 하는 나라',`어전회의 ${polls.length}건의 결론을 남겼습니다.`);
 if(sub.length>=5&&sub.reduce((n,p)=>n+p.bows,0)<sub.length*10)add('입궐은 북적, 경배는 잠잠',`신하 ${sub.length}명에 비해 경배 장부는 아직 소박합니다.`);
 if(!sub.length&&!ind.length)add('옥좌부터 장만한 나라','첫 인연이 들어올 자리를 넉넉히 비워뒀습니다.');
 if(!out.length){const names=['휴식도 국정인 나라','잔치 명분을 찾는 나라','한 푼의 행방을 묻는 나라','출발부터 하고 보는 나라','서로의 표정을 읽는 나라','한 번 더 확인하는 나라','등장부터 신경 쓰는 나라','밥부터 챙기는 나라','준비 회의가 준비된 나라','기준이 분명한 나라'];add(names[k.type]||names[0],'현재 군주의 사주 캐릭터로 붙인 첫 평판입니다. 기록이 쌓이면 새로운 평판이 앞에 붙습니다.');}return out.slice(0,3);
}
// Whitelisted persistence boundary: stored newspaper portraits never include a
// birth date, chart, email, session token, mutable person reference or image URL.
export function validateLife(raw,people){
 const fail=()=>{throw Error('왕실신문 또는 어전회의 기록이 올바르지 않습니다.');};
 const id=s=>typeof s==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(s)&&!['__proto__','constructor','prototype'].includes(s),text=(s,max)=>{if(typeof s!=='string'||s.length>max)fail();return s;},integer=(v,max=999999999)=>{if(!Number.isSafeInteger(v)||v<0||v>max)fail();return v;},time=v=>{if(!Number.isFinite(v)||v<0)fail();return v;};
 const news=raw.news===undefined?[]:raw.news,councils=raw.councils===undefined?[]:raw.councils,lifeSeq=raw.lifeSeq===undefined?0:raw.lifeSeq;if(!Array.isArray(news)||news.length>MAX_NEWS||!Array.isArray(councils)||councils.length>MAX_COUNCILS)fail();integer(lifeSeq);const sequence=new Set();
 function unique(value,prefix){if(!id(value)||!new RegExp('^'+prefix+'-[1-9][0-9]*$').test(value)||sequence.has(value)||Number(value.split('-')[1])>lifeSeq)fail();sequence.add(value);return value;}
 const keys=new Set(),papers=news.map(n=>{if(!n||!Object.hasOwn(NEWS_SECTIONS,n.kind)||keys.has(n.key)||!Array.isArray(n.countryIds)||n.countryIds.length<1||n.countryIds.length>2||new Set(n.countryIds).size!==n.countryIds.length||n.countryIds.some(x=>!people[x]?.isKing)||!Array.isArray(n.portraits)||!n.portraits.length||n.portraits.length>2)fail();keys.add(n.key);const portraits=n.portraits.map(p=>{if(!p||!id(p.id)||!people[p.id]||!['M','F'].includes(p.gender)||!Number.isInteger(p.type)||p.type<0||p.type>9||typeof p.isKing!=='boolean'||typeof p.dependent!=='boolean'||p.isKing&&p.dependent||!['plain','brass','jade','dragon'].includes(p.frame)||!['plain','lantern','screen','palace'].includes(p.decor))fail();return {id:p.id,name:text(p.name,24),gender:p.gender,type:p.type,isKing:p.isKing,dependent:p.dependent,frame:p.frame,decor:p.decor};});if(new Set(portraits.map(p=>p.id)).size!==portraits.length)fail();if(!n.stats||!Number.isFinite(n.stats.bows)||n.stats.bows<0||n.stats.bows>999999999||!Number.isInteger(n.stats.bows*2))fail();let council=null;if(n.kind==='council'){const c=n.council;if(!c||!Array.isArray(c.options)||c.options.length<2||c.options.length>6||!Array.isArray(c.counts)||c.counts.length!==c.options.length||typeof c.kingVoted!=='boolean')fail();const counts=c.counts.map(v=>integer(v,500));if(counts.reduce((a,b)=>a+b,0)!==c.total||c.total<1||c.total>500)fail();council={title:text(c.title,100),options:c.options.map(s=>text(s,60)),counts,total:c.total,kingVoted:c.kingVoted};}else if(n.council!=null)fail();return {id:unique(n.id,'news'),key:text(n.key,240),kind:n.kind,at:time(n.at),countryIds:[...n.countryIds],headline:text(n.headline,200),body:text(n.body,700),quote:text(n.quote,200),portraits,stats:{bows:n.stats.bows,gold:integer(n.stats.gold),network:integer(n.stats.network,500)},council};});
 const active=new Set(),meetings=councils.map(c=>{
  if(!c||!people[c.kingId]?.isKing)fail();
  let agenda;try{agenda=councilAgenda(c);}catch{fail();}if(!agenda||c.agendaId!=='custom'&&c.customAgenda!=null)fail();
  if(!Array.isArray(c.eligible)||!c.eligible.includes(c.kingId)||c.eligible.length>500||new Set(c.eligible).size!==c.eligible.length||c.eligible.some(x=>!id(x)||!people[x])||!c.votes||typeof c.votes!=='object'||Array.isArray(c.votes))fail();
  if(c.closedAt===null){if(c.paperId!==null||active.has(c.kingId))fail();active.add(c.kingId);}else{time(c.closedAt);if(c.closedAt<c.openedAt||!Object.keys(c.votes).length)fail();}
  const votes={};for(const [person,choice] of Object.entries(c.votes)){if(!c.eligible.includes(person))fail();votes[person]=integer(choice,agenda.options.length-1);}
  if(c.paperId!==null){const p=papers.find(p=>p.id===c.paperId&&p.kind==='council'&&p.key==='council:'+c.id&&p.countryIds.includes(c.kingId));if(!p||p.at!==c.closedAt||p.council.title!==agenda.title||JSON.stringify(p.council.options)!==JSON.stringify(agenda.options)||p.council.kingVoted!==Object.hasOwn(votes,c.kingId)||p.council.counts.some((n,i)=>n!==Object.values(votes).filter(v=>v===i).length))fail();}
  return {id:unique(c.id,'council'),kingId:c.kingId,agendaId:c.agendaId,...(c.agendaId==='custom'?{customAgenda:{title:agenda.title,options:[...agenda.options]}}:{}),openedAt:time(c.openedAt),closedAt:c.closedAt,eligible:[...c.eligible],votes,paperId:c.paperId};
 });return {news:papers,councils:meetings,lifeSeq};
}
