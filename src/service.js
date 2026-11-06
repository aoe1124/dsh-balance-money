import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { beijingDay, observe } from './accounting.js';
import { BalanceError } from './balance.js';

export class BalanceService {
  constructor({ home, read, now = Date.now }) {
    Object.assign(this,{home,read,now});
    this.cache = new Map(); this.pending = new Map(); this.records = null;
    this.serial = Promise.resolve(); this.generation = 0; this.disposed = false;
  }
  invalidate() { this.generation++; this.cache.clear(); }
  dispose() { this.disposed = true; this.invalidate(); }
  async load() {
    if (this.records) return;
    try {
      const file = JSON.parse(await readFile(join(this.home,'balance.json'),'utf8'));
      if (file.version !== 1 || !Array.isArray(file.records)) throw Error();
      for (const r of file.records) {
        if (typeof r.scope !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r.day)
          || !/^-?\d+$/.test(r.balance) || !/^\d+$/.test(r.used) || !Number.isFinite(r.updatedAt)) throw Error();
      }
      this.records = new Map(file.records.map(r=>[r.scope,r]));
    } catch(error) {
      if (error.code === 'ENOENT') this.records = new Map();
      else throw new BalanceError('本地统计文件不可读');
    }
  }
  publicValue(value, error = null) {
    return { ...value, used: value.day === beijingDay(this.now()) ? value.used : null, stale:!!error, error };
  }
  async save(records) {
    await mkdir(this.home,{recursive:true,mode:0o700});
    const temp=join(this.home,`balance.${randomUUID()}.tmp`);
    await writeFile(temp,JSON.stringify({version:1,records:[...records.values()]}),{mode:0o600});
    await rename(temp,join(this.home,'balance.json'));
  }
  snapshot(provider, force = false) {
    if (this.disposed) return Promise.resolve({error:'插件已停用'});
    const cached = this.cache.get(provider);
    if (!force && cached && this.now()-cached.updatedAt < 300_000) return Promise.resolve(this.publicValue(cached));
    const pendingKey = `${this.generation}:${provider}`;
    if (this.pending.has(pendingKey)) return this.pending.get(pendingKey);
    const generation = this.generation;
    const task = this.serial.then(async () => {
      try {
        await this.load();
        const sample = await this.read(provider);
        if (this.disposed || generation !== this.generation) throw new BalanceError('账户已切换，请刷新');
        const record = observe(this.records.get(sample.scope), {...sample,now:this.now()});
        const records = new Map(this.records); records.set(sample.scope,record);
        await this.save(records);
        this.records=records;
        if (this.disposed || generation !== this.generation) throw new BalanceError('账户已切换，请刷新');
        const value = {balance:record.balance,used:record.used,day:record.day,currency:sample.currency,updatedAt:record.updatedAt};
        if (generation === this.generation && !this.disposed) this.cache.set(provider,value);
        return this.publicValue(value);
      } catch(error) {
        const missing = error?.message?.match(/^cannot get (?:property|required service) "([A-Za-z0-9.]+)"/);
        const message = error instanceof BalanceError ? error.message : missing ? `宿主依赖不可用：${missing[1]}` : error?.message==='余额格式无效' ? '余额数值格式无效' : '余额刷新失败';
        const last = generation === this.generation ? this.cache.get(provider) : null;
        return last ? this.publicValue(last,message) : {balance:null,used:null,currency:null,updatedAt:null,stale:true,error:message};
      }
    }).finally(()=>this.pending.delete(pendingKey));
    this.pending.set(pendingKey,task); this.serial = task.catch(()=>{});
    return task;
  }
}
