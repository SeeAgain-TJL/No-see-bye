'use client';
import { useId, useState, type PointerEvent } from 'react';
import { Icon } from './icons';

/** Hard-edged optical studies. Every visible surface is original vector geometry. */
export function MemoryPortal() {
  const [opened, setOpened] = useState(false);
  const id = useId();
  const metal = id + '-metal', glass = id + '-glass', core = id + '-core', plate = id + '-plate';
  function move(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType !== 'mouse') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - .5;
    const y = (event.clientY - bounds.top) / bounds.height - .5;
    event.currentTarget.style.setProperty('--optical-yaw', x * 12 + 'deg');
    event.currentTarget.style.setProperty('--optical-pitch', -y * 10 + 'deg');
  }
  function leave(event: PointerEvent<HTMLButtonElement>) {
    event.currentTarget.style.removeProperty('--optical-yaw');
    event.currentTarget.style.removeProperty('--optical-pitch');
  }
  return <button type='button' className='memory-portal auth-optics' aria-label='切换光学构成' aria-pressed={opened} data-open={opened}
    onClick={() => setOpened(value => !value)} onPointerMove={move} onPointerLeave={leave}>
    <span className='auth-optics-edition' aria-hidden='true'><span>NO SEE BYE</span><span>OPTICAL STUDIES — 01</span></span>
    <svg className='auth-optics-scene' viewBox='0 0 640 390' fill='none' aria-hidden='true'>
      <defs>
        <linearGradient id={metal} x1='150' y1='50' x2='485' y2='340' gradientUnits='userSpaceOnUse'>
          <stop stopColor='var(--optic-metal)' /><stop offset='.16' stopColor='var(--optic-light)' /><stop offset='.31' stopColor='var(--optic-mid)' /><stop offset='.47' stopColor='var(--optic-dark)' /><stop offset='.54' stopColor='var(--optic-light)' /><stop offset='.69' stopColor='var(--optic-mid)' /><stop offset='.83' stopColor='var(--optic-dark)' /><stop offset='1' stopColor='var(--optic-metal)' />
        </linearGradient>
        <linearGradient id={glass} x1='190' y1='80' x2='460' y2='325' gradientUnits='userSpaceOnUse'>
          <stop stopColor='var(--optic-light)' stopOpacity='.94' /><stop offset='.23' stopColor='var(--optic-metal)' stopOpacity='.3' /><stop offset='.51' stopColor='var(--optic-dark)' stopOpacity='.8' /><stop offset='.73' stopColor='var(--optic-mid)' stopOpacity='.5' /><stop offset='1' stopColor='var(--optic-light)' stopOpacity='.88' />
        </linearGradient>
        <radialGradient id={core} cx='.32' cy='.24' r='.85'><stop stopColor='var(--optic-light)' /><stop offset='.18' stopColor='var(--optic-metal)' /><stop offset='.4' stopColor='var(--optic-mid)' /><stop offset='.68' stopColor='var(--optic-dark)' /><stop offset='.91' stopColor='var(--optic-mid)' /><stop offset='1' stopColor='var(--optic-light)' /></radialGradient>
        <linearGradient id={plate} x1='175' y1='80' x2='430' y2='300' gradientUnits='userSpaceOnUse'><stop stopColor='var(--optic-light)' /><stop offset='.36' stopColor='var(--optic-mid)' /><stop offset='.58' stopColor='var(--optic-dark)' /><stop offset='1' stopColor='var(--optic-metal)' /></linearGradient>
      </defs>

      <g className='auth-optics-theme auth-optics-iris'>
        <g className='auth-optics-instrument'>
          <circle cx='320' cy='207' r='147' fill='var(--optic-dark)' />
          {[0,1,2,3].map(i => <circle key={i} cx='320' cy={202-i*4} r='147' stroke='var(--optic-metal)' strokeOpacity={.12+i*.04} />)}
          <circle cx='320' cy='186' r='147' fill={'url(#' + metal + ')'} />
          <circle cx='320' cy='186' r='139' fill='var(--optic-dark)' />
          <circle cx='320' cy='186' r='128' stroke={'url(#' + metal + ')'} strokeWidth='11' />
          <circle cx='320' cy='186' r='118' fill='#101b18' stroke='var(--optic-light)' strokeOpacity='.25' />
          {Array.from({ length: 72 }, (_, i) => <path key={i} d={i % 6 ? 'M320 47v5' : 'M320 45v10'} stroke='var(--optic-light)' strokeWidth={i%6 ? .7 : 1.4} strokeOpacity={i%6 ? .4 : .8} transform={'rotate(' + i*5 + ' 320 186)'} />)}
          <g className='auth-optics-blades'>{Array.from({ length: 9 }, (_, i) => <g key={i} transform={'rotate(' + i*40 + ' 320 186)'}><path className='auth-optics-blade' d='M319 73c56 0 100 39 112 83l-82 77-81-57Z' fill={'url(#' + glass + ')'} stroke='var(--optic-metal)' strokeWidth='.8' /></g>)}</g>
          <path className='auth-optics-aperture' d='m320 137 42 24v50l-42 25-42-25v-50Z' fill='#0b1513' stroke='var(--optic-light)' strokeOpacity='.55' />
          <circle cx='320' cy='186' r='23' stroke='var(--optic-metal)' strokeWidth='.6' strokeOpacity='.35' />
          <text x='320' y='77' textAnchor='middle' fill='var(--optic-light)' fontSize='7' letterSpacing='3'>THE ART OF REMEMBERING</text>
          <text x='320' y='309' textAnchor='middle' fill='var(--optic-light)' fontSize='7' letterSpacing='4'>LIGHT / TIME / FORM</text>
        </g>
      </g>

      <g className='auth-optics-theme auth-optics-prism'>
        <path d='m166 310 282-15 53 29-282 15Z' fill='#071922' opacity='.75' />
        <g className='auth-optics-prism-back'><path d='m321 51 143 239-279 17Z' fill={'url(#' + glass + ')'} stroke='var(--optic-light)' strokeWidth='1' /><path d='m321 51 11 21 142 231-10-13Z' fill='var(--optic-dark)' stroke='var(--optic-metal)' strokeWidth='.5' /></g>
        <g className='auth-optics-prism-front'><path d='m291 63 143 239-279 17Z' fill={'url(#' + glass + ')'} stroke='var(--optic-light)' strokeWidth='1.5' /><path d='m291 63 15 5 143 239-15-5Z' fill={'url(#' + metal + ')'} /><path d='m155 319 279-17 15 5-278 18Z' fill='var(--optic-metal)' />
          {Array.from({ length: 12 }, (_, i) => <path key={i} d={`M${167+i*7} ${299-i*13} ${418-i*7} ${284-i*11}`} stroke='var(--optic-light)' strokeWidth='.65' strokeOpacity={.15+i*.025} />)}
          <path d='m291 79 128 215-250 15Z' stroke='var(--optic-light)' strokeWidth='.5' strokeOpacity='.7' />
        </g>
        <path d='m340 227 144 62-6 10-145-66Z' fill='#e8c49e' opacity='.8' /><path d='m334 233 144 66-7 11-143-71Z' fill='#7cb2bd' opacity='.65' /><path d='m328 239 143 71-8 10-141-75Z' fill='#c2d9cd' opacity='.7' />
        <path d='M119 332h67m279-228h55' stroke='var(--optic-metal)' strokeWidth='.7' /><circle cx='119' cy='332' r='2' fill='var(--optic-light)' />
      </g>

      <g className='auth-optics-theme auth-optics-film'>
        <g className='auth-optics-film-sheet auth-optics-film-rear'><rect x='179' y='69' width='243' height='246' rx='2' fill='var(--optic-dark)' stroke='var(--optic-metal)' strokeWidth='2' /><rect x='202' y='93' width='197' height='190' fill={'url(#' + glass + ')'} stroke='var(--optic-light)' strokeOpacity='.3' /></g>
        <g className='auth-optics-film-sheet auth-optics-film-middle'><path fillRule='evenodd' d='M178 68h244v248H178Zm24 25v190h196V93Z' fill={'url(#' + plate + ')'} stroke='var(--optic-light)' strokeWidth='.8' /><path d='M215 292h66m46 0h59' stroke='var(--optic-dark)' strokeWidth='1.3' /></g>
        <g className='auth-optics-film-sheet auth-optics-film-front'><path fillRule='evenodd' d='M178 68h244v248H178Zm24 25v190h196V93Z' fill={'url(#' + metal + ')'} stroke='var(--optic-light)' strokeWidth='.8' />
          {[0,1,2,3,4,5,6].map(i => <g key={i}><rect x='184' y={92+i*28} width='9' height='15' rx='1' fill='var(--optic-dark)' /><rect x='407' y={92+i*28} width='9' height='15' rx='1' fill='var(--optic-dark)' /></g>)}
          <rect x='207' y='98' width='186' height='180' stroke='var(--optic-light)' strokeWidth='.6' strokeOpacity='.65' />
          <text x='300' y='303' textAnchor='middle' fill='var(--optic-dark)' fontSize='6' letterSpacing='3'>EVERY FRAME, A LITTLE FOREVER</text>
        </g>
      </g>

      <g className='auth-optics-theme auth-optics-gyroscope'>
        <g className='auth-optics-gyro-body'>
          <ellipse cx='320' cy='192' rx='159' ry='73' transform='rotate(-31 320 192)' stroke='var(--optic-dark)' strokeWidth='14' />
          <ellipse cx='320' cy='185' rx='159' ry='73' transform='rotate(-31 320 185)' stroke={'url(#' + metal + ')'} strokeWidth='10' />
          <ellipse cx='320' cy='185' rx='159' ry='73' transform='rotate(-31 320 185)' stroke='var(--optic-light)' strokeWidth='.6' />
          <circle cx='320' cy='185' r='77' fill={'url(#' + core + ')'} />
          <path d='M277 139c19-17 49-18 69-8' stroke='var(--optic-light)' strokeWidth='2' strokeOpacity='.7' />
          <ellipse cx='320' cy='185' rx='159' ry='73' transform='rotate(43 320 185)' stroke={'url(#' + metal + ')'} strokeWidth='10' />
          <ellipse cx='320' cy='185' rx='159' ry='73' transform='rotate(43 320 185)' stroke='var(--optic-light)' strokeWidth='.6' />
          <path d='M320 25v31m0 258v31m-178-160h32m294 0h32' stroke='var(--optic-metal)' strokeWidth='.8' />
          <circle cx='320' cy='25' r='3' fill='var(--optic-light)' /><circle cx='320' cy='345' r='3' fill='var(--optic-light)' />
        </g>
      </g>
      <path d='M77 66v19m-9-10h19m476 228v19m-9-10h19' stroke='var(--optic-metal)' strokeWidth='.7' strokeOpacity='.65' />
    </svg>
    <span className='auth-optics-caption'><span>{opened ? '展开 · OPEN' : '凝聚 · FOLD'}</span><span className='auth-optics-action'>轻触变换<Icon name='arrow' size={16} /></span></span>
  </button>;
}
