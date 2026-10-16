// Each monarch owns a circular court; independent kingdoms are separate circles.
// The same world snapshot always produces the same layout.
import {subjects,loyalSubjects,sovereign,isDependent} from './model.mjs';
const TAU=Math.PI*2;
// World-space envelopes include the crown, largest SVG ring, compatibility,
// two-line office/name and status. CSS uses the same fixed portrait/card sizes.
export const MAP_NODE_METRICS={width:224,gap:24,king:{portrait:104,top:96,bottom:184},subject:{portrait:72.8,top:64,bottom:184}};
export function mapNodeBounds(point){const m=point.isKing?MAP_NODE_METRICS.king:MAP_NODE_METRICS.subject;return {left:point.x-MAP_NODE_METRICS.width/2,right:point.x+MAP_NODE_METRICS.width/2,top:point.y-m.top,bottom:point.y+m.bottom};}
function collides(a,b,gap=MAP_NODE_METRICS.gap){const x=mapNodeBounds(a),y=mapNodeBounds(b);return x.left<y.right+gap&&x.right+gap>y.left&&x.top<y.bottom+gap&&x.bottom+gap>y.top;}
// Tighten the spare space at everyday populations, rather than waiting until
// almost 50 people. Portraits and complete label envelopes keep their size.
export function mapSpacing(visibleCount){
 const density=Math.min(1,Math.max(0,(visibleCount-3)/15));
 const gap=MAP_NODE_METRICS.gap-12*density;
 return {gap,countryGap:80-48*density,loyalY:MAP_NODE_METRICS.king.bottom+MAP_NODE_METRICS.subject.top+24,loyalX:(MAP_NODE_METRICS.width+gap)/2};
}
function courtGeometry(king,orbit,loyals,spacing){
 const local=[{id:king.id,x:0,y:0,isKing:true}];
 const stepX=MAP_NODE_METRICS.width+spacing.gap;
 const stepY=MAP_NODE_METRICS.subject.top+MAP_NODE_METRICS.subject.bottom+spacing.gap;
 const above=MAP_NODE_METRICS.king.top+MAP_NODE_METRICS.subject.bottom+24;
 loyals.forEach((p,i)=>local.push({id:p.id,x:loyals.length===1?0:i===0?-spacing.loyalX:spacing.loyalX,y:spacing.loyalY,isKing:false,isLoyal:true,loyalSlot:i+1}));
 // Fill the nearest safe card-sized seats inside the circular country. Fixed
 // concentric rings used to discard their interior space and add a whole new
 // radius even for one extra subject. These seats leave only the label gap.
 const reach=Math.ceil(Math.sqrt(orbit.length+loyals.length+1))+1,candidates=[];
 for(let row=-reach;row<=reach;row++)for(let col=-reach;col<=reach;col++){
  if(!row&&!col)continue;
  // The two reserved confidants occupy the half-offset row below the throne.
  const x=(col+(row===1&&loyals.length===2?.5:0))*stepX;
  const y=row>0?spacing.loyalY+(row-1)*stepY:row<0?-above+(row+1)*stepY:0;
  const point={x,y,isKing:false};
  if(local.some(q=>collides(point,q,spacing.gap-1e-7)))continue;
  const bounds=mapNodeBounds(point);
  const radius=Math.max(...[bounds.left,bounds.right].flatMap(x=>[bounds.top,bounds.bottom].map(y=>Math.hypot(x,y))));
  candidates.push({...point,radius,angle:(Math.atan2(y,x)+Math.PI/2+TAU)%TAU,first:row===-1&&col===0});
 }
 candidates.sort((a,b)=>Number(b.first)-Number(a.first)||a.radius-b.radius||a.angle-b.angle);
 for(let i=0;i<orbit.length;i++){
  const {radius,angle,first,...point}=candidates[i];
  local.push({id:orbit[i].id,...point});
 }
 const radius=Math.max(...local.flatMap(p=>{const b=mapNodeBounds(p);return [Math.hypot(b.left,b.top),Math.hypot(b.right,b.top),Math.hypot(b.left,b.bottom),Math.hypot(b.right,b.bottom)];}))+48;
 return {local,radius};
}
const hash=s=>{let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;};
export function radialLayout(db,focusId=db.activeId,{households=false}={}){
 const all=Object.values(db.people),kings=all.filter(p=>p.isKing),points=Object.create(null),clusters=[],byId=new Map();
 if(!all.length)return {points,clusters,width:800,height:650,focusId:null};
 const visibleCount=all.filter(p=>households||!isDependent(db,p)).length,spacing=mapSpacing(visibleCount);
 const focus=db.people[focusId],centerId=sovereign(db,focus?.id)?.id||kings[0]?.id;
 for(const king of kings){const members=households?all.filter(p=>!p.isKing&&sovereign(db,p.id)?.id===king.id):subjects(db,king.id),loyals=loyalSubjects(db,king.id),orbit=members.filter(p=>!loyals.some(q=>q.id===p.id));const geometry=courtGeometry(king,orbit,loyals,spacing),c={id:king.id,king,members,loyals,orbit,...geometry,x:0,y:0};clusters.push(c);byId.set(c.id,c);}
 const center=byId.get(centerId)||clusters[0],placed=[];
 // Broad-phase circle lookup keeps dense independent kingdoms from requiring
 // a scan of every prior country for every trial position.
 const radii=clusters.map(c=>c.radius).sort((a,b)=>a-b),cellSize=Math.max(256,2*(radii[Math.floor(radii.length/2)]||256)+spacing.countryGap),cells=new Map();
 function eachCell(x,y,r,visit){
  for(let gx=Math.floor((x-r)/cellSize);gx<=Math.floor((x+r)/cellSize);gx++)for(let gy=Math.floor((y-r)/cellSize);gy<=Math.floor((y+r)/cellSize);gy++)if(visit(gx+':'+gy)===false)return false;
  return true;
 }
 function place(c,x,y){
  c.x=x;c.y=y;placed.push(c);
  eachCell(x,y,c.radius,key=>{const list=cells.get(key)||[];list.push(c);cells.set(key,list);});
 }
 function clearAt(c,x,y){return eachCell(x,y,c.radius+spacing.countryGap,key=>{
  for(const p of cells.get(key)||[]){const dx=x-p.x,dy=y-p.y,r=c.radius+p.radius+spacing.countryGap;if(dx*dx+dy*dy<r*r)return false;}
 });}
 if(center)place(center,0,0);
 const others=clusters.filter(c=>c!==center).sort((a,b)=>a.king.joined-b.king.joined||a.id.localeCompare(b.id));
 // Pack new countries around the whole map's center. Following each inviting
 // king outward made a long invitation chain expand across an empty canvas.
 // Invitations still determine ordering and the preferred search direction.
 let pending=[...others],guard=0;
 while(pending.length&&guard++<clusters.length+1){
  const ready=pending.filter(c=>!byId.has(c.king.inviterId)||placed.includes(byId.get(c.king.inviterId))||c.king.inviterId===c.id);
  const batch=ready.length?ready:[pending[0]];
  for(const c of batch){
   const parent=byId.get(c.king.inviterId),anchor=placed.includes(parent)?parent:center;
   const baseAngle=anchor&&anchor!==center?Math.atan2(anchor.y,anchor.x):(hash(c.id)%360)*Math.PI/180;
   let ok=false;
   for(let ring=0;ring<500&&!ok;ring++){
    const distance=(center?.radius||100)+c.radius+spacing.countryGap+ring*64;
    const samples=Math.max(32,Math.ceil(TAU*distance/160));
    for(let i=0;i<samples;i++){
     const a=baseAngle+i*TAU/samples,x=Math.cos(a)*distance,y=Math.sin(a)*distance;
     if(clearAt(c,x,y)){place(c,x,y);ok=true;break;}
    }
   }
   if(!ok)place(c,Math.max(...placed.map(p=>p.x+p.radius))+c.radius+spacing.countryGap,0);
   pending=pending.filter(p=>p!==c);
  }
 }
 for(const c of clusters)for(const p of c.local){const {id,...point}=p;points[id]={...point,x:c.x+p.x,y:c.y+p.y,clusterId:c.id};}
 // Households are collapsed into their visible direct court member.
 const collapsed=households?[]:all.filter(p=>isDependent(db,p));for(const p of collapsed){let owner=db.people[p.liegeId];while(owner&&isDependent(db,owner))owner=db.people[owner.liegeId];if(owner&&points[owner.id])points[p.id]={...points[owner.id],hidden:true,householdOwner:owner.id};}
 const floor=Math.max(0,...clusters.map(c=>c.y+c.radius))+400,loose=all.filter(p=>!points[p.id]);loose.forEach((p,i)=>points[p.id]={x:i*(MAP_NODE_METRICS.width+spacing.gap),y:floor,clusterId:null,isKing:p.isKing});
 const boxes=Object.values(points).filter(p=>!p.hidden).map(mapNodeBounds);
 const minX=Math.min(...clusters.map(c=>c.x-c.radius),...boxes.map(b=>b.left))-80,minY=Math.min(...clusters.map(c=>c.y-c.radius),...boxes.map(b=>b.top))-80,maxX=Math.max(...clusters.map(c=>c.x+c.radius),...boxes.map(b=>b.right))+80,maxY=Math.max(...clusters.map(c=>c.y+c.radius),...boxes.map(b=>b.bottom))+80;
 for(const p of Object.values(points)){p.x-=minX;p.y-=minY;}for(const c of clusters){c.x-=minX;c.y-=minY;delete c.local;}
 return {points,clusters,spacing,width:Math.max(500,maxX-minX),height:Math.max(500,maxY-minY),focusId:center?.id||null};
}
export function fitTransform(bounds,viewport,padding=30){const scale=Math.max(.04,Math.min(1,(viewport.width-padding*2)/bounds.width,(viewport.height-padding*2)/bounds.height));return {scale,x:(viewport.width-bounds.width*scale)/2,y:(viewport.height-bounds.height*scale)/2};}
export function zoomAt(view,factor,x,y,min=.04,max=2.5){const scale=Math.max(min,Math.min(max,view.scale*factor)),ratio=scale/view.scale;return {scale,x:x-(x-view.x)*ratio,y:y-(y-view.y)*ratio};}
