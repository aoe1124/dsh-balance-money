import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { createRoot } from 'react-dom/client';
const require = createRequire(import.meta.url);
async function clientModule() {
  let plugin;
  vm.runInNewContext(await readFile(new URL('../lib/client.js',import.meta.url),'utf8'), {
    window:{__ModuleLoader__:{load:row=>{plugin=row.factory(require);}}},
    setInterval,clearInterval,AbortController,AbortSignal,Date,console,
  });
  return plugin;
}
test('标准客户端包注册独立槽位，使用已确认短文案', async()=>{
  const mod = await clientModule();
  let registered;
  const directory = {store:{getSnapshot:()=>({current:{provider:'deepseek-account'}}),subscribe:()=>()=>{}}};
  const ctx={effect:()=>{},slots:{inject:(name,fn)=>{assert.equal(name,'conversation.composer.dock');fn();},register:(options,component)=>{registered={options,component};}},
    modelDirectories:{directoryFor:()=>directory},connection:{rpc:{call:async()=>({ok:true,value:{}})}}};
  mod.apply(ctx);
  assert.equal(registered.options.id,'balance-money');
  const props = {...registered.options.inject('session-a'),lifecycle:{getSnapshot:()=>true,subscribe:()=>()=>{}}};
  const html = renderToStaticMarkup(React.createElement(registered.component,props));
  assert.ok(html.includes('余额'));
  assert.ok(html.includes('今日'));
  assert.ok(!html.includes('今日已用'));
  assert.ok(!html.includes('时剩余'));
  assert.ok(html.includes('dsh-balance-money'));
  assert.equal((html.match(/<button\b/g)||[]).length,1,'三个指标共用一个点击和悬停区域');
});
test('客户端取得余额后显示金额，卸载后停止更新',async()=>{
  const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/'});
  globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
  const mod=await clientModule();
  const directory={store:{getSnapshot:()=>snapshot,subscribe:()=>()=>{}}};
  const snapshot={current:{provider:'deepseek-account'}};
  let calls=0, fail=false;
  let active=true;
  const listeners=new Set();
  const lifecycle={getSnapshot:()=>active,subscribe:fn=>{listeners.add(fn);return ()=>listeners.delete(fn);}};
  const rpc={call:async()=>{calls++;if(fail)throw Error('network');return {ok:true,value:{balance:'5480000',used:'1400000',currency:'CNY',day:new Date(Date.now()+28800000).toISOString().slice(0,10)}};}};
  const root=createRoot(document.getElementById('root'));
  await React.act(async()=>{root.render(React.createElement(mod.MoneyPill,{directory,rpc,lifecycle}));});
  assert.match(document.body.textContent,/余额 ¥5.48/);
  assert.match(document.body.textContent,/今日 ¥1.40/);
  assert.equal(calls,1);
  fail=true;
  await React.act(async()=>document.querySelector('button').click());
  assert.match(document.body.textContent,/余额 ¥5.48/);
  assert.match(document.querySelector('button').title,/刷新失败/);
  await React.act(async()=>{active=false;for(const fn of listeners)fn();});
  assert.equal(document.getElementById('root').textContent,'','停用必须移除整组文字');
  fail=false;
  await React.act(async()=>{active=true;for(const fn of listeners)fn();});
  assert.match(document.body.textContent,/余额 ¥5.48/);
  await React.act(async()=>root.unmount());dom.window.close();
  delete globalThis.window;delete globalThis.document;delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});
