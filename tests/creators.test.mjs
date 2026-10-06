import test from 'node:test';
import assert from 'node:assert/strict';
import {creatorsAdapter,normalizeCreatorSource,mergeCreatorResults} from '../server/creators.mjs';
import {createAmazonRunner} from '../server/amazon-run.mjs';
import {amazonChatReply} from '../server/amazon.mjs';
import {HttpError} from '../server/errors.mjs';
import {commerceProduct} from '../dist/commerce-catalog.js';
import {amazonPage,socialPage} from '../dist/amazon.js';
import {Readable} from 'node:stream';
import {createCloudHandler} from '../cloud/backend.mjs';
const adapter=creatorsAdapter(),cap='a'.repeat(64),id='b'.repeat(32);
const inventory={connected:true,inventory:[['tiktok','gd_lu702nij2f790tmv9h','search_keyword'],['youtube','gd_lk56epmy2i5g7lzu0k','keyword']].map(([platform,id,keyword])=>({platform,id,scrapers:{discover_by_keyword:{input_schema:[{name:keyword,required:true},{name:'num_of_posts',required:true},{name:'country'},{name:'start_date'},{name:'end_date'},{name:'include_shorts'}]}}}))};
const plan={id,task:'search',market:'GLOBAL',value:'skincare',limit:5,request:'Find creators for skincare campaign',brief:{product:'Cosmetics',language:'English',country:'US',criteria:'Skincare content',confirmed:true}};
const tik=[{url:'https://www.tiktok.com/@a/video/123',profile_url:'https://www.tiktok.com/@a',profile_username:'same name',play_count:0,profile_biography:'https://instagram.com/a'},{url:'https://www.tiktok.com/@a/video/456',profile_url:'https://www.tiktok.com/@a',profile_username:'same name',play_count:100},{url:'https://www.tiktok.com/@b/video/789',profile_url:'https://www.tiktok.com/@b',profile_username:'same name',profile_biography:'Follow @guessed on Instagram'},{url:'https://www.tiktok.com/@none/video/100',profile_username:'No verified URL'}];
const yt=[{url:'https://www.youtube.com/watch?v=abc',channel_url_decoded:'https://www.youtube.com/@a',youtuber:'same name',views:10,description:'https://instagram.com/advertiser'}];
test('brief and separate source limits are validated, public plan does not expose supplier contracts',()=>{
 const p=adapter.prepare({...plan,contract:{steps:['forged']}},inventory);assert.equal(p.contract.steps.length,2);assert.deepEqual(p.display.sourceSteps,[{source:'TikTok',limit:10},{source:'YouTube',limit:10}]);assert.equal(p.display.maxContentRecords,20);assert.equal(p.contract.steps[0].body.input[0].search_keyword,'skincare');assert.equal(p.contract.steps[1].body.input[0].keyword,'skincare');assert.doesNotMatch(JSON.stringify(p.display)+JSON.stringify(adapter.publicConnection(inventory)),/gd_|dataset_id|Bearer|Bright Data/);
 for(const change of [{limit:11},{brief:{...plan.brief,confirmed:false}},{brief:{...plan.brief,country:'EVIL'}},{value:'x'}])assert.throws(()=>adapter.prepare({...plan,...change},inventory));
 const changed=structuredClone(inventory);changed.inventory[0].scrapers.discover_by_keyword.input_schema.push({name:'unexpected',required:true});assert.throws(()=>adapter.prepare(plan,changed),/дополнительный/);
});
test('deduplication uses exact profiles, preserves zero and does not infer cross-network identity',()=>{
 const r=mergeCreatorResults([normalizeCreatorSource(tik,'tiktok',10),normalizeCreatorSource(yt,'youtube',10)],adapter.prepare(plan,inventory).display);assert.equal(r.rows.length,3);assert.equal(r.rows[0]['Просмотры примера'],'0');assert.equal(r.rows[0]['Instagram из биографии'],'https://instagram.com/a');assert.equal(r.rows[1]['Instagram из биографии'],'—');assert.equal(r.rows[2]['Instagram из биографии'],'—');assert.equal(r.rows[1]['Площадка'],'YouTube');assert.match(r.notice,/не подтверждены/);
 const unsafe=normalizeCreatorSource([{url:tik[0].url,profile_url:'https://tiktok.com@evil.example/@a',profile_biography:'https://instagram.com/p/x'}],'tiktok',10);assert.equal(mergeCreatorResults([unsafe],plan).rows.length,0);
});
test('model cannot prepare a ready plan before explicit confirmation; structured brief survives chat',async()=>{
 const input={status:'ready',message:'Ready',options:[],task:'search',market:'GLOBAL',limit:5,value:'skincare',goal:plan.request,brief:plan.brief,zipcode:'',imageSummary:''};
 const env={ANTHROPIC_API_KEY:'fixture',AFFSIWEN_AMAZON_CHAT_ENABLED:'yes',AFFSIWEN_AMAZON_CHAT_MODEL:'claude-haiku-4-5-20251001'};
 const fetcher=async(url,options)=>{const body=JSON.parse(options.body);assert.ok(body.tools[0].input_schema.required.includes('brief'));return Response.json({stop_reason:'tool_use',content:[{type:'tool_use',name:'amazon_assistant_reply',input}]});};
 const first=await amazonChatReply({adapter,inventory,env,fetcher,messages:[{role:'user',content:'Find skincare creators'}]});assert.equal(first.answer.status,'clarify');assert.equal(first.prepared,null);
 const second=await amazonChatReply({adapter,inventory,env,fetcher,prior:first.state,messages:[{role:'user',content:'Да, согласен с брифом'}]});assert.equal(second.prepared.display.brief.product,'Cosmetics');assert.deepEqual(second.state.brief,plan.brief);
 const negated=adapter.resolveChatAnswer(input,[{role:'user',content:'Да, но не запускай, бриф неверный'}],first.state);assert.equal(negated.status,'clarify');
 const modelChanged=adapter.resolveChatAnswer({...input,value:'invented',limit:10,brief:{...plan.brief,country:'AU'}},[{role:'user',content:'Да, согласен с брифом'}],first.state);assert.equal(modelChanged.value,'skincare');assert.equal(modelChanged.limit,5);assert.equal(modelChanged.brief.country,'US');
});
function setup({unknown=false,failedSecond=false,environment={}}={}){
 const docs=new Map(),calls=[];let time=1000000;
 const read=async key=>structuredClone(docs.get(key)||{revision:0,document:null});
 const write=async(key,document,revision)=>{const old=docs.get(key)||{revision:0};if(old.revision!==revision)throw new HttpError(409,'Conflict');assert.ok(Buffer.byteLength(JSON.stringify(document))<16000);const row={revision:revision+1,document:structuredClone(document)};docs.set(key,row);return structuredClone(row);};
 const fetcher=async(url,options={})=>{
  const u=String(url);if(u.includes('/scrapers?'))return Response.json(inventory.inventory);
  if(u.includes('/trigger?')){const query=new URL(u);calls.push({query,body:JSON.parse(options.body)});assert.equal(query.searchParams.get('limit_per_input'),'10');if(unknown)throw Error('uncertain');return Response.json({snapshot_id:query.searchParams.get('dataset_id')===inventory.inventory[0].id?'sd_tiktok123':'sd_youtube123'});}
  if(u.includes('/progress/'))return Response.json({status:failedSecond&&u.includes('youtube')?'failed':'ready'});
  if(u.includes('/snapshot/'))return Response.json(u.includes('tiktok')?tik:yt);throw Error('Unexpected URL');
 };
 const env={BRIGHT_DATA_API_KEY:'fixture',AFFSIWEN_AMAZON_RUN_ENABLED:'yes',AFFSIWEN_CREATORS_RUN_ENABLED:'yes',AFFSIWEN_AMAZON_RUNS_PER_DAY:'2',...environment};
 const make=()=>createAmazonRunner({env,fetcher,read,write,now:()=>time,adapter});
 return {docs,calls,make,advance:()=>time+=10000};
}
test('two searches complete across reloads, duplicate starts/polls cannot repeat paid triggers',async()=>{
 const f=setup(),runner=f.make();const first=await Promise.allSettled([runner.start(cap,plan),runner.start(cap,plan)]);assert.ok(first.some(x=>x.status==='fulfilled'));assert.equal(f.calls.length,1);assert.equal((await runner.start(cap,plan)).status,'running');
 f.advance();await Promise.allSettled([f.make().status(cap,id),f.make().status(cap,id)]);assert.equal(f.calls.length,2);f.advance();const completed=await f.make().status(cap,id);assert.equal(completed.status,'ready');assert.equal(completed.result.rows.length,3);assert.equal(completed.result.synthetic,false);assert.doesNotMatch(JSON.stringify(completed),/gd_|fixture|snapshot|contract/);assert.equal((await runner.read('c'.repeat(64),id)),null);assert.equal(f.calls.length,2);
});
test('uncertain source submission blocks the next search and all retries',async()=>{
 const f=setup({unknown:true});assert.equal((await f.make().start(cap,plan)).status,'unknown');f.advance();assert.equal((await f.make().status(cap,id)).status,'unknown');assert.equal((await f.make().start(cap,plan)).status,'unknown');assert.equal(f.calls.length,1);
});
test('a failed second source never masquerades as a complete shortlist',async()=>{
 const f=setup({failedSecond:true});await f.make().start(cap,plan);f.advance();await f.make().status(cap,id);f.advance();const r=await f.make().status(cap,id);assert.equal(r.status,'failed');assert.equal(r.result,null);assert.equal(f.calls.length,2);
});
test('feature and shared daily gates enforce no paid trigger',async()=>{
 for(const environment of [{AFFSIWEN_CREATORS_RUN_ENABLED:'no'},{AFFSIWEN_AMAZON_RUN_ENABLED:'no'},{AFFSIWEN_AMAZON_RUNS_PER_DAY:'1'}]){const f=setup({environment});await assert.rejects(()=>f.make().start(cap,plan));assert.equal(f.calls.length,0);}
 const f=setup();await f.make().start(cap,plan);f.advance();await f.make().status(cap,id);f.advance();await f.make().status(cap,id);const next=await f.make().start(cap,{...plan,id:'d'.repeat(32)});assert.equal(next.status,'failed');assert.equal(f.calls.length,2);
});
test('customer UI shows one brief, source volumes and candidate limitations without fake Hot ranking',()=>{
 const html=amazonPage({product:commerceProduct('creators'),plan:adapter.prepare(plan,inventory).display});assert.match(html,/Кто снимет контент/);assert.match(html,/TikTok: до 10 видео/);assert.match(html,/до 20 примеров контента/);assert.match(html,/Instagram/);assert.ok(socialPage().includes('#product/creators'));assert.doesNotMatch(html,/Bright Data|Apify|dataset|Actor|gd_|hot-badge/);
});
test('cloud route persists a private brief and plan, isolates sessions, and keeps execution disabled',async()=>{
 const docs=new Map();let triggers=0;
 const fetcher=async(url,options={})=>{
  if(String(url).includes('/scrapers?'))return Response.json(inventory.inventory);
  if(String(url).includes('/trigger?')){triggers++;throw Error('No paid execution');}
  assert.equal(url.pathname,'/rest/v1/rpc/affsiwen_intake');const body=JSON.parse(options.body),old=docs.get(body.capability)||{revision:0,document:null};
  if(body.document){assert.equal(body.expected_revision,old.revision);docs.set(body.capability,{revision:old.revision+1,document:body.document});}return Response.json(docs.get(body.capability)||old);
 };
 const env={PUBLIC_ORIGIN:'https://market.example.com',SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_PUBLISHABLE_KEY:'fixture',BRIGHT_DATA_API_KEY:'fixture'};
 async function call(path,data,cookie=''){
  const req=Readable.from(data?[Buffer.from(JSON.stringify(data))]:[]);req.url='/api/commerce/creators/'+path;req.method=data?'POST':'GET';req.headers={origin:env.PUBLIC_ORIGIN,'content-type':'application/json','x-affsiwen-request':'1',cookie};
  const res={statusCode:200,headers:{},setHeader(k,v){this.headers[k.toLowerCase()]=v;},end(body){this.body=body;}};await createCloudHandler({env,fetcher})(req,res);return res;
 }
 const connection=await call('connection');assert.equal(connection.statusCode,200);assert.equal(JSON.parse(connection.body).connected,true);assert.equal(JSON.parse(connection.body).execution.enabled,false);
 const prepared=await call('prepare',plan);assert.equal(prepared.statusCode,200);assert.doesNotMatch(prepared.body,/gd_|contract|fixture/);const cookie=prepared.headers['set-cookie'][0].split(';')[0];assert.match(cookie,/aff_commerce_creators=/);
 const restored=JSON.parse((await call('workspace',null,cookie)).body);assert.deepEqual(restored.plan.brief,plan.brief);assert.equal((JSON.parse((await call('workspace')).body)).plan,null);
 const blocked=await call('run',{planId:restored.plan.id,confirm:true},cookie);assert.equal(blocked.statusCode,503);assert.equal(triggers,0);
});
