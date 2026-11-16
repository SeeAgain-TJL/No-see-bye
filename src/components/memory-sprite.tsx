/** A paper familiar, used as a small illustration rather than a labelled badge. */
export function MemorySprite({ className = '', pose = 'rest' }: { className?: string; pose?: 'rest' | 'peek' | 'float' }) {
  return <svg className={'memory-sprite sprite-' + pose + ' ' + className} viewBox='0 0 100 90' fill='none' aria-hidden='true' focusable='false'>
    <ellipse cx='50' cy='81' rx='27' ry='4' fill='currentColor' opacity='.1' />
    <g className='sprite-body'>
      <path d='M71 64c13-5 19 5 11 12-6 5-14 2-19-3' fill='var(--sprite-paper)' stroke='var(--sprite-outline)' strokeWidth='1.5' />
      <path d='M24 35c-8-10-6-23-1-25 6-2 14 6 20 13 4-1 10-1 14 0 7-8 14-15 20-13 5 3 7 16-1 26 7 9 9 19 5 28-5 12-17 16-31 16S24 77 19 65c-4-10-2-20 5-30Z' fill='var(--sprite-paper)' stroke='var(--sprite-outline)' strokeWidth='1.5' strokeLinejoin='round' />
      <path d='m25 17 11 10-10 3c-3-5-4-9-1-13Zm49 0L63 27l10 3c3-5 4-9 1-13Z' fill='var(--sprite-blush)' opacity='.7' />
      <path d='M22 50c11 6 16 7 28 7s20-2 28-7c-1 18-12 27-28 27S23 66 22 50Z' fill='#ffffff' opacity='.35' />
      <ellipse className='sprite-eye' cx='37' cy='43' rx='2.7' ry='3.9' fill='var(--sprite-outline)' /><ellipse className='sprite-eye' cx='63' cy='43' rx='2.7' ry='3.9' fill='var(--sprite-outline)' />
      <circle cx='36.3' cy='41.8' r='.8' fill='white' /><circle cx='62.3' cy='41.8' r='.8' fill='white' />
      <path d='m47 50 3 2 3-2M50 52v3m-5 0q2 3 5 0 3 3 5 0' stroke='var(--sprite-outline)' strokeWidth='1.3' strokeLinecap='round' strokeLinejoin='round' />
      <ellipse cx='28' cy='51' rx='5' ry='2.4' fill='var(--sprite-blush)' opacity='.65' /><ellipse cx='72' cy='51' rx='5' ry='2.4' fill='var(--sprite-blush)' opacity='.65' />
      <path d='M28 65c12 7 32 7 44 0l-2 6c-13 6-28 6-40 0Z' fill='var(--sprite-scarf)' /><path d='m60 71 2 11 7-3-2-10' fill='var(--sprite-scarf)' />
      <path d='m46 64 4-7 4 7 8 1-6 6 1 8-7-4-7 4 1-8-6-6Z' fill='var(--sprite-star)' stroke='var(--sprite-outline)' strokeWidth='.8' strokeLinejoin='round' />
    </g>
    <g className='sprite-sparks' fill='var(--sprite-star)'><path d='m88 24 1.5 4.5L94 30l-4.5 1.5L88 36l-1.5-4.5L82 30l4.5-1.5Z' /><circle cx='11' cy='41' r='1.8' /></g>
  </svg>;
}
