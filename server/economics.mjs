import {HttpError} from './errors.mjs';

// Public tariff snapshot. No negotiated discount or free credits are assumed.
export const tariff = Object.freeze({
  id: 'brightdata-web-scraper-2026-10-06', observedAt: '2026-10-06',
  source: 'https://brightdata.com/pricing/web-scraper', currency: 'USD',
  paygPerThousand: 1.5, scaleMonthly: 499, scaleIncluded: 384000, scaleOveragePerThousand: 1.3
});
function number(value, name, min, max, integer = false) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isSafeInteger(value)))
    throw new HttpError(400, `Некорректное значение: ${name}.`);
  return value;
}
const ceilCount = n => Math.ceil(n - Number.EPSILON * Math.abs(n) * 4);
const centsUp = n => Math.ceil((n - 1e-10) * 100) / 100;
export function monthlyProcurement(records) {
  number(records, 'records', 0, 1000000000, true);
  return {
    records, paygUsd: records * tariff.paygPerThousand / 1000,
    scaleUsd: tariff.scaleMonthly + Math.max(0, records - tariff.scaleIncluded) * tariff.scaleOveragePerThousand / 1000
  };
}

export function quoteProspecting(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new HttpError(400, 'Нужны параметры расчёта.');
  const fields = {
    results: [1, 1000000, true], recordsPerCandidate: [1, 100], acceptancePercent: [0.1, 100],
    repeatPercent: [0, 100], usdToEur: [0.01, 100], enrichmentPerCandidateEur: [0, 100],
    processingPerOrderEur: [0, 100000], supportPerOrderEur: [0, 100000],
    priceEur: [0.01, 10000000], vatPercent: [0, 100], feePercent: [0, 99], feeFixedEur: [0, 1000],
    refundPercent: [0, 99], targetMarginPercent: [0, 99], cacEur: [0, 1000000], supplierBudgetUsd: [0, 10000000]
  };
  const p = Object.fromEntries(Object.entries(fields).map(([key, bounds]) => [key, number(input[key], key, ...bounds)]));
  const candidates = ceilCount(p.results / (p.acceptancePercent / 100));
  // Only additional BILLABLE deliveries belong in repeatPercent, not failed HTTP requests.
  const billedRecords = ceilCount(candidates * p.recordsPerCandidate * (1 + p.repeatPercent / 100));
  const supplierUsd = billedRecords * tariff.paygPerThousand / 1000;
  const supplierEur = supplierUsd * p.usdToEur;
  const enrichmentEur = candidates * p.enrichmentPerCandidateEur;
  const deliveryEur = supplierEur + enrichmentEur + p.processingPerOrderEur + p.supportPerOrderEur;
  const paymentEur = p.priceEur * (1 + p.vatPercent / 100) * p.feePercent / 100 + p.feeFixedEur;
  const retainedRevenueEur = p.priceEur * (1 - p.refundPercent / 100);
  const contributionBeforeCacEur = retainedRevenueEur - deliveryEur - paymentEur;
  const marginPercent = contributionBeforeCacEur / retainedRevenueEur * 100;
  const denominator = (1 - p.refundPercent / 100) * (1 - p.targetMarginPercent / 100) - p.feePercent / 100 * (1 + p.vatPercent / 100);
  const targetPriceEur = denominator > 0 ? centsUp((deliveryEur + p.feeFixedEur) / denominator) : null;
  return {
    mode: 'scenario', executionAllowed: false, tariff, assumptions: p,
    candidates, billedRecords, supplierUsd, supplierEur, enrichmentEur, deliveryEur, paymentEur,
    retainedRevenueEur, contributionBeforeCacEur, contributionAfterCacEur: contributionBeforeCacEur - p.cacEur,
    marginPercent, targetPriceEur, targetMet: marginPercent + 1e-9 >= p.targetMarginPercent,
    breakEvenCacEur: Math.max(0, contributionBeforeCacEur),
    supplierBudgetFitsScenario: supplierUsd <= p.supplierBudgetUsd + 1e-9,
    warnings: [
      'Сценарий, не фактический счёт и не разрешение запуска.',
      'Курс, выход годных результатов и прочие расходы введены оператором, а не измерены системой.',
      'Бюджет сравнивается с оценкой; ограничения реального поставщика пока не подключены.',
      'При нулевой выдаче стоимость пригодного результата не определена; обещать объём нельзя.',
      'Маржа до CAC и постоянных расходов; VAT и комиссии — параметры, не налоговое заключение.'
    ]
  };
}
