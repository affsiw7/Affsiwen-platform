import {amazonInventory,publicAmazonConnection} from '../server/amazon.mjs';
import {quoteProspecting} from '../server/economics.mjs';
import {randomBytes,createHash} from 'node:crypto';
import {HttpError} from '../server/errors.mjs';
import {DemoIntake,validateRecommendation} from '../server/onboarding.mjs';
import {csv} from '../server/catalog.mjs';
const check=(ok,status,message)=>{if(!ok)throw new HttpError(status,message);};
const cookie=(req,name)=>(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.slice(name.length+1)||'';
const emptyIntake={messages:[],answer:null,lastRequest:null,mode:'demo'};
export function createCloudHandler({env=process.env,fetcher=fetch}={}){
 return async(req,res)=>{
  const json=(status,value)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(value));};
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');
  let pendingCookies=[];
  const setCookie=(name,value,age=86400)=>{pendingCookies.push(`${name}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${age}`);res.setHeader('Set-Cookie',pendingCookies);};
  try{
   check(env.PUBLIC_ORIGIN&&env.SUPABASE_URL&&env.SUPABASE_PUBLISHABLE_KEY,503,'Облачная база ещё не подключена.');
   const origin=new URL(env.PUBLIC_ORIGIN);check(origin.protocol==='https:'&&origin.origin===env.PUBLIC_ORIGIN,503,'Неверный адрес платформы.');
   const base=new URL(env.SUPABASE_URL);check(base.protocol==='https:'&&base.hostname.endsWith('.supabase.co'),503,'Неверный адрес базы.');
   const url=new URL(req.url,origin),path=url.searchParams.has('route')?'/'+url.searchParams.get('route'):url.pathname.replace(/^\/api/,'');
   const method=req.method||'GET';
   check(['GET','POST'].includes(method),405,'Метод не поддерживается.');
   if(method==='POST')check(req.headers.origin===origin.origin&&req.headers['x-affsiwen-request']==='1'&&/^application\/json(?:;|$)/i.test(req.headers['content-type']||''),403,'Запрос должен исходить со страницы Affsiwen.');
   let data={};
   if(method==='POST'){
    if(req.body!==undefined){const raw=typeof req.body==='string'?req.body:JSON.stringify(req.body);check(Buffer.byteLength(raw)<=65536,413,'Слишком большой запрос.');data=JSON.parse(raw);}
    else{let chunks=[],size=0;for await(const b of req){size+=b.length;check(size<=65536,413,'Слишком большой запрос.');chunks.push(b);}data=JSON.parse(Buffer.concat(chunks).toString()||'{}');}
    check(data&&typeof data==='object'&&!Array.isArray(data),400,'Некорректный запрос.');
   }
   async function sb(path,{token,body,method=body===undefined?'GET':'POST'}={}){
    const response=await fetcher(new URL(path,base),{method,headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,...(token?{Authorization:`Bearer ${token}`} : {}),'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(12000),redirect:'error'});
    const value=await response.json().catch(()=>({}));
    if(!response.ok){const status=response.status;const safe=value.code?.startsWith('PT')&&typeof value.message==='string';throw new HttpError(status>=500?503:status,safe?value.message:status===429?'Слишком много попыток. Повторите позже.':status===400||status===401?'Не удалось подтвердить вход. Проверьте email, пароль и подтверждение почты.':'Сервис временно недоступен.');}
    return value;
   }
   let access=cookie(req,'aff_access');
   const saveSession=session=>{check(session.access_token&&session.refresh_token,502,'Вход не завершён.');access=session.access_token;setCookie('aff_access',access,Number(session.expires_in)||3600);setCookie('aff_refresh',session.refresh_token,604800);};
   async function refresh(){const token=cookie(req,'aff_refresh');if(!token)return false;try{saveSession(await sb('/auth/v1/token?grant_type=refresh_token',{body:{refresh_token:token}}));return true;}catch(e){if(e.status>=500||e.status===429)throw e;return false;}}
   if(!access&&cookie(req,'aff_refresh'))await refresh();
   const rpc=(action,args={},token=access)=>sb('/rest/v1/rpc/affsiwen_market',{token,body:{action,args}});
   if(path==='/health'&&method==='GET'){
    await rpc('catalog',{},'');return json(200,{mode:'cloud-demo',database:'supabase-postgres',execution:'fixture',assistant:'demo',googleLogin:env.GOOGLE_LOGIN_ENABLED==='yes',payments:'fixture',commercialSales:false,demoAccess:false});
   }
   if(path==='/amazon/connection'&&method==='GET')return json(200,publicAmazonConnection(await amazonInventory({key:env.BRIGHT_DATA_API_KEY,fetcher})));
   if(path==='/register'&&method==='POST'){
    check(['buyer','supplier'].includes(data.role||'buyer'),403,'Эту роль нельзя зарегистрировать.');
    check(typeof data.password==='string'&&data.password.length>=12&&data.password.length<=128,400,'Пароль: от 12 до 128 символов.');
    check(typeof data.email==='string'&&data.email.length<=200,400,'Укажите email.');
    const out=await sb('/auth/v1/signup',{body:{email:data.email.trim().toLowerCase(),password:data.password}});
    // Registration role is selected in profile.setup after verified authentication, never read from JWT user_metadata.
    if(out.access_token){saveSession(out);await rpc('profile.setup',{role:data.role||'buyer'});}
    return json(200,{confirmationRequired:!out.access_token});
   }
   if(path==='/login'&&method==='POST'){
    check(['buyer','supplier'].includes(data.role||'buyer'),403,'Эту роль нельзя зарегистрировать.');
    check(typeof data.email==='string'&&typeof data.password==='string'&&data.password.length<=128,400,'Укажите email и пароль.');
    saveSession(await sb('/auth/v1/token?grant_type=password',{body:{email:data.email.trim().toLowerCase(),password:data.password}}));
    return json(200,await rpc('profile.setup',{role:data.role||'buyer'}));
   }
   if(path==='/logout'&&method==='POST'){
    if(access)await sb('/auth/v1/logout',{token:access,method:'POST'}).catch(e=>{if(e.status!==401)throw e;});
    setCookie('aff_access','',0);setCookie('aff_refresh','',0);setCookie('aff_intake','',0);return json(200,{ok:true});
   }
   if(path==='/auth/google/start'&&method==='GET'){
    check(env.GOOGLE_LOGIN_ENABLED==='yes',503,'Вход Google ещё не подключён.');
    const verifier=randomBytes(48).toString('base64url');setCookie('aff_pkce',verifier,600);setCookie('aff_role',url.searchParams.get('role')==='supplier'?'supplier':'buyer',600);
    const target=new URL('/auth/v1/authorize',base);target.searchParams.set('provider','google');target.searchParams.set('redirect_to',`${origin.origin}/api/auth/google/callback`);target.searchParams.set('code_challenge',createHash('sha256').update(verifier).digest('base64url'));target.searchParams.set('code_challenge_method','s256');res.statusCode=302;res.setHeader('Location',target.href);return res.end();
   }
   if(path==='/auth/google/callback'&&method==='GET'){
    const verifier=cookie(req,'aff_pkce');check(/^[\w-]{64}$/.test(verifier)&&url.searchParams.get('code'),400,'Сессия входа истекла.');
    setCookie('aff_pkce','',0);setCookie('aff_role','',0);
    saveSession(await sb('/auth/v1/token?grant_type=pkce',{body:{auth_code:url.searchParams.get('code'),code_verifier:verifier}}));
    await rpc('profile.setup',{role:cookie(req,'aff_role')==='supplier'?'supplier':'buyer'});res.statusCode=302;res.setHeader('Location','/market.html#resume');return res.end();
   }
   if(path==='/catalog'&&method==='GET')return json(200,await rpc('catalog'));
   if(path==='/onboarding/reset'&&method==='POST'){setCookie('aff_intake','',0);return json(200,emptyIntake);}
   if(path==='/onboarding'&&['GET','POST'].includes(method)){
    let capability=cookie(req,'aff_intake');
    if(!/^[a-f0-9]{64}$/.test(capability)){if(method==='GET')return json(200,emptyIntake);capability=randomBytes(32).toString('hex');}
    const stored=await sb('/rest/v1/rpc/affsiwen_intake',{body:{capability}}),prior=stored.document||emptyIntake;
    if(method==='GET')return json(200,prior);
    check(typeof data.message==='string'&&data.message.trim().length>=2&&data.message.length<=2000,400,'Опишите задачу: от 2 до 2000 символов.');
    check(/^[\w-]{8,100}$/.test(data.requestId||''),400,'Нужен идентификатор сообщения.');
    if(prior.lastRequest===data.requestId){check(prior.messages.filter(m=>m.role==='user').at(-1)?.content===data.message.trim(),409,'Идентификатор уже использован.');return json(200,prior);}
    check(prior.messages.length<24,429,'Достигнут лимит диалога. Начните новую задачу.');
    const messages=[...prior.messages.filter(m=>['user','assistant'].includes(m.role)&&typeof m.content==='string'),{role:'user',content:data.message.trim()}];
    const catalog=(await rpc('catalog',{},'')).products,answer=validateRecommendation(await new DemoIntake().respond(messages,catalog),catalog);
    const result={messages:[...messages,{role:'assistant',content:[answer.message,answer.question].filter(Boolean).join('\n')}],answer,lastRequest:data.requestId,mode:'demo'};
    await sb('/rest/v1/rpc/affsiwen_intake',{body:{capability,document:result,expected_revision:stored.revision}});
    setCookie('aff_intake',capability);return json(200,result);
   }
   check(access,401,'Войдите в аккаунт.');
   // Validate the session online before every account operation; the RPC independently enforces auth.uid().
   try{await sb('/auth/v1/user',{token:access});}catch(e){if(e.status!==401||!await refresh())throw e;await sb('/auth/v1/user',{token:access});}
   if(path==='/me'&&method==='GET')return json(200,await rpc('me'));
   if(path==='/catalog'&&method==='POST')return json(201,await rpc('propose',data));
   if(path==='/favorites'&&method==='GET')return json(200,await rpc('favorites'));
   if(path==='/operations'&&method==='GET')return json(200,await rpc('operations'));
   if(path==='/economics/quote'&&method==='POST'){
    const {user}=await rpc('me');check(user.role==='operator',403,'Нужен оператор.');
    return json(200,quoteProspecting(data));
   }
   if(path==='/launch'&&method==='GET'){
    const {user}=await rpc('me');check(user.role==='operator',403,'Нужен оператор.');
    return json(200,{commercialSales:false,items:[{name:'База и роли',status:'ready',note:'Supabase Postgres; отдельные права покупателя, партнёра и оператора.'},{name:'Веб-платформа',status:'ready',note:'Vercel; API без локального диска и фонового таймера.'},{name:'Исполнение и оплаты',status:'pending',note:'Только синтетические результаты и демооплата.'},{name:'Google',status:env.GOOGLE_LOGIN_ENABLED==='yes'?'ready':'pending',note:'Включается после настройки OAuth в Supabase.'},{name:'LLM и письма',status:'pending',note:'Диалог пока демонстрационный. Нужны настройки провайдеров.'}]});
   }
   if(path==='/orders')return json(method==='POST'?201:200,await rpc(method==='POST'?'create':'orders',data));
   const product=path.match(/^\/catalog\/([\w-]+)(?:\/(favorite))?$/);
   if(product&&method==='POST')return json(200,await rpc(product[2]?'favorite':'revise',{...data,id:product[1]}));
   const order=path.match(/^\/orders\/([0-9a-f-]{36})(?:\/([a-z-]+))?$/);
   if(order){
    const [,id,action]=order;
    if(['csv','export'].includes(action)&&method==='GET'){
     const {order:o}=await rpc('read',{id});check(['delivered','accepted'].includes(o.status),409,'Результат ещё не готов.');
     res.setHeader('Content-Disposition',`attachment; filename="affsiwen-${id}.${action==='csv'?'csv':'json'}"`);
     if(action==='export')return json(200,o.result);
     res.setHeader('Content-Type','text/csv; charset=utf-8');return res.end(csv(o.result));
    }
    if(method==='GET'&&(!action||['events','messages'].includes(action)))return json(200,await rpc(action||'read',{id}));
    if(method==='POST'&&['messages','pay-test','accept','cancel','dispute','refund-test'].includes(action))return json(200,await rpc(action==='messages'?'message':action,{...data,id}));
   }
   throw new HttpError(404,'Действие не подключено.');
  }catch(e){json(e.status||(e instanceof SyntaxError?400:500),{error:e instanceof HttpError?e.message:e instanceof SyntaxError?'Некорректный JSON.':'Не удалось обработать запрос.'});}
 };
}
