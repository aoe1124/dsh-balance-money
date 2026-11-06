// Use public WebRoute + Connection admission. The desktop carrier and web
// client speak the same Connection RPC envelope over this dedicated route.
export function createHandler(connection, snapshot) {
  return async (req,res)=> {
    const reply=(status,body)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(body));};
    const admission=connection.admit(req);
    if ('rejection' in admission) return reply(admission.rejection,{error:'unauthorized'});
    if (admission.peer.principal.kind !== 'owner') return reply(403,{error:'forbidden'});
    if(req.method!=='POST')return reply(405,{error:'method'});
    if(req.headers['content-type']?.split(';')[0].trim()!=='application/json')return reply(415,{error:'content-type'});
    let size=0, chunks=[];
    try {
      for await (const chunk of req) {
        const buffer=Buffer.from(chunk);size+=buffer.length;
        if(size>4096)return reply(413,{error:'too-large'});
        chunks.push(buffer);
      }
      const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if(body.type!=='client-request'||typeof body.rpcId!=='string'||body.rpcId.length>100||body.method!=='snapshot'
        ||!['deepseek-account','deepseek-official'].includes(body.payload?.provider)
        ||(body.payload.force!==undefined&&typeof body.payload.force!=='boolean')) return reply(400,{error:'invalid'});
      const value=await snapshot(body.payload.provider,body.payload.force===true);
      reply(200,{type:'server-response',rpcId:body.rpcId,result:{ok:true,value}});
    }catch { reply(400,{error:'invalid-request'}); }
  };
}
