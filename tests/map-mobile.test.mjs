import test from 'node:test';
import assert from 'node:assert/strict';
import {mountMap} from '../public/map-controls.mjs';

function setup(){
 const el=new EventTarget(),captures=new Set(),label={textContent:''};
 const portrait={setPointerCapture:id=>captures.add(id),releasePointerCapture:id=>captures.delete(id)};
 Object.assign(el,{clientWidth:390,clientHeight:570,classList:{add(){},remove(){}},getBoundingClientRect:()=>({left:18,top:120}),contains:target=>target===el||target===portrait,parentElement:{querySelector:()=>label},setPointerCapture:id=>captures.add('viewport-'+id),releasePointerCapture:id=>captures.delete('viewport-'+id)});
 const terrain={style:{}};el.querySelector=selector=>selector==='[data-map-terrain]'?terrain:null;
 const stage={style:{}},control=mountMap(el,stage,{width:1200,height:900},{x:300,y:300});return {el,portrait,captures,label,stage,terrain,control};
}
function fire(el,type,props={},target=el){const e=new Event(type,{cancelable:true});Object.assign(e,props);if(target!==el)Object.defineProperty(e,'target',{value:target});el.dispatchEvent(e);return e;}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const touch=(identifier,x,y,target)=>({identifier,clientX:x,clientY:y,target});

test('pinch starting on a portrait survives bubbled capture loss and continues over multiple pointer moves',()=>{
 const {el,portrait,control}=setup();
 fire(el,'pointerdown',{pointerType:'touch',pointerId:1,button:0,clientX:118,clientY:320},portrait);
 fire(el,'pointerdown',{pointerType:'touch',pointerId:2,button:0,clientX:218,clientY:320},portrait);
 const initial=control.view;
 fire(el,'pointermove',{pointerType:'touch',pointerId:2,clientX:268,clientY:320},portrait);near(control.view.scale,initial.scale*1.5);
 fire(el,'lostpointercapture',{pointerId:2},portrait);
 fire(el,'pointermove',{pointerType:'touch',pointerId:2,clientX:318,clientY:320},portrait);near(control.view.scale,initial.scale*2);
 fire(el,'pointerup',{pointerId:2},portrait);const beforePan=control.view;
 fire(el,'pointermove',{pointerId:1,clientX:138,clientY:330},portrait);near(control.view.x,beforePan.x+20);near(control.view.y,beforePan.y+10);
 fire(el,'pointerup',{pointerId:1},portrait);assert.equal(fire(el,'click',{},portrait).defaultPrevented,true);control.destroy();
});

test('mobile TouchList pinch zooms around its midpoint, ignores duplicate PointerEvents and continues as a one-finger pan',()=>{
 const {el,portrait,control,label}=setup();
 const a=touch(10,118,320,portrait),b=touch(20,218,320,portrait);
 fire(el,'pointerdown',{pointerType:'touch',pointerId:1,button:0,clientX:118,clientY:320},portrait);
 const first=fire(el,'touchstart',{changedTouches:[a],touches:[a]},portrait);assert.equal(first.defaultPrevented,false);
 const second=fire(el,'touchstart',{changedTouches:[b],touches:[a,b]},portrait);assert.equal(second.defaultPrevented,true);
 const initial=control.view,worldX=(150-initial.x)/initial.scale,worldY=(200-initial.y)/initial.scale;
 const movedA=touch(10,88,330,portrait),movedB=touch(20,288,330,portrait);
 const event=fire(el,'touchmove',{touches:[movedB,movedA]},portrait);assert.equal(event.defaultPrevented,true);near(control.view.scale,initial.scale*2);
 // Midpoint moved +20/+10 relative to the viewport while the distance doubled.
 near((170-control.view.x)/control.view.scale,worldX);near((210-control.view.y)/control.view.scale,worldY);
 const noDuplicate=control.view;fire(el,'pointermove',{pointerType:'touch',pointerId:1,clientX:88,clientY:330},portrait);assert.deepEqual(control.view,noDuplicate);
 fire(el,'touchend',{changedTouches:[movedB],touches:[movedA]},portrait);const single=control.view;
 const pan=touch(10,108,345,portrait);fire(el,'touchmove',{touches:[pan]},portrait);near(control.view.x,single.x+20);near(control.view.y,single.y+15);near(control.view.scale,single.scale);
 fire(el,'touchend',{changedTouches:[pan],touches:[]},portrait);assert.equal(fire(el,'click',{},portrait).defaultPrevented,true);assert.equal(label.textContent,Math.round(control.view.scale*100)+'%');control.destroy();
});

test('a portrait tap remains clickable and mouse capture stays on its original target',()=>{
 const {el,portrait,captures,control}=setup();
 fire(el,'pointerdown',{pointerType:'mouse',pointerId:1,button:0,clientX:100,clientY:200},portrait);
 assert.equal(captures.has(1),true);assert.equal(captures.has('viewport-1'),false);
 fire(el,'pointerup',{pointerId:1},portrait);assert.equal(fire(el,'click',{},portrait).defaultPrevented,false);
 const a=touch(3,118,320,portrait);fire(el,'touchstart',{changedTouches:[a],touches:[a]},portrait);fire(el,'touchend',{changedTouches:[a],touches:[]},portrait);
 assert.equal(fire(el,'click',{},portrait).defaultPrevented,false);control.destroy();
});

test('cancelled touches do not leave a stuck gesture and an outside finger never joins the map pinch',()=>{
 const {el,portrait,control}=setup(),outside={},a=touch(1,100,200,portrait),b=touch(2,300,200,outside);
 fire(el,'touchstart',{changedTouches:[a],touches:[a,b]},portrait);const original=control.view;
 fire(el,'touchmove',{touches:[touch(1,120,200,portrait),touch(2,350,200,outside)]},portrait);
 near(control.view.scale,original.scale);near(control.view.x,original.x+20);
 fire(el,'touchcancel',{changedTouches:[a],touches:[b]},portrait);const cancelled=control.view;
 fire(el,'touchmove',{touches:[touch(1,300,400,portrait)]},portrait);assert.deepEqual(control.view,cancelled);
 const next=touch(5,150,300,portrait);fire(el,'touchstart',{changedTouches:[next],touches:[next]},portrait);fire(el,'touchend',{changedTouches:[next],touches:[]},portrait);
 assert.equal(fire(el,'click',{},portrait).defaultPrevented,false);control.destroy();
});

test('wheel modes and trackpad pinch normalize zoom while Safari native gestures are cancelled only on the map',()=>{
 const {el,control}=setup();const start=control.view.scale;
 assert.equal(fire(el,'wheel',{clientX:118,clientY:320,deltaY:-3,deltaMode:1}).defaultPrevented,true);assert.ok(control.view.scale>start);
 const wheel=control.view.scale;fire(el,'wheel',{clientX:118,clientY:320,deltaY:-10,ctrlKey:true});near(control.view.scale,wheel*Math.exp(.1));
 for(const type of ['gesturestart','gesturechange','gestureend'])assert.equal(fire(el,type).defaultPrevented,true);
 control.zoom(1.25);const after=control.view;control.destroy();fire(el,'touchstart',{touches:[],changedTouches:[]});fire(el,'wheel',{clientX:100,clientY:200,deltaY:-100});assert.deepEqual(control.view,after);
});

test('mobile viewport resize preserves chosen scale and the world point at the screen center',()=>{
 const old=globalThis.ResizeObserver;let callback;
 globalThis.ResizeObserver=class{constructor(fn){callback=fn;}observe(){}disconnect(){}};
 try{const {el,control}=setup();control.zoom(1.8);const before=control.view,x=(195-before.x)/before.scale,y=(285-before.y)/before.scale;
  el.clientWidth=570;el.clientHeight=390;callback();near(control.view.scale,before.scale);near((285-control.view.x)/control.view.scale,x);near((195-control.view.y)/control.view.scale,y);control.destroy();
 }finally{if(old===undefined)delete globalThis.ResizeObserver;else globalThis.ResizeObserver=old;}
});

test('terrain covers the viewport independently of world bounds and follows the camera at minimum and maximum zoom',()=>{
 const {el,terrain,control}=setup();
 const aligned=()=>{
  const [tileWidth,tileHeight]=terrain.style.backgroundSize.split(' ').map(parseFloat);
  const [originX,originY]=terrain.style.backgroundPosition.split(' ').map(parseFloat),v=control.view;
  // The repeating landscape's world origin and tile interval stay aligned with
  // portraits even when the relationship graph is far outside the viewport.
  near(tileWidth/v.scale,1440);near(tileHeight/v.scale,1080);near(originX,v.x);near(originY,v.y);
 };
 aligned();control.zoom(.00001);near(control.view.scale,.04);aligned();
 fire(el,'pointerdown',{pointerType:'mouse',pointerId:7,button:0,clientX:100,clientY:200});
 fire(el,'pointermove',{pointerId:7,clientX:100100,clientY:-99800});fire(el,'pointerup',{pointerId:7});
 assert.ok(control.view.x>99000);assert.ok(control.view.y< -99000);aligned();
 control.zoom(10000);near(control.view.scale,2.5);aligned();control.fit();aligned();control.center();aligned();control.destroy();
});

test('phone map opens at readable scale around the actor and still offers the whole map',()=>{
 const {control,label}=setup();near(control.view.scale,1);near((195-control.view.x),300);near((285-control.view.y),300);assert.equal(label.textContent,'100%');
 control.fit();assert.ok(control.view.scale<1);control.center();near(control.view.scale,1);control.destroy();
});
