import {createHmac} from 'node:crypto';
import {HttpError} from './errors.mjs';
import {mergeCreatorResults} from './creators.mjs';
const sign=(key,value)=>createHmac('sha256',key).update(value).digest('hex');
const check=(ok,status,message)=>{if(!ok)throw new HttpError(status,message);};
const done=new Set(['ready','empty','failed','unknown']);
// Each child uses the existing revision lock and shared daily supplier budget.
// Parent polling can be repeated; uncertain POST outcomes never get retried.
export function createCreatorsRunner({env,fetcher=fetch,read,write,now=()=>Date.now(),adapter,runnerFactory}){
 const key=env.BRIGHT_DATA_API_KEY,config=adapter.runConfiguration(env);
 const storage=(cap,id)=>{check(/^[a-f0-9]{64}$/.test(cap)&&/^[a-f0-9]{32}$/.test(id),400,'Некорректное задание.');check(key,503,'Источник недоступен.');return sign(key,'creators-parent-v1:'+cap+':'+id);};
 const get=(cap,id)=>read(storage(cap,id));
 const save=(cap,id,job,revision)=>write(storage(cap,id),{...job,messages:[],updatedAt:new Date(now()).toISOString()},revision);
 const childId=(cap,id,platform)=>sign(key,'creators-child-v1:'+cap+':'+id+':'+platform).slice(0,32);
 const publicJob=job=>job?{id:job.id,planId:job.id,status:job.status,task:job.plan.title,requested:job.plan.limit,createdAt:job.createdAt,updatedAt:job.updatedAt,result:job.result||null,message:job.status==='ready'?'Подбор кандидатов готов.':job.status==='empty'?'В ограниченной выдаче профили не найдены.':job.status==='failed'?'Подбор не завершён. Платного повтора не было.':job.status==='unknown'?'Запуск требует сверки; повтор заблокирован.':'Ищем кандидатов по согласованному брифу.',sources:(job.children||[]).map(c=>({name:c.platform==='tiktok'?'TikTok':'YouTube',status:c.status}))}:null;
 function childRunner(platform,inv){return runnerFactory({env,fetcher,read,write,now,adapter:adapter.childAdapter(platform,inv)});}
 async function advance(cap,stored){
  let job=stored.document;if(done.has(job.status))return publicJob(job);
  if(now()-Number(job.lastPollAt||0)<8000)return publicJob(job);
  let lock;try{lock=await save(cap,job.id,{...job,lastPollAt:now()},stored.revision);}catch(e){if(e.status===409)return publicJob((await get(cap,job.id)).document);throw e;}
  job={...job,lastPollAt:now(),children:job.children.map(c=>({...c}))};
  try{
   const inv=await adapter.inventory({key,fetcher});
   for(const c of job.children){
    if(done.has(c.status))continue;
    const runner=childRunner(c.platform,inv),id=childId(cap,job.id,c.platform);
    let run=await runner.read(cap,id);
    if(!run)run=await runner.start(cap,{...job.plan,id,candidateLimit:job.plan.limit,limit:c.limit});
    else run=await runner.status(cap,id);
    c.status=run.status;c.result=run.result||null;
    if(!done.has(c.status))break; // One active source at a time.
    if(c.status==='unknown'||c.status==='failed'){job.status=c.status;break;}
   }
   if(job.children.every(c=>['ready','empty'].includes(c.status))){
    const result=mergeCreatorResults(job.children.map(c=>c.result||{rows:[],received:0,dataSource:c.platform}),job.plan);
    job.result={...result,createdAt:new Date(now()).toISOString()};job.status=result.rows.length?'ready':'empty';
    // Results belong in the parent only; bound stored document size.
    job.children=job.children.map(({result,...c})=>c);
   }
  }catch(e){
   // A read failure is recoverable. A rejected or uncertain child trigger is
   // already persisted by its runner; next poll reads that state, not a new POST.
   if(e.status===429||e.status===503||e.status===400)job.status='failed';
  }
  try{return publicJob((await save(cap,job.id,job,lock.revision)).document);}catch{return publicJob({...job,status:'unknown'});}
 }
 async function start(cap,plan){
  check(config.enabled&&config.maxRunsPerDay>=2,503,'Составной сбор ещё не включён. Нужен согласованный лимит двух поисков.');
  check(plan&&/^[a-f0-9]{32}$/.test(plan.id),409,'Сначала согласуйте запрос.');
  const old=await get(cap,plan.id);if(old.document)return publicJob(old.document);
  const prepared=adapter.prepare(plan,await adapter.inventory({key,fetcher}));
  const job={id:plan.id,plan:{...prepared.display,id:plan.id},status:'running',createdAt:new Date(now()).toISOString(),children:prepared.display.sourceSteps.map((s,i)=>({platform:i===0?'tiktok':'youtube',limit:s.limit,status:'pending'})),result:null};
  const saved=await save(cap,plan.id,job,old.revision);return advance(cap,saved);
 }
 return {start,status:async(cap,id)=>{const stored=await get(cap,id);check(stored.document,404,'Задание не найдено в этой сессии.');return advance(cap,stored);},read:async(cap,id)=>publicJob((await get(cap,id)).document)};
}
