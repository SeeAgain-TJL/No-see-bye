import type { CSSProperties } from 'react';
import type { ThemeName } from '@/lib/themes';

/* A small illustrated natural-history plate for each world. Gradients are paint,
   not animated filters. Repeated details share paths; only groups articulate. */
const delay = (n: number) => ({ '--phase': `${n}s` }) as CSSProperties;
function Wash({ x, y, rx, ry, color }: { x: number; y: number; rx: number; ry: number; color: string }) {
  return <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="url(#study-wash)" color={color} />;
}
function Meadow() {
  return <><defs>
    <linearGradient id="study-wheat" x2="1" y2=".8" gradientUnits="objectBoundingBox"><stop stopColor="#f9e8ac"/><stop offset=".48" stopColor="#bd9950"/><stop offset="1" stopColor="#6b724b"/></linearGradient>
    <linearGradient id="study-wing" x2=".8" y2="1"><stop stopColor="#fff3b0"/><stop offset=".5" stopColor="#edb04f"/><stop offset="1" stopColor="#ba692e"/></linearGradient>
    <g id="study-ear"><path d="M0 3Q-2-16 1-37" stroke="#877b48" fill="none" strokeWidth="1.2"/>{Array.from({length:6}, (_, i) => <g key={i} transform={`translate(0 ${-i*5})`}><path d="M0 1Q-7-1-8-9Q-1-7 0 1M0-1Q7-5 8-12Q1-9 0-1" fill="url(#study-wheat)"/><path d="m-7-8-4-8m18 5 4-8" fill="none" stroke="#b8a36a" strokeWidth=".7"/></g>)}</g>
    <g id="study-swallow-wing"><path d="M0 0C-14-16-35-35-55-35C-54-21-49-10-39-6Q-48-3-43 4Q-39 11-30 10L-32 19Q-28 21-24 10Q-17 13-13 8Z" fill="#263b37" stroke="#eace8a" strokeWidth=".8"/><path d="M-2-1C-16-17-34-29-48-30L-40-18L-45-18L-39-11L-29-7L-34-4Q-40-2-37 3Q-31 10-25 5Q-18 8-13 4Z" fill="url(#study-wing)"/><path d="M-3 0Q-24-19-45-28M-8-1-39-16M-10 1-36-4M-14 2-30 5" fill="none" stroke="#594a35" strokeWidth="1"/><path d="m-44-23 6 3m-7-8 5 2m7 31 3 1m5-2 3 1" stroke="#f3eab5" strokeWidth="2"/ ><circle cx="-32" cy="5" r="2.2" fill="#68a09c"/><circle cx="-27" cy="6.5" r="1.5" fill="#e28a4e"/></g>
  </defs><Wash x={305} y={191} rx={138} ry={67} color="#929654"/>
    {[[-10,126,.68,-22],[48,101,.77,12],[93,116,.78,-11],[145,93,.91,15],[183,112,.7,8],[212,100,1.05,-10]].map(([x,y,k,a],i)=><g key={x} transform={`translate(${150+x} 219) rotate(${a}) scale(${k})`}><g className="study-stalk" style={delay(-i*.63)}><path d={`M0 0Q-6 -40 4 -${y}`} stroke="#78834d" strokeWidth="1.8" fill="none"/><path d="M-1-18Q-25-40-32-65Q-10-52-1-18M0-37Q13-65 26-78Q21-53 0-37" fill="#889455" opacity=".82"/><use href="#study-ear" transform={`translate(4 -${y}) rotate(5)`}/></g></g>)}
    <g className="study-butterfly-flight"><g transform="translate(188 83) rotate(-23) scale(.84)"><g className="study-wing-near"><use href="#study-swallow-wing"/></g><g transform="scale(-1 1)"><g className="study-wing-far"><use href="#study-swallow-wing"/></g></g><ellipse cy="1" rx="2.2" ry="9" fill="#3e4938"/><path d="M0-5q-2-7-6-9m7 9q3-8 7-9" fill="none" stroke="#3e4938" strokeWidth="1.1"/></g></g>
  </>;
}
function Forest() {
  return <><defs><linearGradient id="study-leaf" x2=".8" y2="1"><stop stopColor="#aac78a"/><stop offset=".48" stopColor="#50856b"/><stop offset="1" stopColor="#234f4a"/></linearGradient>
    <g id="study-fern"><path d="M0 0Q-2-61 9-124" stroke="#698866" fill="none" strokeWidth="1.6"/>{Array.from({length:12},(_,i)=>{const y=-8-i*9, x=i*i*.053, l=(13-i*.85)*2;return <g key={i} transform={`translate(${x} ${y})`}><path d={`M0 0Q-${l*.8} -2 -${l} -18Q-${l*.4} -15 0 0M0 -3Q${l*.8} -7 ${l} -24Q${l*.32} -18 0 -3`} fill="url(#study-leaf)"/><path d={`M0 0l-${l*.84} -15M0-3l${l*.8} -17`} stroke="#bad29c" strokeOpacity=".5" strokeWidth=".65"/></g>})}</g>
    <linearGradient id="study-plume" x2=".7" y2="1"><stop stopColor="#83d9e2"/><stop offset=".4" stopColor="#2698aa"/><stop offset="1" stopColor="#194657"/></linearGradient>
  </defs><Wash x={307} y={190} rx={127} ry={77} color="#568574"/>
    {[[228,219,-43,.84],[256,225,-15,.92],[286,222,25,1.2],[337,228,44,.95],[361,216,9,1.28]].map(([x,y,a,k],i)=><g key={x} transform={`translate(${x} ${y}) rotate(${a}) scale(${k})`}><use className="study-stalk" style={delay(-i*.84)} href="#study-fern"/></g>)}
    <g className="study-bird-flight"><g transform="translate(205 103) rotate(-9)"><path d="M11 2Q26-5 40-13L33-4L44-8L29 3L16 9Z" fill="#236077"/><path d="M-15-9Q-5-16 4-6L22-1Q14 12-2 12Q-14 11-15 0Z" fill="#c48045"/><path d="M-16-6Q-13-18-4-14Q3-13 5-6Q-1-3-5 1Q-11 5-16-1Z" fill="url(#study-plume)"/><path d="m-15-6-21 4 20 .3" fill="#263c43"/><path d="M-13-10q4-5 10-3m-9 1 3-1m1 1 2-1m1 2 2-1m1 3 2-1" stroke="#a9ded2" strokeWidth="1" fill="none"/><path d="M-9 4q11 7 20 2Q5 15-5 9Z" fill="#e5ac65"/><path d="m16 2 16-9m-13 11 12-5" stroke="#598a98" fill="none"/><path d="M-14 0q9 3 12-5q-4 12-11 11" fill="#fff1cc"/><circle cx="-11" cy="-7" r="1.7" fill="#102e36"/><circle cx="-11.4" cy="-7.5" r=".6" fill="white"/>
    <g className="study-feather"><path d="M-2 0C7-13 20-29 38-36Q36-28 26-19L34-24Q31-17 18-9L26-13Q22-3 11 0L15 1Q6 6-2 0Z" fill="url(#study-plume)" stroke="#285d68" strokeWidth=".7"/><path d="M3-1q10-15 21-22q-6 12-19 22Z" fill="#267e87"/>{[0,1,2,3,4].map(i=><path key={i} d={`M${7+i*2} ${-6-i*2}l2-1`} stroke="#99d5ce" strokeWidth=".85"/>)}<path d="M1-1Q18-19 35-32M6-2l19-17M8 0l13-9" stroke="#b2e4d7" strokeWidth=".85" fill="none"/></g></g></g>
  </>;
}
function Ocean() {
  return <><defs><radialGradient id="study-bell" cx=".35" cy=".18" r=".95"><stop stopColor="#efffff" stopOpacity=".95"/><stop offset=".32" stopColor="#84dcd8" stopOpacity=".75"/><stop offset=".7" stopColor="#627db0" stopOpacity=".68"/><stop offset="1" stopColor="#333d77" stopOpacity=".88"/></radialGradient><linearGradient id="study-silk" x2="0" y2="1"><stop stopColor="#83ccc9"/><stop offset=".55" stopColor="#8c85ba" stopOpacity=".85"/><stop offset="1" stopColor="#7971a9" stopOpacity=".12"/></linearGradient>
    <g id="study-jelly"><g className="study-tentacles" fill="none" stroke="url(#study-silk)" strokeLinecap="round">{Array.from({length:11},(_,i)=>{const x=-34+i*6.8, s=i%2?1:-1;return <path key={i} d={`M${x} 0c${-8*s} 17 ${14*s} 26 ${3*s} 42s${-8*s} 26 ${5*s} ${36+i%4*5}`} strokeWidth={i%3===0?1.8:1} />})}<path d="M-13 0c-15 18 18 17 0 36s9 19 0 29M8 0c15 14-12 22-4 32s14 18 4 31" strokeWidth="5" opacity=".72"/></g>
    <g className="study-bell"><path d="M-43 2C-43-25-26-44-3-45C21-47 40-29 44-5Q46 2 39 5Q34 9 29 5Q23 11 17 7Q9 13 3 8Q-3 13-10 8Q-18 11-23 5Q-33 9-36 3Z" fill="url(#study-bell)" stroke="#a1dcd9" strokeWidth="1.3"/><path d="M-42 2Q-4-11 43-3M-37-10Q-28-37-6-41M-26 2Q-26-23-8-40M-12 5Q-16-13-6-38M4 6Q13-14-1-40M24 2Q28-22 4-39" fill="none" stroke="#e6fffa" strokeOpacity=".67" strokeWidth=".9"/><path d="M-38-1Q-5-13 39-3Q6-7-35 1Z" fill="#8aaabf" opacity=".55"/>{Array.from({length:22},(_,i)=><circle key={i} cx={-38+i*3.55} cy={1.8-6*Math.sin(i/21*Math.PI)} r={i%3===0?.9:.58} fill="#d5fff2"/>)}<g fill="none" stroke="#cfc2e7" strokeWidth="1.65">{[15,103,192,280].map(a=><ellipse key={a} cx="4" cy="-21" rx="4.5" ry="3.2" transform={`rotate(${a} 0 -17)`}/>)}</g></g></g>
  </defs><Wash x={273} y={135} rx={118} ry={83} color="#8994be"/>
    <g transform="translate(313 105) rotate(17) scale(.53)" opacity=".7"><g className="study-drift-late"><use href="#study-jelly"/></g></g><g className="study-drift"><g transform="translate(233 104) rotate(-14)"><use href="#study-jelly"/></g></g>
  </>;
}
function Ice() {
  return <><defs>
    <linearGradient id="study-aurora" x1="0" y1="0" x2=".2" y2="1"><stop stopColor="#aea7e1" stopOpacity="0"/><stop offset=".43" stopColor="#a79bd8" stopOpacity=".25"/><stop offset=".83" stopColor="#67d6ce" stopOpacity=".78"/><stop offset="1" stopColor="#c3fff1" stopOpacity=".9"/></linearGradient>
    <linearGradient id="study-floe" x1="0" y1="0" x2=".84" y2="1"><stop stopColor="#f4ffff"/><stop offset=".44" stopColor="#afdbdf"/><stop offset="1" stopColor="#5493ad"/></linearGradient>
    <linearGradient id="study-water" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#b4dce3" stopOpacity="0"/><stop offset=".45" stopColor="#77a7bb" stopOpacity=".7"/><stop offset="1" stopColor="#b1dbdc" stopOpacity="0"/></linearGradient>
    <clipPath id="study-ice-face"><path d="M95 174l20-8 11-1 11-1 7-7 6-3 8-8 13 3 10-1 7-12 6-7 4-8 9 4 5 1 7-12 5-7 7-11 7-10 9 6 6 2 7 6 7 21 6-5 7-3 16 15 11-3 11 0 7 12 7 14 28 5v16q-91 17-151 2t-114 0Z"/></clipPath>
    <g id="study-curtain"><path d="M61 100C121 120 141 25 187 44S212 82 247 54S302 18 355 32L365 0C293-16 275 14 240 32S211 38 187 22S126 56 106 76Q82 98 61 100Z" fill="url(#study-aurora)"/>
    {Array.from({length:32},(_,i)=>{const x=98+i*7.6,y=64-23*Math.sin((i-4)*.29)-i*.65;return <path key={i} d={`M${x} ${y+12}q8 -14 14 -36`} stroke="#a1dcd8" strokeOpacity={.09+(i%3)*.04} fill="none"/>})}</g>
  </defs><Wash x={268} y={161} rx={115} ry={57} color="#799eb5"/><g className="study-aurora"><use href="#study-curtain"/></g><g opacity=".53" transform="translate(94 25) scale(.77)"><use className="study-aurora-late" href="#study-curtain"/></g>
    <g transform="translate(1 7)"><path d="M95 174L118 164L137 164L158 146L181 148L198 121L212 126L238 86L260 100L267 121L280 113L296 128L318 125L332 151L360 156V172Q269 189 209 174T95 174Z" fill="url(#study-floe)"/><path d="M158 146l23 2 17-27-9 35-13 10Zm54-20 26-40-12 52-13 12 8-20Zm26-40 22 14 7 21-16 17 4-27Zm42 27 16 15-8 14-14 8 9-21Zm38 12 14 26 28 5-33 7-15-15Z" fill="#598aa7" opacity=".85"/><g clipPath="url(#study-ice-face)" opacity=".58"><image href="/visuals/films/iceberg-preview.webp" x="90" y="79" width="280" height="108" preserveAspectRatio="xMidYMid slice"/></g><path d="M96 174Q159 164 203 171T293 169T365 166L365 176Q306 187 229 178T96 174" fill="#84aebc"/><path d="m178 162 14-13m10-5 4-10m20 19 12-16 4-17m24 35 9-10m26 8 7-6" stroke="#e9ffff" strokeWidth="1.15" fill="none"/></g>
    <g className="study-reflection" fill="url(#study-water)"><path d="M73 187q93-8 163-1t132-1q-80 9-153 3t-142-1M139 197q61-6 124-2t78-1q-51 7-101 3t-101 0"/></g>
  </>;
}
function Gorge() {
  return <><defs><linearGradient id="study-rock" x2=".7" y2="1"><stop stopColor="#d0a379"/><stop offset=".45" stopColor="#97725d"/><stop offset="1" stopColor="#57525b"/></linearGradient><linearGradient id="study-falls" x2=".18" y2="1"><stop stopColor="#b1dbcd"/><stop offset=".27" stopColor="#e5f9e8"/><stop offset=".72" stopColor="#98c8c6"/><stop offset="1" stopColor="#def2e3" stopOpacity=".23"/></linearGradient>
    <clipPath id="study-stream"><path d="M207 81q10-6 29-7c-6 11-9 22-13 34s-11 17-12 28q-4 21-9 36q-19 9-44 7c7-16 11-27 16-40s12-21 21-31q7-11 12-27Z"/></clipPath>
    <clipPath id="study-cliff"><path d="M89 184q19-4 31-15l4-7 6-15 10-4 15-3 5-6 5-13 9-4 12-3 4-8 4-19 5-14 7-3 13-1 10-4 6-3 5-9 8-1 13 1 7-5 4-8 10 1 12-2 8 4 8-3 9-7 8 2 13 1 18 3v186l-45-7-28 3-22-5-35 3-20-6-33-5-25-8-20 1-18-8-20-3-6-4Z"/></clipPath>
    <g id="study-swift"><path d="M-21-4Q-9-6-1-1Q8-11 23-13Q11-7 3 1L8 3L1 3L-4 6l1-5Q-10-2-21-4" fill="#424a48"/></g>
  </defs><Wash x={282} y={174} rx={109} ry={66} color="#b79278"/>
    <g clipPath="url(#study-cliff)"><path d="M78 27h292v192H78Z" fill="url(#study-rock)"/>
    <image href="/visuals/films/rift-preview.webp" x="-213" y="6" width="580" height="242" preserveAspectRatio="none" opacity=".77"/>
    {Array.from({length:13},(_,i)=>{const y=55+i*10;return <path key={y} d={`M80 ${y+48}q30 -8 50 -16t43 -7q18 -2 36 -10t38 -5q13 2 32 -8t32 -5q16 1 30 -6t31 -7`} fill="none" stroke={['#e3bb91','#4e5351','#bc8b69'][i%3]} opacity={i%3===0?.47:.35} strokeWidth={i%3===1?1.2:.7}/>})}
    <path d="m313 43-9 18 6 16-16 11 1 27-11 16-5 34M239 58l-8 24 3 13-13 18-3 30M352 47l-12 25 4 17-11 17-5 38" stroke="#614f47" strokeWidth="1.6" fill="none" opacity=".7"/>
    <path d="m98 184 61-46 14-2 4-19 13-1 13-44 6 5-8 44-20 21-13 15-24 6-13 16Z" fill="#5c5d54" opacity=".7"/></g>
    <g clipPath="url(#study-stream)"><path d="M153 74h90v109h-90Z" fill="url(#study-falls)"/>
      <image href="/visuals/films/rift-preview.webp" x="89" y="62" width="249" height="120" preserveAspectRatio="none" opacity=".95"/>
      <g fill="none" strokeLinecap="round" stroke="#f5ffef" opacity=".54">{[0,1,2,3,4,5,6,7].map(v=><path key={v} className="study-cascade" style={delay(-v*.26)} strokeWidth={v%2?.65:1} d={`M${207+v*3.3} 77q-1 10-6 25c-6 18-17 24-20 39s-8 23-12 35`}/>)}</g>
    </g>
    <g className="study-spray">{[0,1,2,3,4,5].map(i=><ellipse key={i} cx={179+i*5.8} cy={171-Math.sin(i*2)*2} rx={5+i%3*2} ry={2+i%4} fill="#dbeddf" opacity=".44"/>)}<Wash x={194} y={170} rx={39} ry={22} color="#e6f6dd"/><path d="M145 176q24-7 45-4t40-2m-64 9q33-3 58 1" fill="none" stroke="#b1cdc0" strokeWidth="1.4"/></g>
    <g className="study-soar"><use href="#study-swift" transform="translate(181 53) rotate(-9)"/><use href="#study-swift" transform="translate(149 69) rotate(5) scale(.58)"/></g>
  </>;
}
const plates = { grassland: Meadow, forest: Forest, ocean: Ocean, iceberg: Ice, rift: Gorge };
export default function FieldStudy({ theme }: { theme: ThemeName }) {
  const Plate = plates[theme];
  return <svg viewBox="0 0 360 216" className="field-study" data-study={theme} aria-hidden="true" focusable="false">
    <defs><radialGradient id="study-wash"><stop stopColor="currentColor" stopOpacity=".49"/><stop offset=".55" stopColor="currentColor" stopOpacity=".24"/><stop offset="1" stopColor="currentColor" stopOpacity="0"/></radialGradient></defs><Plate/>
  </svg>;
}
