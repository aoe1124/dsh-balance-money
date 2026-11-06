// Independent of the host-wide module/HMR stream, and carries no account data.
export function createLifecycleRoute(connection) {
  let disposed=false;
  const clients=new Set();
  return {
    handler(req,res) {
      const admission=connection.admit(req);
      if('rejection' in admission || admission.peer.principal.kind!=='owner') {
        res.writeHead(admission.rejection ?? 403);res.end();return;
      }
      if(disposed || req.method!=='GET') {res.writeHead(405);res.end();return;}
      res.writeHead(200,{'content-type':'application/x-ndjson','cache-control':'no-store','x-content-type-options':'nosniff','x-accel-buffering':'no'});
      res.write('{"enabled":true}\n');
      clients.add(res);
      const heartbeat=setInterval(()=>{if(!res.destroyed)res.write('\n');},20_000);
      res.on('close',()=>{clearInterval(heartbeat);clients.delete(res);});
    },
    dispose() {
      disposed=true;
      for(const res of clients)if(!res.destroyed)res.end('{"enabled":false}\n');
      clients.clear();
    },
  };
}
