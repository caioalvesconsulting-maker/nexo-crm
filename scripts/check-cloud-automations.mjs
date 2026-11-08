// Fixed destination; no secret arguments, files, response bodies or redirects.
const endpoint='https://nexo-crm-caio.caiomv352.chatgpt.site/api/automations/cloud';
async function readInput(){return new Promise((resolve,reject)=>{
  let value='';const terminal=process.stdin.isTTY;
  function finish(error){process.stdin.removeListener('data',data);process.stdin.removeListener('end',end);if(terminal)process.stdin.setRawMode(false);process.stdin.pause();error?reject(error):resolve(value);}
  function data(chunk){value+=chunk;if(value.includes('\u0003')||value.length>32000)finish(new Error('Entrada cancelada ou inválida.'));else if(/[\r\n]/.test(value))finish();}
  function end(){finish();}
  if(terminal)process.stdin.setRawMode(true);
  process.stderr.write('Ready for service JSON on stdin (input is hidden).\n');process.stdin.setEncoding('utf8');process.stdin.on('data',data);process.stdin.once('end',end);process.stdin.resume();
});}
try{
  const {token}=JSON.parse(await readInput());if(typeof token!=='string'||!token||/[\r\n]/.test(token))throw new Error('Credencial ausente ou inválida.');
  const headers={'OAI-Sites-Authorization':`Bearer ${token}`};
  const response=await fetch(endpoint,{method:'POST',headers,redirect:'error',signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new Error(`Rotina não confirmada: HTTP ${response.status}`);
  const result=await response.json();if(!result.run?.id||!result.run?.at)throw new Error('Resposta inválida.');
  const read=await fetch(endpoint,{headers,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(20000)});
  if(!read.ok)throw new Error(`Leitura não confirmada: HTTP ${read.status}`);
  const persisted=await read.json();if(persisted.run?.id!==result.run.id&&!(persisted.revision>result.revision&&persisted.run?.at>=result.run.at))throw new Error('Confirmação persistida não encontrada.');
  console.log(JSON.stringify({verified:true,run:result.run,actions:result.actions,revision:result.revision,persistedRevision:persisted.revision}));
}catch(error){console.error(error.message||'Falha na verificação.');process.exitCode=1;}
