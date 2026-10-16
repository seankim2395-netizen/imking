// Shared nickname checks. Keep this identical in the browser and server bundle.
export const NAME_POLICY_ERROR='성적인 표현이나 욕설은 이름에 사용할 수 없습니다. 다른 이름을 입력해주세요.';
const KOREAN_WORDS=[
 '자지','보지','잠지','좆','좃','씹','불알','부랄','후장','페니스','바기나',
 '섹스','섹쓰','쎅스','쎅쓰','야동','포르노','자위','딸딸이','빠구리','강간','성폭행',
 '시발','씨발','시팔','씨팔','씨벌','시벌','쒸발','쉬발','씨이발','시이발',
 'ㅅㅂ','ㅆㅂ','ㅂㅅ','ㅂㅈ','ㅈㅈ','병신','븅신','빙신','개새끼','개색끼','새끼',
 '느금마','니애미','니애비','니미','지랄','염병','썅','닥쳐','꺼져','미친놈','미친년',
];
const FINAL_TO_INITIAL=['ᄀ','ᄁ','ᄀᄉ','ᄂ','ᄂᄌ','ᄂᄒ','ᄃ','ᄅ','ᄅᄀ','ᄅᄆ','ᄅᄇ','ᄅᄉ','ᄅᄐ','ᄅᄑ','ᄅᄒ','ᄆ','ᄇ','ᄇᄉ','ᄉ','ᄊ','ᄋ','ᄌ','ᄎ','ᄏ','ᄐ','ᄑ','ᄒ'];
function koreanKey(value){return value.normalize('NFKD').replace(/[\u11a8-\u11c2]/g,c=>FINAL_TO_INITIAL[c.charCodeAt(0)-0x11a8]).replace(/[^\u1100-\u11ff]/g,'');}
const KOREAN_KEYS=KOREAN_WORDS.map(koreanKey);
// Word boundaries avoid blocking ordinary names such as Dickson or Scunthorpe.
const ENGLISH_WORDS=/(?:^|[^a-z])(?:fuck(?:ing|er|ers|you|off)?|fck|fxxk|shit(?:ty)?|bitch(?:es)?|cunt|pussy|dick|cock|penis|vagina|porn(?:hub)?|sex|sexy)(?:$|[^a-z])/;
export function containsProhibitedName(value){
 if(typeof value!=='string')return false;
 const canonical=value.normalize('NFKC').replace(/([a-z])([A-Z])/g,'$1 $2').toLowerCase().replace(/\p{Default_Ignorable_Code_Point}/gu,'');
 const korean=koreanKey(canonical);if(KOREAN_KEYS.some(word=>korean.includes(word)))return true;
 const compact=canonical.replace(/[\p{P}\p{S}\p{Z}\p{N}]/gu,'');
 const leet=canonical.replace(/[013457]/g,c=>({'0':'o','1':'i','3':'e','4':'a','5':'s','7':'t'}[c])).replace(/[\p{P}\p{S}\p{Z}]/gu,'');
 return [canonical,compact,leet].some(candidate=>ENGLISH_WORDS.test(candidate));
}
export function validateName(value){
 if(typeof value!=='string')throw Error('이름은 1~12자로 적어주세요.');
 const name=value.normalize('NFC').trim();
 if(!name||[...name].length>12)throw Error('이름은 1~12자로 적어주세요.');
 if(containsProhibitedName(name))throw Error(NAME_POLICY_ERROR);
 if(/[\p{Cc}\p{Default_Ignorable_Code_Point}]/u.test(name))throw Error('이름에 보이지 않는 문자나 제어 문자를 사용할 수 없습니다.');
 return name;
}
