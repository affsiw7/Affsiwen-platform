import {HttpError} from './errors.mjs';
import {travelProducts,productLinkAllowed} from '../dist/commerce-catalog.js';
const check=(ok,message)=>{if(!ok)throw new HttpError(400,message);};
// Console contracts inspected in AFF7 on 2026-10-06; inventory is revalidated at runtime.
const definitions={
 booking:{domain:'booking.com',listing:'gd_m5mbdl081229ln6t4a',search:'gd_mdy9ld3p1e0oqlj9g4',method:'search_input'},
 airbnb:{domain:'airbnb.com',listing:'gd_ld7ll037kqy322v05',search:'gd_ld7ll037kqy322v05',method:'location'},
 agoda:{domain:'agoda.com',listing:'gd_m837ssst155rq3a1xo'},
 trip:{domain:'trip.com',listing:'gd_mb7q8vuuej1nso8j2'},
 naver:{domain:'hotels.naver.com',listing:'gd_mmt7ee9m1r245mjv0v'}
};
const columns=['Объект','Адрес','Рейтинг','Цена источника','Валюта','Основание цены','Ссылка'];
const cache=new Map();
export function travelAdapter(id){
 const d=definitions[id],product=travelProducts.find(p=>p.id===id);if(!d||!product)return null;
 const tasks=[{id:'property',title:'Изучить объект размещения',description:'Публичные сведения по ссылке на конкретный объект. Даты и гости в ссылке сохраняются.',family:'listing',method:'collect_by_url'},...(d.search?[{id:'search',title:'Найти варианты размещения',description:'Поиск по месту, датам и явно указанному составу гостей. Не бронирование.',family:'search',method:'discover_by_'+d.method}]:[])];
 async function inventory({key,fetcher=fetch,now=Date.now()}={}){
  if(!key)return {connected:false,reason:'not_configured',inventory:[]};const hit=cache.get(id);if(hit?.key===key&&hit.fetcher===fetcher&&hit.until>now)return hit.value;
  let value;try{const r=await fetcher('https://api.brightdata.com/datasets/v3/scrapers?domain='+d.domain,{headers:{Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(15000),redirect:'error'});const b=r.ok?await r.json():null;const rows=Array.isArray(b)?b.filter(x=>x&&[d.listing,d.search].includes(x.id)&&x.scrapers):[];value={connected:rows.length>0,reason:rows.length?'verified':'unavailable',inventory:rows};}catch{value={connected:false,reason:'unavailable',inventory:[]};}cache.set(id,{key,fetcher,until:now+(value.connected?300000:15000),value});return value;
 }
 const available=inv=>tasks.filter(t=>inv.inventory?.some(r=>r.id===d[t.family]&&r.scrapers?.[t.method]));
 function prepare(data,inv){
  check(data&&typeof data==='object','Некорректное задание.');const task=tasks.find(t=>t.id===data.task);check(task,'Эта задача пока не подключена.');check(!data.market||data.market==='GLOBAL','Регион запроса определяется местом или ссылкой.');
  const value=String(data.value||'').trim(),request=String(data.request||'').trim(),limit=Number(data.limit);check(value.length>=2&&value.length<=2000&&request.length>=2&&request.length<=2000,'Укажите место или ссылку и цель запроса.');check(Number.isInteger(limit)&&limit>=1&&limit<=100,'Объём: от 1 до 100 записей.');
  if(!inv.connected)throw new HttpError(503,'Подключение данных временно недоступно.');const row=inv.inventory.find(r=>r.id===d[task.family]),contract=row?.scrapers?.[task.method];check(contract&&Array.isArray(contract.input_schema)&&contract.input_schema.length,'Эта операция сейчас недоступна.');
  let travel=null,supplied;
  if(task.id==='search'){
   travel=validateTravel(data.travel,id);supplied={url:'https://www.'+d.domain,location:value,check_in:travel.checkIn+'T00:00:00.000Z',check_out:travel.checkOut+'T00:00:00.000Z',currency:travel.currency,adults:travel.adults,rooms:travel.rooms,num_of_adults:travel.adults,num_of_children:travel.children,num_of_infants:String(travel.infants),num_of_pets:travel.pets};
  }else{
   check(productLinkAllowed(value,product),'Пришлите HTTPS-ссылку '+product.name+' на объект.');const u=new URL(value);u.hash='';
   const valid=id==='booking'?/^\/hotel\//.test(u.pathname):id==='airbnb'?/^\/rooms\/\d+/.test(u.pathname):id==='agoda'?/\/hotel\//.test(u.pathname):id==='trip'?/^\/hotels\//.test(u.pathname):/^\/accommodation\/search\/detail\//.test(u.pathname);check(valid,'Нужна ссылка на конкретный объект размещения.');
   supplied={url:u.href};
  }
  const input={},missing=[];for(const f of contract.input_schema){if(typeof f.name!=='string')continue;const v=supplied[f.name];if(v!==undefined&&v!==null)input[f.name]=v;else if(f.required===true)missing.push(f.name);}
  check(!missing.length,'Для этой операции нужны дополнительные параметры. Запрос не отправлен.');check(input.url||input.location,'Параметры операции требуют настройки.');
  const query={dataset_id:row.id,include_errors:'true',notify:'false'};if(task.id==='search'){query.type='discover_new';query.discover_by=d.method;}
  return {display:{product:id,task:task.id,title:task.title,market:'GLOBAL',limit,value,request,travel,columns:id==='agoda'?columns.filter(c=>!['Цена источника','Валюта','Основание цены'].includes(c)):columns,mode:'prepared',priceStatus:'not_approved',notice:'Цена источника не является ценой услуги или подтверждением бронирования. Валюта и основание цены — только из выдачи.'},contract:{query,body:{input:[input],limit_per_input:limit}}};
 }
 function normalize(raw,plan){
  check(Array.isArray(raw),'Не удалось прочитать результат источника.');const good=raw.filter(r=>r&&typeof r==='object'&&!Array.isArray(r)&&!r.error&&!r.error_code);
  const str=v=>{if(v===undefined||v===null||typeof v==='object')return '—';let text=String(v).slice(0,200).replace(/[\u0000-\u001f]/g,' ');while(Buffer.byteLength(text)>200)text=text.slice(0,-1);return text||'—';};const first=(r,keys)=>keys.map(k=>r[k]).find(v=>v!==undefined&&v!==null&&v!=='');
  const rows=good.slice(0,plan.limit).map(r=>{const url=first(r,['url','hotel_url','property_url']);const fields={'Объект':str(first(r,['hotel_name','property_name','name','title'])),'Адрес':str(first(r,['address','location','city'])),'Рейтинг':str(first(r,['rating','review_score','score'])),'Цена источника':str(first(r,['price','price_per_night','total_price'])),'Валюта':str(first(r,['currency','currency_code'])),'Основание цены':r.price!==undefined?str(r.price_basis):r.price_per_night!==undefined?'За ночь (поле источника)':r.total_price!==undefined?'Итого (поле источника)':'—','Ссылка':typeof url==='string'&&url.length<=1500&&productLinkAllowed(url,product)?url:'—'};return Object.fromEntries(plan.columns.map(k=>[k,fields[k]||'—']));}).filter(r=>Object.values(r).some(v=>v!=='—'));
  return {mode:'live',synthetic:false,product:id,rows,title:plan.title,received:raw.length,errorRecords:raw.length-good.length,requested:plan.limit,travel:plan.travel,notice:'Это снимок данных, не бронь. Неизвестные поля отмечены «—». Сравнивайте цены только при совпадении дат, гостей, валюты, налогов и основания расчёта.'};
 }
 return {id,product,tasks,markets:product.markets,inventory,available,prepare,normalize,acceptsUrl:v=>productLinkAllowed(v,product),urlPrompt:'на объект размещения',chatFields:{travel:{type:['object','null'],properties:{checkIn:{type:'string'},checkOut:{type:'string'},adults:{type:'integer'},children:{type:'integer'},infants:{type:'integer'},pets:{type:'integer'},rooms:{type:'integer'},currency:{type:'string'}}}},chatInstructions:'Travel: GLOBAL — техническое значение рынка, не страна и не гарантия мирового охвата; не спрашивай его. Для search уточни место, даты YYYY-MM-DD, взрослых, детей, младенцев, питомцев (Airbnb), номера (Booking) и валюту. Не выдумывай даты или состав гостей. Сохраняй согласованные параметры в travel: checkIn/checkOut/adults/children/infants/pets/rooms/currency. Для property travel=null, условия сохраняются в ссылке клиента. Booking search пока только для взрослых. Результаты не гарантируют доступность; бронирование, оплата отеля и сравнение итоговой стоимости не подключены. Сравнивай цены только с одинаковыми условиями.',publicConnection:inv=>({connected:inv.connected,reason:inv.reason,product:product.name,category:'Travel',checkedAt:new Date().toISOString(),tasks:tasks.map(({id,title,description})=>({id,title,description,available:available(inv).some(t=>t.id===id)}))})};
}
export function validateTravel(v,id){
 check(v&&typeof v==='object'&&!Array.isArray(v),'Уточните даты, гостей и валюту.');const out={};for(const field of ['checkIn','checkOut']){const date=v[field];check(typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date))&&new Date(date).toISOString().slice(0,10)===date,'Укажите корректные даты YYYY-MM-DD.');out[field]=date;}check(out.checkIn>=new Date().toISOString().slice(0,10)&&out.checkOut>out.checkIn,'Выезд должен быть после заезда, даты — не в прошлом.');check(Date.parse(out.checkOut)-Date.parse(out.checkIn)<=366*86400000,'Период размещения слишком длинный.');
 for(const field of ['adults','children','infants',...(id==='airbnb'?['pets']:['rooms'])]){check(Number.isInteger(v[field])&&v[field]>=(['adults','rooms'].includes(field)?1:0)&&v[field]<=30,'Уточните состав гостей и число номеров.');out[field]=v[field];}
 if(id==='booking')check(out.children===0&&out.infants===0,'Поиск Booking в этой версии — только для взрослых; запрос с детьми требует другого контракта.');check(typeof v.currency==='string'&&/^[A-Z]{3}$/.test(v.currency),'Укажите валюту трёхбуквенным кодом.');out.currency=v.currency;return out;
}
