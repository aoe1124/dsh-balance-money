import test from 'node:test';
import assert from 'node:assert/strict';
import { readBalance } from '../src/balance.js';

test('账号余额合并充值和赠金，币种不相加，不返回账户id', async () => {
  const ctx = { get: name => name === 'deepseekAccount' ? account : undefined };
  const account = {
    getProfile: async () => ({status:'ready',value:{id:'private-user'}}),
    getBalance: async () => ({status:'ready',value:[{currency:'CNY',balance:'2.10'}],bonusWallets:[{currency:'CNY',balance:'3.38'},{currency:'USD',balance:'10'}]}),
  };
  const result = await readBalance(ctx, 'deepseek-account');
  assert.equal(result.balance, '5.480000');
  assert.equal(result.currency, 'CNY');
  assert.ok(!JSON.stringify(result).includes('private-user'));
});
test('账号读取失败不回退到另一个 API key 账户', async () => {
  let keyRead = false;
  const ctx = { get: name => name === 'deepseekAccount' ? {getProfile:async()=>null} : {resolve:async()=>{keyRead=true;}} };
  await assert.rejects(readBalance(ctx,'deepseek-account'));
  assert.equal(keyRead,false);
});
test('API key 仅向官方接口使用，换 key 时旧余额作废', async () => {
  let key='test-key-one';
  const ctx={get:name=> name==='credentials' ? {resolve:async()=>({value:key})} : undefined};
  const transport = async (url, init) => {
    assert.equal(url,'https://api.deepseek.com/user/balance');
    assert.equal(init.headers.Authorization,'Bearer test-key-one');
    key='test-key-two';
    return Response.json({balance_infos:[{currency:'CNY',total_balance:'5.48'}]});
  };
  await assert.rejects(readBalance(ctx,'deepseek-official', {fetch:transport}), /账户已切换/);
});
test('非 DeepSeek 来源不读凭据', async () => {
  await assert.rejects(readBalance({get:()=>{throw Error('不应读取');}},'other'), /当前模型/);
});
