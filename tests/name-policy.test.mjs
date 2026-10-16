import test from 'node:test';
import assert from 'node:assert/strict';
import {containsProhibitedName,validateName} from '../public/name-policy.mjs';
import {validateName as serverValidate} from '../supabase/functions/_shared/lib/shared/name-policy.mjs';
import {newWorld,addPerson,setBirth} from '../public/model.mjs';
const blocked=['자지','보지','시발','씨발왕','병신','개새끼','섹스','야동왕','강간','자 지','보-지','씨1발','자a지','자\u200b지','ㅅㅣㅂㅏㄹ','ㅂㅗㅈㅣ','시발','ㅅ.ㅂ','ＦＵＣＫ','f.u.c.k','KingFuck','Sh1t','s3x','porn'];
const allowed=['민범','담당자','수빈','지은','김성기','고추농부','신발왕','선물왕','Dickson','Scunthorpe','Classic','Assistant'];
test('client and server reject explicit sexual and abusive names including common disguises',()=>{
 for(const name of blocked){assert.ok(containsProhibitedName(name),name);assert.throws(()=>validateName(name),/성적인 표현|욕설/,name);assert.throws(()=>serverValidate(name),/성적인 표현|욕설/,name);}
});
test('ordinary Korean and English names remain valid; length and invisible characters stay guarded',()=>{
 for(const name of allowed){assert.equal(validateName(name),name);assert.equal(serverValidate(name),name);}
 assert.equal(validateName(' 민범 '),'민범');for(const name of ['',null,'가'.repeat(13),'민\u200b범','민\n범'])assert.throws(()=>validateName(name));
});
test('rejected registration and rename cannot partially mutate identity or birth records',()=>{
 const world=newWorld(),birth={date:'1990-05-10',time:'',city:'서울'};const person=addPerson(world,{id:'clean-user',name:'민범',gender:'M',type:0,birth});world.activeId=person.id;const before=JSON.stringify(world);
 for(const name of blocked){assert.throws(()=>addPerson(world,{id:'blocked-user',name,gender:'M',type:0,birth}));assert.equal(JSON.stringify(world),before);assert.throws(()=>setBirth(world,person.id,{...birth,date:'1991-05-10'},{name}));assert.equal(JSON.stringify(world),before);}
});
