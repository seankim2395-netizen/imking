import {characterImage} from './model.mjs';
export const newspaperText=p=>`[내가왕 · 왕실신문]\n${p.headline}\n\n${p.body}\n\n“${p.quote}”\n${new Date(p.at).toLocaleDateString('ko-KR')} 발행 당시의 기록`;
export async function newspaperBlob(p){
 if(document.fonts?.ready)await document.fonts.ready;
 const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=4000;const c=canvas.getContext('2d');if(!c)throw Error('이 브라우저에서 이미지 만들기를 지원하지 않습니다.');
 const ink='#382f25',red='#963e30',muted='#897457';c.fillStyle='#f3e9d3';c.fillRect(0,0,1080,4000);
 function text(s,x,y,size=26,color=ink,weight='400',align='left'){c.fillStyle=color;c.font=`${weight} ${size}px "Gowun Batang", serif`;c.textAlign=align;c.fillText(s,x,y);}
 function wrap(s,x,y,max,size=28,line=47,maxLines=8){c.fillStyle=ink;c.font=`400 ${size}px "Gowun Batang", serif`;c.textAlign='left';let lineText='',count=0;for(const char of s){if(c.measureText(lineText+char).width>max&&lineText){c.fillText(lineText,x,y);y+=line;lineText='';count++;if(count>=maxLines-1)break;}lineText+=char;}if(lineText)c.fillText(lineText,x,y);return y+line;}
 text('작은 조정의 큰 소식',540,104,22,muted,'400','center');text('王 室 新 聞',540,197,78,ink,'700','center');text('내가왕 · '+new Date(p.at).toLocaleDateString('ko-KR')+' · '+p.id.toUpperCase(),540,245,21,muted,'400','center');c.fillStyle=ink;c.fillRect(80,270,920,4);c.fillRect(80,280,920,1);
 let y=wrap(p.headline,85,345,910,43,66,10);y=Math.max(470,y+25);
 const sources=await Promise.all(p.portraits.map(s=>new Promise(resolve=>{const img=new Image();const timer=setTimeout(()=>{img.onload=null;img.onerror=null;resolve(null);},8000);img.onload=()=>{clearTimeout(timer);resolve(img);};img.onerror=()=>{clearTimeout(timer);resolve(null);};img.src=characterImage(s,{dependent:s.dependent});})));
 if(sources.some(img=>!img))throw Error('초상을 불러오지 못했습니다. 다시 시도하거나 기사 문구 복사를 이용해주세요.');
 const xs=p.portraits.length===1?[540]:[365,715];p.portraits.forEach((s,i)=>{const x=xs[i],img=sources[i];c.save();c.beginPath();c.arc(x,y+100,100,0,Math.PI*2);c.clip();c.fillStyle='#e2d4b5';c.fillRect(x-100,y,200,200);if(img)c.drawImage(img,x-100,y,200,200);c.restore();c.strokeStyle=s.frame==='dragon'?'#aa7929':s.frame==='jade'?'#46765d':'#ab9060';c.lineWidth=s.frame==='plain'?3:10;c.beginPath();c.arc(x,y+100,105,0,Math.PI*2);c.stroke();text(s.name+(s.isKing?(s.gender==='F'?'여왕':'왕'):'')+(s.dependent?' · 식솔':''),x,y+250,24,ink,'700','center');});
 y+=300;y=wrap(p.body,90,y,900,29,49,24)+25;text('“',90,y+25,70,red);y=wrap(p.quote,145,y+10,795,30,48,8)+35;
 if(p.council){p.council.options.forEach((option,i)=>{const max=Math.max(1,...p.council.counts);c.fillStyle='#dfd1af';c.fillRect(100,y-22,880,31);c.fillStyle='#b29862';c.fillRect(100,y-22,880*p.council.counts[i]/max,31);text(option+' · '+p.council.counts[i]+'표',110,y+1,21,ink);y+=49;});}
 const footer=Math.max(1220,y+45),height=footer+190;c.strokeStyle='#bda477';c.lineWidth=2;c.strokeRect(32,32,1016,height-64);c.strokeRect(44,44,992,height-88);c.fillStyle=ink;c.fillRect(80,footer,920,2);text(`발행 당시  |  인맥 ${p.stats.network}명  ·  경배 ${p.stats.bows}회  ·  금화 ${p.stats.gold}개`,540,footer+52,22,muted,'400','center');text('과거 기사는 발행 당시 모습으로 남습니다.  ·  내가왕',540,footer+98,20,muted,'400','center');
 const cropped=document.createElement('canvas');cropped.width=1080;cropped.height=height;cropped.getContext('2d').drawImage(canvas,0,0);return new Promise((resolve,reject)=>cropped.toBlob(b=>b?resolve(b):reject(Error('신문 이미지를 만들지 못했습니다.')),'image/png'));
}
