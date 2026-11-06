import { createHash } from 'node:crypto';
import { moneyUnits, decimalFromUnits } from './accounting.js';

export class BalanceError extends Error {}
const tag = text => createHash('sha256').update(text).digest('hex');
const client = { version:'0.2.1-rc.5', locale:'zh_CN', timezoneOffsetSeconds:28800 };

function pickCurrency(wallets) {
  const currencies = [...new Set(wallets.map(w => w.currency))];
  const currency = currencies.includes('CNY') ? 'CNY' : currencies.includes('USD') ? 'USD' : null;
  if (!currency) throw new BalanceError('没有可用余额');
  return currency;
}

export async function readBalance(ctx, provider, options = {}) {
  if (provider === 'deepseek-account') {
    const account = ctx.get('deepseekAccount');
    if (!account) throw new BalanceError('账号服务不可用');
    const profile = await account.getProfile(client);
    if (profile?.status !== 'ready' || !profile.value.id) throw new BalanceError('请先登录 DeepSeek');
    const result = await account.getBalance(client);
    const after = await account.getProfile(client);
    if (after?.status !== 'ready' || after.value.id !== profile.value.id) throw new BalanceError('账户已切换，请刷新');
    if (result?.status !== 'ready') throw new BalanceError('余额暂不可用');
    const wallets = [...result.value, ...result.bonusWallets];
    const currency = pickCurrency(wallets);
    const units = wallets.filter(w=>w.currency===currency).reduce((sum,w)=>sum+moneyUnits(w.balance),0n);
    return { scope:tag(`account:${profile.value.id}:${currency}`), currency, balance:decimalFromUnits(units) };
  }
  if (provider !== 'deepseek-official') throw new BalanceError('当前模型非 DeepSeek 官方');
  // Read the live official adapter's credential reference, rather than assuming
  // every installation uses the default key name. This descriptor is never sent.
  const forms = ctx.get('settings')?.describe({redactSecrets:true}) ?? [];
  const config = forms.find(form=>form.ns==='llm-deepseek')?.value ?? {};
  const ref = config.apiKeyEnv ?? 'DEEPSEEK_API_KEY';
  if (typeof ref !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(ref)) throw new BalanceError('凭据引用无效');
  if (config.baseURL && new URL(config.baseURL).origin !== 'https://api.deepseek.com') throw new BalanceError('当前模型非 DeepSeek 官方');
  const credentials = ctx.get('credentials');
  const key = (await credentials?.resolve(ref))?.value;
  if (!key) throw new BalanceError('请先配置 DeepSeek API Key');
  const response = await (options.fetch ?? globalThis.fetch)('https://api.deepseek.com/user/balance', {
    headers:{Authorization:`Bearer ${key}`}, signal:options.signal ?? AbortSignal.timeout(15_000), redirect:'error',
  });
  if (!response.ok) throw new BalanceError(response.status===401 ? 'DeepSeek 凭据已失效' : '余额暂不可用');
  const body = await response.json();
  if (!Array.isArray(body.balance_infos)) throw new BalanceError('余额格式无效');
  const currency = pickCurrency(body.balance_infos);
  const wallet = body.balance_infos.find(w=>w.currency===currency);
  moneyUnits(wallet.total_balance);
  if ((await credentials.resolve(ref))?.value !== key) throw new BalanceError('账户已切换，请刷新');
  return { scope:tag(`api:${key}:${currency}`),currency,balance:wallet.total_balance };
}
