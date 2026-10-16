import test from 'node:test';import assert from 'node:assert/strict';
import {newWorld,addPerson,makeDemo,appointLoyal,becomeKing} from '../public/model.mjs';
import {radialLayout,mapNodeBounds,MAP_NODE_METRICS,mapSpacing} from '../public/map-layout.mjs';
const add=(w,id,inviterId=null)=>addPerson(w,{id,name:'가나다라마바사아자차카타',gender:'F',type:0,inviterId});
function visible(layout){return Object.entries(layout.points).filter(([,p])=>!p.hidden);}
function assertSeparated(layout,scale=1){const boxes=visible(layout).map(([id,p])=>{const b=mapNodeBounds(p);return {id,...Object.fromEntries(Object.entries(b).map(([k,v])=>[k,v*scale]))};});for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j],gap=12*scale;assert.ok(a.right+gap<=b.left+1e-7||b.right+gap<=a.left+1e-7||a.bottom+gap<=b.top+1e-7||b.bottom+gap<=a.top+1e-7,`${a.id} covers ${b.id} at ${scale}x`);}}
test('the reported servant-above-queen arrangement leaves the entire label below neither face at 133 percent',()=>{const m=radialLayout(makeDemo(),'demo-me'),king=m.points['demo-5'],subject=m.points['demo-6'];assert.ok(Math.abs(subject.x-king.x)<1e-7);assert.ok(subject.y<king.y);const a=mapNodeBounds(subject),b=mapNodeBounds(king);assert.ok((b.top-a.bottom)*1.33>=24*1.33);for(const zoom of [.04,.5,1,1.33,2.5])assertSeparated(m,zoom);});
test('zero, one and two confidants retain safe card spacing across multiple radial rings',()=>{for(const count of [0,1,2,3,6,7,15,36,70])for(const seats of [0,1,2]){if(seats>count)continue;const w=newWorld();add(w,'king');for(let i=0;i<count;i++)add(w,'s'+i,'king');for(let i=0;i<seats;i++)appointLoyal(w,'king','s'+i);w.activeId='king';w.people.king.frame='dragon';const layout=radialLayout(w);assertSeparated(layout);assert.deepEqual(radialLayout(w),layout);if(seats===2){assert.equal(layout.points.s0.y,layout.points.s1.y);assert.ok(layout.points.s0.x<layout.points.king.x&&layout.points.s1.x>layout.points.king.x);}for(const [,point] of visible(layout)){const b=mapNodeBounds(point);assert.ok(b.left>=0&&b.top>=0&&b.right<=layout.width&&b.bottom<=layout.height);}}});
test('expanded households and separate independent countries keep their full cards inside country bounds',()=>{const w=newWorld();add(w,'root');for(let i=0;i<6;i++){add(w,'p'+i,'root');for(let j=0;j<5;j++)add(w,'h'+i+'-'+j,'p'+i);if(i%2===0)becomeKing(w,'p'+i);}appointLoyal(w,'root','p1');appointLoyal(w,'root','p3');w.activeId='root';for(const households of [false,true]){const layout=radialLayout(w,'root',{households});assertSeparated(layout);for(const [,p] of visible(layout)){const c=layout.clusters.find(c=>c.id===p.clusterId),b=mapNodeBounds(p);for(const x of [b.left,b.right])for(const y of [b.top,b.bottom])assert.ok(Math.hypot(x-c.x,y-c.y)<=c.radius-47.9);}}});
test('a maximum-size court is packed without card collisions or missing people',()=>{const w=newWorld();add(w,'root');for(let i=0;i<499;i++)add(w,'s'+i,'root');appointLoyal(w,'root','s0');appointLoyal(w,'root','s1');w.activeId='root';const layout=radialLayout(w);assert.equal(visible(layout).length,500);assertSeparated(layout);assert.equal(MAP_NODE_METRICS.subject.portrait/MAP_NODE_METRICS.king.portrait,.7);});

test('visible population progressively tightens spare spacing without shrinking portraits or labels',()=>{
 let previous=mapSpacing(0);for(const count of [1,6,12,24,36,48,100,500]){const next=mapSpacing(count);assert.ok(next.gap<=previous.gap&&next.countryGap<=previous.countryGap&&next.loyalY<=previous.loyalY);assert.ok(next.gap>=12);previous=next;}
 const w=newWorld();add(w,'root');add(w,'subject','root');for(let i=0;i<30;i++)add(w,'family'+i,'subject');w.activeId='root';
 const collapsed=radialLayout(w,'root'),expanded=radialLayout(w,'root',{households:true});assert.equal(collapsed.spacing.gap,24);assert.ok(expanded.spacing.gap<collapsed.spacing.gap);assertSeparated(expanded);assertSeparated(collapsed);
 assert.equal(MAP_NODE_METRICS.width,224);assert.equal(MAP_NODE_METRICS.subject.portrait,72.8);
});
test('a busy court uses a compact circular footprint while preserving all people and safe labels',()=>{
 const w=newWorld();add(w,'root');for(let i=0;i<50;i++)add(w,'s'+i,'root');appointLoyal(w,'root','s0');appointLoyal(w,'root','s1');w.activeId='root';
 const layout=radialLayout(w);assert.equal(visible(layout).length,51);assert.ok(layout.width<3200,'50 subjects should not spread beyond the compact footprint');assertSeparated(layout);assert.deepEqual(radialLayout(w),layout);
});

// Regression: at modest real populations the previous 320px concentric rings
// left empty seats and increased the country's diameter by almost 600px.
test('ordinary courts fill nearby empty seats before growing a large new outer ring',()=>{
 for(const seats of [0,1,2]){
  const w=newWorld();add(w,'root');w.activeId='root';let previous;
  for(let i=1;i<=29;i++){
   add(w,'s'+i,'root');if(i<=seats)appointLoyal(w,'root','s'+i);
   const layout=radialLayout(w);
   if(i>=6&&previous)assert.ok(layout.width-previous.width<300,'one arrival must not add an entire empty outer ring');
   if(i===16)assert.ok(layout.width<1800,'a 17-person court should use its interior seats');
   assertSeparated(layout);previous=layout;
  }
 }
});
test('long independence chains pack around the whole world rather than walking outward with each invitation',()=>{
 const w=newWorld();add(w,'root');w.activeId='root';let parent='root';
 for(let i=0;i<19;i++){const id='king'+i;add(w,id,parent);add(w,'child'+i,id);becomeKing(w,id);parent=id;}
 const layout=radialLayout(w);assert.equal(layout.clusters.length,20);assert.equal(visible(layout).length,39);
 assert.ok(layout.width<6000&&layout.height<6000,'the invitation chain should stay inside a compact group');
 assertSeparated(layout);assert.deepEqual(radialLayout(w),layout);
 for(let i=0;i<layout.clusters.length;i++)for(let j=i+1;j<layout.clusters.length;j++){
  const a=layout.clusters[i],b=layout.clusters[j];assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>=a.radius+b.radius+32-1e-7);
 }
});
test('a maximum-size world with many separate countries keeps country circles apart',()=>{
 const w=newWorld();add(w,'root');w.activeId='root';let parent='root';
 for(let i=0;i<249;i++){const id='king'+i;add(w,id,parent);add(w,'child'+i,id);becomeKing(w,id);parent=id;}
 add(w,'last','root');const layout=radialLayout(w);
 assert.equal(visible(layout).length,500);assertSeparated(layout);
 for(let i=0;i<layout.clusters.length;i++)for(let j=i+1;j<layout.clusters.length;j++){
  const a=layout.clusters[i],b=layout.clusters[j];assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>=a.radius+b.radius+32-1e-7);
 }
});
test('very different country sizes keep circle boundaries safe when focused on a small or large country',()=>{
 const w=newWorld();add(w,'root');w.activeId='root';
 for(let i=0;i<90;i++)add(w,'root-subject'+i,'root');
 for(let k=0;k<8;k++){const id='king'+k;add(w,id,'root');for(let i=0;i<[45,23,13,8,5,3,2,1][k];i++)add(w,id+'-subject'+i,id);becomeKing(w,id);}
 for(const focus of ['root','king7']){
  const layout=radialLayout(w,focus);assertSeparated(layout);assert.equal(layout.focusId,focus);
  for(let i=0;i<layout.clusters.length;i++)for(let j=i+1;j<layout.clusters.length;j++){
   const a=layout.clusters[i],b=layout.clusters[j];assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>=a.radius+b.radius+32-1e-7);
  }
 }
});
