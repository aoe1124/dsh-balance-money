export const alwaysActive={getSnapshot:()=>true,subscribe:()=>()=>{}};

export function createLifecycle({request=(url,init)=>globalThis.fetch(url,init),retryMs=2000}={}) {
  let enabled=false,controller=null;
  const listeners=new Set();
  const publish=value=>{if(enabled!==value){enabled=value;for(const listener of listeners)listener();}};
  const stop=()=>{controller?.abort();controller=null;};
  return {
    getSnapshot:()=>enabled,
    subscribe:listener=>{listeners.add(listener);return ()=>listeners.delete(listener);},
    stop,
    start() {
      stop();controller=new AbortController();const {signal}=controller;
      void (async()=>{
        while(!signal.aborted) {
          try {
            const response=await request('dsh-balance-money/lifecycle',{method:'GET',cache:'no-store',signal});
            if([404,405].includes(response.status))publish(false);
            if(response.ok && response.body) {
              const reader=response.body.pipeThrough(new TextDecoderStream()).getReader();
              let pending='';
              try {
                while(!signal.aborted) {
                  const {done,value}=await reader.read();if(done)break;
                  pending+=value;
                  let newline;
                  while((newline=pending.indexOf('\n'))>=0) {
                    const line=pending.slice(0,newline);pending=pending.slice(newline+1);
                    if(line.trim()) {const event=JSON.parse(line);if(typeof event.enabled==='boolean')publish(event.enabled);}
                  }
                }
              }finally {await reader.cancel().catch(()=>{});reader.releaseLock();}
            }else await response.body?.cancel();
          }catch { /* Network loss is not a user disable. */ }
          if(signal.aborted)break;
          await new Promise(resolve=>{
            const finish=()=>{clearTimeout(timer);signal.removeEventListener('abort',finish);resolve();};
            const timer=setTimeout(finish,retryMs);signal.addEventListener('abort',finish,{once:true});
          });
        }
      })();
      return stop;
    },
  };
}
