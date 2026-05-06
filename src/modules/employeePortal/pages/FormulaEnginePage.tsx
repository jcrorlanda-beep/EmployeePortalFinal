import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { EmployeePortalStatusBadge } from '../components/EmployeePortalStatusBadge';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { formulaService, getFormulaServiceStatus } from '../services/formulaService';
import type { FormulaComponentType, FormulaEvaluationResult, PayrollFormula } from '../types/formulaTypes';

const componentTypeOptions: FormulaComponentType[] = ['earning', 'deduction', 'benefit', 'contribution', 'deposit'];

export function FormulaEnginePage() {
  const [formulas, setFormulas] = useState<PayrollFormula[]>([]);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [expression, setExpression] = useState('');
  const [variablesCsv, setVariablesCsv] = useState('');
  const [componentType, setComponentType] = useState<FormulaComponentType>('earning');
  const [taxable, setTaxable] = useState(false);
  const [effectiveDate, setEffectiveDate] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<FormulaEvaluationResult | null>(null);
  const [formError, setFormError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    setFormulas(await formulaService.listFormulas());
  };

  useEffect(() => {
    void formulaService.listFormulas().then((list) => {
      setFormulas(list);
      setEffectiveDate(new Date().toISOString().slice(0, 10));
      setLoadError('');
      setIsLoading(false);
    }, (error: unknown) => {
      setLoadError(error instanceof Error ? error.message : 'Unable to load formulas.');
      setIsLoading(false);
    });
  }, []);

  const resetForm = () => {
    setCode('');
    setName('');
    setExpression('');
    setVariablesCsv('');
    setComponentType('earning');
    setTaxable(false);
    setEffectiveDate(new Date().toISOString().slice(0, 10));
    setEditingId(null);
    setFormError('');
    setPreviewResult(null);
  };

  const startEdit = (formula: PayrollFormula) => {
    setCode(formula.code);
    setName(formula.name);
    setExpression(formula.expression);
    setVariablesCsv(formula.variables.join(', '));
    setComponentType(formula.componentType);
    setTaxable(formula.taxable);
    setEffectiveDate(formula.effectiveDate);
    setEditingId(formula.id);
    setFormError('');
    setPreviewResult(null);
  };

  const submitFormula = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!code.trim() || !name.trim() || !expression.trim()) {
      setFormError('Code, name, and expression are required.');
      return;
    }
    setFormError('');
    const variables = variablesCsv.split(',').map((v) => v.trim()).filter(Boolean);
    try {
      if (editingId) {
        await formulaService.updateFormula(editingId, {
          code: code.trim().toUpperCase(),
          name: name.trim(),
          expression: expression.trim(),
          variables,
          componentType,
          taxable,
          effectiveDate,
        });
      } else {
        await formulaService.createFormula(
          code.trim(),
          name.trim(),
          expression.trim(),
          variables,
          componentType,
          taxable,
          effectiveDate,
        );
      }
      await refresh();
      resetForm();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save formula.');
    }
  };

  const previewFormula = async (formula: PayrollFormula) => {
    try {
      const previewVariables = Object.fromEntries(formula.variables.map((variable) => [variable, 1]));
      const result = await formulaService.previewFormula({ formulaCode: formula.code, variables: previewVariables });
      setPreviewResult(result);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to preview formula.');
    }
  };

  return (
    <section className="crud-page">
      <div className="page-heading-row">
        <div>
          <h2>Formula Engine Foundation</h2>
          <p className="lead">Formula records store configurable expressions. Preview uses a safe parser with allowlisted variables and operators only.</p>
        </div>
        <EmployeePortalStatusBadge status="Phase 013 formula engine" />
      </div>

      {loadError && <p className="form-error">{loadError}</p>}
      {!loadError && !getFormulaServiceStatus().available && <p className="service-note">Formula backend unavailable. Live persistence is required for this module.</p>}

      <div className="crud-layout narrow">
        <form className="form-card" onSubmit={submitFormula}>
          <h3>{editingId ? 'Edit formula' : 'Add formula'}</h3>
          {formError && <p className="form-error">{formError}</p>}
          <div className="form-grid two-column">
            <label>Code *
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="BASE_PAY_CONFIGURED" required />
            </label>
            <label>Name *
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Base Pay Configured Formula" required />
            </label>
            <label className="full-width">Expression *
              <input value={expression} onChange={(e) => setExpression(e.target.value)} placeholder="configured_rate * approved_units" required />
            </label>
            <label className="full-width">Variables (comma separated)
              <input value={variablesCsv} onChange={(e) => setVariablesCsv(e.target.value)} placeholder="configured_rate, approved_units" />
            </label>
            <label>Component type
              <select value={componentType} onChange={(e) => setComponentType(e.target.value as FormulaComponentType)}>
                {componentTypeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label>Effective date
              <input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
            </label>
            <label className="inline-check full-width">
              <input type="checkbox" checked={taxable} onChange={(e) => setTaxable(e.target.checked)} /> Taxable
            </label>
          </div>
          <div className="button-row">
            <button className="primary" type="submit">{editingId ? 'Save formula' : 'Add formula'}</button>
            <button className="secondary" type="button" onClick={resetForm}>Clear</button>
          </div>
        </form>

        <div className="cards single-column">
          {isLoading ? <EmptyStateCard title="Loading formulas" message="Fetching stored formulas and metadata." /> : formulas.length ? formulas.map((formula) => (
            <article className="record-card" key={formula.id}>
              <div className="record-card-header">
                <h3>{formula.name}</h3>
                <EmployeePortalStatusBadge status={formula.active ? 'active' : 'inactive'} />
              </div>
              <p>Code: <code>{formula.code}</code> · Type: {formula.componentType} · Taxable: {formula.taxable ? 'Yes' : 'No'}</p>
              <p>Expression: <code>{formula.expression}</code></p>
              <p>Variables: {formula.variables.length ? formula.variables.join(', ') : 'None'}</p>
              <p>Effective: {formula.effectiveDate}</p>
              <div className="button-row">
                <button className="secondary" type="button" onClick={() => startEdit(formula)}>Edit</button>
                <button className="secondary" type="button" onClick={() => previewFormula(formula)}>Preview</button>
              </div>
            </article>
          )) : <EmptyStateCard title="No formulas yet" message="Add a formula record above." />}
        </div>
      </div>

      {previewResult && (
        <section className="role-admin-section">
          <div>
            <h3>Preview result — {previewResult.formulaCode}</h3>
          </div>
          <div className="filter-card">
            <p>Preview amount: {previewResult.previewAmount === null ? 'null' : previewResult.previewAmount}</p>
            {previewResult.warnings.map((w) => <p key={w} className="form-error">{w}</p>)}
            <p className="lead">Preview only. No posting, locking, or payroll finalization is performed.</p>
            <button className="secondary" type="button" onClick={() => setPreviewResult(null)}>Dismiss</button>
          </div>
        </section>
      )}
    </section>
  );
}
