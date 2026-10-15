import {fitTransform,zoomAt} from './map-layout.mjs';

export function mountMap(viewport,stage,bounds,focus){
 if(!viewport?.addEventListener||!stage)return null;
 const controller=new AbortController(),signal=controller.signal;
 const terrain=viewport.querySelector?.('[data-map-terrain]');
 let view={scale:1,x:0,y:0},points=new Map(),source=null,baseline=null;
 let dragged=false,interacted=false,suppress=0,lastTouch=0;
 const ownedTouches=new Set(),captures=new Map();
 const size=()=>({width:viewport.clientWidth||650,height:viewport.clientHeight||590});
 const local=(x,y)=>{const r=viewport.getBoundingClientRect();return {x:x-r.left,y:y-r.top};};
 const prevent=e=>{if(e.cancelable!==false)e.preventDefault();};
 const sample=()=>[...points.entries()].sort(([a],[b])=>a-b).slice(0,2).map(([,p])=>p);
 const midpoint=p=>p.length>1?{x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2}:p[0];
 const distance=p=>p.length>1?Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y):0;
 const draw=()=>{stage.style.transform=`translate(${view.x}px,${view.y}px) scale(${view.scale})`;
  // A repeating viewport-sized layer has no finite world edge. Match the same
  // camera so scenery stays attached to world positions through pan and zoom.
  if(terrain){terrain.style.backgroundSize=`${1440*view.scale}px ${1080*view.scale}px`;terrain.style.backgroundPosition=`${view.x}px ${view.y}px`;}
  const label=viewport.parentElement?.querySelector('[data-map-scale]');if(label)label.textContent=Math.round(view.scale*100)+'%';};
 const rebase=()=>{const p=sample();baseline=p.length?{count:p.length,center:midpoint(p),distance:distance(p),view:{...view}}:null;};
 const fit=()=>{view=fitTransform(bounds,size());draw();rebase();};
 const zoom=(factor,anchor)=>{const s=size(),p=anchor||{x:s.width/2,y:s.height/2};view=zoomAt(view,factor,p.x,p.y);interacted=true;draw();rebase();};
 const center=()=>{const s=size(),p=focus||{x:bounds.width/2,y:bounds.height/2};view={scale:.9,x:s.width/2-p.x*.9,y:s.height/2-p.y*.9};interacted=true;draw();rebase();};
 const begin=input=>{if(!points.size){source=input;dragged=false;suppress=0;}};
 const move=e=>{
  if(!baseline)return;const p=sample(),c=midpoint(p);if(!c)return;
  if(p.length!==baseline.count){rebase();return;}
  const dx=c.x-baseline.center.x,dy=c.y-baseline.center.y;
  if(p.length===1&&!dragged&&Math.hypot(dx,dy)<=5)return;
  prevent(e);dragged=true;interacted=true;viewport.classList.add('dragging');
  if(p.length===2){
   const d=distance(p);if(baseline.distance<2){rebase();return;}
   const anchor=local(baseline.center.x,baseline.center.y);
   view=zoomAt(baseline.view,d/baseline.distance,anchor.x,anchor.y);
   view.x+=dx;view.y+=dy;
  }else view={...baseline.view,x:baseline.view.x+dx,y:baseline.view.y+dy};
  draw();
 };
 const settle=()=>{if(dragged)suppress=Date.now()+500;if(points.size)rebase();else{source=null;baseline=null;viewport.classList.remove('dragging');}};
 const releaseCaptures=()=>{for(const [id,target] of captures){try{target.releasePointerCapture?.(id);}catch{}}captures.clear();};
 const reset=()=>{if(dragged)suppress=Date.now()+500;points.clear();ownedTouches.clear();source=null;baseline=null;viewport.classList.remove('dragging');releaseCaptures();};

 viewport.addEventListener('wheel',e=>{
  prevent(e);const unit=e.deltaMode===1?16:e.deltaMode===2?size().height:1;
  const delta=Math.max(-400,Math.min(400,e.deltaY*unit));
  zoom(Math.exp(-delta*(e.ctrlKey?.01:.0015)),local(e.clientX,e.clientY));
 },{passive:false,signal});

 // Keep a tap's original target: capturing every contact on the viewport would
 // retarget button clicks. Never transfer capture from a portrait on each move.
 viewport.addEventListener('pointerdown',e=>{
  if(source==='touch'||e.pointerType==='mouse'&&Date.now()-lastTouch<700||e.button!==undefined&&e.button!==0)return;
  begin('pointer');points.set(e.pointerId,{x:e.clientX,y:e.clientY});
  const target=e.target?.setPointerCapture?e.target:viewport;
  if(e.pointerType!=='touch')try{target.setPointerCapture?.(e.pointerId);captures.set(e.pointerId,target);}catch{}
  if(points.size>=2)dragged=true;rebase();
 },{signal});
 viewport.addEventListener('pointermove',e=>{
  if(source!=='pointer'||!points.has(e.pointerId))return;
  points.set(e.pointerId,{x:e.clientX,y:e.clientY});move(e);
 },{passive:false,signal});
 const endPointer=e=>{if(source!=='pointer'||!points.has(e.pointerId))return;points.delete(e.pointerId);captures.delete(e.pointerId);settle();};
 viewport.addEventListener('pointerup',endPointer,{signal});
 viewport.addEventListener('pointercancel',endPointer,{signal});
 // lostpointercapture bubbles from descendants, including implicit capture on
 // mobile buttons. That notification is not a lifted finger on the viewport.
 viewport.addEventListener('lostpointercapture',e=>{if(e.target===viewport)endPointer(e);},{signal});

 // Full TouchList snapshots provide a stable two-finger path on mobile browsers
 // and embedded webviews. Once received, ignore duplicate PointerEvents.
 const readTouches=e=>{points=new Map(Array.from(e.touches||[]).filter(t=>ownedTouches.has(t.identifier)).map(t=>[t.identifier,{x:t.clientX,y:t.clientY}]));};
 viewport.addEventListener('touchstart',e=>{
  if(source!=='touch'){reset();source='touch';dragged=false;suppress=0;}
  for(const t of Array.from(e.changedTouches||[])){
   if(!t.target||!viewport.contains||viewport.contains(t.target))ownedTouches.add(t.identifier);
  }
  readTouches(e);lastTouch=Date.now();
  if(points.size>=2){dragged=true;prevent(e);}rebase();
 },{passive:false,signal});
 viewport.addEventListener('touchmove',e=>{if(source!=='touch')return;readTouches(e);lastTouch=Date.now();move(e);},{passive:false,signal});
 const endTouch=e=>{
  if(source!=='touch')return;
  for(const t of Array.from(e.changedTouches||[]))ownedTouches.delete(t.identifier);
  readTouches(e);lastTouch=Date.now();if(dragged)prevent(e);settle();
 };
 viewport.addEventListener('touchend',endTouch,{passive:false,signal});
 viewport.addEventListener('touchcancel',endTouch,{passive:false,signal});
 // Safari's page gesture must not compete with the map's own pinch transform.
 for(const type of ['gesturestart','gesturechange','gestureend'])viewport.addEventListener(type,prevent,{passive:false,signal});
 viewport.addEventListener('click',e=>{if(Date.now()<suppress){prevent(e);e.stopPropagation();}},{capture:true,signal});
 viewport.addEventListener('dblclick',e=>{if(e.target.closest('button'))return;prevent(e);zoom(1.3,local(e.clientX,e.clientY));},{signal});
 viewport.addEventListener('keydown',e=>{if(e.target!==viewport)return;let handled=true;switch(e.key){case '+':case '=':zoom(1.2);break;case '-':zoom(1/1.2);break;case '0':fit();break;case 'ArrowLeft':view.x+=45;draw();break;case 'ArrowRight':view.x-=45;draw();break;case 'ArrowUp':view.y+=45;draw();break;case 'ArrowDown':view.y-=45;draw();break;default:handled=false;}if(handled){interacted=true;prevent(e);rebase();}},{signal});
 globalThis.addEventListener?.('blur',reset,{signal});
 let observer=null,lastSize=size();
 if(typeof ResizeObserver==='function'){
  observer=new ResizeObserver(()=>{const next=size();if(next.width===lastSize.width&&next.height===lastSize.height)return;
   if(interacted){view.x+=(next.width-lastSize.width)/2;view.y+=(next.height-lastSize.height)/2;draw();rebase();}else fit();lastSize=next;
  });observer.observe(viewport);
 }
 fit();
 return {fit,zoom,center,setView(next){if(next&&Number.isFinite(next.x)&&Number.isFinite(next.y)&&Number.isFinite(next.scale)&&next.scale>0){view={...next};interacted=true;draw();rebase();}},get view(){return {...view};},destroy(){controller.abort();observer?.disconnect();reset();}};
}
