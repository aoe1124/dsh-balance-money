import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { displayMoney, beijingDay } from './accounting.js';
import { tariff, formatRemaining } from './schedule.js';
import { alwaysActive, createLifecycle } from './lifecycle.js';

export const inject = ['slots', 'connection', 'modelDirectories'];

export function MoneyPill({ directory, rpc, lifecycle=alwaysActive }) {
  const active=useSyncExternalStore(lifecycle.subscribe,lifecycle.getSnapshot,lifecycle.getSnapshot);
  const selection = useSyncExternalStore(directory.store.subscribe, directory.store.getSnapshot, directory.store.getSnapshot);
  const provider = selection.current?.provider ?? null;
  const [result,setResult] = useState(null);
  const [now,setNow] = useState(Date.now);
  const [refresh,setRefresh] = useState(0);
  useEffect(()=>{
    if(!active)return;
    const timer=setInterval(()=>setNow(Date.now()),1000);
    return ()=>clearInterval(timer);
  },[active]);
  useEffect(()=>{
    const controller=new AbortController();
    let busy=false;
    if(!active){setResult(null);return ()=>controller.abort();}
    if (!['deepseek-account','deepseek-official'].includes(provider)) return ()=>controller.abort();
    const pull=async(force)=>{
      if(busy)return;
      busy=true;
      try {
        const response=await rpc.call('/dsh-balance-money','snapshot',{provider,force},AbortSignal.any([controller.signal,AbortSignal.timeout(20_000)]));
        if(!controller.signal.aborted) {
          if(!response.ok) throw Error();
          setResult({provider,...response.value});
        }
      }catch(error) {
        const http = error?.message?.match(/HTTP \d{3}/)?.[0];
        if(!controller.signal.aborted)setResult(old=>({...(old?.provider===provider?old:{}),provider,stale:true,error:http?`余额刷新失败（${http}）`:'余额刷新失败'}));
      }finally{busy=false;}
    };
    void pull(refresh>0);
    // Poll only the host's cached snapshot, so all sessions share one sample.
    const timer=setInterval(()=>void pull(false),30_000);
    return ()=>{controller.abort();clearInterval(timer);};
  },[provider,rpc,refresh,active]);
  const value=result?.provider===provider ? result : null;
  const balance=value?.balance==null?'—':displayMoney(value.balance,value.currency);
  const used=value?.used==null || value.day!==beijingDay(now)?'—':displayMoney(value.used,value.currency);
  const period=tariff(now);
  const time=period.next==null?'—':formatRemaining(period.next-now);
  const error=value?.error ?? (!provider?'正在读取当前模型':!['deepseek-account','deepseek-official'].includes(provider)?'当前模型非 DeepSeek 官方':null);
  const stamp=value?.updatedAt ? new Date(value.updatedAt).toLocaleTimeString('zh-CN',{hour12:false}) : null;
  const status=[error,stamp?`余额更新于 ${stamp}`:null,'点击刷新'].filter(Boolean).join('；');
  const update=()=>setRefresh(n=>n+1);
  if(!active)return null;
  const scheduleHint=period.reason ?? `当前${period.label==='峰'?'高峰':'低谷'}价格；北京时间 ${new Date(period.next).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false})} 切换`;
  const hint=`${status}\n今日根据北京时间首次观测后的余额下降累计，非官方账单。\n${scheduleHint}`;
  return <button type="button" className="dsh-balance-money" data-composer-stat="balance-money" onClick={update} title={hint}
    aria-label={`余额 ${balance}，今日 ${used}，${period.label} ${time}。${status}`}>
    <span>余额 {balance}{value?.stale?' *':''}</span>
    <span>今日 {used}</span>
    <span>{period.label} {time}</span>
  </button>;
}

export function apply(ctx) {
  const lifecycle=createLifecycle();
  ctx.effect(()=>lifecycle.start());
  return ctx.slots.inject('conversation.composer.dock',()=>ctx.slots.register({
    name:'conversation.composer.dock',id:'balance-money',order:2,
    inject:sessionId=>({directory:ctx.modelDirectories.directoryFor(sessionId),rpc:ctx.connection.rpc,lifecycle}),
  },MoneyPill));
}
