// Vector ornaments keep a clear photo opening at every map zoom level.
export function avatarFrame(style){
 if(!['brass','jade','dragon'].includes(style))return '';
 const rich=style==='dragon',jade=style==='jade',gold=rich?'#e6bb4f':'#bd9141',dark=jade?'#285c4b':'#815027',gem=jade?'#2e9274':'#a34036';
 const repeats=rich?16:12;
 const studs=Array.from({length:repeats},(_,i)=>`<g transform="rotate(${i*360/repeats} 80 80)"><path d="M80 6 L84 12 L80 18 L76 12 Z" fill="${i%2===0?gem:gold}" stroke="#f5dda0" stroke-width="1"/>${rich?'<path d="M75 20 Q70 12 69 19 Q69 24 77 25 M85 20 Q90 12 91 19 Q91 24 83 25" fill="none" stroke="#ddb353" stroke-width="1.6"/>':''}</g>`).join('');
 return `<svg class="avatar-frame" viewBox="0 0 160 160" fill="none" aria-hidden="true" focusable="false"><circle cx="80" cy="80" r="64" stroke="${dark}" stroke-width="8"/><circle cx="80" cy="80" r="68" stroke="${gold}" stroke-width="2"/><circle cx="80" cy="80" r="60" stroke="#f3d380" stroke-width="3"/><circle cx="80" cy="80" r="55" stroke="${gold}" stroke-width="2"/><circle cx="80" cy="80" r="64" stroke="#ecd58a" stroke-width="1.5" stroke-dasharray="2 5"/>${studs}</svg>`;
}
