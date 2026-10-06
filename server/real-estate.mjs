import {HttpError} from './errors.mjs';
import {realEstateProducts,productLinkAllowed} from '../dist/commerce-catalog.js';
const check=(ok,message)=>{if(!ok)throw new HttpError(400,message);};
// All 11 domains / 22 endpoints observed in AFF7 on 2026-10-06.
export const realEstateDefinitions={
 zillow:{domain:'zillow.com',families:{listing:'gd_lfqkr8wm13ixtbd8f5',history:'gd_lxu1cz9r88uiqsosl',full:'gd_m794g571225l6vm7gh',page:'gd_m71oxpvxwr113ehqg'},operations:{property:['listing','collect_by_url'],search:['listing','discover_by_input_filters'],searchurl:['listing','discover_by_url'],history:['history','collect_by_url'],full:['full','collect_by_url'],fullsearch:['full','discover_by_search_url'],searchpage:['page','collect_by_url']}},
 otodom:{domain:'otodom.pl',families:{listing:'gd_ld739mwou49s5y9ko'}},
 realestate:{domain:'realestate.com.au',families:{listing:'gd_l3cvjh111l943r4awk'},operations:{property:['listing','collect_by_url'],search:['listing','discover_by_listing_type'],searchurl:['listing','discover_by_url']}},
 zoopla:{domain:'zoopla.co.uk',families:{listing:'gd_lnabksndfp1pegwzh'},operations:{property:['listing','collect_by_url'],search:['listing','discover_by_input_filters']}},
 zonaprop:{domain:'zonaprop.com.ar',families:{listing:'gd_lfsbhfgo2bglgrecm6'},operations:{property:['listing','collect_by_url'],searchurl:['listing','discover_by_domain']}},
 inmuebles:{domain:'inmuebles24.com',families:{listing:'gd_lfsa1vgv183347v45m'}},
 metrocuadrado:{domain:'metrocuadrado.com',families:{listing:'gd_lfsblgpf2oq16yrbny'}},
 toctoc:{domain:'toctoc.com',families:{listing:'gd_lgfdx3l01behlrboh7'}},
 properati:{domain:'properati.com.co',families:{listing:'gd_lg3nvn6ibrhbotstw'}},
 infocasas:{domain:'infocasas.com.uy',families:{listing:'gd_lftpmbga1jwon80ddh'}},
 suumo:{domain:'suumo.jp',families:{listing:'gd_mj8aqitubss2k47k3'},operations:{property:['listing','collect_by_url'],search:['listing','discover_by_category']}}
};
const labels={property:['Карточка объекта','Публичные сведения объявления по вашей ссылке.'],search:['Поиск объявлений','Ограниченный сбор по согласованным параметрам.'],searchurl:['Объявления из выдачи','Сбор по вашей ссылке на каталог или поисковую выдачу.'],history:['История цен','Доступные события истории цены Zillow по ссылке объекта.'],full:['Расширенная карточка','Доступные расширенные сведения Zillow по ссылке объекта.'],fullsearch:['Расширенная выдача','Расширенные сведения объектов по вашей ссылке на выдачу Zillow.'],searchpage:['Поисковая страница','Сведения поисковой страницы Zillow по вашей ссылке.']};
const columns=['Объект','Адрес','Цена объявления','Валюта','Площадь источника','Единица площади','Спальни','Ванные','Тип объекта','Ссылка'];
const historyColumns=['Дата события','Событие','Цена события','Валюта','Изменение цены, %','Цена за кв. фут','Ссылка'];
const cache=new Map();
const bounded=(v,max=70)=>{if(v===undefined||v===null||typeof v==='object')return '—';let s=String(v).replace(/[\u0000-\u001f]/g,' ');while(Buffer.byteLength(s)>max)s=s.slice(0,-1);return s||'—';};
const first=(r,keys)=>keys.map(k=>r[k]).find(v=>v!==undefined&&v!==null&&v!=='');
export function realEstateAdapter(id){
 const d=realEstateDefinitions[id],product=realEstateProducts.find(p=>p.id===id);if(!d||!product)return null;
 const operations=d.operations||{property:['listing','collect_by_url']};
 const tasks=Object.entries(operations).map(([id,[family,method]])=>({id,title:labels[id][0],description:id==='search'?(d.domain==='realestate.com.au'?'Каталог buy/rent; город отдельным параметром не поддерживается.':d.domain==='suumo.jp'?'Категория аренды rent; без отдельного параметра города.':'По месту и типу сделки: продажа или аренда.'):labels[id][1],family,method}));
 const available=inv=>tasks.filter(t=>inv.inventory?.some(r=>r.id===d.families[t.family]&&r.scrapers?.[t.method]));
 async function inventory({key,fetcher=fetch,now=Date.now()}={}){
  if(!key)return {connected:false,reason:'not_configured',inventory:[]};const hit=cache.get(id);if(hit?.key===key&&hit.fetcher===fetcher&&hit.until>now)return hit.value;
  let value;try{const res=await fetcher('https://api.brightdata.com/datasets/v3/scrapers?domain='+d.domain,{headers:{Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(15000),redirect:'error'});const body=res.ok?await res.json():null;const rows=Array.isArray(body)?body.filter(r=>r&&Object.values(d.families).includes(r.id)&&r.scrapers):[];value={inventory:rows};value.connected=available(value).length>0;value.reason=value.connected?'verified':'unavailable';}catch{value={connected:false,reason:'unavailable',inventory:[]};}cache.set(id,{key,fetcher,until:now+(value.connected?300000:15000),value});return value;
 }
 function acceptsUrl(value,task){
  if(typeof value!=='string'||!productLinkAllowed(value,product))return false;const p=new URL(value).pathname;if(p==='/'||/^\/(?:login|signin|account|accounts|auth)(?:\/|$)/i.test(p))return false;
  if(id==='zillow')return ['searchurl','fullsearch','searchpage'].includes(task)?!p.startsWith('/homedetails/'):p.startsWith('/homedetails/');
  if(id==='otodom')return /^\/pl\/oferta\//.test(p);
  if(id==='realestate')return task==='searchurl'?/^\/(buy|rent|sold)\//.test(p):/^\/property-/.test(p);
  if(id==='zoopla')return /^\/(for-sale|to-rent)\/details\//.test(p);
  return true;
 }
 function prepare(data,inv){
  check(data&&typeof data==='object','Некорректный запрос.');const task=tasks.find(t=>t.id===data.task);check(task,'Эта операция не подключена.');check(!data.market||data.market==='GLOBAL','Регион определяется площадкой и запросом.');
  const value=String(data.value||'').trim(),request=String(data.request||'').trim(),limit=Number(data.limit);
  check(value.length>=2&&value.length<=2000&&request.length>=2&&request.length<=1500,'Нужны место или ссылка и цель запроса.');check(Number.isInteger(limit)&&limit>=1&&limit<=100,'Выберите объём от 1 до 100 записей.');
  if(!inv.connected)throw new HttpError(503,'Подключение данных недоступно.');const row=inv.inventory.find(r=>r.id===d.families[task.family]),schema=row?.scrapers?.[task.method]?.input_schema;check(Array.isArray(schema)&&schema.length,'Параметры этой операции требуют проверки.');
  const e=data.estate||{};check(e&&typeof e==='object'&&!Array.isArray(e),'Уточните параметры недвижимости.');
  const estate={};let supplied={};
  if(task.id==='search'){
   const kind=e.kind;check(['sale','rent'].includes(kind),'Уточните тип сделки: продажа или аренда.');estate.kind=kind;
   if(id==='suumo'){check(value==='rent','Категория аренды принимает rent; отдельный город не поддерживается.');check(kind==='rent','В категории Suumo сейчас проверена только аренда.');supplied.category='rent';}
   else if(id==='realestate'){check(['buy','rent'].includes(value)&&value===(kind==='sale'?'buy':'rent'),'Каталог принимает buy/rent. Для города нужна ваша ссылка на выдачу.');supplied.filter=value;}
   else{check(!/^https?:/i.test(value)&&value.length<=200,'Укажите место, индекс или адрес.');supplied.location=value;if(id==='zillow')supplied.listingCategory=kind==='sale'?'House for sale':'House for rent';else supplied.property_type=kind==='sale'?'For sale':'to rent';}
   if(id==='zillow'&&e.homeType){check(typeof e.homeType==='string'&&e.homeType.length<=100,'Уточните тип объекта.');estate.homeType=e.homeType;supplied.HomeType=e.homeType;}
   if(id==='zillow'&&e.daysOnMarket){check(typeof e.daysOnMarket==='string'&&e.daysOnMarket.length<=30,'Уточните срок публикации.');estate.daysOnMarket=e.daysOnMarket;supplied.days_on_zillow=e.daysOnMarket;}
   if(id==='zillow'){check(e.exactAddress===undefined||typeof e.exactAddress==='boolean','Уточните точный адрес.');estate.exactAddress=e.exactAddress===true;supplied.exact_address=estate.exactAddress;}
   if(id==='suumo'){if(e.buildingType){check(typeof e.buildingType==='string'&&e.buildingType.length<=80,'Уточните тип здания.');estate.buildingType=e.buildingType;supplied.building_type=e.buildingType;}if(e.condominiumRental!==undefined){check(typeof e.condominiumRental==='boolean','Уточните тип аренды.');estate.condominiumRental=e.condominiumRental;supplied.condominium_rental=e.condominiumRental;}}
  }else{
   check(acceptsUrl(value,task.id),'Нужна ссылка '+product.name+' на подходящий объект или выдачу.');const u=new URL(value);u.hash='';supplied.url=u.href;
   if(id==='realestate'&&task.id==='searchurl'){
    check(!e.splitPropertyType&&!e.splitPriceRange,'Для пилота разбиение выдачи выключено.');check(e.limitPages===undefined||e.limitPages===1,'Для пилота доступна одна страница выдачи.');supplied.split_property_type=false;supplied.split_price_range=false;supplied.limit_pages=1;estate.limitPages=1;
    if(e.daysBack!==undefined&&e.daysBack!==null){check(Number.isInteger(e.daysBack)&&e.daysBack>=1&&e.daysBack<=365,'Уточните число дней от 1 до 365.');estate.daysBack=e.daysBack;supplied.days_back=e.daysBack;}
   }
   if(id==='zillow'&&task.id==='searchpage'){check(e.includeOffmarket===undefined||typeof e.includeOffmarket==='boolean','Уточните состав выдачи.');supplied.include_offmarket=e.includeOffmarket===true;estate.includeOffmarket=supplied.include_offmarket;}
  }
  const input={};for(const f of schema){if(typeof f.name!=='string')continue;const v=supplied[f.name];if(v!==undefined){if(Array.isArray(f.enum)&&f.enum.length)check(f.enum.includes(v),'Этот фильтр сейчас не поддерживается.');input[f.name]=v;}else check(f.required!==true,'Для операции нужен дополнительный параметр. Сбор не запускался.');}
  check(Object.keys(input).length,'Параметры операции ещё не настроены.');
  const query={dataset_id:row.id,include_errors:'true',notify:'false'};if(task.method.startsWith('discover_by_')){query.type='discover_new';query.discover_by=task.method.slice(12);}
  const note='Цена объявления не означает цену сделки или оценку стоимости. Валюта, площадь и единицы — только из выдачи.'+(id==='realestate'&&task.id==='search'?' Каталог по типу сделки: город не передаётся отдельным параметром.':'')+(id==='suumo'&&task.id==='search'?' Категория аренды: географический фильтр не подключён.':'');
  return {display:{product:id,task:task.id,title:task.title,market:'GLOBAL',value,request,limit,estate:Object.keys(estate).length?estate:null,dataSource:product.name,columns:task.id==='history'?historyColumns:columns,mode:'prepared',priceStatus:'not_approved',notice:note},contract:{query,body:{input:[input],limit_per_input:limit}}};
 }
 function normalize(raw,plan){
  check(Array.isArray(raw),'Источник вернул непонятный формат.');const good=raw.filter(r=>r&&typeof r==='object'&&!Array.isArray(r)&&!r.error&&!r.error_code);
  const rows=good.slice(0,plan.limit).map(r=>{
   const url=first(r,['url','property_url','listing_url']);const price=r.price&&typeof r.price==='object'?r.price.value??r.price.amount:r.price;
   const fields={'Объект':bounded(first(r,['title','name','property_name','address']),120),'Адрес':bounded(first(r,['address','full_address','location']),120),'Цена объявления':bounded(price??first(r,['current_price','listing_price'])),'Валюта':bounded(first(r,['currency','currency_code'])??(r.price&&typeof r.price==='object'?r.price.currency:undefined),20),'Площадь источника':bounded(first(r,['area','living_area','livingArea','floor_area','surface','square_feet'])),'Единица площади':bounded(first(r,['area_unit','area_units','livingAreaUnits','size_unit']),25),'Спальни':bounded(first(r,['bedrooms','beds'])),'Ванные':bounded(first(r,['bathrooms','baths'])),'Тип объекта':bounded(first(r,['property_type','home_type','homeType'])),'Дата события':bounded(r.date),'Событие':bounded(r.event,120),'Цена события':bounded(price),'Изменение цены, %':bounded(r.price_change_rate),'Цена за кв. фут':bounded(r.price_per_squarefoot),'Ссылка':typeof url==='string'&&url.length<=500&&(acceptsUrl(url,'property')||acceptsUrl(url,'searchurl'))?url:'—'};
   return Object.fromEntries(plan.columns.map(k=>[k,fields[k]??'—']));
  }).filter(r=>Object.values(r).some(v=>v!=='—'));
  return {mode:'live',synthetic:false,product:id,title:plan.title,rows,received:raw.length,errorRecords:raw.length-good.length,requested:plan.limit,dataSource:product.name,notice:'Снимок публичных сведений. «—» — поле не получено. Неизвестная валюта и единицы площади не угадываются. Число объявлений не означает число уникальных объектов или подтверждённых сделок; одна квартира может иметь несколько объявлений.'};
 }
 return {id,product,tasks,markets:['GLOBAL'],inventory,available,prepare,normalize,acceptsUrl:v=>productLinkAllowed(v,product),urlPrompt:'на объявление или поддерживаемую выдачу',chatFields:{estate:{type:['object','null'],additionalProperties:false,properties:{kind:{type:'string',enum:['sale','rent','']},homeType:{type:'string'},daysOnMarket:{type:'string'},exactAddress:{type:'boolean'},buildingType:{type:'string'},condominiumRental:{type:'boolean'},limitPages:{type:'integer'},daysBack:{type:['integer','null']},splitPropertyType:{type:'boolean'},splitPriceRange:{type:'boolean'},includeOffmarket:{type:'boolean'}}}},chatInstructions:'Real Estate: GLOBAL не страна; не задавай вопрос про GLOBAL. Одна площадка, один конкретный согласованный сбор. Для Zillow/Zoopla search уточни место и продажу/аренду, сохрани estate.kind=sale/rent. Для Zillow homeType и daysOnMarket — только со слов клиента, exactAddress=true только если клиент просит точный адрес. Для Realestate.com.au search value=buy/rent и estate.kind=sale/rent, это каталог без фильтра города; для географии попроси предоставленную пользователем поисковую ссылку и searchurl. Для Suumo search value=rent и estate.kind=rent; категория без города. Не обещай поиска по городу для других площадок. Zillow history — история цены по ссылке homedetails; full — расширенная карточка, fullsearch — расширенная выдача по поисковой ссылке, searchpage — поисковая страница. Не придумывай ссылки. Не включай разбиение страниц Австралии: в пилоте одна страница. Не угадывай валюту и единицы площади, не называй объявления подтверждёнными сделками, оценкой рыночной стоимости, прогнозом дохода или подтверждённой доступностью. Перед ready уточни необходимые параметры и объём. Отвечай простым текстом, без markdown-разметки.',publicConnection:inv=>({connected:inv.connected,reason:inv.reason,product:product.name,category:'Real Estate',dataSource:product.name,checkedAt:new Date().toISOString(),tasks:tasks.map(({id,title,description})=>({id,title,description,available:available(inv).some(t=>t.id===id)}))})};
}
