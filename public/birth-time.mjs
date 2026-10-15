// The form speaks in 12-hour time; the saju engine and saved records keep HH:mm.
export function birthTimeFields(time=''){
 if(!time)return {period:'unknown',hour:'',minute:''};
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw Error('태어난 시각을 확인해주세요.');
 const [hour,minute]=time.split(':');
 return {period:Number(hour)<12?'am':'pm',hour:String(Number(hour)%12||12),minute};
}
export function birthTimeValue(period,hour,minute){
 if(period==='unknown')return '';
 if(!['am','pm'].includes(period)||!/^([1-9]|1[0-2])$/.test(String(hour))||!(/^[0-5]\d$/).test(String(minute)))throw Error('태어난 시각의 오전·오후, 시, 분을 선택해주세요. 모르면 ‘시간 모름’을 선택하세요.');
 return String(Number(hour)%12+(period==='pm'?12:0)).padStart(2,'0')+':'+minute;
}
