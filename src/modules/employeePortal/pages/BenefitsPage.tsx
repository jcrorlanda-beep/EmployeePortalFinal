import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { EmployeePortalStatusBadge } from '../components/EmployeePortalStatusBadge';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { benefitsService, getBenefitsServiceStatus } from '../services/benefitsService';
import type { BenefitRule } from '../types/benefitsTypes';

export function BenefitsPage() {
  const [rules, setRules] = useState<BenefitRule[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [benefitType, setBenefitType] = useState('Allowance');
  const [eligibilityType, setEligibilityType] = useState('Formula');
  const [eligibilityCode, setEligibilityCode] = useState('');
  const [formulaId, setFormulaId] = useState('');
  const [taxableFlag, setTaxableFlag] = useState(false);
  const [effectiveStartDate, setEffectiveStartDate] = useState('');
  const [effectiveEndDate, setEffectiveEndDate] = useState('');
  const [status, setStatus] = useState('active');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    setRules(await benefitsService.listBenefits());
  };

  useEffect(() => {
    void benefitsService.listBenefits().then((list) => {
      setRules(list);
      setEffectiveStartDate(new Date().toISOString().slice(0, 10));
      setLoadError('');
      setIsLoading(false);
    }, (error: unknown) => {
      setLoadError(error instanceof Error ? error.message : 'Unable to load benefits.');
      setEffectiveStartDate(new Date().toISOString().slice(0, 10));
      setIsLoading(false);
    });
  }, []);

  const resetForm = () => {
    setName('');
    setDescription('');
    setBenefitType('Allowance');
    setEligibilityType('Formula');
    setEligibilityCode('');
    setFormulaId('');
    setTaxableFlag(false);
    setEffectiveStartDate(new Date().toISOString().slice(0, 10));
    setEffectiveEndDate('');
    setStatus('active');
    setEditingId(null);
    setFormError('');
  };

  const startEdit = (rule: BenefitRule) => {
    setName(rule.name);
    setDescription(rule.description);
    setBenefitType(rule.benefitType);
    setEligibilityType(rule.eligibilityType);
    setEligibilityCode(rule.eligibilityRuleCode);
    setFormulaId(rule.formulaId ?? '');
    setTaxableFlag(rule.taxableFlag);
    setEffectiveStartDate(rule.effectiveStartDate);
    setEffectiveEndDate(rule.effectiveEndDate ?? '');
    setStatus(rule.status);
    setEditingId(rule.id);
    setFormError('');
  };

  const submitRule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || !eligibilityCode.trim() || !effectiveStartDate) {
      setFormError('Name, eligibility rule code, and effective start date are required.');
      return;
    }
    setFormError('');
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        benefitType,
        eligibilityType,
        eligibilityRuleCode: eligibilityCode.trim(),
        formulaId: formulaId.trim() || undefined,
        taxableFlag,
        effectiveStartDate,
        effectiveEndDate: effectiveEndDate || undefined,
        status,
      };
      if (editingId) {
        await benefitsService.updateBenefit(editingId, payload);
      } else {
        await benefitsService.createBenefit(payload);
      }
      await refresh();
      resetForm();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save benefit rule.');
    }
  };

  const toggleActive = async (id: string) => {
    try {
      await benefitsService.deactivateBenefit(id);
      await refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to deactivate benefit rule.');
    }
  };

  return (
    <section className="crud-page">
      <div className="page-heading-row">
        <div>
          <h2>Benefits Management</h2>
          <p className="lead">Configure benefit rules referencing formulas and eligibility logic. Configurable setup only — no official rates are hardcoded.</p>
        </div>
        <EmployeePortalStatusBadge status="Phase 014 benefits" />
      </div>

      {loadError && <p className="form-error">{loadError}</p>}
      {!loadError && !getBenefitsServiceStatus().available && <p className="service-note">Benefits backend unavailable. Live persistence is required for this module.</p>}

      <div className="crud-layout narrow">
        <form className="form-card" onSubmit={submitRule}>
          <h3>{editingId ? 'Edit benefit rule' : 'Add benefit rule'}</h3>
          {formError && <p className="form-error">{formError}</p>}
          <div className="form-grid two-column">
            <label className="full-width">Name *
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Configured Allowance Benefit" required />
            </label>
            <label className="full-width">Description
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe this benefit rule" />
            </label>
            <label>Benefit type
              <select value={benefitType} onChange={(e) => setBenefitType(e.target.value)}>
                {['Allowance', 'Insurance', 'Wellness', 'Leave', 'Other'].map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            <label>Eligibility type
              <select value={eligibilityType} onChange={(e) => setEligibilityType(e.target.value)}>
                {['Formula', 'Manual', 'Role', 'Department', 'ServiceLength'].map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            <label>Eligibility rule code *
              <input value={eligibilityCode} onChange={(e) => setEligibilityCode(e.target.value)} placeholder="BENEFIT_ELIGIBILITY_CONFIGURED" required />
            </label>
            <label>Formula ID
              <input value={formulaId} onChange={(e) => setFormulaId(e.target.value)} placeholder="BENEFIT_AMOUNT_CONFIGURED" />
            </label>
            <label>Effective start date
              <input type="date" value={effectiveStartDate} onChange={(e) => setEffectiveStartDate(e.target.value)} />
            </label>
            <label>Effective end date
              <input type="date" value={effectiveEndDate} onChange={(e) => setEffectiveEndDate(e.target.value)} />
            </label>
            <label>Status
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                {['active', 'inactive', 'draft'].map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            <label className="inline-check">
              <input type="checkbox" checked={taxableFlag} onChange={(e) => setTaxableFlag(e.target.checked)} /> Taxable
            </label>
          </div>
          <p className="lead">Configurable setup only — no official rates are hardcoded. Formula references remain preparation-ready and preview-only.</p>
          <div className="button-row">
            <button className="primary" type="submit">{editingId ? 'Save rule' : 'Add rule'}</button>
            <button className="secondary" type="button" onClick={resetForm}>Clear</button>
          </div>
        </form>

        <div className="cards single-column">
          {isLoading ? <EmptyStateCard title="Loading benefits" message="Fetching benefit rules from the API." /> : rules.length ? rules.map((rule) => (
            <article className="record-card" key={rule.id}>
              <div className="record-card-header">
                <h3>{rule.name}</h3>
                <EmployeePortalStatusBadge status={rule.active ? 'active' : 'inactive'} />
              </div>
              <p>{rule.description || 'No description.'}</p>
              <p>{rule.benefitType} · {rule.eligibilityType} · Status: {rule.status}</p>
              <p>Eligibility rule: <code>{rule.eligibilityRuleCode}</code></p>
              <p>Formula ID: <code>{rule.formulaId || 'None'}</code></p>
              <p>Taxable: {rule.taxableFlag ? 'Yes' : 'No'}</p>
              <p>Effective: {rule.effectiveStartDate}{rule.effectiveEndDate ? ` to ${rule.effectiveEndDate}` : ''}</p>
              <div className="button-row">
                <button className="secondary" type="button" onClick={() => startEdit(rule)}>Edit</button>
                <button className="secondary" type="button" onClick={() => toggleActive(rule.id)} disabled={!rule.active}>
                  {rule.active ? 'Deactivate' : 'Inactive'}
                </button>
              </div>
            </article>
          )) : <EmptyStateCard title="No benefit rules yet" message="Add a benefit rule above." />}
        </div>
      </div>
    </section>
  );
}
