import test from 'node:test';
import assert from 'node:assert/strict';
import {quoteProspecting,monthlyProcurement} from '../server/economics.mjs';
const base={results:1000,recordsPerCandidate:1,acceptancePercent:100,repeatPercent:0,usdToEur:1,enrichmentPerCandidateEur:0,processingPerOrderEur:0,supportPerOrderEur:0,priceEur:49,vatPercent:0,feePercent:0,feeFixedEur:0,refundPercent:0,targetMarginPercent:70,cacEur:0,supplierBudgetUsd:5};
test('published tariffs ignore discounts/free credits and do not double count Scale',()=>{
 assert.equal(quoteProspecting(base).supplierUsd,1.5);
 assert.deepEqual(monthlyProcurement(384000),{records:384000,paygUsd:576,scaleUsd:499});
 assert.equal(monthlyProcurement(1000000).scaleUsd,1299.8);
 assert.equal(monthlyProcurement(0).scaleUsd,499);
});
test('yield loss, multiple sources and billable repeats affect cost before enrichment',()=>{
 const q=quoteProspecting({...base,acceptancePercent:50,recordsPerCandidate:3,repeatPercent:10,enrichmentPerCandidateEur:0.01});
 assert.equal(q.candidates,2000);assert.equal(q.billedRecords,6600);assert.equal(q.supplierUsd,9.9);assert.equal(q.enrichmentEur,20);assert.equal(q.supplierBudgetFitsScenario,false);
});
test('refunds retain delivery/payment costs and VAT affects fees, not net revenue',()=>{
 const q=quoteProspecting({...base,priceEur:100,vatPercent:20,feePercent:2,feeFixedEur:0.3,refundPercent:10});
 assert.equal(q.retainedRevenueEur,90);assert.ok(Math.abs(q.paymentEur-2.7)<1e-9);assert.ok(Math.abs(q.contributionBeforeCacEur-85.8)<1e-9);
});
test('rounded target price meets target; CAC remains separate and FX is explicit',()=>{
 const input={...base,acceptancePercent:80,repeatPercent:10,usdToEur:0.93,feePercent:2,feeFixedEur:0.3,refundPercent:3,processingPerOrderEur:1,supportPerOrderEur:2,cacEur:10};
 const q=quoteProspecting(input);const priced=quoteProspecting({...input,priceEur:q.targetPriceEur});
 assert.equal(priced.targetMet,true);assert.ok(priced.marginPercent>=70);assert.ok(Math.abs(q.supplierEur-q.supplierUsd*0.93)<1e-9);
 assert.equal(q.contributionAfterCacEur,q.contributionBeforeCacEur-10);
});
test('no scenario can authorize spending; impossible target has no invented price',()=>{
 assert.equal(quoteProspecting({...base,supplierBudgetUsd:10000}).executionAllowed,false);
 assert.equal(quoteProspecting({...base,feePercent:40,targetMarginPercent:70}).targetPriceEur,null);
});
test('missing, coercible, nonfinite, negative and zero-yield inputs fail closed',()=>{
 for(const value of [null,[],{}, {...base,usdToEur:undefined},{...base,results:'1000'},{...base,results:1.5},{...base,acceptancePercent:0},{...base,cacEur:NaN},{...base,feeFixedEur:-1},{...base,usdToEur:Infinity}])assert.throws(()=>quoteProspecting(value),{status:400});
});
