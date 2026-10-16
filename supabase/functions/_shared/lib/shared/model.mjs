import {validateName} from './name-policy.mjs';
import {publishNews,recordBowMilestones,countryOf} from './royal-life.mjs?v=20261016-custom-surveys';
import {analyzeBirth,royalTypeFromChart,validChart} from './saju.mjs';
// Pure world rules; snapshots are persisted per owner account through Sites D1.
export const TYPES = [
 {id:'lazy',name:'누워서 다스리는 군주',short:'드러눕군',tag:'할 일은 신하에게, 평화는 과인에게.',quote:'급한 일이더냐? 누워서도 들을 수 있느니라.',desc:'평온한 일상과 나만의 속도가 소중한 군주. 재촉에는 약하지만 편안한 분위기를 만드는 데는 일가견이 있습니다.',p:[25,55,10,65,40],color:'#587567'},
 {id:'party',name:'잔치부터 여는 군주',short:'흥폭발군',tag:'국정은 내일, 오늘은 한 잔.',quote:'백성은 모르겠고, 일단 다들 모여보거라.',desc:'사람이 모이면 에너지가 살아나는 군주. 어색한 조정에도 웃음과 이야깃거리를 불러옵니다.',p:[100,65,35,65,60],color:'#a34836'},
 {id:'treasury',name:'국고 지키는 군주',short:'짠돌군',tag:'과인의 지갑에는 태평성대가 없다.',quote:'그것을 꼭 나라 돈으로 사야 하느냐?',desc:'충동보다 실속을 챙기는 군주. 작은 낭비도 지나치지 않고, 나라 살림을 야무지게 지킵니다.',p:[35,40,90,65,10],color:'#9d7d36'},
 {id:'bold',name:'일단 지르는 군주',short:'직진군',tag:'계획은 출발하고 세우는 것.',quote:'일단 가거라. 이유는 가면서 생각하자.',desc:'결정 앞에서 오래 머무르지 않는 군주. 새로운 기회가 보이면 직접 먼저 움직입니다.',p:[70,40,35,95,85],color:'#a44932'},
 {id:'people',name:'눈치 보는 군주',short:'눈치군',tag:'왕인데, 왜 과인이 눈치를 보느냐.',quote:'과인은 괜찮다. 그대들은 정말 괜찮으냐?',desc:'다른 사람의 반응과 분위기를 세심하게 살피는 군주. 결정은 조금 늦어도 조정의 표정을 놓치지 않습니다.',p:[35,80,45,10,40],color:'#6c7b6b'},
 {id:'suspicious',name:'의심 많은 군주',short:'궁예군',tag:'지금 누가 마구니 소리를 내었는가.',quote:'그 말, 칭찬이냐? 돌려 말한 것이냐?',desc:'말의 이면과 놓친 조건을 한 번 더 살피는 군주. 납득할 만한 설명이 있어야 마음을 놓습니다.',p:[25,10,65,15,55],color:'#6d5a78'},
 {id:'vain',name:'폼에 사는 군주',short:'멋부림군',tag:'나라가 작아도, 등장만큼은 성대하게.',quote:'과인의 업적보다 오늘의 착장을 기록하라.',desc:'나만의 취향과 표현을 즐기는 군주. 평범한 순간에도 분위기와 개성을 더합니다.',p:[90,45,45,55,100],color:'#9c5570'},
 {id:'caring',name:'백성 챙기는 군주',short:'다정군',tag:'반역은 나중에 하고, 밥부터 먹거라.',quote:'그대 밥은 먹었느냐? 그것부터 아뢰어라.',desc:'사람의 마음과 일상을 먼저 챙기는 군주. 조언보다 먼저 편을 들어주고 따뜻한 자리를 내어줍니다.',p:[50,100,55,70,40],color:'#4e7969'},
 {id:'planner',name:'계획만 세우는 군주',short:'계획군',tag:'계획의 계획을 세우는 중이다.',quote:'즉흥적으로 하자. 즉흥 일정표를 가져오라.',desc:'순서와 준비가 있어야 마음이 놓이는 군주. 빈틈을 잘 찾지만 생각이 길어질 때도 있습니다.',p:[35,50,100,25,65],color:'#4e687d'},
 {id:'stubborn',name:'아무튼 내 말이 맞는 군주',short:'고집군',tag:'경청하였다. 물론 과인 뜻대로 한다.',quote:'반대 의견도 듣겠다. 듣기만 하겠다.',desc:'자신만의 기준이 분명한 군주. 남의 말에 쉽게 흔들리지 않고 선택한 방향을 지켜갑니다.',p:[65,5,70,100,25],color:'#8b493d'}
];
export const AXES=['사교','다정함','계획','평정심','상상력'];
export const QUESTIONS=[
 ['궁궐 잔치가 시작되었다. 과인은?',0,1,['첫 잔부터 건배사를 맡는다','친한 사람들 사이에 앉는다','구석에서 조용히 구경한다','잔치 끝나면 알려달라고 한다']],
 ['신하가 실수하고 풀이 죽었다.',1,1,['괜찮다며 밥부터 먹인다','사정을 먼저 들어본다','다음부터 조심하라고 한다','잘못한 일은 정확히 짚는다']],
 ['내일 갑자기 여행을 떠나자 한다.',2,1,['숙소·동선·식당부터 정한다','큰 일정 정도는 잡는다','숙소만 있으면 괜찮다','일단 출발하면 되지 않는가']],
 ['단톡방에서 내 말에만 답이 없다.',3,1,['바쁜가 보다. 신경 안 쓴다','조금 기다렸다 다른 일을 한다','내가 뭘 잘못 말했나 생각한다','다시 읽으며 의미를 분석한다']],
 ['궁궐에 빈 방 하나가 생겼다.',4,1,['세상에 없던 놀이터를 만든다','내 취향 가득한 방을 꾸민다','지금 필요한 용도로 쓴다','멀쩡한 방을 왜 바꾸느냐']],
 ['기다리던 약속이 취소되었다.',0,-1,['솔직히 좀 기쁘다','아쉽지만 혼자 쉬면 좋다','다른 친구에게 연락한다','어떻게든 다른 약속을 잡는다']],
 ['벗이 고민을 한 시간째 말한다.',1,-1,['해결 방법부터 정리해준다','핵심이 뭔지 물어본다','충분히 말하도록 들어준다','같이 속상해하며 끝까지 듣는다']],
 ['할 일이 쌓여 있는데 새 일이 생겼다.',2,-1,['재밌는 것부터 손댄다','급한 것만 먼저 한다','순서를 정리하고 시작한다','목록과 시간표부터 다시 짠다']],
 ['예상 밖의 일이 벌어졌다.',3,-1,['표정부터 굳고 생각이 많아진다','잠깐 당황하고 주변을 살핀다','할 수 있는 것부터 찾는다','오히려 재밌다. 직접 나선다']],
 ['아무 일정도 없는 한가한 오후.',4,-1,['늘 하던 익숙한 일을 한다','편하게 쉬면서 하루를 보낸다','새로 가볼 곳을 찾아본다','엉뚱한 상상과 새 일을 벌인다']]
];
export const RANKS=['문밖 쭈구리','눈도장 신하','궁궐 단골','이름 외운 신하','수라상 꼽사리','귓속말 측근','야식 독대 대감','침전 프리패스','왕의 최애','전하의 반쪽'];
export const THRESHOLDS=[0,8,23,45,90,150,300,600,1050,1500];
export const OFFICES=[
 ['마구니 낀 신하','신은 아무 생각도 하지 않았사옵니다. 표정이 원래 이렇사옵니다.'],
 ['왕좌 노리는 내시','전하의 만수무강을 바라옵니다. 너무 오래는 말고.'],
 ['입만 산 충신','목숨을 바치겠사옵니다. 오늘 당장은 곤란하옵니다.'],
 ['칼퇴하는 시녀','망국도 내일 근무시간에 부탁드리옵니다.'],
 ['눈치 없는 간신','전하, 아부를 시작해도 되겠사옵니까?'],
 ['상소문 폭격기','추가로 47가지만 더 아뢰겠사옵니다.'],
 ['국고 축내는 대감','나라에 돈이 없는 것이 아니라 신이 다 쓴 것이옵니다.'],
 ['수라상 털이범','독이 있는지 확인하느라 한 그릇 더 먹었사옵니다.'],
 ['왕명 읽씹 승지','보았사오나 답할 기운까지 있지는 않았사옵니다.'],
 ['누워 있는 호위무사','자객이 이쪽으로 오면 그때 일어나겠사옵니다.'],
 ['소문 퍼 나르는 상궁','전하께만 드린 말씀을 모두에게 드렸사옵니다.'],
 ['역모 꿈나무','역모는 아니옵니다. 뜻이 맞는 사람만 모으고 있사옵니다.'],
 ['왕의 첩','총애는 받겠사오나 나랏일은 시키지 마시옵소서.']
];
// Historical entries above keep their indices readable in old backups. New roles
// follow each portrait's gesture and personality rather than a king's choice.
const EXTRA_OFFICES=[
 ['낮잠 전담 침전승지','왕명은 꿈에서 받들겠사옵니다.'],
 ['잔치 과몰입 예조판서','나라 경사는 신이 먼저 예약했사옵니다.'],
 ['건배사 독점 대감','짧게 한 말씀만 올리겠사옵니다. 아직 서론이옵니다.'],
 ['엽전 집착 호조판서','한 푼만 더 깎아주시면 충성을 다하겠사옵니다.'],
 ['결재 반려 호조참봉','이 지출, 꼭 오늘 해야 하옵니까?'],
 ['국고 문단속 대감','금고 열쇠는 신도 못 찾게 숨겼사옵니다.'],
 ['일단 출병 병조판서','작전은 가는 길에 생각하겠사옵니다.'],
 ['뒷수습 외주 장군','돌격은 신이, 수습은 다른 분이 하시옵소서.'],
 ['눈치 만렙 도승지','전하의 헛기침에도 세 가지 뜻이 있사옵니다.'],
 ['아부 자동완성 내시','전하 말씀 뒤에는 늘 옳사옵니다가 붙사옵니다.'],
 ['전하 기분 관측관','오늘 용안은 맑음이나 오후 역정이 예상되옵니다.'],
 ['상소문 돋보기 대감','좋은 말씀인데 작은 글씨부터 보겠사옵니다.'],
 ['뒷말 추적 암행어사','아무도 안 했다던 그 말, 신은 들었사옵니다.'],
 ['거울 독점 의상대감','조회는 늦어도 옷매무새는 늦출 수 없사옵니다.'],
 ['등장 연출 예조판서','신이 들어오면 북부터 치시옵소서.'],
 ['밥부터 먹이는 수라대감','벌은 밥 먹이고 내리시옵소서.'],
 ['잔소리 보약 어의','이 보약은 쓰지만 신의 잔소리는 더 쓰옵니다.'],
 ['백성 간식 조달관','백성이 배고프면 역모보다 야식이 먼저옵니다.'],
 ['계획만 짜는 책사','실행 계획의 준비 회의를 잡겠사옵니다.'],
 ['회의 소집 영의정','이 회의를 줄일 회의를 열겠사옵니다.'],
 ['왕명 첨삭 대사간','받들겠사옵니다. 다만 수정 사항이 있사옵니다.'],
 ['아무튼 반대 대감','이유는 곧 생각하겠사오나 우선 반대옵니다.'],
 ['원칙 사수 철벽대감','전하 뜻은 알겠으나 규정은 신이 갖고 있사옵니다.']
];
const extraStart=OFFICES.length;OFFICES.push(...EXTRA_OFFICES);
const extra=i=>extraStart+i;
export const OFFICE_VARIANTS=[
 [9,3,extra(0)],
 [10,extra(1),extra(2)],
 [extra(3),extra(4),extra(5)],
 [extra(6),extra(7),11],
 [extra(8),extra(9),extra(10)],
 [0,extra(11),extra(12)],
 [12,extra(13),extra(14)],
 [extra(15),extra(16),extra(17)],
 [5,extra(18),extra(19)],
 [extra(20),extra(21),extra(22)]
];
export const OFFICE_BY_TYPE=OFFICE_VARIANTS.map(group=>group[0]);
export function destinyVariant(chart){
 if(!validChart(chart))return 0;
 const ownElement=[0,0,1,1,2,2,3,3,4,4][chart.ds],own=chart.cnt[ownElement],peak=Math.max(...chart.cnt);
 return own>=3?2:peak>=3&&peak>own?1:0;
}
export const characterType=p=>royalTypeFromChart(p?.chart)??p?.type??0;
export const temperamentOffice=(type,chart=null)=>OFFICE_VARIANTS[royalTypeFromChart(chart)??type]?.[destinyVariant(chart)]??0;
export const officeFor=p=>OFFICES[temperamentOffice(characterType(p),p.chart)];
export function applyDestiny(p){p.type=characterType(p);p.office=temperamentOffice(p.type,p.chart);p.officeSource='temperament';return p;}
export const royalCharacterName=p=>TYPES[characterType(p)].short.replace(/군$/,'')+kingLabel(p);
export function characterImage(p,{dependent=false,forceKing=false}={}){const family=TYPES[characterType(p)].id;return `assets/${p.isKing||forceKing?family+'-'+(p.gender==='F'?'queen':'king'):dependent?(p.gender==='F'?'household-mother':'household-farmer'):'servant-'+family+'-'+(p.gender==='F'?'female':'male')}.webp`;}
export function destinyDescription(p){
 const t=TYPES[characterType(p)],variant=destinyVariant(p.chart);
 if(!validChart(p.chart))return '사주 정보를 등록하면 타고난 성향에 맞춰 관직과 초상이 자동으로 정해집니다.';
 return t.desc+' '+['여러 기질이 섞인 기본형으로 읽어 이 캐릭터에 배정했습니다.','함께 드러나는 다른 기질을 더해 세부 관직을 골랐습니다.','본래 기질이 또렷한 구성으로 읽어 성격을 한껏 과장했습니다.'][variant];
}
export const loyalSubjects=(db,kingId)=>(db.people[kingId]?.loyalIds||[]).map(id=>db.people[id]).filter(p=>p&&!p.isKing&&p.liegeId===kingId);
export function appointLoyal(db,actorId,subjectId){const p=requireLiege(db,actorId,subjectId),king=db.people[actorId];king.loyalIds=loyalSubjects(db,actorId).map(x=>x.id);if(king.loyalIds.includes(subjectId))throw Error('이미 전하의 충신입니다.');if(king.loyalIds.length>=2)throw Error('최측근 자리는 두 명입니다. 기존 충신을 먼저 해제해주세요.');king.loyalIds.push(p.id);p.wasLoyal=true;publishNews(db,'loyal',{kingId:actorId,targetId:p.id});addEvent(db,`${p.name}, 전하의 최측근 충신에 임명되다.`);}
export function dismissLoyal(db,actorId,subjectId){requireLiege(db,actorId,subjectId);const king=db.people[actorId];king.loyalIds=(king.loyalIds||[]).filter(id=>id!==subjectId);publishNews(db,'dismiss',{kingId:actorId,targetId:subjectId});addEvent(db,`${db.people[subjectId].name}, 최측근 충신 자리에서 물러나다.`);}
export function analyze(answers){
 if(!Array.isArray(answers)||answers.length!==10||answers.some(a=>!Number.isInteger(a)||a<0||a>3))throw Error('열 가지 선택을 모두 마쳐주세요.');
 const scores=AXES.map(()=>0);
 QUESTIONS.forEach((q,i)=>{scores[q[1]]+=(q[2]===1?3-answers[i]:answers[i])*100/6;});
 const distances=TYPES.map(t=>t.p.reduce((s,p,i)=>s+(p-scores[i])**2,0));
 return {type:distances.indexOf(Math.min(...distances)),scores:scores.map(Math.round)};
}
export function newWorld(){return {version:1,people:{},activeId:null,events:[],news:[],councils:[],lifeSeq:0};}
export function addEvent(db,text){db.events.unshift({text,at:Date.now()});db.events=db.events.slice(0,60);}
export function addPerson(db,{id,name,gender,type,scores=[],answers=[],inviterId=null,external=false,birth=null}){
 if(Object.keys(db.people).length>=500)throw Error('이 초안의 천하는 인물 500명까지 보관합니다.');
 if(db.people[id])throw Error('이미 입장한 인물입니다.');
 name=validateName(name);
 if(!['M','F'].includes(gender)||!Number.isInteger(type)||!TYPES[type])throw Error('캐릭터 정보가 올바르지 않습니다.');
 const natal=birth?analyzeBirth(birth,gender):null;if(natal){type=natal.type;scores=natal.scores;answers=[];}
 const inviter=inviterId?db.people[inviterId]:null;
 if(inviterId&&!inviter)throw Error('초대한 인물을 찾을 수 없습니다.');
 const p={id,name:name.trim(),gender,type,scores,answers,birth:natal?.birth||null,chart:natal?.chart||null,inheritedBows:0,peakNetwork:0,inviterId,liegeId:inviter?.id||null,isKing:!inviter,bows:0,grantedRank:0,office:temperamentOffice(type),officeSource:'temperament',loyalIds:[],houseOffice:0,recruitChoice:'stay',gold:0,totalBows:0,tributeRemainder:0,tributeDay:'',tributeToday:0,frame:'plain',ownedFrames:['plain'],decor:'plain',ownedDecor:['plain'],summons:null,favorCount:0,wasLoyal:false,tutorialSeen:{subject:false,king:false},joined:Date.now(),external};
 applyDestiny(p);db.people[id]=p;if(inviter)inviter.peakNetwork=Math.max(inviter.peakNetwork||0,networkCount(db,inviter.id));
 if(inviter&&!inviter.isKing){
   if(household(db,inviter.id).length===1)inviter.recruitChoice='pending';
   addEvent(db,`${p.name}, ${inviter.name}의 식솔이 되다. 독립 여부는 초대한 사람이 선택합니다.`);
 }else addEvent(db,inviter?`${p.name}, ${inviter.name}의 조정에 입궐.`:`${p.name}${kingLabel(p)}, 새로운 나라를 세우다.`);
 if(!external){const king=countryOf(db,p.id),count=Object.values(db.people).filter(x=>x.inviterId===inviter?.id).length;if(!inviter)publishNews(db,'founding',{kingId:p.id});else if(inviter.isKing)publishNews(db,'arrival',{kingId:king.id,targetId:p.id,count});else if([1,3,5,10,20].includes(count))publishNews(db,'household',{kingId:king.id,targetId:inviter.id,count,key:'household:'+inviter.id+':'+count});}
 return p;
}
export const household=(db,id)=>Object.values(db.people).filter(p=>!p.isKing&&p.liegeId===id).sort((a,b)=>b.bows-a.bows||a.joined-b.joined||a.id.localeCompare(b.id));
export const subjects=(db,id)=>db.people[id]?.isKing?household(db,id):[];
export const isDependent=(db,p)=>!p.isKing&&!!p.liegeId&&!db.people[p.liegeId]?.isKing;
export function sovereign(db,id){let p=db.people[id];const seen=new Set();while(p&&!p.isKing&&!seen.has(p.id)){seen.add(p.id);p=db.people[p.liegeId];}return p?.isKing?p:null;}
export function chooseStay(db,id){const p=db.people[id];if(!p||p.isKing||!household(db,id).length)throw Error('식솔이 있는 신하·식솔만 선택할 수 있습니다.');p.recruitChoice='stay';addEvent(db,`${p.name}, 독립 대신 식솔과 함께 남기로 하다.`);}
export function becomeKing(db,id){const p=db.people[id];if(!p||p.isKing||!household(db,id).length)throw Error('초대한 지인이 한 명 이상 남아 있어야 독립할 수 있습니다.');const former=db.people[p.liegeId],oldKing=countryOf(db,p.id);if(former?.loyalIds?.includes(id))p.wasLoyal=true;if(former)former.loyalIds=(former.loyalIds||[]).filter(x=>x!==id);applyDestiny(p);p.isKing=true;p.liegeId=null;p.recruitChoice='stay';p.summons=null;publishNews(db,'independence',{kingId:p.id,targetId:p.id,relatedKingId:oldKing?.id});addEvent(db,`${p.name}${kingLabel(p)}, 독립하다. 함께한 식솔은 신하가 되고 옛 인연은 남다.`);return p;}
// Release a direct subject without deleting an account or its invitation tree.
export function expelSubject(db,actorId,subjectId){
 const p=requireLiege(db,actorId,subjectId),king=db.people[actorId];
 if(king.loyalIds?.includes(subjectId))p.wasLoyal=true;
 king.loyalIds=(king.loyalIds||[]).filter(id=>id!==subjectId);
 applyDestiny(p);p.isKing=true;p.liegeId=null;p.recruitChoice='stay';p.summons=null;
 publishNews(db,'independence',{kingId:p.id,targetId:p.id,relatedKingId:actorId});
 addEvent(db,`${king.name}${kingLabel(king)}, ${p.name} 신하를 목록에서 내보내다. 식솔과 옛 인연은 남다.`);
 return p;
}
export const networkCount=(db,id)=>Object.values(db.people).filter(p=>p.inviterId===id).length;
export const networkLevelCount=(db,id)=>Math.max(networkCount(db,id),db.people[id]?.peakNetwork||0);
export function setBirth(db,id,birth,{name,gender}={}){const p=db.people[id];if(!p)throw Error('인물을 찾을 수 없습니다.');const nextName=name===undefined?p.name:validateName(name),g=gender||p.gender,r=analyzeBirth(birth,g);p.birth=r.birth;p.chart=r.chart;p.type=r.type;p.scores=r.scores;p.answers=[];p.gender=g;p.name=nextName;return applyDestiny(p);}
export const independent=(db,id)=>Object.values(db.people).filter(p=>p.isKing&&p.inviterId===id);
export const bowRank=p=>THRESHOLDS.reduce((r,n,i)=>p.bows>=n?i:r,0);
export const rank=p=>Math.max(bowRank(p),p.grantedRank||0);
export const royalGranted=p=>(p.grantedRank||0)>bowRank(p);
function creditGold(p,amount){p.tributeRemainder=(p.tributeRemainder||0)+amount;const coins=Math.floor(p.tributeRemainder/10);p.gold=Math.min(999999999,(p.gold||0)+coins);p.tributeRemainder-=coins*10;}
export function bow(db,actorId,targetId,now=Date.now()){const p=db.people[actorId],king=db.people[targetId];if(!p||!king?.isKing||p.isKing||p.liegeId!==targetId)throw Error('소속된 조정의 직속 신하만 경배할 수 있습니다.');
 if(p.bows>=999999)return p.bows;const before=king.totalBows||0;p.bows++;
 king.totalBows=Math.min(999999999,(king.totalBows||0)+1);
 const sponsor=db.people[king.inviterId],beneficiary=sponsor||null;if(beneficiary){beneficiary.totalBows=Math.min(999999999,(beneficiary.totalBows||0)+.5);beneficiary.inheritedBows=(beneficiary.inheritedBows||0)+.5;}
 const day=new Date(now+9*3600000).toISOString().slice(0,10);if(p.tributeDay!==day){p.tributeDay=day;p.tributeToday=0;}
 if(p.tributeToday<100){p.tributeToday++;creditGold(king,1);if(beneficiary)creditGold(beneficiary,.5);}
 recordBowMilestones(db,p,king,before,now);return p.bows;
}

export const FRAMES=[{id:'plain',name:'소박한 목테',cost:0,desc:'나라의 시작은 소박하게.'},{id:'brass',name:'금빛 단청테',cost:100,desc:'가까이서 봐도 번쩍. 신하까지 함께.'},{id:'jade',name:'비취 봉황테',cost:300,desc:'비취와 금빛 겹무늬로 위엄을.'},{id:'dragon',name:'황금 용문테',cost:750,desc:'멀리서도 보이는 과인의 존재감.'}];
export const DECOR=[{id:'plain',name:'소박한 편전',cost:0,desc:'아직은 검소한 왕실.'},{id:'lantern',name:'홍등 연회전',cost:150,desc:'붉은 등롱과 휘장으로 잔치 분위기.'},{id:'screen',name:'일월 금병풍',cost:400,desc:'해와 달, 금빛 산봉우리의 어좌.'},{id:'palace',name:'황금 대전',cost:900,desc:'금빛 기둥과 용문으로 가득한 궁궐.'}];
export function royalStyle(db,p){const king=sovereign(db,p.id);return {king,frame:FRAMES.find(x=>x.id===king?.frame)||FRAMES[0],decor:DECOR.find(x=>x.id===king?.decor)||DECOR[0]};}
export function prestige(p){const b=p.totalBows||0;return b>=3000?'천하의 부러움':b>=1000?'만백성의 자랑':b>=300?'경배 맛집':b>=100?'소문난 왕실':'갓 세운 왕실';}
export function royalShop(db,actorId,kind,itemId){const king=db.people[actorId],catalog=kind==='frame'?FRAMES:kind==='decor'?DECOR:null;if(!king?.isKing||!catalog)throw Error('왕만 자기 나라를 꾸밀 수 있습니다.');const item=catalog.find(x=>x.id===itemId);if(!item)throw Error('왕실 물품을 확인해주세요.');const key=kind==='frame'?'ownedFrames':'ownedDecor';if(!king[key].includes(itemId)){if(king.gold<item.cost)throw Error('국고의 금화가 부족합니다.');king.gold-=item.cost;king[key].push(itemId);king[kind]=itemId;publishNews(db,kind,{kingId:actorId,item:item.name,count:item.cost,key:kind+':'+actorId+':'+itemId});addEvent(db,`${king.name}${kingLabel(king)}, 금화 ${item.cost}개로 「${item.name}」 장만.`);}king[kind]=itemId;return item;}
export function royalNudge(db,actorId,subjectId,now=Date.now()){const p=requireLiege(db,actorId,subjectId);const old=p.summons;p.summons={fromId:actorId,at:now,count:Math.min(999999,(old?.count||0)+1),read:false};return p.summons;}
export function acknowledgeNudge(db,actorId){const p=db.people[actorId];if(p?.summons)p.summons.read=true;}

function requireLiege(db,actorId,subjectId){const p=db.people[subjectId],actor=db.people[actorId];if(!actor?.isKing||!p||p.isKing||p.liegeId!==actorId)throw Error('자신의 신하에게만 왕명을 내릴 수 있습니다.');return p;}
export function grant(db,actorId,subjectId,to){const p=requireLiege(db,actorId,subjectId);if(!Number.isInteger(to)||to<0||to>=RANKS.length||to<=rank(p))throw Error('현재보다 높은 등급을 골라주세요.');p.grantedRank=to;p.favorCount=(p.favorCount||0)+1;publishNews(db,'favor',{kingId:actorId,targetId:p.id,count:to});addEvent(db,`${p.name}에게 특별 총애. 「${RANKS[to]}」 하사.`);}
// Retain the old callable name as a rejecting boundary for stale clients.
export function appoint(){throw Error('관직은 사주로 자동 부여되어 왕이 변경할 수 없습니다.');}
export function border(count){return count>=20?{color:'#a33932',name:'주홍 왕실',next:null}:count>=10?{color:'#b49445',name:'금빛 왕실',next:20}:count>=6?{color:'#827098',name:'보라 왕실',next:10}:count>=3?{color:'#66849d',name:'푸른 왕실',next:6}:count>=1?{color:'#6a8b72',name:'초록 왕실',next:3}:{color:'#aaa394',name:'새로운 왕실',next:1};}
export const kingLabel=p=>p.gender==='F'?'여왕':'왕';
export function makeDemo(){
 const db=newWorld();
 let seed=0;const p=(id,name,gender,type,inviterId=null)=>addPerson(db,{id,name,gender,type,inviterId,birth:{date:`${1990+seed%5}-05-${String(10+seed++).padStart(2,'0')}`,time:'12:30',cal:'solar',city:'서울'}});
 p('demo-me','담당자','M',5);
 p('demo-1','민수','M',2,'demo-me').bows=186;
 p('demo-2','지은','F',7,'demo-me').bows=92;
 p('demo-3','도윤','M',0,'demo-me').bows=24;
 p('demo-4','수빈','F',6,'demo-me').bows=8;
 p('demo-5','하늘','F',1,'demo-me');p('demo-6','지후','M',3,'demo-5').bows=11;becomeKing(db,'demo-5');
 p('demo-family-m','덕수','M',2,'demo-3');p('demo-family-f','옥분','F',7,'demo-3');chooseStay(db,'demo-3');
 db.people['demo-me'].totalBows=1310;db.people['demo-me'].gold=600;db.people['demo-me'].frame='brass';db.people['demo-me'].ownedFrames.push('brass');
 db.people['demo-5'].totalBows=3420;db.people['demo-5'].gold=162;db.people['demo-5'].frame='dragon';db.people['demo-5'].ownedFrames.push('dragon');db.people['demo-5'].decor='palace';db.people['demo-5'].ownedDecor.push('palace');
 db.people['demo-2'].grantedRank=8;db.people['demo-me'].loyalIds=['demo-1','demo-2'];for(const id of db.people['demo-me'].loyalIds)db.people[id].wasLoyal=true;db.activeId='demo-me';return db;
}

export const HOUSE_OFFICES=['밥만 먹는 식솔','텃밭 지킴이','집안 실세','낮잠 담당'];
export function assignHousehold(db,actorId,targetId,office){const actor=db.people[actorId],p=db.people[targetId];if(!actor||actor.isKing||!p||p.isKing||p.liegeId!==actorId||!Number.isInteger(office)||!HOUSE_OFFICES[office])throw Error('직접 돌보는 식솔의 집안 직책만 바꿀 수 있습니다.');p.houseOffice=office;}
