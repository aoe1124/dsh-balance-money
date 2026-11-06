import { holidayRanges } from './holidays.js';
const OFFSET = 8 * 3600_000;
const DAY = 24 * 3600_000;

function stateAt(now) {
  const local = new Date(now + OFFSET);
  const year = local.getUTCFullYear();
  if (!holidayRanges[year]) return null;
  const date = local.toISOString().slice(5,10);
  const holiday = holidayRanges[year].some(([start,end]) => date >= start && date <= end);
  const hour = local.getUTCHours();
  return !holiday && local.getUTCDay() !== 0 && local.getUTCDay() !== 6
    && ((hour >= 9 && hour < 12) || (hour >= 14 && hour < 18));
}

export function tariff(now) {
  const peak = stateAt(now);
  if (peak === null) return { label:'—', next:null, reason:'节假日日历需要更新' };
  const localMidnight = Math.floor((now + OFFSET) / DAY) * DAY - OFFSET;
  // Check every real boundary, including midnight/year validity transitions.
  for (let day = 0; day < 16; day++) {
    for (const hour of [0,9,12,14,18,24]) {
      const next = localMidnight + day * DAY + hour * 3600_000;
      if (next <= now) continue;
      const state = stateAt(next);
      if (state === null) return { label: peak ? '峰':'谷', next:null, reason:'节假日日历需要更新' };
      if (state !== peak) return { label:peak ? '峰':'谷', next, reason:null };
    }
  }
  return { label:peak ? '峰':'谷', next:null, reason:'无法确定下次切换时间' };
}

export function formatRemaining(ms) {
  const minutes = Math.max(0, Math.ceil(ms / 60_000));
  return `${Math.floor(minutes/60)}h${String(minutes%60).padStart(2,'0')}m`;
}
