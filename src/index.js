import { homedir } from 'node:os';
import { join } from 'node:path';
import { BalanceService } from './service.js';
import { readBalance } from './balance.js';
import { createHandler } from './route.js';
import { createLifecycleRoute } from './lifecycle-route.js';

export const name = 'dsh-balance-money';
export const inject = ['connection','credentials','webServer'];
export function apply(ctx) {
  const lifetime = new AbortController();
  const service = new BalanceService({
    home:join(process.env.DSH_HOME || join(homedir(),'.dsh'),'balance-money'),
    read:provider=>readBalance(ctx,provider,{signal:AbortSignal.any([lifetime.signal,AbortSignal.timeout(15_000)])}),
  });
  for (const event of ['credentials/reference-updated','credentials/record-updated','deepseek-account/signed-out','deepseek-account/changed','settings/document-updated']) {
    ctx.on(event,()=>service.invalidate());
  }
  ctx.effect(()=>ctx.webServer.register({kind:'exact',path:'/dsh-balance-money/snapshot',
    handler:createHandler(ctx.connection,(provider,force)=>service.snapshot(provider,force)),
  }));
  ctx.effect(()=>()=>{lifetime.abort();service.dispose();});
  const lifecycle=createLifecycleRoute(ctx.connection);
  ctx.effect(()=>ctx.webServer.register({kind:'exact',path:'/dsh-balance-money/lifecycle',handler:lifecycle.handler}));
  ctx.effect(()=>()=>lifecycle.dispose());
}
