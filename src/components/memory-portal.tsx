'use client';
import { useId, useState, type PointerEvent } from 'react';
import { Icon } from './icons';

const editions = [
  ['dusk', '01 / THE INNER GARDEN', '风起，草木有信。', '轻触，唤起一阵风'],
  ['sea', '02 / LETTERS FROM THE TIDE', '潮声有期，来信无尽。', '轻触，寄一封海信'],
  ['film', '03 / A FRAME OF YESTERDAY', '光阴经过，故事留影。', '轻触，让旧光显影'],
  ['night', '04 / THE FOREST AFTER DARK', '穿过长夜，星光有归。', '轻触，点亮林间星河'],
] as const;

/** Original layered anime scenery: the setting and its response belong to each edition. */
export function MemoryPortal() {
  const [awakened, setAwakened] = useState(false);
  const prefix = useId().replace(/:/g, '');
  const scene = prefix + '-scene';
  const traveler = prefix + '-traveler';
  const fern = prefix + '-fern';
  function move(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === 'touch' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--scene-x', ((event.clientX - bounds.left) / bounds.width - .5).toFixed(3));
    event.currentTarget.style.setProperty('--scene-y', ((event.clientY - bounds.top) / bounds.height - .5).toFixed(3));
  }
  function leave(event: PointerEvent<HTMLButtonElement>) {
    event.currentTarget.style.removeProperty('--scene-x');
    event.currentTarget.style.removeProperty('--scene-y');
  }
  return <button type='button' className='memory-portal anime-portal' aria-label='唤醒主题风景' aria-pressed={awakened} data-awakened={awakened}
    onClick={() => setAwakened(value => !value)} onPointerMove={move} onPointerLeave={leave}>
    <span className='anime-scene-window' aria-hidden='true'>
    <svg className='anime-scene' viewBox='22 19 556 322' preserveAspectRatio='xMidYMid slice' fill='none'>
      <defs>
        <clipPath id={scene}><rect x='22' y='19' width='556' height='322' rx='5' /></clipPath>
        <linearGradient id={prefix + '-garden-sky'} x1='300' y1='20' x2='300' y2='340' gradientUnits='userSpaceOnUse'><stop stopColor='#bed7bd' /><stop offset='1' stopColor='#edf0c8' /></linearGradient>
        <linearGradient id={prefix + '-sea-sky'} x1='300' y1='20' x2='300' y2='340' gradientUnits='userSpaceOnUse'><stop stopColor='#8ec5cf' /><stop offset='.7' stopColor='#dce9dc' /><stop offset='1' stopColor='#eddfc1' /></linearGradient>
        <linearGradient id={prefix + '-sea-water'} x1='300' y1='208' x2='300' y2='341' gradientUnits='userSpaceOnUse'><stop stopColor='#7bafb4' /><stop offset='.16' stopColor='#568e9c' /><stop offset='1' stopColor='#326b79' /></linearGradient>
        <linearGradient id={prefix + '-film-sky'} x1='300' y1='20' x2='300' y2='340' gradientUnits='userSpaceOnUse'><stop stopColor='#b78b7c' /><stop offset='.65' stopColor='#ebc49a' /><stop offset='1' stopColor='#f4deb5' /></linearGradient>
        <linearGradient id={prefix + '-night-sky'} x1='300' y1='20' x2='300' y2='340' gradientUnits='userSpaceOnUse'><stop stopColor='#102c32' /><stop offset='.6' stopColor='#28534d' /><stop offset='1' stopColor='#718878' /></linearGradient>
        <linearGradient id={prefix + '-glass'} x1='174' y1='58' x2='415' y2='280' gradientUnits='userSpaceOnUse'><stop stopColor='#fffce4' stopOpacity='.38' /><stop offset='.35' stopColor='#fffce4' stopOpacity='.02' /><stop offset='.72' stopColor='#fffce4' stopOpacity='.14' /><stop offset='1' stopColor='#fffce4' stopOpacity='.01' /></linearGradient>
        <pattern id={prefix + '-paper-grain'} width='23' height='19' patternUnits='userSpaceOnUse'><path d='m2 4 2-.7m11 9 1.5-.4m-7 3 .7-.3m11-12 1-.4' stroke='#f5f1d8' strokeWidth='.55' opacity='.2' /><path d='m6 9 1-.3m13 8 1-.7m-7-13 .8-.5' stroke='#15382e' strokeWidth='.5' opacity='.12' /></pattern>
        <symbol id={fern} viewBox='0 0 70 95'><path d='M31 94c10-23 0-56 19-86' stroke='#6a9270' strokeWidth='1' /><path d='M38 74C13 73 9 62 7 50c17 4 26 12 31 24Zm0-15c19-2 29-12 32-24-15 4-26 11-32 24Zm1-11C19 43 18 34 18 25c12 5 19 13 21 23Zm4-12c15-4 22-14 22-24-12 6-18 13-22 24Zm2-13C35 18 34 9 38 0c8 6 10 14 7 23Z' fill='#567d61' /><path d='m38 74-25-17m25 2 26-18m-25 7-17-17m21 5 18-18' stroke='#99ad83' strokeWidth='.45' /></symbol>
        <symbol id={traveler} viewBox='0 0 80 180'>
          <ellipse cx='42' cy='176' rx='23' ry='2.4' fill='#263e36' opacity='.22' />
          <path d='m29 108 2 28-3 31 10 1 5-31 3-28m0 1 2 29 6 29 9-2-4-32-2-25' fill='#324b42' stroke='#243b33' strokeWidth='.8' />
          <path d='m32 120 4 18-3 27m20-44 1 16 6 27' stroke='#6e7f64' strokeWidth='1.1' />
          <path d='m27 164-2 10-7 2v3h21l1-14m12 0 3 14h17v-4l-9-5-3-7' fill='#263a32' /><path d='M21 176h16m20 0h12' stroke='#d1cba6' strokeWidth='.6' />
          <path d='m28 47-9 12-7 41 8 3 11-34m22-22 12 14 5 36-8 3-9-29' fill='#ded9bd' stroke='#5f7560' strokeWidth='.7' />
          <path d='m21 62-1 23-5 13m46-36 2 23 4 12' stroke='#a5af94' strokeWidth='1' /><path d='m14 100-2 8 3 4 4-2 1-7m43-3 1 9 4 2 3-4-2-10' fill='#dcae91' stroke='#a67d64' strokeWidth='.5' />
          <path d='M28 45c7-4 17-4 25 0l2 32 8 43-22 5-22-5 8-44Z' fill='#e8e0c6' stroke='#5f7560' strokeWidth='.8' />
          <path d='m30 49-3 32-5 36 12 2 4-42-2-31m15 1-4 31 4 42 11-3-8-37Z' fill='#c3c8a8' opacity='.65' /><path d='M40 52v68m-12-44 12 4 14-4m-15 6-11 16m15-15 12 18m-31 14 13 2m9-1 12-2' stroke='#9aab8b' strokeWidth='.85' />
          <path d='m27 93 9 2-1 11-9-1m21-11 9-2 1 12-8 2' stroke='#93a182' strokeWidth='.8' />
          <path d='m27 48 28 41' stroke='#5b6853' strokeWidth='3.2' /><path d='m29 48 28 41' stroke='#d6c9a1' strokeWidth='.65' />
          <path d='m47 86 23 1-1 25-23 1Z' fill='#bb865e' stroke='#775d44' strokeWidth='1' /><path d='m47 87 22 1-1 10-22-1Z' fill='#c69c70' /><path d='m48 100 19 1m-12-4v6h5v-6' stroke='#70583f' strokeWidth='.8' /><path d='M49 108h14' stroke='#e0c59b' strokeWidth='.7' />
          <path d='m34 32-1 13c5 6 11 6 16 0l-1-12Z' fill='#dab195' /><path d='M28 26C25 9 34 3 44 5c12 1 17 10 14 23l-2 21-7-8-7 4-4-4-7 7-3-18Z' fill='#263e35' stroke='#18362b' strokeWidth='.8' />
          <path d='M31 22c3-10 14-14 22-6m-22 9c2 8 1 12-1 18m6-23c-1 7 2 13 0 19m7-21c4 7 3 14 2 23m5-21c5 7 4 15 4 21' stroke='#668167' strokeWidth='.75' /><path d='m53 13 4 11-1 14-3-8' fill='#45634c' opacity='.7' />
          <path d='M31 40c6-2 13-1 21 1l-1 6c-9-3-14-3-21-1Z' fill='#ba7765' /><path d='m33 42 15 2' stroke='#e2aa8c' strokeWidth='.8' />
          <path className='anime-traveler-scarf' d='M49 42c15 1 21-8 31-11l15 3-9 5c-15-1-15 11-36 8Z' fill='#ce8b72' stroke='#ad735e' strokeWidth='.55' />
        </symbol>
      </defs>

      <g className='anime-edition anime-edition-dusk' clipPath={'url(#' + scene + ')'}>
        <path fill={'url(#' + prefix + '-garden-sky)'} d='M22 19h556v322H22z' />
        <g className='anime-depth-far'>
          <circle cx='423' cy='88' r='39' fill='#edf0cf' />
          <path d='M-5 210c79-26 112-73 181-70s83 49 146 33 121-52 186-21 68 23 106 13v176H-5Z' fill='#a5bfa0' />
          <path d='M-15 257c56-34 129-45 203-25s147-55 203-31 124 25 220-25v190H-15Z' fill='#779e87' />
          <path d='M384 54c14-10 30-10 46-5m-315 74c30-15 68-16 98-8' stroke='#f5f2d1' strokeWidth='2' strokeLinecap='round' opacity='.7' />
          <path d='M31 172c19-14 27-29 36-44l20 19 24-31 35 24 25-16 33 22m160 27 31-43 19 23 18-34 24 28 15-20 29 27 20-10 34 26' stroke='#799a7b' strokeWidth='1' opacity='.55' />
          {Array.from({length:23},(_,i)=><path key={i} d={`M${36+i*23} ${192+(i*13)%31}v-18m-4 9 4-7 5 8m-8-5 3-5 4 5`} stroke='#5f896b' strokeWidth='.65' opacity='.42' />)}
        </g>
        <g className='anime-depth-middle'>
          <path d='M125 280V139c0-78 77-116 174-116s175 38 175 116v141' fill='#e8eac9' fillOpacity='.17' stroke='#e3e9cb' strokeWidth='3' />
          <path d='M299 23v257M125 143h349M153 96h292M145 211h310M199 41v239M399 41v239' stroke='#e3e9cb' strokeWidth='1.2' opacity='.65' />
          <path d='M125 280V139c0-78 77-116 174-116s175 38 175 116v141' stroke='#486f59' strokeWidth='1' />
          <path d='M138 280V139c0-68 69-105 161-105s162 37 162 105v141M189 280V117c0-39 48-82 110-93 64 14 110 56 110 93v163M244 279V88c0-29 19-52 55-65 37 14 56 37 56 65v191' stroke='#f4f1d6' strokeWidth='.65' opacity='.55' />
          <path d='m145 110 42-26v63l-42 41Zm59-61 35-15v102l-35 44Zm101-16 43 10v80l-43 34Zm103 33 36 28v73l-36 43Z' fill={'url(#' + prefix + '-glass)'} />
          <path d='M126 143h348m-349 70h350M199 41v239m200-239v239' stroke='#436d55' strokeWidth='.65' opacity='.5' />
          {[143,211].map(y=><g key={y} fill='#50745b'>{[126,199,299,399,473].map(x=><circle key={x} cx={x} cy={y} r='1.3' />)}</g>)}
          <path d='M213 51v75m-16-18h32m-27 0 4 18h18l4-18M375 49v67m-17-18h33m-28 0 4 18h18l4-18' stroke='#6a8c6a' strokeWidth='1' /><path d='M208 110c-15-16-15-24-10-32 11 7 14 17 10 32Zm5-6c-3-18 1-26 11-32 3 12 0 23-11 32Zm160-4c-13-11-16-21-12-30 11 6 15 16 12 30Zm7-1c3-17 12-23 22-22-3 13-10 20-22 22Z' fill='#6d965f' />
          <path d='m218 252 176 8 102 82H98Z' fill='#c2c6a2' /><path d='m263 256-39 86m88-86 25 86m-178-49h274m-307 24h336' stroke='#7b9278' strokeWidth='1' />
          <path d='m228 259-78 82h35l66-82Zm91 0 58 82h32l-70-82Z' fill='#738d6c' opacity='.2' /><path d='m299 259 5 81m-90-63h175m-240 50h326' stroke='#e2e0bd' strokeWidth='.6' opacity='.55' />
          <path d='M126 252h105v9H126Zm273 0h75v9h-75Z' fill='#486d53' /><path d='M140 261v42m73-42v15m201-15v29m46-29v42' stroke='#486d53' strokeWidth='3' />
          <path d='M153 250c-3-43-23-53-33-65m35 41c7-32 16-39 29-43m-26 54c21-15 33-13 40-11m-40 5c-23-15-34-13-42-10' stroke='#507b5a' strokeWidth='2' />
          <path d='M139 204c-25 1-27-13-29-24 18 0 29 8 29 24Zm26 5c-3-21 9-28 22-33 3 15-6 28-22 33Zm-8 28c17-16 31-14 43-9-10 13-24 14-43 9Z' fill='#5d8b60' />
          <path d='m138 244 43 1-7 18h-29Z' fill='#ac8160' /><path d='M418 244c-6-31 9-48 21-57m-14 37c-17-3-25-12-30-23m34 14c18-2 28-12 33-26' stroke='#517e61' strokeWidth='2' />
          <path d='M415 215c-21 0-24-11-26-23 17 3 27 9 26 23Zm14-8c-5-20 4-29 18-36 5 15-1 27-18 36Zm1 9c15-17 25-17 36-15-7 14-17 20-36 15Z' fill='#78a16c' /><path d='m407 240 38 2-5 18h-29Z' fill='#b89c72' />
          <use href={'#' + traveler} x='269' y='181' width='64' height='128' />
        </g>
        <g className='anime-butterfly'><path d='M355 157c-16-21-31-16-25-2 2 7 10 8 25 2Zm0 0c6-28 22-31 24-15 1 8-10 13-24 15Z' fill='#ead89d' /><path d='m353 155 4 9' stroke='#48715a' strokeWidth='1.5' /></g>
        <g className='anime-depth-near'>
          <path d='M7 351C42 262 46 149 79 78M48 276C17 257 8 228 9 207c28 11 41 35 39 69Zm15-92c26-11 38-30 44-57-26 6-42 27-44 57ZM70 126C42 107 37 80 45 57c23 18 28 42 25 69Z' fill='#355d47' /><path d='M7 351C42 262 46 149 79 78' stroke='#a5b283' strokeWidth='1.3' />
          <path d='M605 343c-22-64-31-104-46-153m20 91c-29-1-43-16-52-38 27 3 44 15 52 38Zm-13-42c20-15 27-36 27-56-20 9-29 30-27 56Z' fill='#2e5644' />
          <path d='M-1 341c69-20 120-12 179 6m277 3c62-29 98-36 159-30' stroke='#264b3e' strokeWidth='18' />
          <path d='m42 84 25 38m-3 24 31-14m-52 120-25-34m550 48-27-14m32-18 13-34' stroke='#81a074' strokeWidth='.65' opacity='.65' />
          {Array.from({length:18},(_,i)=><g key={i} transform={`translate(${27+i*31} ${328+(i*7)%13})`}><path d='M0 9 2-7m-1 7-6-4m7 1 6-5' stroke='#628569' strokeWidth='.7' /><path d='m1-5 2-4 2 3-2 3Z' fill='#d5d3a0' opacity={i%3?.25:.75} /></g>)}
        </g>
        {[0,1,2,3,4,5].map(i => <path key={i} className='anime-garden-petal' style={{ animationDelay: `${i * -.9}s` }} d={`m${160+i*51} ${76+(i*37)%131} 8 3-5 6-7-2Z`} fill={i%2 ? '#e5cf9a' : '#bed09a'} />)}
      </g>

      <g className='anime-edition anime-edition-sea' clipPath={'url(#' + scene + ')'}>
        <path fill={'url(#' + prefix + '-sea-sky)'} d='M22 19h556v322H22z' />
        <g className='anime-depth-far'>
          <path d='M40 94c5-8 12-10 19-9 2-12 11-18 22-15 5-18 24-21 36-9 12-5 24 3 25 13 12-2 20 4 25 12l18 8Zm264-28c7-7 13-9 22-8 4-13 14-20 24-15 7-16 26-17 34-2 13-1 22 7 22 16l20 9Z' fill='#f5efdb' />
          <path d='M65 89h62m-42-11h23m24 8h21m175-26h36m-11-9h20' stroke='#cbdcd2' strokeWidth='1.2' opacity='.7' /><path d='M205 45h67m-30 7h55m195 123h58m-45 6h26' stroke='#e0e8d9' strokeWidth='1.2' opacity='.75' />
          <circle cx='463' cy='126' r='33' fill='#edc591' />
          <path d='m22 205 29-15 15-3 9-13 21 4 13-16 19 18 18 2 17 12 24-1 11-9 17 2 13-10 21 15 22 5 16 13h291v132H22Z' fill='#5e97a0' /><path d='m23 206 76-8 41 9 29-6 35 8 43-6 43 11H22Z' fill='#4e8290' />
          <path d='M22 214h556v127H22Z' fill={'url(#' + prefix + '-sea-water)'} />
          <path d='m77 178 8 12m18-22 8 20 20 7m78-10 7 13 15 3m-23-23 5-17h7l4 19m-13-18h9m-8-2v-6l4-3 4 3v6' stroke='#c2d0bd' strokeWidth='.75' opacity='.75' />
          {Array.from({length:37},(_,i)=><path key={i} d={`M${27+(i*83)%530} ${219+(i*19)%75}h${7+(i*11)%31}`} stroke={i%3?'#b9d6ce':'#e7e5c7'} strokeWidth={i%4?.65:1.1} opacity={i%3?.45:.8} />)}
          <path d='M250 217h43m36 13h71m-315 6h92m230 9h118m-292 14h45' stroke='#b1cfd0' strokeWidth='1.3' />
          <path d='m440 213 6-33 21 33Z' fill='#eee9d3' /><path d='m442 215 27-1-5 6h-18Z' fill='#3d6167' />
          <path d='m193 117 7 4 8-5m-37-12 6 3 7-4' stroke='#557c85' strokeWidth='1.5' strokeLinecap='round' />
        </g>
        <g className='anime-depth-middle'>
          <path d='m211 242 150-4 160 104H63Z' fill='#a69f82' /><path d='m241 244-35 98m105-100 26 100m-170-68h248m-277 23h314m-340 29h381' stroke='#c9bfa0' strokeWidth='1.4' />
          <path d='m233 246-90 96h31l75-96m77-4 85 100h35l-100-99' fill='#687b6b' opacity='.25' /><path d='m270 245-9 97m20-97 3 97m45-100 50 100m-224-30h315m-290-24h261' stroke='#e3d8b8' strokeWidth='.65' opacity='.55' />
          <path d='M53 270h164m138-4h191M77 272v70m62-70v70m274-74v74m78-74v74' stroke='#e5dfc2' strokeWidth='5' /><path d='M53 263h164m138-4h191' stroke='#567d7f' strokeWidth='2' />
          <path d='M103 50v217M111 50v217m-12-47h86V61h-86Z' stroke='#e0e5cd' strokeWidth='3' /><path d='m107 60 78 2v35h-78Z' fill='#427d87' /><path d='M124 78h40m-40 8h21' stroke='#e2e9d7' strokeWidth='1.1' />
          <path d='M103 105h82v105h-82Z' fill='#edf0d5' fillOpacity='.16' /><path d='M109 115h71m-71 17h50m-50 14h71m-71 17h59m-59 14h71m-71 17h39' stroke='#d9e2ca' strokeWidth='1' opacity='.8' />
          <path d='M344 40h234v10H344Zm186 10v209m7-209v209' fill='#3b707a' /><path d='M346 50h187l-88 28h-99Z' fill='#739ca0' /><path d='m354 52 87 25m-48-25 72 18m-33-18 51 12' stroke='#a5c1b6' />
          <path d='M344 40h234v5H344m187 6v205m5-205v205' stroke='#aac7bd' strokeWidth='.7' /><path d='M350 53h176m-75 28h-99M98 58h89v159h-89Zm10 159v45m73-44v45' stroke='#365f69' strokeWidth='.7' /><path d='M121 118h43m-43 30h35m-35 30h47m-47 22h29' stroke='#edf0da' strokeWidth='.6' />
          <path d='M487 49v42m-9 10a9 9 0 1 0 18 0 9 9 0 0 0-18 0Z' fill='#e8e6ca' stroke='#3b6d76' strokeWidth='1' /><path d='m487 94 0 8 5 2' stroke='#527c7c' strokeWidth='1' /><path d='M83 263v5m63-5v5m270-9v6m78-6v6' stroke='#fff2d1' strokeWidth='1' />
          <use href={'#' + traveler} x='264' y='182' width='64' height='128' />
          <path className='anime-sea-letter' d='m346 176 27-8 8 23-27 8Z' fill='#f1e8c8' stroke='#7a9f9d' /><path className='anime-sea-letter-fold' d='m346 176 19 8 8-16' stroke='#a79676' />
        </g>
        <g className='anime-sea-current'><path d='M-10 291c98-35 155 35 261 0s159-11 243 2 114-7 143-20M-10 309c97-34 160 27 252-1s151-16 255-1 124-10 145-22' stroke='#b9dcd5' strokeWidth='1' fill='none' opacity='.7' /></g>
        <g className='anime-depth-near'><path d='M22 323c47-6 71-1 101 18H22Zm451 18c45-32 77-34 105-29v29Z' fill='#2c646e' /><path d='m55 341 6-48m-5 32-21-17m26 3 18-19m458 49-1-57m1 29 22-17m-22 4-13-20' stroke='#487f80' strokeWidth='3' /></g>
      </g>

      <g className='anime-edition anime-edition-film' clipPath={'url(#' + scene + ')'}>
        <path fill={'url(#' + prefix + '-film-sky)'} d='M22 19h556v322H22z' />
        <g className='anime-depth-far'>
          <circle cx='376' cy='119' r='43' fill='#f1d49c' /><path d='M33 70h126m159 23h179m-267 42h64' stroke='#eed1ad' strokeWidth='3' />
          <path d='M22 200h31v-65h51v38h30v-50h47v77h24v-43h31v-53h45v96h35v-48h38v-26h30v74h34v-63h48v-23h37v86h85v142H22Z' fill='#b58d75' />
          <path d='M22 243h49v-66h47v66h28v-32h69v32h26v-53h62v53h34v-56h34v-29h43v85h34v-74h40v74h29v-41h61v140H22Z' fill='#8e7766' />
          <path d='M177 123v-20m-7 0h14m267 11v-23m-8 0h17' stroke='#8f7665' strokeWidth='1.2' /><path d='M81 146h12m-12 9h12m115 17h16m36-57h12m103 57h17m62-22h15m34-15h13' stroke='#e0b58b' strokeWidth='2' />
          {[[55,140,48,58],[138,128,40,73],[244,111,34,96],[340,163,28,73],[413,143,38,87],[464,120,30,93],[272,195,27,48]].map(([x,y,w,h],index)=><g key={index} stroke='#e6c7a0' strokeWidth='.6' opacity='.58'>{Array.from({length:Math.floor(h/13)},(_,r)=><g key={r}>{Array.from({length:Math.floor(w/11)},(_,c)=><path key={c} d={`m${x+c*11} ${y+r*13}h5v6h-5Z`} />)}</g>)}<path d={`M${x-2} ${y-5}h${w+3}m-${w-3} 0v-6h11v6`} /></g>)}
          <path d='M135 123h48m58-20h42m124 34h50m3-23h42M40 225h92m85 0h37m83-12h29' stroke='#715f50' strokeWidth='.7' /><path d='M259 104V82m-9 9 26-5m-20 9 14-3m-134 38 24 10m301-23 24 7m24-8v-18m-8 7h18' stroke='#8f7665' strokeWidth='.7' />
          <path className='anime-film-swallow' d='m223 89 27-6-13 9 12 7-26-6-8 5 4-8-8-8Z' fill='#716754' />
        </g>
        <g className='anime-depth-middle'>
          <path d='M22 263h556v79H22Z' fill='#826e5b' /><path d='m244 251-80 91m152-91 99 91M94 322h416m-383-24h352m-310-23h278' stroke='#d0b28a' strokeWidth='1.2' />
          <path d='M16 250h568M52 251v91m73-91v91m73-91v91m243-91v91m72-91v91m54-91v91' stroke='#d3b58e' strokeWidth='3' /><path d='M16 244h568' stroke='#604f43' strokeWidth='2' />
          <path d='M82 49v196m7-196v196M58 53h498M370 20l-6 225m7-163h109' stroke='#5d554c' strokeWidth='2' /><path d='m82 49 91 62 191-28 116 16 99-27' stroke='#746456' strokeWidth='1' />
          <path d='M22 223h556v8H22Zm37 8v29m98-29v29m202-29v29m114-29v29' stroke='#5e6558' strokeWidth='3' /><path d='M22 220h556m-556 5h556M87 59l87 57 189-28 117 16 96-26m-7-3v17m-96 12v19m-111-32v24' stroke='#b1a081' strokeWidth='.65' />
          <g className='anime-film-tram'><path d='M370 118h148v96H370Z' fill='#d1b482' /><path d='M370 118h148v13H370Z' fill='#5e6a59' /><path d='M379 139h38v43h-38Zm47 0h38v43h-38Zm47 0h36v43h-36Z' fill='#697f79' /><path d='M370 194h148v7H370Z' fill='#925f45' /><path d='M380 186h128' stroke='#ede0b7' /><circle cx='394' cy='216' r='8' fill='#584e45' /><circle cx='493' cy='216' r='8' fill='#584e45' /><path d='m428 118 9-15 9 15' stroke='#675b4a' strokeWidth='2' />
            <path d='m382 140 12-1-12 32Zm49 0h14l-14 31Zm45 0h12l-12 28Z' fill='#c0c5a2' opacity='.4' /><path d='M374 129h140M374 207h140m-94-74v75m48-75v75m-68-70v43m48-43v43m43-43v43m-115-21h138' stroke='#efe1b5' strokeWidth='.7' /><path d='M373 115h143l-4-5H379Z' fill='#a08a66' /><path d='M378 191h11m88 0h21m-30-56v71h41v-71Z' stroke='#715e49' strokeWidth='.8' /><path d='M394 211v10m-5-5h10m94-5v10m-5-5h10' stroke='#a89b7b' strokeWidth='.6' />
          </g>
          <use href={'#' + traveler} x='256' y='178' width='64' height='128' />
          <path d='M152 266v-67h46v67Z' fill='#a78766' /><rect x='158' y='205' width='34' height='46' fill='#e0c89e' /><path d='M166 218h19m-19 7h13m-13 7h18' stroke='#947255' />
        </g>
        <g className='anime-depth-near'><path d='M22 319h93v22H22Zm470 7h86v15h-86Z' fill='#544e40' /><path d='M26 19h14v322H26m534-322h14v322h-14' fill='#493e35' />{Array.from({length:12},(_,i)=><g key={i} fill='#bda482'><rect x='30' y={27+i*27} width='6' height='13' rx='1' /><rect x='564' y={27+i*27} width='6' height='13' rx='1' /></g>)}</g>
        <path className='anime-film-scan' d='M45 19h515v322H45Z' fill='#ffedc4' />
        <path d='M60 40v19m0-19h19m442 282h19v-19' stroke='#fff0c7' strokeWidth='1' opacity='.6' />
      </g>

      <g className='anime-edition anime-edition-night' clipPath={'url(#' + scene + ')'}>
        <path fill={'url(#' + prefix + '-night-sky)'} d='M22 19h556v322H22z' />
        <g className='anime-depth-far'>
          <circle cx='402' cy='88' r='38' fill='#d6dfbd' /><circle cx='416' cy='77' r='37' fill='#18393b' />
          <path d='M371 88c-4 13 2 26 13 31m-15-39 2-8m15 45 7 3' stroke='#a9c3a3' strokeWidth='.8' opacity='.65' />
          {[0,1,2,3,4,5,6,7,8,9,10,11].map(i=><circle key={i} cx={65+(i*73)%465} cy={42+(i*29)%137} r={i%3?1:1.7} fill='#d2dfbf' opacity={i%2?.55:.8} />)}
          <path d='M22 244c57-43 98-29 145-69s76-13 122 14 90-57 148-19 88 21 141-8v179H22Z' fill='#355f55' />
          <path d='M75 260V109m9 89-31-49m22 18 22-42m72 131V81m0 93-38-51m38 8 19-36m283 165V104m0 78-26-42m26 3 22-30' stroke='#244c46' strokeWidth='5' />
          {Array.from({length:16},(_,i)=><path key={i} d={`M${40+i*34} ${255+(i*11)%35}v-${76+(i*19)%75}m0 26-10-17m10 31 9-18`} stroke='#315d50' strokeWidth={i%3?1.2:2.3} opacity='.75' />)}
          {Array.from({length:28},(_,i)=><path key={i} d={`m${45+(i*71)%505} ${29+(i*37)%146} 3-1m-1-3v6`} stroke='#c0d4b5' strokeWidth='.45' opacity={i%3?.2:.6} />)}
          <path d='M30 280c60-32 95-14 151-31s83-7 133 16 139-41 264-30v106H30Z' fill='#416f5d' />
          <path className='anime-night-trail' d='M156 145c95-93 203-85 287-29' stroke='#b2d4bb' strokeWidth='1' strokeDasharray='3 13' opacity='.7' />
          <g className='anime-moon-moth'><path d='M348 145c-13-22-30-26-28-9 0 9 12 15 28 9Zm0 0c10-24 25-30 26-14 1 10-9 16-26 14Zm-2 3c-13 0-21 6-17 14 5 4 12-3 17-14Zm5 0c13-1 21 3 19 11-4 6-13 0-19-11Z' fill='#c0d1a9' /><path d='m346 141 4 13' stroke='#6b9a83' strokeWidth='1.4' /></g>
        </g>
        <g className='anime-depth-middle'>
          <path d='M211 341c19-48 75-45 82-72 6-26-15-42-2-57l15-8c-17 30 29 41 18 67-13 28-6 49 28 70Z' fill='#8b9d78' />
          <path d='M257 323c55-12 24-32 51-44m-22-29 20-8' stroke='#c8ce9e' strokeWidth='1.2' opacity='.6' />
          <path d='m245 327 22-6 13 3-22 7Zm31-20 17-7 12 2-17 8Zm15-23 14-6 9 3-13 5Zm-4-24 10-6 9 1-9 7Z' fill='#c3c5a1' opacity='.3' />
          <path d='M131 272v-67h42v67m-46-56h50' stroke='#769982' strokeWidth='4' /><path d='M123 200h56l-9 7h-38Z' fill='#adc4a1' /><path d='M135 215h34v44h-34Z' fill='#d4d7ad' /><path d='M143 215v44m18-44v44' stroke='#8d9c7e' /><path d='m132 261 40-1-6 8h-27Z' fill='#8fa68a' />
          <path d='M427 260v-80h39v80m-44-67h49' stroke='#527a67' strokeWidth='4' /><path d='M419 176h55l-8 8h-38Z' fill='#8cac91' /><path d='M431 193h30v43h-30Z' fill='#b3c79e' /><path d='M438 193v43m15-43v43' stroke='#79917a' />
          <path d='M126 201h50m-44 12h40v49h-40Zm8 9h32m-32 10h32m-32 10h32m-32 10h32m-23-38v47M423 177h48m-43 14h36m-34 11h32m-32 9h32m-32 9h32m-32 9h32' stroke='#dbe1b7' strokeWidth='.55' opacity='.65' /><path d='M131 274h44m253-11h37' stroke='#1e493c' strokeWidth='1' />
          <use href={'#' + traveler} x='271' y='181' width='64' height='128' />
          {[0,1,2,3,4,5,6,7].map(i=><circle key={i} className='anime-firefly' style={{animationDelay:`${i*-.7}s`}} cx={98+(i*59)%416} cy={154+(i*37)%133} r={i%2?1.7:2.4} fill='#d6dea3' />)}
        </g>
        <g className='anime-depth-near'>
          <path d='M32 19h37c-9 79 7 137-9 201-12 44-11 85-5 121H22c7-74 20-116 12-163-7-55 12-99-2-159Zm470 0h43c-11 73 8 129-2 188-8 49 12 98 14 134h-42c8-73-14-100-7-162 8-59-3-98-6-160Z' fill='#173d35' />
          <path d='M55 129c37-19 56-44 72-81m-70 66-35-36m499 99c-34-27-48-63-54-92m64 58 45-49' stroke='#173d35' strokeWidth='12' />
          <path d='M22 341v-30c39-12 74 2 101 30m348 0c43-44 74-45 107-34v34' fill='#173d35' /><path d='m76 341-11-47m12 35 15-24m439 36 14-53m-10 36-18-22' stroke='#47735c' strokeWidth='2' />
          <path d='M42 31c7 66-1 101 3 147s-12 97-10 146m22-283c-3 42 4 60-1 93m-7 38c-3 49-9 75-7 119m482-251c-2 54 9 80 2 123s-1 103 5 148m-11-219 5 21m8 64 2 44m-477-78 9-17m-21 67 3 16' stroke='#507764' strokeWidth='.7' opacity='.55' />
          <use href={'#' + fern} x='59' y='276' width='67' height='70' /><use href={'#' + fern} x='471' y='267' width='73' height='80' /><use href={'#' + fern} x='89' y='297' width='41' height='47' />
          {Array.from({length:31},(_,i)=><path key={i} d={`m${29+(i*47)%542} ${303+(i*13)%33} 2-.7m4-3 1.5-.5`} stroke='#9dbf8d' strokeWidth='.6' opacity='.5' />)}
        </g>
        <path className='anime-night-comet' d='m183 100 132-38-119 50Z' fill='#c7dfbd' />
      </g>

      <g clipPath={'url(#' + scene + ')'}>
        <rect x='22' y='19' width='556' height='322' fill={'url(#' + prefix + '-paper-grain)'} />
        <g className='anime-scene-telemetry' opacity='.5' fill='#edf0d2'>
          <path d='M39 43h37m-37 4h17m467-4h38m-38 4h19M39 315v12h12m498-12v12h12' stroke='#edf0d2' strokeWidth='.65' fill='none' />
          <text x='41' y='39' fontSize='4.5' letterSpacing='1.5'>FIELD / 01</text><text x='499' y='39' fontSize='4.5' letterSpacing='1'>DEPTH / 03</text>
          <path d='M61 321h55m-55-2v4m14-4v4m14-4v4m14-4v4m13-4v4' stroke='#edf0d2' strokeWidth='.5' /><text x='466' y='324' fontSize='4.5' letterSpacing='1.5'>A MOMENT WITHIN</text>
        </g>
        <g className='anime-scene-hotspot' opacity='.45'>
          <circle cx='353' cy='157' r='9' stroke='#f0eed0' strokeWidth='.6' strokeDasharray='1 4' /><path d='M366 157h16l10-10h40' stroke='#f0eed0' strokeWidth='.55' /><text x='395' y='143' fill='#f0eed0' fontSize='4.5' letterSpacing='1.2'>TRACE / 07</text>
          <path className='anime-scene-signal' d='M353 157c-29-45-79-55-105-30' stroke='#edf0d2' strokeWidth='.65' strokeDasharray='2 6' fill='none' />
        </g>
        <path className='anime-scene-scan' d='M24 30h552' stroke='#edf0d2' strokeOpacity='.45' strokeWidth='.7' />
        <rect className='anime-scene-response' x='28' y='25' width='544' height='310' rx='3' stroke='#edf0d2' strokeWidth='1' pathLength='100' />
      </g>
      <rect x='22' y='19' width='556' height='322' rx='5' stroke='var(--optic-light)' strokeOpacity='.35' />
      <g className='anime-scene-cursor'><path d='M281 166v-8h8m22 0h8v8m-38 22v8h8m22 0h8v-8' stroke='#f2f1d1' strokeWidth='1' opacity='.8' /></g>
    </svg>
    <span className='anime-scene-state'><i />{awakened ? '镜头展开' : '片刻停驻'}</span>
    </span>
    <span className='anime-scene-caption' aria-hidden='true'>{editions.map(([theme, number, note, action]) => <span className='anime-edition-caption' data-anime-theme={theme} key={theme}><span><small>{number}</small><strong>{note}</strong></span><span className='anime-scene-invitation'>{awakened ? '回到此刻' : action}<Icon name={awakened ? 'restore' : 'arrow'} size={16} /></span></span>)}</span>
  </button>;
}
