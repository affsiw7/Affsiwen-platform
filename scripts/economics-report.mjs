import {writeFile} from 'node:fs/promises';
import {quoteProspecting,monthlyProcurement} from '../server/economics.mjs';
const assumptions={results:1000,recordsPerCandidate:1,acceptancePercent:80,repeatPercent:10,usdToEur:1,enrichmentPerCandidateEur:0,processingPerOrderEur:1,supportPerOrderEur:2,priceEur:49,vatPercent:0,feePercent:2,feeFixedEur:0.3,refundPercent:3,targetMarginPercent:70,cacEur:10,supplierBudgetUsd:5};
const scenarios=[
 ['Basic illustrative case',{}],
 ['50 percent yield, three source records, EUR 0.01 enrichment per candidate',{acceptancePercent:50,recordsPerCandidate:3,enrichmentPerCandidateEur:0.01}],
 ['Previously proposed 10K package',{results:10000,priceEur:49}],
 ['Previously proposed 50K package',{results:50000,priceEur:149}],
 ['Previously proposed 200K package',{results:200000,priceEur:399}]
].map(([label,changes])=>({label,...quoteProspecting({...assumptions,...changes})}));
const report={recordedAt:new Date().toISOString(),status:'SCENARIOS_NOT_MEASUREMENTS',notes:['FX of 1 EUR/USD is a sensitivity assumption, not a current exchange rate.','One source record per candidate is unverified for the chosen workflow.','Fees, refunds, CAC, yield and operating costs are assumptions. No spend was made.'],scenarios,monthly:[100000,332666,332667,384000,1000000].map(monthlyProcurement)};
await writeFile(new URL('../docs/evidence/prospecting-scenarios.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
for(const q of scenarios)console.log(`${q.label}: procurement $${q.supplierUsd.toFixed(2)}; before CAC EUR ${q.contributionBeforeCacEur.toFixed(2)}; after CAC EUR ${q.contributionAfterCacEur.toFixed(2)}; target price EUR ${q.targetPriceEur}`);
