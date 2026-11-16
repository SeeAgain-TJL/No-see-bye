'use client';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/icons';

function todayInBeijing() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
export function DateFilter({ month, day, onChange }: { month: string; day: string; onChange: (month: string, day: string) => void }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  return <div className='date-filter'>
    <button ref={trigger} type='button' className='date-filter-trigger' aria-haspopup='dialog' aria-expanded={open} onClick={() => setOpen(true)}><Icon name='calendar' size={18} /><span>{day || (month ? month.replace('-', ' 年 ') + ' 月' : '按日期查找')}</span><Icon name='arrow' size={14} /></button>
    {open && <Calendar month={month} day={day} dialog={dialog} onChange={onChange} close={() => { setOpen(false); trigger.current?.focus(); }} />}
  </div>;
}
function Calendar({ month, day, dialog, onChange, close }: { month: string; day: string; dialog: React.RefObject<HTMLDialogElement | null>; onChange: (month: string, day: string) => void; close: () => void }) {
  const today = todayInBeijing();
  const [shown, setShown] = useState((day || month || today).slice(0, 7));
  const [year, monthNumber] = shown.split('-').map(Number);
  const first = new Date(Date.UTC(year, monthNumber - 1, 1));
  const count = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7;
  function moveMonth(delta: number) { const next = new Date(Date.UTC(year, monthNumber - 1 + delta, 1)); setShown(next.toISOString().slice(0, 7)); }
  function select(m: string, d: string) { onChange(m, d); dialog.current?.close(); }
  useEffect(() => {
    dialog.current?.showModal();
    dialog.current?.querySelector<HTMLButtonElement>('[aria-pressed=true]')?.focus();
    const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = overflow; };
  }, [dialog]);
  return <dialog ref={dialog} className='calendar-dialog' aria-labelledby='calendar-title' onClose={close} onClick={e => { if (e.target !== e.currentTarget) return; const r = e.currentTarget.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.current?.close(); }}>
    <header><div><span>回到某一天</span><h2 id='calendar-title'>按日期查找</h2></div><button className='icon-button' type='button' aria-label='关闭日历' onClick={() => dialog.current?.close()}><Icon name='close' size={19} /></button></header>
    <div className='calendar-month-nav'><button type='button' aria-label='上个月' disabled={shown === '0001-01'} onClick={() => moveMonth(-1)}><Icon name='back' size={18} /></button><label><span className='sr-only'>选择年份</span><select aria-label='选择年份' value={year} onChange={e => setShown(e.target.value.padStart(4, '0') + '-' + String(monthNumber).padStart(2, '0'))}>{Array.from({ length: Math.max(Number(today.slice(0, 4)) + 6, year + 1) - Math.min(1900, year) }, (_, i) => Math.min(1900, year) + i).reverse().map(y => <option key={y} value={y}>{y} 年</option>)}</select></label><select aria-label='选择月份' value={monthNumber} onChange={e => setShown(String(year).padStart(4, '0') + '-' + e.target.value.padStart(2, '0'))}>{Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{i + 1} 月</option>)}</select><button type='button' aria-label='下个月' onClick={() => moveMonth(1)}><Icon name='arrow' size={18} /></button></div>
    <div className='calendar-weekdays' aria-hidden='true'>{['一','二','三','四','五','六','日'].map(d => <span key={d}>{d}</span>)}</div>
    <div key={shown} className='calendar-days' role='group' aria-label={year + '年' + monthNumber + '月'} onKeyDown={e => {
      const shift = ({ ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 } as Record<string, number>)[e.key]; if (!shift) return; e.preventDefault();
      const buttons = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('button')); const at = buttons.indexOf(e.target as HTMLButtonElement); const next = at + shift;
      if (buttons[next]) buttons[next].focus();
    }}>
      {Array.from({ length: offset }, (_, i) => <span key={'blank-' + i} />)}
      {Array.from({ length: count }, (_, i) => { const date = shown + '-' + String(i + 1).padStart(2, '0'); return <button key={date} type='button' aria-label={date} aria-pressed={date === day} aria-current={date === today ? 'date' : undefined} onClick={() => select('', date)}>{i + 1}</button>; })}
    </div>
    <footer><button type='button' onClick={() => select('', '')}>不限日期</button><button type='button' onClick={() => setShown(today.slice(0, 7))}>本月</button><button className='calendar-apply' type='button' onClick={() => select(shown, '')}>查看整月</button></footer>
    <small className='calendar-timezone'>日期按北京时间</small>
  </dialog>;
}
