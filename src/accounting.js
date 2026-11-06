// Millionths preserve DeepSeek's decimal balances without binary rounding drift.
export function moneyUnits(value) {
  const text = String(value);
  const match=text.length<=128 && text.match(/^([+-]?)(\d+)(?:\.(\d*))?(?:[eE]([+-]?\d{1,2}))?$/);
  if(!match)throw new Error('余额格式无效');
  const [,sign,whole,fraction='',exponent='0']=match;
  const power=6+Number(exponent)-fraction.length;
  const digits=BigInt(whole+fraction);
  const units=power>=0 ? digits*10n**BigInt(power) : (digits+10n**BigInt(-power)/2n)/(10n**BigInt(-power));
  return sign==='-' ? -units:units;
}

export function beijingDay(now) {
  return new Date(now + 8 * 3600_000).toISOString().slice(0, 10);
}

export function observe(previous, { scope, balance, now }) {
  const current = moneyUnits(balance);
  const day = beijingDay(now);
  let used = 0n;
  if (previous?.scope === scope && previous.day === day) {
    if (now < previous.updatedAt) throw new Error('系统时间早于上次采样');
    used = BigInt(previous.used);
    const drop = BigInt(previous.balance) - current;
    if (drop > 0n) used += drop;
  }
  return { scope, day, balance: String(current), used: String(used), updatedAt: now };
}

export function displayMoney(units, currency) {
  const value=BigInt(units), negative=value<0n;
  const cents = ((negative ? -value:value) + 5000n) / 10_000n;
  const symbol = currency === 'CNY' ? '¥' : currency === 'USD' ? '$' : currency + ' ';
  return `${negative&&cents>0n?'-':''}${symbol}${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`;
}

export function decimalFromUnits(units) {
  const raw=BigInt(units), value=raw<0n?-raw:raw;
  return `${raw<0n?'-':''}${value / 1_000_000n}.${String(value % 1_000_000n).padStart(6, '0')}`;
}
