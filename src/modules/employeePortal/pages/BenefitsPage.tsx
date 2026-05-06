import { benefitRules } from '../services/benefitsService';
export function BenefitsPage() { return <section><h2>Benefits Management</h2><div className="cards">{benefitRules.map((rule) => <article className="record-card" key={rule.id}><h3>{rule.name}</h3><p>Eligibility formula: {rule.eligibilityFormulaCode}</p><p>Amount formula: {rule.amountFormulaCode}</p></article>)}</div></section>; }
