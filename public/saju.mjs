import {saju,reading,CITY,DAYMASTER} from './atelier-reading.mjs';
export {CITY};
const STEM_TO_TYPE=[3,4,1,7,9,2,5,6,0,8];
const cache=new Map();
export function normalizeBirth(raw){
 if(!raw||typeof raw!=='object'||typeof raw.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(raw.date))throw Error('생년월일을 정확하게 입력해주세요.');
 const birth={date:raw.date,time:raw.time??'',cal:raw.cal??'solar',leap:raw.leap??false,city:raw.city??'서울',zishi:raw.zishi??'unified',timeMode:raw.timeMode??'lmt',dstFold:raw.dstFold??'earlier'};
 if(typeof birth.time!=='string'||birth.time!==''&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(birth.time)||!['solar','lunar'].includes(birth.cal)||typeof birth.leap!=='boolean'||!Object.hasOwn(CITY,birth.city)||!['unified','split'].includes(birth.zishi)||!['lmt','standard','apparent'].includes(birth.timeMode)||!['earlier','later'].includes(birth.dstFold)||birth.cal==='solar'&&birth.leap)throw Error('출생 정보의 날짜·시간·음양력 설정을 확인해주세요.');
 return birth;
}
export function analyzeBirth(raw,gender='M'){
 if(!['M','F'].includes(gender))throw Error('성별을 선택해주세요.');const birth=normalizeBirth(raw),key=JSON.stringify([birth,gender]);if(cache.has(key))return cache.get(key);
 const sj=saju({...birth,gender}),c=sj.cnt,clamp=x=>Math.max(0,Math.min(100,Math.round(x))),st=sj.r.strength.score;
 const scores=[clamp(25+c[1]*11+c[0]*4+st*.2),clamp(35+c[0]*6+c[2]*7-c[3]*3),clamp(30+c[2]*8+c[3]*7-c[1]*3),clamp(35+st*.4+c[2]*4-c[4]*3),clamp(30+c[4]*9+c[0]*6-c[2]*3)];
 const chart={ds:sj.ds,db:sj.db,cnt:[...c],unknownTime:!birth.time,boundary:!!(sj.r.uncertainty.month||sj.r.uncertainty.year)};
 const out={birth,type:STEM_TO_TYPE[sj.ds],scores,chart,sj,dayMaster:DAYMASTER[sj.ds]};if(cache.size>=600)cache.clear();cache.set(key,out);return out;
}
export function validChart(c){return !!c&&Number.isInteger(c.ds)&&c.ds>=0&&c.ds<10&&Number.isInteger(c.db)&&c.db>=0&&c.db<12&&Array.isArray(c.cnt)&&c.cnt.length===5&&c.cnt.every(x=>Number.isInteger(x)&&x>=0&&x<=8)&&[6,8].includes(c.cnt.reduce((a,b)=>a+b,0))&&typeof c.unknownTime==='boolean'&&typeof c.boundary==='boolean';}
export const royalTypeFromChart=chart=>validChart(chart)?STEM_TO_TYPE[chart.ds]:null;
export function compatibilityReport(a,b){
 const A=a?.chart,B=b?.chart;if(!validChart(A)||!validChart(B))return null;
 const EL=[0,0,1,1,2,2,3,3,4,4],K=['목','화','토','금','수'],S='甲乙丙丁戊己庚辛壬癸',Z='子丑寅卯辰巳午未申酉戌亥',ea=EL[A.ds],eb=EL[B.ds],gen=(a,b)=>(a+1)%5===b;let score,reasons=[];
 const dayPair=`${S[A.ds]}(${K[ea]}) · ${S[B.ds]}(${K[eb]})`;
 if(Math.abs(A.ds-B.ds)===5){score=95;reasons.push({title:'일간의 천간합',evidence:dayPair,meaning:'두 일간이 합을 이루어 관심사나 역할을 함께 묶어보는 접점으로 읽습니다. 실제 호감이나 협조가 자동으로 생긴다는 뜻은 아닙니다.',points:95,base:true});}
 else if(ea===eb){score=72;reasons.push({title:'같은 오행의 일간',evidence:dayPair,meaning:'비슷한 기준이 통할 수 있고 같은 영역에서 경쟁할 수도 있습니다. 서로 맡을 역할을 나누어보세요.',points:72,base:true});}
 else if(gen(ea,eb)||gen(eb,ea)){score=88;reasons.push({title:'일간의 상생',evidence:dayPair,meaning:'한쪽의 기운이 다른 쪽을 돕는 방향으로 읽습니다. 지원을 주고받는 양과 부담도 함께 맞춰보세요.',points:88,base:true});}
 else{score=55;reasons.push({title:'일간의 상극',evidence:dayPair,meaning:'서로 기준을 세우거나 속도를 조절하는 작용으로 읽습니다. 검토가 도움이 될지 간섭이 될지는 역할 합의에 달려 있습니다.',points:55,base:true});}
 const pair=[A.db,B.db].sort((a,b)=>a-b).join(',');
 if(['0,1','2,11','3,10','4,9','5,8','6,7'].includes(pair)){score+=8;reasons.push({title:'일지 육합',evidence:`${Z[A.db]} · ${Z[B.db]}`,meaning:'가까운 생활 리듬을 맞추려는 접점으로 읽습니다. 친해도 싫은 점과 부탁은 제때 말해보세요.',points:8});}
 else if(Math.abs(A.db-B.db)===6){score-=12;reasons.push({title:'일지 충',evidence:`${Z[A.db]} · ${Z[B.db]}`,meaning:'생활 방식이나 우선순위의 차이를 드러내는 자극으로 읽습니다. 큰 변경은 미리 알려 조율해보세요.',points:-12});}
 else reasons.push({title:'일지에서 확인한 범위',evidence:`${Z[A.db]} · ${Z[B.db]}`,meaning:'이번 계산 규칙의 육합·충은 없습니다. 다른 구조까지 모두 안정적이라는 판정은 아닙니다.',points:0});
 let complement=false;for(let e=0;e<5;e++)if(A.cnt[e]===0&&B.cnt[e]>=2||B.cnt[e]===0&&A.cnt[e]>=2){score+=4;complement=true;reasons.push({title:'오행의 보완 접점',evidence:`${K[e]} 기운 · 한쪽 0개, 다른 쪽 2개 이상`,meaning:'한쪽 원국에 없는 오행이 상대에게 있는 점을 반영합니다. 오행 개수 차이만으로 실제 도움을 확정할 수는 없습니다.',points:4});break;}
 if(!complement)reasons.push({title:'오행의 보완 접점',evidence:'이번 규칙의 추가 보완 점수 없음',meaning:'특정 오행이 없다는 이유만으로 관계의 좋고 나쁨을 결정하지 않습니다.',points:0});
 const rawScore=score;score=Math.max(0,Math.min(100,score));const uncertain=A.unknownTime||B.unknownTime||A.boundary||B.boundary;
 const base=reasons[0].points,rhythm=reasons[1].points,complements=reasons[2].points>0;
 const explanation=[
  {title:'두 사람이 가까워지는 방식',paragraphs:base===95?[
   '사주 풀이에서는 서로 다른 장점을 한 방향으로 묶기 쉬운 조합으로 봅니다. 같은 목표를 정하면 각자의 역할을 찾으며 가까워지는 그림입니다.',
   '한 사람이 먼저 제안하고 다른 사람이 구체화하는 식으로 작은 일을 함께 해보세요. 잘 맞는 조합이어도 마음을 알아서 읽어주리라 기대하기보다는 원하는 것을 직접 말하는 편이 좋습니다.'
  ]:base===72?[
   '사주 풀이에서는 비슷한 기준과 관심사를 발견하기 쉬운 조합으로 봅니다. 서로의 반응을 이해하고 공감하는 데서 친밀감이 자랄 수 있습니다.',
   '다만 같은 역할을 하고 싶거나 서로 비교할 때는 경쟁심이 생길 수 있습니다. 누가 더 잘하는지 겨루기보다 각자 맡을 일을 나누고, 상대의 수고를 구체적으로 인정해보세요.'
  ]:base===88?[
   '사주 풀이에서는 한쪽이 다른 쪽을 북돋우는 흐름이 있는 조합으로 봅니다. 아이디어를 응원하거나 시작한 일을 이어주는 식으로 호흡을 맞추기 좋습니다.',
   '도와주는 사람이 늘 같은 쪽이 되면 부담이 쌓일 수 있습니다. 도움을 당연하게 여기지 말고, 이번에는 누가 무엇을 해줄지 가볍게 정해보세요. 고마움을 표현할수록 관계가 편해집니다.'
  ]:[
   '사주 풀이에서는 서로의 기준이나 추진 속도에 차이가 드러나는 조합으로 봅니다. 한쪽의 제안에 다른 쪽이 질문을 던지며 방향을 점검하는 관계가 될 수 있습니다.',
   '조언이 간섭으로 들리지 않도록 먼저 도움이 필요한지 물어보세요. 중요한 결정을 할 때는 바로 설득하려 들기보다 각자 중요하게 여기는 이유를 한 가지씩 말해보는 편이 좋습니다.'
  ]},
  {title:'일상에서 호흡을 맞추는 법',paragraphs:rhythm===8?[
   '사주 풀이에서는 가까이 지낼 때 생활의 호흡을 맞춰볼 접점이 있는 조합으로 봅니다. 정기적으로 안부를 묻거나 함께하는 작은 습관이 친밀감을 쌓는 데 도움이 될 수 있습니다.',
   '친하다는 이유로 부탁이나 약속을 생략하지는 마세요. 괜찮은지 한 번 더 묻고, 싫은 점도 부담 없이 말할 수 있도록 여유를 주는 것이 좋습니다.'
  ]:rhythm===-12?[
   '사주 풀이에서는 생활 방식이나 우선순위의 차이가 쉽게 눈에 띄는 조합으로 봅니다. 연락 간격, 약속 시간, 계획을 바꾸는 방식에서 서로 다르게 느낄 수 있습니다.',
   '계획이 바뀌면 미리 알리고 답장을 기다릴 수 있는 시간을 정해보세요. 의견이 부딪힐 때는 잠깐 쉬었다가 사실과 부탁을 나누어 말하면 불필요한 감정 소모를 줄일 수 있습니다.'
  ]:[
   '이번 궁합 계산에서는 일상의 호흡을 특별히 가깝게 보거나 크게 부딪힌다고 보는 표지가 두드러지지 않습니다. 실제로 편한 연락 방식과 만나는 간격을 알아가는 과정이 중요합니다.',
   '답장이 늦었다는 이유만으로 마음이 멀어졌다고 단정하지 말고, 서로 편한 연락 빈도와 약속 방식을 물어보세요. 함께 지켜본 작은 경험이 서로를 이해하는 기준이 됩니다.'
  ]},
  {title:'서로에게 보탬이 되는 지점',paragraphs:complements?[
   '사주 구성에서는 한쪽에 드러나지 않은 특성이 다른 쪽에 비교적 뚜렷하게 나타납니다. 서로 다른 관점이나 익숙한 방식을 나누는 조합으로 해석할 수 있습니다.',
   '혼자 막히는 일에 상대의 의견을 물어보고, 도움이 됐던 부분을 구체적으로 알려주세요. 다만 상대가 항상 내 부족한 점을 채워줘야 하는 것은 아닙니다. 부탁과 역할은 서로 동의하는 만큼 나누는 편이 좋습니다.'
  ]:[
   '이번 계산에서는 특정 특성을 서로 채워준다는 추가 표지가 뚜렷하지 않습니다. 이것만으로 도움이 적거나 인연이 약한 관계라고 보지는 않습니다.',
   '상대가 편하게 해내는 일과 내가 자신 있는 일을 직접 물어보세요. 함께해본 경험을 바탕으로 역할을 정하면 사주 점수에 드러나지 않는 장점도 발견할 수 있습니다.'
  ]},
  {title:'왕과 신하로 함께 지낸다면',paragraphs:base>=88?[
   '같이 이룰 작은 목표를 먼저 정하고, 해낸 일에는 칭찬과 총애를 분명하게 표현해보세요. 경배 횟수만 기다리기보다 서로 즐거운 방식으로 왕실의 분위기를 만드는 것이 좋습니다.'
  ]:base===72?[
   '비슷한 생각을 가졌다고 모든 선택이 같을 필요는 없습니다. 관직이나 역할을 정할 때 각자의 취향을 물어보고, 같은 자리에서 경쟁하기보다 다른 장점을 드러낼 기회를 만들어보세요.'
  ]:[
   '왕의 명령이라도 상대가 편한지 먼저 물어보세요. 의견이 다를 때 바로 충성심을 의심하기보다 원하는 역할과 속도를 맞추면, 서로의 다른 시선이 왕실을 풍성하게 만들 수 있습니다.'
  ]}
 ];
 const readingNotes=[...(A.unknownTime||B.unknownTime?['태어난 시간을 모르는 사람이 있어 출생 시간을 제외해 풀이했습니다.']:[]),...(A.boundary||B.boundary?['계절이 바뀌는 시점과 가깝거나 출생 시간이 없어, 정확한 시각에 따라 풀이가 달라질 수 있습니다.']:[]),'아뜰리에 사주의 궁합 규칙을 바탕으로 풀어쓴 재미용 해설입니다. 점수는 실제 호감이나 관계의 미래를 뜻하지 않습니다.'];
 return {score,rawScore,uncertain,reasons,explanation,readingNotes,summary:score>=85?'함께 묶어볼 접점이 많은 조합':score>=65?'서로 맞춰갈 접점이 보이는 조합':'다른 기준을 조율해가는 조합',notes:[...(A.unknownTime||B.unknownTime?['출생 시간이 없는 원국은 시주를 제외했습니다.']:[]),...(A.boundary||B.boundary?['시간 모름·절기 경계로 년주 또는 월주가 달라질 수 있는 정보가 포함돼 있습니다.']:[]),'기존 아뜰리에 사주의 사주 궁합 규칙만 사용합니다. 성향 질문 점수는 섞지 않습니다.','원국이 확인돼도 이 관계 점수는 일간·일지·오행 개수 중심의 재미용 지표이며 실제 관계나 감정의 확률이 아닙니다.']};
}
export function compatibility(a,b){const r=compatibilityReport(a,b);return r?{score:r.score,uncertain:r.uncertain}:null;}

export function sajuReading(p){if(!p.birth)return null;const result=analyzeBirth(p.birth,p.gender),b5=Object.fromEntries(['E','A','C','S','O'].map((k,i)=>[k,result.scores[i]]));return {...result,interpretation:reading({...p,...p.birth,sj:result.sj,b5})};}
