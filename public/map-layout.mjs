// Each monarch owns a circular court; independent kingdoms are separate circles.
// The same world snapshot always produces the same layout.
import {subjects,loyalSubjects,sovereign,isDependent} from './model.mjs';
const TAU=Math.PI*2;
// World-space envelopes include the crown, largest SVG ring, compatibility,
// two-line office/name and status. CSS uses the same fixed portrait/card sizes.
export const MAP_NODE_METRICS={width:224,gap:24,ringStep:320,loyalY:300,loyalX:124,king:{portrait:104,top:96,bottom:184},subject:{portrait:72.8,top:64,bottom:184}};
export function mapNodeBounds(point){const m=point.isKing?MAP_NODE_METRICS.king:MAP_NODE_METRICS.subject;return {left:point.x-MAP_NODE_METRICS.width/2,right:point.x+MAP_NODE_METRICS.width/2,top:point.y-m.top,bottom:point.y+m.bottom};}
function collides(a,b,gap=MAP_NODE_METRICS.gap){const x=mapNodeBounds(a),y=mapNodeBounds(b);return x.left<y.right+gap&&x.right+gap>y.left&&x.top<y.bottom+gap&&x.bottom+gap>y.top;}
function courtGeometry(king,orbit,loyals){
 const local=[{id:king.id,x:0,y:0,isKing:true}],rings=[];
 loyals.forEach((p,i)=>local.push({id:p.id,x:loyals.length===1?0:i===0?-MAP_NODE_METRICS.loyalX:MAP_NODE_METRICS.loyalX,y:MAP_NODE_METRICS.loyalY,isKing:false,isLoyal:true,loyalSlot:i+1}));
 let at=0,index=0,lastRadius=0;
 while(at<orbit.length){const take=Math.min(orbit.length-at,(loyals.length?4:6)+index*5),angleOffset=-Math.PI/2+index*.22;let radius=Math.max(MAP_NODE_METRICS.ringStep*(index+1),lastRadius+MAP_NODE_METRICS.ringStep),candidates;
  for(;;){candidates=Array.from({length:take},(_,i)=>{const a=loyals.length?Math.PI*.88+(i+.5)*(Math.PI*1.24)/take:angleOffset+i*TAU/take;return {id:orbit[at+i].id,x:Math.cos(a)*radius,y:Math.sin(a)*radius,isKing:false};});
   if(candidates.every((p,i)=>local.every(q=>!collides(p,q))&&candidates.slice(0,i).every(q=>!collides(p,q))))break;
   radius+=24;
  }
  local.push(...candidates);rings.push({take,radius});lastRadius=radius;at+=take;index++;
 }
 const radius=Math.max(...local.flatMap(p=>{const b=mapNodeBounds(p);return [Math.hypot(b.left,b.top),Math.hypot(b.right,b.top),Math.hypot(b.left,b.bottom),Math.hypot(b.right,b.bottom)];}))+48;
 return {local,rings,radius};
}
const hash=s=>{let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;};
export function radialLayout(db,focusId=db.activeId,{households=false}={}){
 const all=Object.values(db.people),kings=all.filter(p=>p.isKing),points=Object.create(null),clusters=[],byId=new Map();
 if(!all.length)return {points,clusters,width:800,height:650,focusId:null};
 const focus=db.people[focusId],centerId=sovereign(db,focus?.id)?.id||kings[0]?.id;
 for(const king of kings){const members=households?all.filter(p=>!p.isKing&&sovereign(db,p.id)?.id===king.id):subjects(db,king.id),loyals=loyalSubjects(db,king.id),orbit=members.filter(p=>!loyals.some(q=>q.id===p.id));const geometry=courtGeometry(king,orbit,loyals),c={id:king.id,king,members,loyals,orbit,...geometry,x:0,y:0};clusters.push(c);byId.set(c.id,c);}
 const center=byId.get(centerId)||clusters[0],placed=[];
 function place(c,x,y){c.x=x;c.y=y;placed.push(c);}
 if(center)place(center,0,0);
 const others=clusters.filter(c=>c!==center).sort((a,b)=>a.king.joined-b.king.joined||a.id.localeCompare(b.id));
 // Prefer growth near the inviting country; search an outward spiral to avoid
 // overlapping any existing country's full ring, not just its king's icon.
 let pending=[...others],guard=0;
 while(pending.length&&guard++<clusters.length+1){const ready=pending.filter(c=>!byId.has(c.king.inviterId)||placed.includes(byId.get(c.king.inviterId))||c.king.inviterId===c.id);const batch=ready.length?ready:[pending[0]];for(const c of batch){const parent=byId.get(c.king.inviterId),anchor=placed.includes(parent)?parent:center;const baseAngle=((hash(c.id)%360)*Math.PI/180),originX=anchor?.x||0,originY=anchor?.y||0;let ok=false;
  for(let ring=0;ring<300&&!ok;ring++){const distance=(anchor?.radius||100)+c.radius+95+ring*110;for(let i=0;i<32;i++){const a=baseAngle+i*TAU/32,x=originX+Math.cos(a)*distance,y=originY+Math.sin(a)*distance;if(placed.every(p=>Math.hypot(x-p.x,y-p.y)>=c.radius+p.radius+80)){place(c,x,y);ok=true;break;}}}
  if(!ok)place(c,(placed.length+1)*(c.radius*2+300),0);
  pending=pending.filter(p=>p!==c);
 }}
 for(const c of clusters)for(const p of c.local){const {id,...point}=p;points[id]={...point,x:c.x+p.x,y:c.y+p.y,clusterId:c.id};}
 // Households are collapsed into their visible direct court member.
 const collapsed=households?[]:all.filter(p=>isDependent(db,p));for(const p of collapsed){let owner=db.people[p.liegeId];while(owner&&isDependent(db,owner))owner=db.people[owner.liegeId];if(owner&&points[owner.id])points[p.id]={...points[owner.id],hidden:true,householdOwner:owner.id};}
 const floor=Math.max(0,...clusters.map(c=>c.y+c.radius))+400,loose=all.filter(p=>!points[p.id]);loose.forEach((p,i)=>points[p.id]={x:i*(MAP_NODE_METRICS.width+MAP_NODE_METRICS.gap),y:floor,clusterId:null,isKing:p.isKing});
 const boxes=Object.values(points).filter(p=>!p.hidden).map(mapNodeBounds);
 const minX=Math.min(...clusters.map(c=>c.x-c.radius),...boxes.map(b=>b.left))-80,minY=Math.min(...clusters.map(c=>c.y-c.radius),...boxes.map(b=>b.top))-80,maxX=Math.max(...clusters.map(c=>c.x+c.radius),...boxes.map(b=>b.right))+80,maxY=Math.max(...clusters.map(c=>c.y+c.radius),...boxes.map(b=>b.bottom))+80;
 for(const p of Object.values(points)){p.x-=minX;p.y-=minY;}for(const c of clusters){c.x-=minX;c.y-=minY;delete c.local;}
 return {points,clusters,width:Math.max(500,maxX-minX),height:Math.max(500,maxY-minY),focusId:center?.id||null};
}
export function fitTransform(bounds,viewport,padding=30){const scale=Math.max(.04,Math.min(1,(viewport.width-padding*2)/bounds.width,(viewport.height-padding*2)/bounds.height));return {scale,x:(viewport.width-bounds.width*scale)/2,y:(viewport.height-bounds.height*scale)/2};}
export function zoomAt(view,factor,x,y,min=.04,max=2.5){const scale=Math.max(min,Math.min(max,view.scale*factor)),ratio=scale/view.scale;return {scale,x:x-(x-view.x)*ratio,y:y-(y-view.y)*ratio};}
