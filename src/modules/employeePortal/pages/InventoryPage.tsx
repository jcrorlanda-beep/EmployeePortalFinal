import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { EmployeePortalStatusBadge } from '../components/EmployeePortalStatusBadge';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { getInventoryServiceStatus, inventoryService } from '../services/inventoryService';
import type { InventoryItem, InventoryMovement, MovementType } from '../types/inventoryTypes';

const movementTypeOptions: MovementType[] = ['in', 'out', 'adjustment'];

export function InventoryPage() {
  const pageSize = 6;
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [sku, setSku] = useState('');
  const [itemName, setItemName] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [qty, setQty] = useState(0);
  const [reorderPoint, setReorderPoint] = useState(5);
  const [supplier, setSupplier] = useState('');
  const [movItemId, setMovItemId] = useState('');
  const [movType, setMovType] = useState<MovementType>('in');
  const [movQty, setMovQty] = useState(1);
  const [movReason, setMovReason] = useState('');
  const [query, setQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'healthy'>('all');
  const [sortBy, setSortBy] = useState<'name-asc' | 'qty-asc' | 'qty-desc'>('name-asc');
  const [page, setPage] = useState(1);
  const [itemError, setItemError] = useState('');
  const [movError, setMovError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingItem, setIsSubmittingItem] = useState(false);
  const [isSubmittingMovement, setIsSubmittingMovement] = useState(false);

  const refresh = async () => {
    const [iList, mList] = await Promise.all([inventoryService.listItems(), inventoryService.listMovements()]);
    setItems(iList);
    setMovements(mList);
    setMovItemId((cur) => cur || iList[0]?.id || '');
  };

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = items.filter((item) => {
      const matchesQuery = !normalizedQuery || `${item.sku} ${item.name} ${item.supplier ?? ''}`.toLowerCase().includes(normalizedQuery);
      const isLow = item.quantityOnHand <= item.reorderPoint;
      const matchesStock = stockFilter === 'all' || (stockFilter === 'low' ? isLow : !isLow);
      return matchesQuery && matchesStock;
    });
    return [...filtered].sort((left, right) => {
      if (sortBy === 'qty-asc') return left.quantityOnHand - right.quantityOnHand;
      if (sortBy === 'qty-desc') return right.quantityOnHand - left.quantityOnHand;
      return left.name.localeCompare(right.name);
    });
  }, [items, query, sortBy, stockFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const pagedItems = useMemo(
    () => filteredItems.slice((page - 1) * pageSize, page * pageSize),
    [filteredItems, page, pageSize],
  );

  useEffect(() => {
    void Promise.all([inventoryService.listItems(), inventoryService.listMovements()]).then(([iList, mList]) => {
      setItems(iList);
      setMovements(mList);
      setMovItemId(iList[0]?.id ?? '');
      setLoadError('');
      setIsLoading(false);
    }, (error: unknown) => {
      setLoadError(error instanceof Error ? error.message : 'Unable to load inventory.');
      setIsLoading(false);
    });
  }, []);

  const submitItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmittingItem) return;
    if (!sku.trim() || !itemName.trim() || !unit.trim()) {
      setItemError('SKU, name, and unit are required.');
      return;
    }
    setItemError('');
    setIsSubmittingItem(true);
    try {
      await inventoryService.createItem(sku.trim(), itemName.trim(), unit.trim(), qty, reorderPoint, {
        supplier: supplier.trim() || undefined,
      });
      await refresh();
      setSku('');
      setItemName('');
      setUnit('pcs');
      setQty(0);
      setReorderPoint(5);
      setSupplier('');
    } catch (error) {
      setItemError(error instanceof Error ? error.message : 'Unable to create inventory item.');
    } finally {
      setIsSubmittingItem(false);
    }
  };

  const submitMovement = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmittingMovement) return;
    if (!movItemId || movQty <= 0 || !movReason.trim()) {
      setMovError('Item, quantity > 0, and reason are required.');
      return;
    }
    setMovError('');
    setIsSubmittingMovement(true);
    try {
      await inventoryService.recordMovement(movItemId, movType, movQty, movReason.trim());
      await refresh();
      setMovQty(1);
      setMovReason('');
    } catch (error) {
      setMovError(error instanceof Error ? error.message : 'Unable to record inventory movement.');
    } finally {
      setIsSubmittingMovement(false);
    }
  };

  return (
    <section className="crud-page">
      <div className="page-heading-row">
        <div>
          <h2>Inventory System</h2>
          <p className="lead">Manage inventory items, track quantities, and log stock movements through live backend persistence. Items below reorder point are flagged for follow-up.</p>
        </div>
        <EmployeePortalStatusBadge status="Phase 019 inventory" />
      </div>

      {loadError && <p className="form-error">{loadError}</p>}
      {!loadError && !getInventoryServiceStatus().available && <p className="service-note">Inventory backend unavailable. Live persistence is required for this module.</p>}

      <div className="crud-layout narrow">
        <form className="form-card" onSubmit={submitItem}>
          <h3>Add inventory item</h3>
          {itemError && <p className="form-error">{itemError}</p>}
          <div className="form-grid two-column">
            <label>SKU *
              <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="OIL-FILTER-GEN" required />
            </label>
            <label>Name *
              <input value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="General Oil Filter" required />
            </label>
            <label>Unit *
              <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="pcs" required />
            </label>
            <label>Initial quantity
              <input type="number" min="0" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
            </label>
            <label>Reorder point
              <input type="number" min="0" value={reorderPoint} onChange={(e) => setReorderPoint(Number(e.target.value))} />
            </label>
            <label>Supplier
              <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Parts Supplier A" />
            </label>
          </div>
          <div className="button-row">
            <button className="primary" disabled={isSubmittingItem} type="submit">{isSubmittingItem ? 'Saving…' : 'Add item'}</button>
          </div>
        </form>

        <div className="cards single-column">
          <div className="filter-card training-filter-card">
            <label>Search<input value={query} onChange={(e) => { setPage(1); setQuery(e.target.value); }} placeholder="Search SKU, item, or supplier" /></label>
            <label>Stock state<select value={stockFilter} onChange={(e) => { setPage(1); setStockFilter(e.target.value as typeof stockFilter); }}><option value="all">All stock states</option><option value="low">Low stock</option><option value="healthy">Healthy stock</option></select></label>
            <label>Sort by<select value={sortBy} onChange={(e) => { setPage(1); setSortBy(e.target.value as typeof sortBy); }}><option value="name-asc">Name A-Z</option><option value="qty-asc">Lowest quantity</option><option value="qty-desc">Highest quantity</option></select></label>
          </div>
          {isLoading ? <EmptyStateCard title="Loading inventory items" message="Fetching the live inventory catalog and stock levels." /> : pagedItems.length ? pagedItems.map((item) => (
            <article className="record-card" key={item.id}>
              <div className="record-card-header">
                <h3>{item.name}</h3>
                {item.quantityOnHand <= item.reorderPoint
                  ? <EmployeePortalStatusBadge status="reorder-needed" />
                  : <EmployeePortalStatusBadge status="in-stock" />}
              </div>
              <p>SKU: {item.sku} · Unit: {item.unit}</p>
              <p>On hand: {item.quantityOnHand} · Reorder point: {item.reorderPoint}</p>
              {item.supplier && <p>Supplier: {item.supplier}</p>}
              <p>Movements: {movements.filter((m) => m.inventoryItemId === item.id).length}</p>
            </article>
          )) : <EmptyStateCard title="No inventory items yet" message="Add an inventory item above." />}
          <div className="button-row table-pagination-row">
            <button className="secondary" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} type="button">Previous</button>
            <span>Page {page} of {totalPages} · {filteredItems.length} matching items</span>
            <button className="secondary" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} type="button">Next</button>
          </div>
        </div>
      </div>

      <section className="role-admin-section">
        <div>
          <h3>Record stock movement</h3>
          <p className="lead">Log in, out, or adjustment movements. Quantity on hand is updated automatically.</p>
        </div>
        <form className="filter-card training-assignment-form" onSubmit={submitMovement}>
          {movError && <p className="form-error">{movError}</p>}
          <label>Item
            <select value={movItemId} onChange={(e) => setMovItemId(e.target.value)}>
              {items.map((item) => <option key={item.id} value={item.id}>{item.name} (on hand: {item.quantityOnHand})</option>)}
            </select>
          </label>
          <label>Movement type
            <select value={movType} onChange={(e) => setMovType(e.target.value as MovementType)}>
              {movementTypeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label>Quantity
            <input type="number" min="1" value={movQty} onChange={(e) => setMovQty(Number(e.target.value))} />
          </label>
          <label>Reason *
            <input value={movReason} onChange={(e) => setMovReason(e.target.value)} placeholder="Service usage, restock, etc." required />
          </label>
          <button className="primary align-end" disabled={isSubmittingMovement} type="submit">{isSubmittingMovement ? 'Saving…' : 'Record movement'}</button>
        </form>
      </section>

      <section className="crud-layout narrow">
        <div className="cards single-column">
          {isLoading ? <EmptyStateCard title="Loading stock movements" message="Fetching live stock movement history." /> : movements.length ? movements.map((movement) => {
            const item = items.find((i) => i.id === movement.inventoryItemId);
            return (
              <article className="record-card" key={movement.id}>
                <div className="record-card-header">
                  <h3>{item?.name ?? movement.inventoryItemId}</h3>
                  <EmployeePortalStatusBadge status={movement.movementType} />
                </div>
                <p>Qty: {movement.quantity} · Reason: {movement.reason}</p>
                <p>{new Date(movement.createdAt).toLocaleString()}</p>
              </article>
            );
          }) : <EmptyStateCard title="No movements logged yet" message="Record a stock movement above." />}
        </div>
      </section>
    </section>
  );
}
