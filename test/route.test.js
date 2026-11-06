import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createHandler } from '../src/route.js';

async function request(handler, body, headers={}) {
  const req=Readable.from([JSON.stringify(body)]);req.method='POST';req.headers={'content-type':'application/json',...headers};
  let status,bodyText;
  const res={writeHead:(s)=>{status=s;},end:s=>{bodyText=s;}};
  await handler(req,res);return {status,body:JSON.parse(bodyText)};
}
test('先验证宿主身份，未授权请求不读取余额',async()=>{
  const handler=createHandler({admit:()=>({rejection:403})},()=>{throw Error('不应调用');});
  assert.equal((await request(handler,{})).status,403);
});
test('仅 owner 的有效请求可以刷新，返回标准 RPC envelope',async()=>{
  const handler=createHandler({admit:()=>({peer:{principal:{kind:'owner'}}})},async(provider,force)=>{
    assert.equal(provider,'deepseek-account');assert.equal(force,true);return {balance:'5480000'};
  });
  const r=await request(handler,{type:'client-request',rpcId:'id-1',method:'snapshot',payload:{provider:'deepseek-account',force:true}});
  assert.equal(r.status,200);assert.equal(r.body.rpcId,'id-1');assert.equal(r.body.result.value.balance,'5480000');
  assert.equal((await request(handler,{})).status,400);
});
