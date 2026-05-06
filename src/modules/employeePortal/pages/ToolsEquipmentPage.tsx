import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { EmployeePortalStatusBadge } from '../components/EmployeePortalStatusBadge';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { employeeService } from '../services/employeeService';
import { equipmentService, getEquipmentServiceStatus } from '../services/equipmentService';
import type { Employee } from '../types/employeeTypes';
import type { DamageStatus, EquipmentAssignment, EquipmentItem, ToolDeposit } from '../types/equipmentTypes';

const conditionOptions: EquipmentItem['condition'][] = ['new', 'good', 'fair', 'poor'];
const damageStatusOptions: DamageStatus[] = ['none', 'minor', 'major', 'lost'];

const empName = (employees: Employee[], id: string) => {
  const emp = employees.find((e) => e.id === id);
  return emp ? `${emp.firstName} ${emp.lastName}` : id;
};

export function ToolsEquipmentPage() {
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [assignments, setAssignments] = useState<EquipmentAssignment[]>([]);
  const [deposits, setDeposits] = useState<ToolDeposit[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assetTag, setAssetTag] = useState('');
  const [itemName, setItemName] = useState('');
  const [serial, setSerial] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState<EquipmentItem['condition']>('good');
  const [location, setLocation] = useState('');
  const [photoRef, setPhotoRef] = useState('');
  const [assignEmpId, setAssignEmpId] = useState('');
  const [assignItemId, setAssignItemId] = useState('');
  const [assignDepositId, setAssignDepositId] = useState('');
  const [assignCondNotes, setAssignCondNotes] = useState('');
  const [returnId, setReturnId] = useState('');
  const [returnDamage, setReturnDamage] = useState<DamageStatus>('none');
  const [returnNotes, setReturnNotes] = useState('');
  const [itemError, setItemError] = useState('');
  const [assignError, setAssignError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    const [eqList, aList, depList] = await Promise.all([
      equipmentService.listEquipment(),
      equipmentService.listAssignments(),
      equipmentService.listToolDeposits(),
    ]);
    setItems(eqList);
    setAssignments(aList);
    setDeposits(depList);
    setAssignItemId((cur) => cur || eqList.find((i) => i.status === 'available')?.id || eqList[0]?.id || '');
  };

  useEffect(() => {
    void Promise.all([
      equipmentService.listEquipment(),
      equipmentService.listAssignments(),
      equipmentService.listToolDeposits(),
      employeeService.listEmployees(),
    ]).then(([eqList, aList, depList, emps]) => {
      setItems(eqList);
      setAssignments(aList);
      setDeposits(depList);
      setEmployees(emps);
      setAssignEmpId(emps[0]?.id ?? '');
      setAssignItemId(eqList.find((i) => i.status === 'available')?.id ?? eqList[0]?.id ?? '');
      setLoadError('');
      setIsLoading(false);
    }, (error: unknown) => {
      setLoadError(error instanceof Error ? error.message : 'Unable to load equipment data.');
      setIsLoading(false);
    });
  }, []);

  const submitItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!assetTag.trim() || !itemName.trim() || !category.trim()) {
      setItemError('Asset tag, name, and category are required.');
      return;
    }
    setItemError('');
    try {
      await equipmentService.createEquipmentItem(
        assetTag.trim(),
        itemName.trim(),
        category.trim(),
        condition,
        {
          serialNumber: serial.trim() || undefined,
          brand: brand.trim() || undefined,
          model: model.trim() || undefined,
          location: location.trim() || undefined,
          photoReference: photoRef.trim() || undefined,
        },
      );
      await refresh();
      setAssetTag('');
      setItemName('');
      setSerial('');
      setBrand('');
      setModel('');
      setCategory('');
      setCondition('good');
      setLocation('');
      setPhotoRef('');
    } catch (error) {
      setItemError(error instanceof Error ? error.message : 'Unable to create equipment item.');
    }
  };

  const submitAssignment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!assignEmpId || !assignItemId) {
      setAssignError('Employee and equipment item are required.');
      return;
    }
    setAssignError('');
    try {
      await equipmentService.assignEquipment(
        assignEmpId,
        assignItemId,
        assignCondNotes.trim() || undefined,
        assignDepositId || undefined,
      );
      await refresh();
      setAssignCondNotes('');
      setAssignDepositId('');
    } catch (error) {
      setAssignError(error instanceof Error ? error.message : 'Unable to assign equipment.');
    }
  };

  const returnEquipment = async () => {
    if (!returnId) return;
    try {
      await equipmentService.returnEquipment(returnId, returnDamage, returnNotes.trim() || undefined);
      await refresh();
      setReturnId('');
      setReturnDamage('none');
      setReturnNotes('');
    } catch (error) {
      setAssignError(error instanceof Error ? error.message : 'Unable to return equipment.');
    }
  };

  return (
    <section className="crud-page">
      <div className="page-heading-row">
        <div>
          <h2>Tools & Equipment Registry</h2>
          <p className="lead">Manage equipment items, assign them to employees, track return condition, and persist photo/reference URLs through the standalone backend API.</p>
        </div>
        <EmployeePortalStatusBadge status="Phase 018+020 tools equipment" />
      </div>

      {loadError && <p className="form-error">{loadError}</p>}
      {!loadError && !getEquipmentServiceStatus().available && <p className="service-note">Equipment backend unavailable. Live persistence is required for this module.</p>}

      <div className="crud-layout narrow">
        <form className="form-card" onSubmit={submitItem}>
          <h3>Add equipment item</h3>
          {itemError && <p className="form-error">{itemError}</p>}
          <div className="form-grid two-column">
            <label>Asset tag *
              <input value={assetTag} onChange={(e) => setAssetTag(e.target.value)} placeholder="NCCC-TOOL-004" required />
            </label>
            <label>Name *
              <input value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="Torque Wrench" required />
            </label>
            <label>Category *
              <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Hand Tools" required />
            </label>
            <label>Condition
              <select value={condition} onChange={(e) => setCondition(e.target.value as EquipmentItem['condition'])}>
                {conditionOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label>Serial number
              <input value={serial} onChange={(e) => setSerial(e.target.value)} />
            </label>
            <label>Brand
              <input value={brand} onChange={(e) => setBrand(e.target.value)} />
            </label>
            <label>Model
              <input value={model} onChange={(e) => setModel(e.target.value)} />
            </label>
            <label>Location
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Workshop Bay 1" />
            </label>
            <label className="full-width">Photo reference
              <input value={photoRef} onChange={(e) => setPhotoRef(e.target.value)} placeholder="future-media-store://photo" />
            </label>
          </div>
          <div className="button-row">
            <button className="primary" type="submit">Add item</button>
          </div>
        </form>

        <div className="cards single-column">
          {isLoading ? <EmptyStateCard title="Loading equipment items" message="Fetching the live equipment registry and assignment state." /> : items.length ? items.map((item) => (
            <article className="record-card" key={item.id}>
              <div className="record-card-header">
                <h3>{item.name} — {item.assetTag}</h3>
                <EmployeePortalStatusBadge status={item.status} />
              </div>
              <p>Category: {item.category} · Condition: {item.condition}</p>
              {item.brand && <p>Brand: {item.brand} {item.model ? `· Model: ${item.model}` : ''}</p>}
              {item.location && <p>Location: {item.location}</p>}
              {item.serialNumber && <p>S/N: {item.serialNumber}</p>}
              {item.assignedEmployeeId && <p>Assigned to: {empName(employees, item.assignedEmployeeId)}</p>}
            </article>
          )) : <EmptyStateCard title="No equipment items yet" message="Add an equipment item above." />}
        </div>
      </div>

      <section className="role-admin-section">
        <div>
          <h3>Assign equipment</h3>
          <p className="lead">Assign an available equipment item to an employee, optionally linking a tool deposit.</p>
        </div>
        <form className="filter-card training-assignment-form" onSubmit={submitAssignment}>
          {assignError && <p className="form-error">{assignError}</p>}
          <label>Employee
            <select value={assignEmpId} onChange={(e) => setAssignEmpId(e.target.value)}>
              {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>)}
            </select>
          </label>
          <label>Equipment item
            <select value={assignItemId} onChange={(e) => setAssignItemId(e.target.value)}>
              {items.map((item) => <option key={item.id} value={item.id}>{item.name} — {item.assetTag} ({item.status})</option>)}
            </select>
          </label>
          <label>Link tool deposit (optional)
            <select value={assignDepositId} onChange={(e) => setAssignDepositId(e.target.value)}>
              <option value="">None</option>
              {deposits.filter((d) => d.status === 'active').map((d) => <option key={d.id} value={d.id}>{d.description} · {empName(employees, d.employeeId)}</option>)}
            </select>
          </label>
          <label>Condition notes
            <input value={assignCondNotes} onChange={(e) => setAssignCondNotes(e.target.value)} placeholder="Optional condition notes at assignment" />
          </label>
          <button className="primary align-end" type="submit">Assign equipment</button>
        </form>
      </section>

      <section className="crud-layout narrow">
        <div className="cards single-column">
          {isLoading ? <EmptyStateCard title="Loading assignments" message="Fetching live equipment assignments and returns." /> : assignments.length ? assignments.map((assignment) => {
            const item = items.find((i) => i.id === assignment.equipmentItemId);
            return (
              <article className="record-card" key={assignment.id}>
                <div className="record-card-header">
                  <h3>{empName(employees, assignment.employeeId)} — {item?.name ?? assignment.equipmentItemId}</h3>
                  <EmployeePortalStatusBadge status={assignment.damageStatus} />
                </div>
                <p>Assigned: {assignment.assignedOn}{assignment.returnedOn ? ` · Returned: ${assignment.returnedOn}` : ''}</p>
                {assignment.conditionNotes && <p>Condition notes: {assignment.conditionNotes}</p>}
                {!assignment.returnedOn && (
                  <button className="secondary" type="button" onClick={() => setReturnId(assignment.id)}>Process return</button>
                )}
              </article>
            );
          }) : <EmptyStateCard title="No equipment assignments yet" message="Assign an item above." />}
        </div>
      </section>

      {returnId && (
        <section className="role-admin-section">
          <div>
            <h3>Process equipment return</h3>
          </div>
          <div className="filter-card">
            <label>Damage status
              <select value={returnDamage} onChange={(e) => setReturnDamage(e.target.value as DamageStatus)}>
                {damageStatusOptions.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
            <label>Return notes
              <input value={returnNotes} onChange={(e) => setReturnNotes(e.target.value)} placeholder="Optional return notes" />
            </label>
            <div className="button-row">
              <button className="primary" type="button" onClick={returnEquipment}>Confirm return</button>
              <button className="secondary" type="button" onClick={() => { setReturnId(''); setReturnDamage('none'); setReturnNotes(''); }}>Cancel</button>
            </div>
          </div>
        </section>
      )}
    </section>
  );
}
