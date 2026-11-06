import test from 'node:test';
import assert from 'node:assert/strict';
import { tariff, formatRemaining } from '../src/schedule.js';
const at = s => Date.parse(s + '+08:00');
test('小时分钟显示，不显示秒，分钟向上取整', () => {
  assert.equal(formatRemaining(61*3600000+34*60000), '61h34m');
  assert.equal(formatRemaining(3599000), '1h00m');
  assert.equal(formatRemaining(1), '0h01m');
});
test('峰谷边界与超过24小时周末倒计时', () => {
  assert.equal(tariff(at('2026-11-06T08:59:00')).label, '谷');
  assert.equal(tariff(at('2026-11-06T09:00:00')).label, '峰');
  assert.equal(tariff(at('2026-11-06T12:00:00')).next, at('2026-11-06T14:00:00'));
  const weekend = tariff(at('2026-11-06T18:00:00'));
  assert.equal(weekend.label, '谷');
  assert.equal(weekend.next, at('2026-11-09T09:00:00'));
  assert.equal(formatRemaining(weekend.next-at('2026-11-06T18:00:00')), '63h00m');
});
test('法定节假日全天谷价，调休周末仍谷价，超出日历不瞎报', () => {
  assert.equal(tariff(at('2026-10-01T10:00:00')).label, '谷');
  assert.equal(tariff(at('2026-10-10T10:00:00')).label, '谷');
  assert.equal(tariff(at('2027-02-08T10:00:00')).label, '谷');
  assert.equal(tariff(at('2028-02-01T10:00:00')).label, '—');
});
