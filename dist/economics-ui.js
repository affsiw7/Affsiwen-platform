// Operator-only view; all authoritative arithmetic lives on the server.
const fields = [
 ['results','Нужное число пригодных компаний',1000,1],
 ['recordsPerCandidate','Оплаченных записей на кандидата',1,0.01],
 ['acceptancePercent','Доля пригодных компаний, %',80,0.1],
 ['repeatPercent','Дополнительные оплаченные повторные записи, %',10,0.1],
 ['usdToEur','Евро за $1 — сценарий, не текущий курс',1,0.0001],
 ['enrichmentPerCandidateEur','Обогащение на кандидата, €',0,0.0001],
 ['processingPerOrderEur','AI, хранение и обработка заказа, €',1,0.01],
 ['supportPerOrderEur','Поддержка на заказ, €',2,0.01],
 ['priceEur','Цена заказа без VAT, €',49,0.01],
 ['vatPercent','VAT, % — параметр сценария',0,0.1],
 ['feePercent','Комиссия оплаты, % — допущение',2,0.01],
 ['feeFixedEur','Фиксированная комиссия, € — допущение',0.3,0.01],
 ['refundPercent','Полные возвраты, %',3,0.1],
 ['targetMarginPercent','Целевая маржа до CAC, %',70,0.1],
 ['cacEur','Привлечение одного заказа, €',10,0.01],
 ['supplierBudgetUsd','Бюджет закупки на заказ, $ — только проверка оценки',5,0.01]
];
export function economicsForm(){return `<section class="panel"><h2>Поиск компаний · расчёт перед продажей</h2><p>Все значения ниже — редактируемые допущения. 0 € за обогащение означает, что оно не включено. Email, LinkedIn и размер компании не обещаются базовым продуктом.</p><form id="economics"><div class="split">${fields.map(([name,label,value,step])=>`<label>${label}<input type="number" name="${name}" value="${value}" step="${step}" min="0" required></label>`).join('')}</div><button class="primary" type="submit">Рассчитать цену и запас маржи</button></form><p class="fine">Расчёт не изменяет каталог, не покупает данные и не запускает Agent. Для запуска потребуется измерить качество и подключить контроль расходов.</p></section><section id="economics-result" aria-live="polite"></section>`;}
export function economicsResult(q){
 const euro=n=>new Intl.NumberFormat('ru-RU',{style:'currency',currency:'EUR'}).format(n);
 const rows=[['Кандидатов для получения нужного объёма',q.candidates],['Оплаченных записей с повторами',q.billedRecords],['Закупка по публичному PAYG',`$${q.supplierUsd.toFixed(4)} / ${euro(q.supplierEur)}`],['Обогащение',euro(q.enrichmentEur)],['Выдача всего, включая обработку и поддержку',euro(q.deliveryEur)],['Комиссия оплаты',euro(q.paymentEur)],['Выручка после ожидаемых возвратов, без VAT',euro(q.retainedRevenueEur)],['Остаётся до CAC и постоянных затрат',euro(q.contributionBeforeCacEur)],['Маржа до CAC',`${q.marginPercent.toFixed(1)}%`],['Остаётся после CAC, до постоянных затрат',euro(q.contributionAfterCacEur)],['Предельный CAC до нулевого вклада в постоянные затраты',euro(q.breakEvenCacEur)],['Цена для целевой маржи, без VAT',q.targetPriceEur===null?'Недостижима при заданных параметрах':euro(q.targetPriceEur)]];
 return `<div class="panel" style="margin-top:22px"><h2>Расчётный сценарий · не фактическая прибыль</h2><p><span class="pill ${q.targetMet?'green':'amber'}">${q.targetMet?'Цель по марже достигается в сценарии':'Цена не обеспечивает целевую маржу'}</span></p><p>${q.supplierBudgetFitsScenario?'Расчётная закупка укладывается в заданный бюджет.':'Расчётная закупка превышает заданный бюджет.'} Это не ограничитель реального счёта поставщика.</p><div class="table-wrap"><table><tbody>${rows.map(([label,value])=>`<tr><td>${label}</td><td><strong>${value}</strong></td></tr>`).join('')}</tbody></table></div><p class="fine">Публичный тариф поставщика от 06.10.2026. Бесплатный лимит и будущие скидки исключены. Закупочная информация видна только оператору.</p><p class="fine">Исполнение выключено. Выход пригодных компаний и расходы нужно подтвердить контрольным сбором. При нулевой пригодной выдаче цена одного результата не определена.</p></div>`;
}
