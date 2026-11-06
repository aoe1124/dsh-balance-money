import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BalanceService } from '../src/service.js';

test('并发刷新合并、五分钟缓存、写盘和重启恢复', async () => {
  const home=await mkdtemp(join(tmpdir(),'balance-test-'));
  let balance='10', count=0, now=Date.parse('2026-11-06T10:00:00Z');
  const read=async()=>{count++; await new Promise(r=>setTimeout(r,5));return {scope:'a',currency:'CNY',balance};};
  const service=new BalanceService({home,read,now:()=>now});
  const [a,b]=await Promise.all([service.snapshot('deepseek-account'),service.snapshot('deepseek-account')]);
  assert.deepEqual(a,b);assert.equal(count,1);
  await service.snapshot('deepseek-account');assert.equal(count,1);
  now+=1000;balance='9.8';
  const spent=await service.snapshot('deepseek-account',true);assert.equal(spent.used,'200000');
  const restored=new BalanceService({home,read,now:()=>now});balance='9.5';
  assert.equal((await restored.snapshot('deepseek-account')).used,'500000');
  assert.ok((await readFile(join(home,'balance.json'),'utf8')).includes('500000'));
});
test('写盘期间失效的请求不返回旧账户成功值',async()=>{
  const home=await mkdtemp(join(tmpdir(),'balance-test-'));
  const service=new BalanceService({home,read:async()=>({scope:'a',currency:'CNY',balance:'1'})});
  const save=service.save?.bind(service);
  service.save=async records=>{await save(records);service.invalidate();};
  const result=await service.snapshot('deepseek-account');
  assert.equal(result.balance,null);assert.match(result.error,/账户已切换/);
});
test('失败保留同账户采样，跨天旧消费不冒充今日，损坏文件不覆盖', async () => {
  const home=await mkdtemp(join(tmpdir(),'balance-test-'));
  let fail=false, now=Date.parse('2026-11-06T15:59:00Z');
  const service=new BalanceService({home,now:()=>now,read:async()=>{if(fail)throw Error('secret-token');return {scope:'a',currency:'CNY',balance:'5'};}});
  await service.snapshot('deepseek-account');fail=true;now+=120000;
  const stale=await service.snapshot('deepseek-account',true);
  assert.equal(stale.balance,'5000000');assert.equal(stale.used,null);assert.equal(stale.stale,true);
  assert.ok(!JSON.stringify(stale).includes('secret-token'));
  await writeFile(join(home,'balance.json'),'broken');
  const broken=new BalanceService({home,read:async()=>({scope:'a',currency:'CNY',balance:'1'}),now:()=>now});
  assert.equal((await broken.snapshot('deepseek-account')).error,'本地统计文件不可读');
  assert.equal(await readFile(join(home,'balance.json'),'utf8'),'broken');
});
