import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createLifecycleRoute } from '../src/lifecycle-route.js';
import { createLifecycle } from '../src/lifecycle.js';

test('独立生命周期连接：停用立即隐藏，重新启用恢复，不依赖宿主HMR',async()=>{
  let route=createLifecycleRoute({admit:()=>({peer:{principal:{kind:'owner'}}})});
  const server=createServer((req,res)=>route.handler(req,res));
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const url=`http://127.0.0.1:${server.address().port}/`;
  const state=createLifecycle({request:(_,init)=>fetch(url,init),retryMs:10});
  const changed=()=>new Promise(resolve=>{
    const unsub=state.subscribe(()=>{unsub();resolve(state.getSnapshot());});
  });
  try {
    const active=changed();const stop=state.start();
    assert.equal(await active,true);
    const hidden=changed();route.dispose();assert.equal(await hidden,false);
    route=createLifecycleRoute({admit:()=>({peer:{principal:{kind:'owner'}}})});
    const restored=changed();assert.equal(await restored,true);
    stop();route.dispose();
  }finally {state.stop();route.dispose();server.closeAllConnections();await new Promise(r=>server.close(r));}
});
