export function cleanInput(input={},product){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Некорректное задание.');
 const query=String(input.query||'').trim();
 if(query.length<2||query.length>2000)throw Error('Опишите задачу: от 2 до 2000 символов.');
 const limit=Number(input.limit??100);
 if(!Number.isInteger(limit)||limit<1||limit>product.maxItems)throw Error(`Лимит: от 1 до ${product.maxItems}.`);
 const country=String(input.country||'Worldwide');if(!/^(Worldwide|[A-Z]{2})$/.test(country))throw Error('Укажите двухбуквенный код страны.');
 return {query,limit,country};
}

export function csv(rows){if(!rows.length)return '';const keys=[...new Set(rows.flatMap(Object.keys))];const cell=v=>{let s=String(v??'');if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};return '\uFEFF'+[keys,...rows.map(r=>keys.map(k=>r[k]))].map(row=>row.map(cell).join(',')).join('\r\n');}
