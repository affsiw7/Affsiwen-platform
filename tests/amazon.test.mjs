import test from 'node:test';
import assert from 'node:assert/strict';
import {amazonInventory,publicAmazonConnection} from '../server/amazon.mjs';
test('missing Amazon secret never calls the provider',async()=>{
 const result=await amazonInventory({fetcher:()=>{throw Error('must not call');}});
 assert.equal(result.reason,'not_configured');
});
test('connection reads only Amazon metadata; public view strips upstream IDs and secrets',async()=>{
 let count=0;const fetcher=async(url,opts)=>{count++;assert.equal(url,'https://api.brightdata.com/datasets/v3/scrapers?domain=amazon.com');assert.equal(opts.method,undefined);assert.equal(opts.headers.Authorization,'Bearer private-test-value');return {ok:true,json:async()=>[{id:'gd_l7q7dkf244hwjntr0',scrapers:{collect_by_url:{},discover_by_keyword:{}},private:'never show'}]};};
 const a=await amazonInventory({key:'private-test-value',fetcher,now:100});
 await amazonInventory({key:'private-test-value',fetcher,now:101});assert.equal(count,1);
 const result=publicAmazonConnection(a);assert.equal(result.connected,true);assert.equal(result.tasks.find(x=>x.id==='search').available,true);assert.equal(result.tasks.find(x=>x.id==='reviews').available,false);
 assert.doesNotMatch(JSON.stringify(result),/gd_|private-test-value|never show|discover_by|family/);assert.equal(result.execution,'not_enabled');
});
test('rejected key and malformed supplier replies cannot advertise a connection',async()=>{
 const a=await amazonInventory({key:'rejected',fetcher:async()=>({ok:false,status:401}),now:1});assert.equal(a.reason,'access_denied');
 const b=await amazonInventory({key:'malformed',fetcher:async()=>({ok:true,json:async()=>({error:'private'})}),now:1});assert.equal(b.connected,false);
});
import {prepareAmazon,amazonDemoRows} from '../server/amazon.mjs';
const inventory={connected:true,inventory:[
 {id:'gd_l7q7dkf244hwjntr0',scrapers:{discover_by_keyword:{input_schema:[{name:'keyword',required:true},{name:'zipcode'}]},collect_by_url:{input_schema:[{name:'url',required:true},{name:'all_variations'}]}}},
 {id:'gd_le8e811kzy4ggddlq',scrapers:{collect_by_url:{input_schema:[{name:'url',required:true},{name:'max_reviews'},{name:'reviews_to_not_include'},{name:'variation_specific'}]}}}
]};
test('Amazon plan creates one bounded source input and never silently enables variations',()=>{
 const p=prepareAmazon({task:'search',market:'US',limit:10,request:'Найти товары',value:'water bottle'},inventory);
 assert.deepEqual(p.contract.body,{input:[{keyword:'water bottle'}],limit_per_input:10});assert.equal(p.contract.query.discover_by,'keyword');assert.equal(p.display.priceStatus,'not_approved');
 const q=prepareAmazon({task:'products',market:'US',limit:1,request:'Цена товара',value:'https://www.amazon.com/dp/B0CRMZHDG8'},inventory);assert.equal(q.contract.body.input[0].all_variations,false);
});
test('Amazon planner rejects untrusted URLs, mismatched markets, missing contracts and oversized limits',()=>{
 const d={task:'products',market:'US',limit:10,request:'Цена товара'};
 for(const value of ['https://amazon.com.evil.test/a','http://amazon.com/dp/X','https://u:p@amazon.com/dp/X','https://amazon.de/dp/X','https://127.0.0.1/a'])assert.throws(()=>prepareAmazon({...d,value},inventory));
 assert.throws(()=>prepareAmazon({...d,value:'https://www.amazon.com/dp/X',limit:100000},inventory));
 assert.throws(()=>prepareAmazon({...d,market:'DE',value:'https://www.amazon.de/dp/X'},inventory));
});
test('review count is bounded; demo rows cannot be confused with real results',()=>{
 const p=prepareAmazon({task:'reviews',market:'US',limit:3,request:'Собрать отзывы',value:'https://www.amazon.com/dp/B094NC89P9'},inventory);
 assert.equal(p.contract.body.input[0].max_reviews,3);assert.deepEqual(p.contract.body.input[0].reviews_to_not_include,[]);
 const rows=amazonDemoRows(p.display);assert.equal(rows.length,3);assert.match(JSON.stringify(rows),/Демо/);assert.match(rows[0]['Ссылка'],/^https:\/\/example.com\//);
});
test('search results and global keyword discovery use their distinct confirmed contracts',()=>{
 const result={connected:true,inventory:[{id:'gd_lwdb4vjm1ehb499uxs',scrapers:{collect_by_url:{input_schema:[{name:'keyword',required:true},{name:'url',required:true},{name:'pages_to_search'}]}}},{id:'gd_lwhideng15g8jg63s7',scrapers:{discover_by_keywords:{input_schema:[{name:'keywords',required:true},{name:'domain',required:true},{name:'pages_to_search'}]}}}]};
 const data={market:'DE',limit:10,request:'Найти товары',value:'bottle'};
 const a=prepareAmazon({...data,task:'search-results'},result);assert.deepEqual(a.contract.body.input,[{keyword:'bottle',url:'https://www.amazon.de',pages_to_search:1}]);assert.equal(a.contract.query.type,undefined);
 const b=prepareAmazon({...data,task:'search'},result);assert.deepEqual(b.contract.body.input,[{keywords:'bottle',domain:'https://www.amazon.de',pages_to_search:1}]);assert.equal(b.contract.query.discover_by,'keywords');
});
import {amazonChatReply,amazonPreviewQuote,amazonChatMode} from '../server/amazon.mjs';
test('chat clarifies one detail at a time, then offers a bounded server-priced result',async()=>{
 let messages=[],prior={},out;
 for(const text of ['Сравнить товары по ключевой фразе','insulated water bottle','США (US)','50 записей']){
  messages.push({role:'user',content:text});out=await amazonChatReply({messages,prior,inventory});prior=out.state;messages.push({role:'assistant',content:out.answer.message});
 }
 assert.equal(out.answer.status,'ready');assert.equal(out.prepared.display.task,'search');assert.equal(out.prepared.display.limit,50);assert.equal(out.prepared.contract.body.input[0].keyword,'insulated water bottle');
 const q=amazonPreviewQuote(out.prepared.display,0);assert.equal(q.priceCents,430);assert.equal(q.payable,false);assert.equal(q.status,'preview');assert.equal(q.expiresAt,'1970-01-01T00:30:00.000Z');
 messages.push({role:'user',content:'10 записей'});const changed=await amazonChatReply({messages,prior,inventory});assert.equal(changed.prepared.display.limit,10);assert.equal(amazonPreviewQuote(changed.prepared.display).priceCents,390);
});
test('chat does not turn unavailable analysis into a sold scraping job',async()=>{
 const out=await amazonChatReply({messages:[{role:'user',content:'Проанализируй причины жалоб и гарантируй прибыль'}],inventory});assert.equal(out.answer.status,'unsupported');assert.equal(out.prepared,null);
});
test('Anthropic uses a pinned vision model and cannot invent a price or expose credentials',async()=>{
 assert.equal(amazonChatMode({BRIGHT_DATA_API_KEY:'fixture'}),'preview');
 const env={ANTHROPIC_API_KEY:'private-llm',AFFSIWEN_AMAZON_CHAT_ENABLED:'yes',AFFSIWEN_AMAZON_CHAT_MODEL:'claude-haiku-4-5-20251001'};
 const fetcher=async(url,opts)=>{assert.equal(url,'https://api.anthropic.com/v1/messages');assert.equal(opts.headers['x-api-key'],'private-llm');const body=JSON.parse(opts.body);assert.equal(body.max_tokens,1000);assert.equal(body.tool_choice.name,'amazon_assistant_reply');return Response.json({stop_reason:'tool_use',content:[{type:'tool_use',name:'amazon_assistant_reply',input:{status:'clarify',message:'Цена €1',options:[]}}]});};
 await assert.rejects(()=>amazonChatReply({messages:[{role:'user',content:'Найди товары'}],inventory,env,fetcher}));
 await assert.rejects(()=>amazonChatReply({messages:[{role:'user',content:'Найди товары'}],inventory,env,fetcher:async()=>Response.json({}, {status:503})}));
});
import {validateAmazonImage} from '../server/amazon.mjs';
const smallPng='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC';
test('photo input is bounded and sent before text, with only a description retained',async()=>{
 const image=validateAmazonImage({mediaType:'image/png',data:smallPng});
 assert.throws(()=>validateAmazonImage({mediaType:'image/svg+xml',data:smallPng}));assert.throws(()=>validateAmazonImage({mediaType:'image/jpeg',data:smallPng}));assert.throws(()=>validateAmazonImage({mediaType:'image/png',data:'A'.repeat(1400004)}));
 const env={ANTHROPIC_API_KEY:'private-llm',AFFSIWEN_AMAZON_CHAT_ENABLED:'yes',AFFSIWEN_AMAZON_CHAT_MODEL:'claude-haiku-4-5-20251001'};
 const out=await amazonChatReply({messages:[{role:'user',content:'Найти похожий товар'}],inventory,env,image,fetcher:async(url,opts)=>{
  const b=JSON.parse(opts.body);assert.equal(b.messages[0].content[0].type,'image');assert.equal(b.messages[0].content[0].source.data,smallPng);assert.equal(b.messages[0].content[1].text,'Найти похожий товар');
  return Response.json({stop_reason:'tool_use',usage:{input_tokens:100,output_tokens:30},content:[{type:'tool_use',name:'amazon_assistant_reply',input:{status:'clarify',message:'На фото небольшой предмет. Что хотите о нём узнать?',options:[],task:null,value:null,market:null,limit:null,goal:'Найти товар',imageSummary:'Небольшой предмет; деталей недостаточно.'}}]});
 }});
 assert.equal(out.imageSummary,'Небольшой предмет; деталей недостаточно.');assert.equal(out.usage.inputTokens,100);assert.doesNotMatch(JSON.stringify(out),/iVBOR|private-llm/);
});

test('ready response never claims an execution started',async()=>{
 const out=await amazonChatReply({messages:[{role:'user',content:'10 товаров bottle США'}],inventory,env:{ANTHROPIC_API_KEY:'key',AFFSIWEN_AMAZON_CHAT_ENABLED:'yes',AFFSIWEN_AMAZON_CHAT_MODEL:'claude-haiku-4-5-20251001'},fetcher:async()=>Response.json({stop_reason:'tool_use',content:[{type:'tool_use',name:'amazon_assistant_reply',input:{status:'ready',message:'Начинаю поиск',options:[],task:'search',market:'US',limit:10,value:'bottle',goal:'Сравнить товары',imageSummary:''}}]})});
 assert.doesNotMatch(out.answer.message,/Начинаю поиск/);assert.match(out.answer.message,/Сбор ещё не запущен/);
});
