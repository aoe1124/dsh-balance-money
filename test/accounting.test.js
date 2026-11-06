import test from 'node:test';
import assert from 'node:assert/strict';
import { observe, moneyUnits, displayMoney, beijingDay } from '../src/accounting.js';

test('充值不抵扣已用，使用精确十进制余额差', () => {
  let state;
  for (const [balance, used] of [['10.00','0'],['9.80','200000'],['19.80','200000'],['19.50','500000']]) {
    state = observe(state, { scope: 'a-CNY', balance, now: Date.parse('2026-11-06T10:00:00Z') });
    assert.equal(state.used, used);
  }
  assert.equal(displayMoney(state.used, 'CNY'), '¥0.50');
  assert.equal(moneyUnits('0.000001'), 1n);
  assert.throws(() => moneyUnits('NaN'));
  assert.throws(() => moneyUnits('not-money'));
});
test('北京时间跨天建立新基线，不跨账户币种继承', () => {
  const now = Date.parse('2026-11-06T15:59:00Z');
  const s = observe(undefined, { scope: 'a-CNY', balance:'10', now });
  const spent = observe(s, { scope: 'a-CNY', balance:'9', now });
  assert.equal(beijingDay(now + 60_000), '2026-11-07');
  assert.equal(observe(spent, { scope:'a-CNY', balance:'8', now:now+60_000 }).used, '0');
  assert.equal(observe(spent, { scope:'a-USD', balance:'8', now }).used, '0');
});
test('序列化重启后继续累计，倒退时间不污染统计', () => {
  const now = Date.parse('2026-11-06T10:00:00Z');
  const first = observe(undefined, { scope:'a', balance:'1.00', now });
  const restored = JSON.parse(JSON.stringify(first));
  const next = observe(restored, { scope:'a', balance:'0.99', now:now+1000 });
  assert.equal(next.used, '10000');
  assert.throws(() => observe(next, { scope:'a', balance:'0.5', now:now-1000 }));
});
test('接受官方高精度十进制钱包，按百万分之一四舍五入',()=>{
  assert.equal(moneyUnits('5.484331640000000000'),5484332n);
  assert.equal(moneyUnits('5.480000000000000000'),5480000n);
  assert.equal(moneyUnits('0.9999999'),1000000n);
});
test('欠费与科学计数余额正确显示，跨零消费继续累计',()=>{
  assert.equal(moneyUnits('-1e-2'),-10000n);
  assert.equal(moneyUnits('5.48e0'),5480000n);
  assert.equal(displayMoney(-10000n,'CNY'),'-¥0.01');
  const now=Date.parse('2026-11-06T10:00:00Z');
  const a=observe(undefined,{scope:'a',balance:'0.01',now});
  assert.equal(observe(a,{scope:'a',balance:'-0.01',now:now+1}).used,'20000');
});
