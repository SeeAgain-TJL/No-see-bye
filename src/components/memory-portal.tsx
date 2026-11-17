'use client';
import { useId, useState, type CSSProperties } from 'react';
import { Icon } from './icons';

export function MemoryPortal() {
  const [turn, setTurn] = useState(0);
  const seaClip = useId();
  return <button type='button' className='memory-portal' aria-label='拨动光影' data-shifted={turn % 2 === 1} onClick={() => setTurn(value => value + 1)} style={{ '--portal-turn': turn * 90 + 'deg' } as CSSProperties}>
    <span className='portal-orbit portal-orbit-one' /><span className='portal-orbit portal-orbit-two' />
    <svg className='auth-portal-art' viewBox='0 0 560 370' fill='none' aria-hidden='true'>
      <defs><clipPath id={seaClip}><circle cx='280' cy='185' r='160' /></clipPath></defs>
      <g className='portal-theme portal-garden'>
        <path d='M120 335c20-102 90-139 157-153' stroke='#cce4aa' strokeWidth='3' />
        <path d='M167 267c-78 2-113-38-110-79 62-8 112 19 110 79Z' fill='#8fbb83' /><path d='M192 235c8-78 54-100 94-88 0 57-36 91-94 88Z' fill='#d6e8b7' />
        <g className='portal-bloom' style={{ transformOrigin: '317px 172px' }}>{Array.from({ length: 8 }, (_, i) => <ellipse key={i} cx='317' cy='101' rx='35' ry='71' fill={i % 2 ? '#c5df84' : '#e9efa8'} transform={'rotate(' + i * 45 + ' 317 172)'} />)}<circle cx='317' cy='172' r='46' fill='#e9a96c' /><circle cx='307' cy='160' r='5' fill='#314e3d' /><circle cx='328' cy='160' r='5' fill='#314e3d' /><path d='M305 181q12 11 25 0' stroke='#314e3d' strokeWidth='3' strokeLinecap='round' /></g>
        <path d='m442 265 7 18 18 7-18 7-7 18-7-18-18-7 18-7Z' fill='#e9a96c' />
      </g>
      <g className='portal-theme portal-sea'>
        <g clipPath={'url(#' + seaClip + ')'}><circle cx='280' cy='185' r='160' fill='#173e52' />
        <circle cx='366' cy='135' r='87' fill='#ffbe81' className='portal-sun' /><path d='M44 220q65-60 130 0t130 0 130 0 130 0v140H44Z' fill='#70bbc7' /><path d='M30 268q75-60 150 0t150 0 150 0 150 0v110H30Z' fill='#388eac' />
        <g className='portal-vessel'><path d='m174 250 153-8-34 36h-87Z' fill='#f4eed6' /><path d='m251 106-3 129-78 4Z' fill='#fff5db' /><path d='m263 156 61 80-62 2Z' fill='#e8a271' /><path d='M251 106v138' stroke='#243c50' strokeWidth='3' /></g><path d='M68 315h85m213-23h89' stroke='#dff3df' strokeWidth='3' strokeLinecap='round' /></g>
        <circle cx='280' cy='185' r='160' stroke='#edf1d3' strokeOpacity='.24' />
      </g>
      <g className='portal-theme portal-film'>
        <path d='M74 140C180 7 349 17 456 105' stroke='#dfaa70' strokeWidth='2' strokeDasharray='5 7' /><g className='portal-film-frame'><rect x='130' y='56' width='280' height='265' rx='8' fill='#f4e2b5' /><rect x='151' y='81' width='238' height='180' fill='#c7724f' /><circle cx='307' cy='131' r='32' fill='#ffe7a6' /><path d='m151 240 77-103 62 87 46-59 53 75v21H151Z' fill='#634f43' /><path d='M155 288h88' stroke='#7d5a41' strokeWidth='3' /></g><g fill='#f2bc72'>{[0,1,2].map(i => <g key={i}><rect x='90' y={90+i*77} width='18' height='34' rx='3' /><rect x='432' y={90+i*77} width='18' height='34' rx='3' /></g>)}</g>
      </g>
      <g className='portal-theme portal-night'>
        <g className='portal-lunar'><circle cx='280' cy='172' r='116' fill='#b9bcf3' /><circle cx='317' cy='135' r='111' fill='#243443' /><circle cx='199' cy='209' r='10' fill='#9398d7' /><circle cx='217' cy='241' r='17' fill='#a0a6e6' /></g><path d='m67 198 79-98 137-43 163 77 49 128-111 56' stroke='#b9b8d5' strokeWidth='1.5' />{[[67,198],[146,100],[283,57],[446,134],[495,262],[384,318]].map(([x,y]) => <path key={x} d={`m${x} ${y-9} 3 6 6 3-6 3-3 6-3-6-6-3 6-3Z`} fill='#f5dba1' />)}
      </g>
    </svg>
    <span className='portal-touch'><Icon name='restore' size={15} />拨动光影<span>↗</span></span>
  </button>;
}
