import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {createCloudHandler} from '../cloud/backend.mjs';
const env={PUBLIC_ORIGIN:'https://market.example.com',SUPABASE_URL:'https://test.supabase.co',SUPABASE_PUBLISHABLE_KEY:'publishable-fixture'};
async function call(path,{data,headers={},fetcher,environment=env}={}){
 const req=Readable.from(data===undefined?[]:[Buffer.from(JSON.stringify(data))]);req.url=path;req.method=data===undefined?'GET':'POST';req.headers={origin:env.PUBLIC_ORIGIN,'content-type':'application/json','x-affsiwen-request':'1',...headers};
 const out={statusCode:200,headers:{},setHeader(k,v){this.headers[k.toLowerCase()]=v;},end(v){this.body=v;}};
 await createCloudHandler({env:environment,fetcher:fetcher||(()=>{throw Error('unexpected network');})})(req,out);return out;
}
test('cloud fails closed without configuration',async()=>{const r=await call('/api/health',{environment:{}});assert.equal(r.statusCode,503);});
test('cross-origin mutation never reaches database',async()=>{const r=await call('/api/orders',{data:{},headers:{origin:'https://evil.example'}});assert.equal(r.statusCode,403);});
test('anonymous account routes require login',async()=>{assert.equal((await call('/api/orders')).statusCode,401);assert.equal((await call('/api/me')).statusCode,401);});
test('registration cannot choose operator',async()=>{assert.equal((await call('/api/register',{data:{role:'operator'}})).statusCode,403);});
test('Google remains disabled until configured',async()=>{assert.equal((await call('/api/auth/google/start')).statusCode,503);});
test('health checks the DB and does not advertise paid execution or local role access',async()=>{
 const r=await call('/api/index?route=health',{fetcher:async(url,opts)=>{assert.equal(url.pathname,'/rest/v1/rpc/affsiwen_market');assert.equal(opts.headers.apikey,'publishable-fixture');assert.equal(opts.headers.Authorization,undefined);return Response.json({products:[]});}});
 assert.equal(r.statusCode,200);const body=JSON.parse(r.body);assert.equal(body.database,'supabase-postgres');assert.equal(body.commercialSales,false);assert.equal(body.demoAccess,false);assert.equal(body.googleLogin,false);
});
test('authenticated order uses caller JWT and overwrites a forged ID with route ID',async()=>{
 const calls=[];const r=await call('/api/orders/00000000-0000-0000-0000-000000000001/accept',{data:{id:'forged'},headers:{cookie:'aff_access=caller-jwt'},fetcher:async(url,opts)=>{calls.push({url,opts});assert.equal(opts.headers.Authorization,'Bearer caller-jwt');return Response.json(url.pathname==='/auth/v1/user'?{id:'owner'}:{order:{status:'accepted'}});}});
 assert.equal(r.statusCode,200);assert.equal(JSON.parse(calls[1].opts.body).args.id,'00000000-0000-0000-0000-000000000001');
});
test('provider failures do not leak internal payloads',async()=>{const r=await call('/api/catalog',{fetcher:async()=>Response.json({message:'private credential detail'},{status:500})});assert.equal(r.statusCode,503);assert.ok(!r.body.includes('credential'));});
test('signup requiring confirmation does not create a session',async()=>{const r=await call('/api/register',{data:{email:'demo@example.com',password:'twelve-characters',role:'buyer'},fetcher:async()=>Response.json({id:'pending-user'})});assert.equal(JSON.parse(r.body).confirmationRequired,true);assert.equal(r.headers['set-cookie'],undefined);});
test('login session cookies are HttpOnly Secure and role setup uses verified JWT',async()=>{const r=await call('/api/login',{data:{email:'demo@example.com',password:'twelve-characters',role:'supplier'},fetcher:async(url,opts)=>url.pathname==='/auth/v1/token'?Response.json({access_token:'jwt',refresh_token:'refresh',expires_in:3600}):Response.json({user:{id:'demo',role:'supplier'}})});assert.equal(r.statusCode,200);assert.equal(r.headers['set-cookie'].length,2);assert.ok(r.headers['set-cookie'].every(v=>v.includes('HttpOnly; Secure; SameSite=Lax')));});
test('economics is private: anonymous, buyer and supplier denied',async()=>{
 assert.equal((await call('/api/economics/quote',{data:{}})).statusCode,401);
 for(const role of ['buyer','supplier']){
  const r=await call('/api/economics/quote',{data:{},headers:{cookie:'aff_access=jwt'},fetcher:async url=>Response.json(url.pathname==='/auth/v1/user'?{id:'u'}:{user:{role}})});
  assert.equal(r.statusCode,403);assert.ok(!r.body.includes('brightdata'));
 }
});
test('operator quote validates inputs without execution or catalog writes',async()=>{
 const calls=[];
 const r=await call('/api/economics/quote',{data:{},headers:{cookie:'aff_access=jwt'},fetcher:async(url,opts)=>{calls.push({url,opts});return Response.json(url.pathname==='/auth/v1/user'?{id:'o'}:{user:{role:'operator'}});}});
 assert.equal(r.statusCode,400);assert.equal(calls.length,2);assert.equal(JSON.parse(calls[1].opts.body).action,'me');
});
test('operator receives a scenario quote with no execution approval',async()=>{
 const data={results:1000,recordsPerCandidate:1,acceptancePercent:100,repeatPercent:0,usdToEur:1,enrichmentPerCandidateEur:0,processingPerOrderEur:0,supportPerOrderEur:0,priceEur:49,vatPercent:0,feePercent:0,feeFixedEur:0,refundPercent:0,targetMarginPercent:70,cacEur:0,supplierBudgetUsd:5};
 const r=await call('/api/economics/quote',{data,headers:{cookie:'aff_access=jwt'},fetcher:async url=>Response.json(url.pathname==='/auth/v1/user'?{id:'o'}:{user:{role:'operator'}})});
 assert.equal(r.statusCode,200);const q=JSON.parse(r.body);assert.equal(q.supplierUsd,1.5);assert.equal(q.executionAllowed,false);assert.equal(q.mode,'scenario');
});
test('Amazon workspace persists its plan, isolates visitors and never exposes the supplier contract',async()=>{
 const documents=new Map();let providerReads=0,writes=0;
 const fetcher=async(url,opts)=>{
  if(String(url).startsWith('https://api.brightdata.com/')){providerReads++;return Response.json([{id:'gd_l7q7dkf244hwjntr0',scrapers:{discover_by_keyword:{input_schema:[{name:'keyword',required:true}]}}}]);}
  assert.equal(url.pathname,'/rest/v1/rpc/affsiwen_intake');const body=JSON.parse(opts.body),old=documents.get(body.capability)||{document:null,revision:0};
  if(body.document){assert.equal(body.expected_revision,old.revision);writes++;documents.set(body.capability,{document:body.document,revision:old.revision+1});}
  return Response.json(documents.get(body.capability)||old);
 };
 const environment={...env,BRIGHT_DATA_API_KEY:'test-private-key'};
 const prepared=await call('/api/amazon/prepare',{environment,fetcher,data:{task:'search',market:'US',limit:3,request:'Найти товары',value:'bottles'}});
 assert.equal(prepared.statusCode,200);const plan=JSON.parse(prepared.body).plan;
 assert.doesNotMatch(prepared.body,/gd_|contract|test-private-key/);
 assert.match(prepared.headers['set-cookie'][0],/HttpOnly; Secure; SameSite=Lax/);
 const headers={cookie:prepared.headers['set-cookie'][0].split(';')[0]};
 const restored=await call('/api/amazon/workspace',{environment,fetcher,headers});assert.equal(JSON.parse(restored.body).plan.id,plan.id);assert.doesNotMatch(restored.body,/contract|gd_/);
 const stranger=await call('/api/amazon/workspace',{environment,fetcher});assert.deepEqual(JSON.parse(stranger.body),{plan:null,result:null});
 const forged=await call('/api/amazon/demo',{environment,fetcher,headers,data:{planId:'forged'}});assert.equal(forged.statusCode,409);
 const demo=await call('/api/amazon/demo',{environment,fetcher,headers,data:{planId:plan.id}});assert.equal(demo.statusCode,200);assert.equal(JSON.parse(demo.body).result.synthetic,true);
 const repeated=await call('/api/amazon/demo',{environment,fetcher,headers,data:{planId:plan.id}});assert.equal(repeated.body,demo.body);assert.equal(writes,2);assert.equal(providerReads,1);
 const exported=await call('/api/amazon/export',{environment,fetcher,headers});assert.equal(exported.statusCode,200);assert.match(exported.headers['content-disposition'],/DEMO.csv/);assert.match(exported.body,/Демо/);
 assert.equal((await call('/api/amazon/export',{environment,fetcher,headers:{cookie:'aff_amazon='+'a'.repeat(64)}})).statusCode,409);
 assert.equal((await call('/api/amazon/prepare',{environment,data:{},headers:{origin:'https://evil.example'}})).statusCode,403);
});
test('Amazon conversation reaches a quote, survives reload, revises price and cannot charge',async()=>{
 const documents=new Map();const fetcher=async(url,opts)=>{
  if(String(url).startsWith('https://api.brightdata.com/'))return Response.json([{id:'gd_l7q7dkf244hwjntr0',scrapers:{discover_by_keyword:{input_schema:[{name:'keyword',required:true}]}}}]);
  assert.equal(url.pathname,'/rest/v1/rpc/affsiwen_intake');const body=JSON.parse(opts.body),old=documents.get(body.capability)||{document:null,revision:0};
  if(body.document){assert.equal(body.expected_revision,old.revision);documents.set(body.capability,{document:body.document,revision:old.revision+1});}
  return Response.json(documents.get(body.capability)||old);
 };
 const environment={...env,BRIGHT_DATA_API_KEY:'chat-source'};let headers={},body,last;
 for(const [i,message] of ['Сравнить товары по ключевой фразе','insulated water bottle','США (US)','50 записей'].entries()){
  last={message,requestId:'chat-request-'+i};const r=await call('/api/amazon/chat',{environment,fetcher,headers,data:last});assert.equal(r.statusCode,200,r.body);headers={cookie:r.headers['set-cookie'][0].split(';')[0]};body=JSON.parse(r.body);
 }
 assert.equal(body.quote,null);assert.equal(body.plan.limit,50);assert.doesNotMatch(JSON.stringify(body),/gd_|contract|assumptions|chat-source/);
 const repeated=await call('/api/amazon/chat',{environment,fetcher,headers,data:last});assert.deepEqual(JSON.parse(repeated.body),body);
 const restored=JSON.parse((await call('/api/amazon/workspace',{environment,fetcher,headers})).body);assert.equal(restored.messages.length,8);assert.equal(restored.quote,null);assert.equal(restored.plan.limit,50);
 const changed=JSON.parse((await call('/api/amazon/chat',{environment,fetcher,headers,data:{message:'10 записей',requestId:'change-records-1'}})).body);assert.equal(changed.quote,null);assert.equal(changed.plan.limit,10);assert.notEqual(changed.plan.id,body.plan.id);
 assert.equal((await call('/api/amazon/demo',{environment,fetcher,headers,data:{planId:body.plan.id}})).statusCode,409);
 const reset=await call('/api/amazon/chat/reset',{environment,fetcher,headers,data:{}});assert.match(reset.headers['set-cookie'][0],/Max-Age=0/);assert.equal(JSON.parse(reset.body).plan,null);
});
test('public assistant reserves the global allowance before any paid model call',async()=>{
 for(const configured of [2,100,10000]){
 const ceiling=Math.min(100,configured);
 const environment={...env,BRIGHT_DATA_API_KEY:'source',ANTHROPIC_API_KEY:'model-key',AFFSIWEN_AMAZON_CHAT_MODEL:'claude-haiku-4-5-20251001',AFFSIWEN_AMAZON_CHAT_ENABLED:'yes',AFFSIWEN_AMAZON_CHAT_DAILY_LIMIT:String(configured)};
 let modelCalls=0,allowance=0;const docs=new Map();
 const fetcher=async(url,opts)=>{
  if(String(url).startsWith('https://api.anthropic.com/')){modelCalls++;assert.equal(allowance,modelCalls);return Response.json({stop_reason:'tool_use',content:[{type:'tool_use',name:'amazon_assistant_reply',input:{status:'clarify',message:'Какой товар вас интересует?',options:[],task:'products',market:null,limit:null,value:null,goal:'Получить карточку товара',imageSummary:''}}]});}
  if(String(url).startsWith('https://api.brightdata.com/'))return Response.json([{id:'gd_l7q7dkf244hwjntr0',scrapers:{collect_by_url:{input_schema:[{name:'url',required:true}]}}}]);
  if(url.pathname==='/auth/v1/user'){assert.equal(opts.headers.Authorization,'Bearer verified-user');return Response.json({id:'verified-user'});}
  const b=JSON.parse(opts.body),old=docs.get(b.capability)||{document:null,revision:0};
  if(b.document){assert.equal(b.expected_revision,old.revision);if(b.document.calls)allowance=b.document.calls;docs.set(b.capability,{document:b.document,revision:old.revision+1});}return Response.json(docs.get(b.capability)||old);
 };
 const data={message:'Получить карточку товара',requestId:'llm-request-1'};
 assert.equal(modelCalls,0);
 for(let i=0;i<ceiling+1;i++){
  const r=await call('/api/amazon/chat',{environment,fetcher,data:{...data,requestId:'llm-request-'+i}});
  assert.equal(r.statusCode,i<ceiling?200:429,r.body);
 }
 assert.equal(modelCalls,ceiling);assert.equal(allowance,ceiling);
 assert.equal([...docs.values()].find(x=>x.document?.calls)?.document.reservedMicroUsd,ceiling*100000);
 }
});

test('cloud live run roundtrip keeps ownership, returns actual rows and exports without a second trigger',async()=>{
 const docs=new Map();let triggers=0;const fetcher=async(url,opts={})=>{
  if(String(url).startsWith('https://api.brightdata.com/')){
   if(String(url).includes('/scrapers?'))return Response.json([{id:'gd_l7q7dkf244hwjntr0',scrapers:{discover_by_keyword:{input_schema:[{name:'keyword',required:true}]}}}]);
   if(String(url).includes('/trigger?')){triggers++;return Response.json({snapshot_id:'sd_actual123'});}
   if(String(url).includes('/progress/'))return Response.json({status:'ready'});
   if(String(url).includes('/snapshot/'))return Response.json([{title:'Source bottle',final_price:20,currency:'USD',url:'https://www.amazon.com/dp/B012345678'}]);
   throw Error('unexpected supplier call');
  }
  const b=JSON.parse(opts.body),old=docs.get(b.capability)||{revision:0,document:null};
  if(b.document){if(old.revision!==b.expected_revision)return Response.json({code:'PT409',message:'Conflict'},{status:409});docs.set(b.capability,{document:b.document,revision:old.revision+1});}return Response.json(docs.get(b.capability)||old);
 };
 const environment={...env,BRIGHT_DATA_API_KEY:'run-key',AFFSIWEN_AMAZON_RUN_ENABLED:'yes',AFFSIWEN_AMAZON_RUNS_PER_DAY:'1'};
 const prepared=await call('/api/amazon/prepare',{environment,fetcher,data:{task:'search',market:'US',limit:5,request:'Find products',value:'bottle'}});const plan=JSON.parse(prepared.body).plan,headers={cookie:prepared.headers['set-cookie'][0].split(';')[0]};
 assert.equal((await call('/api/amazon/run',{environment,fetcher,headers,data:{planId:plan.id}})).statusCode,400);
 const started=await call('/api/amazon/run',{environment,fetcher,headers,data:{planId:plan.id,confirm:true}});assert.equal(started.statusCode,200,started.body);assert.equal(JSON.parse(started.body).run.status,'running');
 await call('/api/amazon/run',{environment,fetcher,headers,data:{planId:plan.id,confirm:true}});assert.equal(triggers,1);
 const done=await call('/api/amazon/run/status',{environment,fetcher,headers});assert.equal(done.statusCode,200,done.body);assert.equal(JSON.parse(done.body).run.result.rows[0]['Товар'],'Source bottle');assert.doesNotMatch(done.body,/gd_|sd_actual123|run-key/);
 const restored=JSON.parse((await call('/api/amazon/workspace',{environment,fetcher,headers})).body);assert.equal(restored.result.synthetic,false);
 const csv=await call('/api/amazon/export',{environment,fetcher,headers});assert.match(csv.body,/Source bottle/);assert.doesNotMatch(csv.headers['content-disposition'],/DEMO/);
 assert.equal((await call('/api/amazon/run/status?id='+plan.id,{environment,fetcher,headers:{cookie:'aff_amazon='+'f'.repeat(64)}})).statusCode,404);
});
