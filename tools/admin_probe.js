const http = require('http');
const PORTS = Array.from({length:11},(_,i)=>8080+i);
let activePort = null;
function reqToPort(port, method, path, headers={}, body=null){
  return new Promise((resolve,reject)=>{
    const opts={hostname:'127.0.0.1',port,path,method,headers};
    const r = http.request(opts,res=>{let b='';res.on('data',c=>b+=c);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:b}));});
    r.on('error',reject);
    if(body) r.write(body);
    r.end();
  });
}
async function req(method,path,headers={},body=null){
  if(activePort) return reqToPort(activePort,method,path,headers,body);
  for(const p of PORTS){
    try{const r=await reqToPort(p,method,path,headers,body); activePort=p; return r;}catch(e){}
  }
  throw new Error('no server');
}

async function probe(){
  const endpoints=['/api/session','/api/users','/api/orgs','/api/admin/user_search?q=test','/api/submissions','/api/submissions/1','/api/submissions/1/grade'];
  for(const ep of endpoints){
    try{
      if(ep === '/api/submissions'){
        // try POST without auth to ensure it requires auth (student endpoint)
        const payload = JSON.stringify({ lesson_id: 1, content: 'probe' });
        const r = await req('POST', ep, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }, payload);
        console.log(ep,'POST status',r.status,'bodySnippet',r.body? r.body.slice(0,200).replace(/\n/g,' '):'');
        continue;
      }
      if(ep.endsWith('/grade')){
        // send a PUT test without auth - expect 403
        const payload = JSON.stringify({ grade: 95, feedback: 'Test' });
        const r = await req('PUT', ep, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }, payload);
        console.log(ep,'PUT status',r.status,'bodySnippet',r.body? r.body.slice(0,200).replace(/\n/g,' '):'');
      } else {
        const r = await req('GET',ep);
        console.log(ep,'GET status',r.status,'bodySnippet',r.body? r.body.slice(0,200).replace(/\n/g,' '):'');
      }
    }catch(e){
      console.log(ep,'error',String(e).slice(0,200));
    }
  }
}

(async()=>{try{await probe();}catch(e){console.error('Probe failed',e);process.exit(1);} })();
