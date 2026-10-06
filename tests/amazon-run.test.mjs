import test from 'node:test';
import assert from 'node:assert/strict';
import {createAmazonRunner,normalizeAmazonResults} from '../server/amazon-run.mjs';
import {HttpError} from '../server/errors.mjs';
const cap='a'.repeat(64),id='b'.repeat(32),plan={id,task:'search',market:'US',limit:5,request:'Найти термобутылки',value:'bottle'};
function setup(options={}){
 const docs=new Map();let revisionTime=1000000,triggers=0,reads=0;const urls=[];
 const read=async key=>structuredClone(docs.get(key)||{revision:0,document:null});
 const write=async(key,document,revision)=>{const old=docs.get(key)||{revision:0};if(old.revision!==revision)throw new HttpError(409,'Conflict');const row={revision:revision+1,document:structuredClone(document)};docs.set(key,row);return structuredClone(row);};
 const fetcher=async(url,opts={})=>{urls.push(String(url));
  if(String(url).endsWith('/scrapers?domain=amazon.com'))return Response.json([{id:'gd_l7q7dkf244hwjntr0',scrapers:{discover_by_keyword:{input_schema:[{name:'keyword',required:true}]}}}]);
  if(String(url).includes('/trigger?')){triggers++;const u=new URL(url);assert.equal(u.searchParams.get('limit_per_input'),'5');assert.equal(u.searchParams.get('limit_multiple_results'),'5');assert.deepEqual(JSON.parse(opts.body),{input:[{keyword:'bottle'}],limit_per_input:5});assert.equal(opts.method,'POST');if(options.timeout)throw Error('unknown after submission');return Response.json({snapshot_id:'sd_fixture123'});}
  if(String(url).includes('/progress/')){reads++;return Response.json({status:options.failed?'failed':'ready'});}
  if(String(url).includes('/snapshot/'))return Response.json(options.empty?[]:[{title:'Real source title',asin:'B012345678',final_price:19.95,currency:'USD',rating:4.5,url:'https://www.amazon.com/dp/B012345678'},{error:'private source failure'}]);
  throw Error('unexpected endpoint');
 };
 const env={BRIGHT_DATA_API_KEY:'fixture-key',AFFSIWEN_AMAZON_RUN_ENABLED:'yes',AFFSIWEN_AMAZON_RUNS_PER_DAY:'2',...options.env};
 return {runner:createAmazonRunner({env,fetcher,read,write,now:()=>revisionTime}),docs,read,write,get triggers(){return triggers;},get reads(){return reads;},urls,advance:()=>revisionTime+=10000};
}
test('one bounded trigger yields persisted real results and a duplicate start never retriggers',async()=>{
 const f=setup(),run=await f.runner.start(cap,plan);assert.equal(run.status,'running');assert.doesNotMatch(JSON.stringify(run),/snapshot|gd_|fixture-key/);
 assert.equal((await f.runner.start(cap,plan)).status,'running');assert.equal(f.triggers,1);
 const done=await f.runner.status(cap,id);assert.equal(done.status,'ready');assert.equal(done.result.synthetic,false);assert.equal(done.result.rows.length,1);assert.equal(done.result.rows[0]['Цена'],'19.95');assert.equal(done.result.errorRecords,1);
 assert.equal((await f.runner.status(cap,id)).status,'ready');assert.equal(f.reads,1);assert.equal((await f.runner.read('c'.repeat(64),id)),null);
});
test('simultaneous start requests cannot issue duplicate paid calls',async()=>{
 const f=setup();const r=await Promise.allSettled([f.runner.start(cap,plan),f.runner.start(cap,plan)]);assert.equal(f.triggers,1);assert.ok(r.some(x=>x.status==='fulfilled'));assert.ok(r.some(x=>x.status==='rejected'));
});
test('unknown trigger outcome fails closed and cannot be retried by clicking again',async()=>{
 const f=setup({timeout:true});assert.equal((await f.runner.start(cap,plan)).status,'unknown');assert.equal((await f.runner.start(cap,plan)).status,'unknown');assert.equal(f.triggers,1);assert.equal((await f.runner.status(cap,id)).status,'unknown');assert.equal(f.reads,0);
});
test('daily count and request size are enforced before extra paid execution',async()=>{
 const f=setup();await assert.rejects(()=>f.runner.start(cap,{...plan,limit:100}),/объём/);assert.equal(f.triggers,0);
 await f.runner.start(cap,plan);await f.runner.start(cap,{...plan,id:'c'.repeat(32)});await assert.rejects(()=>f.runner.start(cap,{...plan,id:'d'.repeat(32)}),/лимит/);assert.equal(f.triggers,2);
 const disabled=setup({env:{AFFSIWEN_AMAZON_RUN_ENABLED:'no'}});await assert.rejects(()=>disabled.runner.start(cap,plan));assert.equal(disabled.triggers,0);
});
test('caller supplied provider contract cannot change request destination or dataset',async()=>{
 const f=setup();await f.runner.start(cap,{...plan,contract:{query:{dataset_id:'evil'},body:{input:[{url:'https://evil.example'}]}}});assert.ok(f.urls.some(x=>x.includes('dataset_id=gd_l7q7dkf244hwjntr0')));assert.ok(!f.urls.some(x=>x.includes('evil')));
});
test('failed and empty supplier jobs never produce synthetic rows',async()=>{
 for(const options of [{failed:true},{empty:true}]){const f=setup(options);await f.runner.start(cap,plan);const r=await f.runner.status(cap,id);assert.equal(r.status,options.failed?'failed':'empty');assert.ok(!r.result||r.result.synthetic===false);assert.ok(!r.result||r.result.rows.length===0);}
});
test('normalization keeps missing fields empty, discards source errors and unsafe links',()=>{
 const r=normalizeAmazonResults([{title:'a',url:'https://evil.example',currency:'EUR'},{error:'bad'}],{columns:['Товар','Цена','Ссылка'],limit:5,title:'Products'});assert.deepEqual(r.rows,[{'Товар':'a','Цена':'—','Ссылка':'—'}]);assert.equal(r.synthetic,false);assert.equal(r.errorRecords,1);
});
