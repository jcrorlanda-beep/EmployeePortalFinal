import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { EmployeePortalStatusBadge } from '../components/EmployeePortalStatusBadge';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { benefitsService, getBenefitsServiceStatus } from '../services/benefitsService';
import type { GovernmentContributionSetting } from '../types/benefitsTypes';

export function GovernmentContributionsPage() {
  const [settings, setSettings] = useState<GovernmentContributionSetting[]>([]);
  const [contributionType, setContributionType] = useState<GovernmentContributionSetting['contributionType']>('SSS');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ruleType, setRuleType] = useState<GovernmentContributionSetting['ruleType']>('Formula');
  const [formulaId, setFormulaId] = useState('');
  const [tableJson, setTableJson] = useState('');
  const [effectiveStartDate, setEffectiveStartDate] = useState('');
  const [effectiveEndDate, setEffectiveEndDate] = useState('');
  const [status, setStatus] = useState('active');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    setSettings(await benefitsService.listGovernmentSettings());
  };

  useEffect(() => {
    void benefitsService.listGovernmentSettings().then((list) => {
      setSettings(list);
      setEffectiveStartDate(new Date().toISOString().slice(0, 10));
      setLoadError('');
      setIsLoading(false);
    }, (error: unknown) => {
      setLoadError(error instanceof Error ? error.message : 'Unable to load government contribution settings.');
      setEffectiveStartDate(new Date().toISOString().slice(0, 10));
      setIsLoading(false);
    });
  }, []);

  const resetForm = () => {
    setContributionType('SSS');
    setName('');
    setDescription('');
    setRuleType('Formula');
    setFormulaId('');
    setTableJson('');
    setEffectiveStartDate(new Date().toISOString().slice(0, 10));
    setEffectiveEndDate('');
    setStatus('active');
    setEditingId(null);
    setFormError('');
  };

  const startEdit = (setting: GovernmentContributionSetting) => {
    setContributionType(setting.contributionType);
    setName(setting.name);
    setDescription(setting.description);
    setRuleType(setting.ruleType);
    setFormulaId(setting.formulaId ?? '');
    setTableJson(setting.tableJson ?? '');
    setEffectiveStartDate(setting.effectiveStartDate);
    setEffectiveEndDate(setting.effectiveEndDate ?? '');
    setStatus(setting.status);
    setEditingId(setting.id);
    setFormError('');
  };

  const submitSetting = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || !effectiveStartDate) {
      setFormError('Name and effective start date are required.');
      return;
    }
    setFormError('');
    try {
      const payload = {
        contributionType,
        name: name.trim(),
        description: description.trim(),
        ruleType,
        formulaId: formulaId.trim() || undefined,
        tableJson: tableJson.trim() || undefined,
        effectiveStartDate,
        effectiveEndDate: effectiveEndDate || undefined,
        status,
      };
      if (editingId) {
        await benefitsService.updateGovernmentSetting(editingId, payload);
      } else {
        await benefitsService.createGovernmentSetting(payload);
      }
      await refresh();
      resetForm();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save contribution setting.');
    }
  };

  const toggleActive = async (id: string) => {
    try {
      await benefitsService.deactivateGovernmentSetting(id);
      await refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to deactivate contribution setting.');
    }
  };

  return (
    <section className="crud-page">
      <div className="page-heading-row">
        <div>
          <h2>PH Government Contribution Setup</h2>
          <p className="lead">Configurable setup only — no official rates are hardcoded. Contribution settings remain formula-ready and configurable.</p>
        </div>
        <EmployeePortalStatusBadge status="Phase 015 government contributions" />
      </div>

      {loadError && <p className="form-error">{loadError}</p>}
      {!loadError && !getBenefitsServiceStatus().available && <p className="service-note">Government contributions backend unavailable. Live persistence is required for this module.</p>}

      <section className="role-admin-section">
        <div>
          <h3>Safety note</h3>
        </div>
        <div className="filter-card">
          <p>Configurable setup only — no official rates are hardcoded. Formula or table references remain configurable and preview-oriented.</p>
        </div>
      </section>

      <div className="crud-layout narrow">
        <form className="form-card" onSubmit={submitSetting}>
          <h3>{editingId ? 'Edit contribution setting' : 'Add contribution setting'}</h3>
          {formError && <p className="form-error">{formError}</p>}
          <div className="form-grid two-column">
            <label>Contribution type
              <select value={contributionType} onChange={(e) => setContributionType(e.target.value as GovernmentContributionSetting['contributionType'])}>
                {['SSS', 'PhilHealth', 'PagIBIG', 'BIR'].map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            <label>Name *
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. SSS Contribution 2026 Config" required />
            </label>
            <label>Rule type
              <select value={ruleType} onChange={(e) => setRuleType(e.target.value as GovernmentContributionSetting['ruleType'])}>
                {['Formula', 'Table', 'Bracket', 'Manual'].map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            <label>Formula ID
              <input value={formulaId} onChange={(e) => setFormulaId(e.target.value)} placeholder="CONTRIBUTION_FORMULA_CONFIGURED" />
            </label>
            <label>Effective start date *
              <input type="date" value={effectiveStartDate} onChange={(e) => setEffectiveStartDate(e.target.value)} required />
            </label>
            <label>Effective end date
              <input type="date" value={effectiveEndDate} onChange={(e) => setEffectiveEndDate(e.target.value)} />
            </label>
            <label>Status
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                {['active', 'inactive', 'draft'].map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            <label className="full-width">Description
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe this contribution setting" />
            </label>
            <label className="full-width">Table JSON
              <textarea value={tableJson} onChange={(e) => setTableJson(e.target.value)} placeholder='Optional JSON table or bracket data' />
            </label>
          </div>
          <div className="button-row">
            <button className="primary" type="submit">{editingId ? 'Save setting' : 'Add setting'}</button>
            <button className="secondary" type="button" onClick={resetForm}>Clear</button>
          </div>
        </form>

        <div className="cards single-column">
          {isLoading ? <EmptyStateCard title="Loading contribution settings" message="Fetching configurable contribution settings from the API." /> : settings.length ? settings.map((setting) => (
            <article className="record-card" key={setting.id}>
              <div className="record-card-header">
                <h3>{setting.name}</h3>
                <EmployeePortalStatusBadge status={setting.active ? 'active' : 'inactive'} />
              </div>
              <p>{setting.description || 'No description.'}</p>
              <p>{setting.contributionType} · {setting.ruleType} · Status: {setting.status}</p>
              <p>Formula ID: <code>{setting.formulaId || 'None'}</code></p>
              <p>Effective: {setting.effectiveStartDate}{setting.effectiveEndDate ? ` to ${setting.effectiveEndDate}` : ''}</p>
              <div className="button-row">
                <button className="secondary" type="button" onClick={() => startEdit(setting)}>Edit</button>
                <button className="secondary" type="button" onClick={() => toggleActive(setting.id)} disabled={!setting.active}>
                  {setting.active ? 'Deactivate' : 'Inactive'}
                </button>
              </div>
            </article>
          )) : <EmptyStateCard title="No contribution settings yet" message="Add a government contribution setting above." />}
        </div>
      </div>
    </section>
  );
}
