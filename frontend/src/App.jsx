import React, { useState, useEffect, useRef } from 'react';
import {
  Package, Users, ShoppingBag, AlertTriangle, Plus, Trash2, Edit, Eye, X,
  Terminal, Activity, RefreshCw, Zap, Trash, Layers
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function useCountUp(target, duration = 600) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target === 0) { setVal(0); return; }
    let start = 0;
    const step = Math.max(1, Math.floor(target / (duration / 16)));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(timer); }
      else setVal(start);
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return val;
}

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState({ total_products: 0, total_customers: 0, total_orders: 0, low_stock_products: 0, low_stock_details: [] });

  const [prodModal, setProdModal] = useState(false);
  const [editProd, setEditProd] = useState(null);
  const [custModal, setCustModal] = useState(false);
  const [ordModal, setOrdModal] = useState(false);
  const [viewOrder, setViewOrder] = useState(null);

  const [pf, setPf] = useState({ name: '', sku: '', price: 0, quantity: 0 });
  const [cf, setCf] = useState({ name: '', email: '', phone: '' });
  const [of, setOf] = useState({ customer_id: '', items: [{ product_id: '', quantity: 1 }] });

  const [toasts, setToasts] = useState([]);
  const [tele, setTele] = useState([{ id: 1, ts: new Date().toLocaleTimeString(), tag: 'SYS', msg: 'Core database telemetry sync online', lat: '0ms' }]);
  const [cliOpen, setCliOpen] = useState(false);
  const [cliIn, setCliIn] = useState('');
  const [cliLog, setCliLog] = useState([
    { t: 'sys', v: 'StockFlow Nexus Platform CLI [Version 2.5]' },
    { t: 'sys', v: 'Command engine ready. Type "help" for a list of directives.' }
  ]);
  const cliEnd = useRef(null);

  const cP = useCountUp(summary.total_products);
  const cC = useCountUp(summary.total_customers);
  const cO = useCountUp(summary.total_orders);
  const cL = useCountUp(summary.low_stock_products);

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { cliEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [cliLog]);

  const toast = (m, ok = true) => {
    const id = Date.now();
    setToasts(p => [...p, { id, m, ok }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 5000);
  };

  const addTele = (tag, msg, lat = '0ms') => {
    setTele(p => [{ id: Date.now() + Math.random(), ts: new Date().toLocaleTimeString(), tag, msg, lat }, ...p].slice(0, 30));
  };

  const mFetch = async (url, opts = {}) => {
    const t0 = performance.now();
    const method = opts.method || 'GET';
    try {
      const r = await fetch(url, opts);
      const lat = `${(performance.now() - t0).toFixed(1)}ms`;
      addTele(method, `${url.replace(API, '')} → ${r.status}`, lat);
      return r;
    } catch (e) {
      addTele('ERR', `${url.replace(API, '')} → FAIL`, `${(performance.now() - t0).toFixed(1)}ms`);
      throw e;
    }
  };

  const fetchAll = () => Promise.all([
    mFetch(`${API}/dashboard/summary`).then(r => r.ok ? r.json() : null).then(d => d && setSummary(d)).catch(() => {}),
    mFetch(`${API}/products`).then(r => r.ok ? r.json() : []).then(setProducts).catch(() => {}),
    mFetch(`${API}/customers`).then(r => r.ok ? r.json() : []).then(setCustomers).catch(() => {}),
    mFetch(`${API}/orders`).then(r => r.ok ? r.json() : []).then(setOrders).catch(() => {})
  ]);

  const submitProduct = async e => {
    e.preventDefault();
    try {
      const r = editProd
        ? await mFetch(`${API}/products/${editProd.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pf) })
        : await mFetch(`${API}/products`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pf) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || 'Failed');
      toast(`Product ${editProd ? 'updated' : 'created'}`);
      setProdModal(false); setEditProd(null); setPf({ name: '', sku: '', price: 0, quantity: 0 }); fetchAll();
    } catch (e) { toast(e.message, false); }
  };

  const delProduct = async id => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const r = await mFetch(`${API}/products/${id}`, { method: 'DELETE' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail); toast('Product deleted'); fetchAll();
    } catch (e) { toast(e.message, false); }
  };

  const submitCustomer = async e => {
    e.preventDefault();
    try {
      const r = await mFetch(`${API}/customers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cf) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || 'Failed');
      toast('Customer registered successfully'); setCustModal(false); setCf({ name: '', email: '', phone: '' }); fetchAll();
    } catch (e) { toast(e.message, false); }
  };

  const delCustomer = async id => {
    if (!confirm('Are you sure you want to delete this customer record?')) return;
    try {
      const r = await mFetch(`${API}/customers/${id}`, { method: 'DELETE' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail); toast('Customer record deleted'); fetchAll();
    } catch (e) { toast(e.message, false); }
  };

  const submitOrder = async e => {
    e.preventDefault();
    if (!of.customer_id || of.items.some(i => !i.product_id || i.quantity < 1)) { toast('Please populate all fields correctly', false); return; }
    try {
      const r = await mFetch(`${API}/orders`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: +of.customer_id, items: of.items.map(i => ({ product_id: +i.product_id, quantity: +i.quantity })) })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || 'Failed to place order');
      toast('Transaction committed'); setOrdModal(false); setOf({ customer_id: '', items: [{ product_id: '', quantity: 1 }] }); fetchAll();
    } catch (e) { toast(e.message, false); }
  };

  const delOrder = async id => {
    if (!confirm('Rollback transaction and restore inventory stock?')) return;
    try {
      const r = await mFetch(`${API}/orders/${id}`, { method: 'DELETE' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail); toast('Transaction rolled back, stock restored'); fetchAll();
    } catch (e) { toast(e.message, false); }
  };

  const liveTotal = of.items.reduce((s, i) => {
    const p = products.find(x => x.id === +i.product_id);
    return s + (p ? p.price * (+i.quantity || 0) : 0);
  }, 0);

  const parseCli = (str) => {
    const a = {}; let m;
    const re = /--([a-z\-]+)\s+("[^"]*"|[^\s]+)/gi;
    while ((m = re.exec(str))) a[m[1]] = m[2].replace(/^"|"$/g, '');
    return a;
  };

  const runCli = async e => {
    e.preventDefault();
    const raw = cliIn.trim(); if (!raw) return;
    setCliLog(p => [...p, { t: 'in', v: `> ${raw}` }]);
    setCliIn('');
    const cmd = raw.split(/\s+/)[0].toLowerCase();
    try {
      if (cmd === 'help') {
        setCliLog(p => [...p,
          { t: 'out', v: 'Directives:' },
          { t: 'out', v: '  products              Get active inventory list' },
          { t: 'out', v: '  customers             Get registered customer list' },
          { t: 'out', v: '  orders                Get transactional log' },
          { t: 'out', v: '  sys-info              Diagnostic overview metrics' },
          { t: 'out', v: '  add-product --name "X" --sku "Y" --price N --qty N' },
          { t: 'out', v: '  add-customer --name "X" --email "Y" --phone "Z"' },
          { t: 'out', v: '  clear                 Reset terminal display' },
        ]);
      } else if (cmd === 'clear') { setCliLog([]); }
      else if (cmd === 'sys-info') {
        setCliLog(p => [...p,
          { t: 'out', v: `[OK] Products Count: ${products.length} | Customers Count: ${customers.length} | Active Orders: ${orders.length}` },
          { t: 'out', v: `[OK] Connection: Active API Endpoint | Process Latency: ~12ms` }
        ]);
      } else if (cmd === 'products') {
        if (!products.length) setCliLog(p => [...p, { t: 'out', v: 'No database catalog records found.' }]);
        else setCliLog(p => [...p, { t: 'out', v: 'ID   SKU           PRICE      QTY   NAME' },
          ...products.map(x => ({ t: 'out', v: `${String(x.id).padEnd(4)} ${x.sku.padEnd(13)} $${parseFloat(x.price).toFixed(2).padEnd(9)} ${String(x.quantity).padEnd(5)} ${x.name}` }))]);
      } else if (cmd === 'customers') {
        if (!customers.length) setCliLog(p => [...p, { t: 'out', v: 'No directory records found.' }]);
        else setCliLog(p => [...p, ...customers.map(c => ({ t: 'out', v: `[CID-${c.id}] ${c.name} - ${c.email} (${c.phone})` }))]);
      } else if (cmd === 'orders') {
        if (!orders.length) setCliLog(p => [...p, { t: 'out', v: 'No transaction entries logged.' }]);
        else setCliLog(p => [...p, ...orders.map(o => ({ t: 'out', v: `[TXN-${o.id}] Value: $${parseFloat(o.total_amount).toFixed(2)} | Date: ${new Date(o.created_at).toLocaleDateString()}` }))]);
      } else if (cmd === 'add-product') {
        const a = parseCli(raw);
        if (!a.name || !a.sku || !a.price || !a.qty) throw new Error('Params: add-product --name "X" --sku "Y" --price N --qty N');
        const r = await mFetch(`${API}/products`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: a.name, sku: a.sku, price: +a.price, quantity: +a.qty }) });
        const d = await r.json(); if (!r.ok) throw new Error(d.detail);
        setCliLog(p => [...p, { t: 'out', v: `[OK] Success: Product "${d.name}" registered.` }]); fetchAll();
      } else if (cmd === 'add-customer') {
        const a = parseCli(raw);
        if (!a.name || !a.email || !a.phone) throw new Error('Params: add-customer --name "X" --email "Y" --phone "Z"');
        const r = await mFetch(`${API}/customers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: a.name, email: a.email, phone: a.phone }) });
        const d = await r.json(); if (!r.ok) throw new Error(d.detail);
        setCliLog(p => [...p, { t: 'out', v: `[OK] Success: Customer ID ${d.id} registered.` }]); fetchAll();
      } else {
        setCliLog(p => [...p, { t: 'err', v: `Directive "${cmd}" not recognized. Enter "help" for options.` }]);
      }
    } catch (err) { setCliLog(p => [...p, { t: 'err', v: `Execution Fault: ${err.message}` }]); }
  };

  const stockPct = q => Math.min(100, (q / 100) * 100);
  const stockClass = q => q < 5 ? 'critical' : q < 15 ? 'low' : 'healthy';

  return (
    <div className="nexus-app">
      <div className="grid-bg" />

      {/* ── LEFT SIDEBAR NAVIGATION ── */}
      <aside className="sidebar">
        <div className="brand-section">
          <div className="brand-logo-cube"><Layers size={16} /></div>
          <span className="brand-name">STOCKFLOW</span>
        </div>

        <nav style={{ flex: 1 }}>
          <ul className="nav-menu">
            {[['dashboard', Activity, 'Overview'], ['products', Package, 'Products Catalog'], ['customers', Users, 'Directory Registry'], ['orders', ShoppingBag, 'Ledger Transactions']].map(([k, Icon, label]) => (
              <li key={k} className={`nav-item ${tab === k ? 'active' : ''}`}>
                <button onClick={() => setTab(k)}>
                  <Icon size={18} />
                  <span>{label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="live-indicator"><div className="pulse-ring" /><span>LIVE TELEMETRY</span></div>
        </div>
      </aside>

      {/* ── MAIN WORKSPACE PANEL ── */}
      <main className="main-panel">

        {tab === 'dashboard' && (
          <div className="page-enter" key="dash">
            <div className="sec-header">
              <div><h1>Dashboard Summary</h1><p>Real-time system health parameters & transaction records</p></div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="nx-btn nx-btn-ghost nx-btn-sm" onClick={fetchAll}><RefreshCw size={14} /> Sync</button>
                <button className="nx-btn nx-btn-primary nx-btn-sm" onClick={() => setOrdModal(true)}><Zap size={14} /> New Order</button>
              </div>
            </div>

            {summary.low_stock_details.length > 0 && (
              <div className="alert-ticker">
                <div className="ticker-track">
                  {[...summary.low_stock_details, ...summary.low_stock_details].map((p, i) => (
                    <span key={i} className="ticker-item"><AlertTriangle size={12} /> {p.name} ({p.sku}) running low — Only {p.quantity} items left</span>
                  ))}
                </div>
              </div>
            )}

            <div className="metric-row">
              <div className="m-card"><div className="m-card-label">Catalog Products</div><div className="m-card-val">{cP}</div><div className="m-card-icon"><Package size={20} /></div></div>
              <div className="m-card"><div className="m-card-label">Active Customers</div><div className="m-card-val">{cC}</div><div className="m-card-icon"><Users size={20} /></div></div>
              <div className="m-card"><div className="m-card-label">Logged Orders</div><div className="m-card-val">{cO}</div><div className="m-card-icon"><ShoppingBag size={20} /></div></div>
              <div className="m-card"><div className="m-card-label">Low Stock Alarms</div><div className="m-card-val">{cL}</div><div className="m-card-icon"><AlertTriangle size={20} /></div></div>
            </div>

            <div className="dash-grid">
              <div className="glass-panel">
                <div className="panel-title">Recent Transactions</div>
                {orders.length === 0 ? <div className="empty-well">No logged transactions</div> : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="nx-table">
                      <thead><tr><th>Transaction ID</th><th>Client Name</th><th>Total Amount</th><th>Commit Date</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
                      <tbody>
                        {orders.slice(0, 5).map(o => (
                          <tr key={o.id}>
                            <td className="mono cyan">#TXN-{String(o.id).padStart(4, '0')}</td>
                            <td style={{ fontWeight: 600 }}>{o.customer?.name}</td>
                            <td className="mono">${parseFloat(o.total_amount).toFixed(2)}</td>
                            <td>{new Date(o.created_at).toLocaleDateString()}</td>
                            <td style={{ textAlign: 'right' }}><button className="nx-btn nx-btn-ghost nx-btn-sm" onClick={() => setViewOrder(o)}><Eye size={12} /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="glass-panel">
                <div className="panel-title">Database Telemetry Logs</div>
                <div className="tele-feed">
                  {tele.map(l => (
                    <div key={l.id} className="tele-row">
                      <span className="tele-ts">[{l.ts}]</span>
                      <span className="tele-tag">[{l.tag}]</span>
                      <span className="tele-msg">{l.msg}</span>
                      <span className="tele-lat">{l.lat}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'products' && (
          <div className="page-enter" key="prod">
            <div className="sec-header">
              <div><h1>Inventory Catalog</h1><p>Record catalog items, SKU configuration parameters, and stock</p></div>
              <button className="nx-btn nx-btn-primary" onClick={() => { setEditProd(null); setPf({ name: '', sku: '', price: 0, quantity: 0 }); setProdModal(true); }}><Plus size={14} /> Add Product</button>
            </div>
            <div className="glass-panel">
              {products.length === 0 ? <div className="empty-well"><Package size={36} /><p>No inventory records found</p></div> : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="nx-table">
                    <thead><tr><th>Product Identifier</th><th>SKU Value</th><th>Unit Price</th><th>Stock Volume</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
                    <tbody>
                      {products.map(p => (
                        <tr key={p.id}>
                          <td style={{ fontWeight: 600, color: 'var(--text-1)' }}>{p.name}</td>
                          <td><span className="tag tag-info">{p.sku}</span></td>
                          <td className="mono">${parseFloat(p.price).toFixed(2)}</td>
                          <td style={{ minWidth: 160 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <span className={`tag ${p.quantity < 5 ? 'tag-bad' : p.quantity < 15 ? 'tag-warn' : 'tag-ok'}`}>{p.quantity} Units</span>
                              <div className="stock-bar-wrap" style={{ flex: 1 }}>
                                <div className="stock-bar-track"><div className={`stock-bar-fill ${stockClass(p.quantity)}`} style={{ width: `${stockPct(p.quantity)}%` }} /></div>
                              </div>
                            </div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                              <button className="nx-btn nx-btn-ghost nx-btn-sm" onClick={() => { setEditProd(p); setPf({ name: p.name, sku: p.sku, price: p.price, quantity: p.quantity }); setProdModal(true); }}><Edit size={12} /></button>
                              <button className="nx-btn nx-btn-danger nx-btn-sm" onClick={() => delProduct(p.id)}><Trash2 size={12} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'customers' && (
          <div className="page-enter" key="cust">
            <div className="sec-header">
              <div><h1>Directory Registry</h1><p>Record business clients, directory listings, and contact info</p></div>
              <button className="nx-btn nx-btn-primary" onClick={() => setCustModal(true)}><Plus size={14} /> Register Customer</button>
            </div>
            <div className="glass-panel">
              {customers.length === 0 ? <div className="empty-well"><Users size={36} /><p>No client listings registered</p></div> : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="nx-table">
                    <thead><tr><th>Client Number</th><th>Full Name</th><th>Email Identifier</th><th>Phone String</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
                    <tbody>
                      {customers.map(c => (
                        <tr key={c.id}>
                          <td className="mono cyan">#C-{String(c.id).padStart(3, '0')}</td>
                          <td style={{ fontWeight: 600, color: 'var(--text-1)' }}>{c.name}</td>
                          <td className="mono" style={{ fontSize: '0.85rem' }}>{c.email}</td>
                          <td className="mono">{c.phone}</td>
                          <td style={{ textAlign: 'right' }}><button className="nx-btn nx-btn-danger nx-btn-sm" onClick={() => delCustomer(c.id)}><Trash2 size={12} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'orders' && (
          <div className="page-enter" key="ord">
            <div className="sec-header">
              <div><h1>Transaction Log Ledger</h1><p>Invoice parameters and database checkout rolls</p></div>
              <button className="nx-btn nx-btn-primary" onClick={() => setOrdModal(true)}><Zap size={14} /> New Order</button>
            </div>
            <div className="glass-panel">
              {orders.length === 0 ? <div className="empty-well"><ShoppingBag size={36} /><p>No active transaction ledger logs</p></div> : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="nx-table">
                    <thead><tr><th>Receipt Identifier</th><th>Client Record</th><th>Order Value</th><th>Items Volume</th><th>Transaction Date</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
                    <tbody>
                      {orders.map(o => (
                        <tr key={o.id}>
                          <td className="mono cyan">#TXN-{String(o.id).padStart(4, '0')}</td>
                          <td style={{ fontWeight: 600 }}>{o.customer?.name}</td>
                          <td className="mono green">${parseFloat(o.total_amount).toFixed(2)}</td>
                          <td className="mono">{o.items?.length} Items</td>
                          <td>{new Date(o.created_at).toLocaleString()}</td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                              <button className="nx-btn nx-btn-ghost nx-btn-sm" onClick={() => setViewOrder(o)}><Eye size={12} /></button>
                              <button className="nx-btn nx-btn-danger nx-btn-sm" onClick={() => delOrder(o.id)}><Trash size={12} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ── FLOATING DEV CONSOLE ── */}
      <section className={`cli-bar ${cliOpen ? 'open' : 'shut'}`}>
        <div className="cli-head" onClick={() => setCliOpen(!cliOpen)}>
          <div className="cli-title"><Terminal size={14} /> DEVELOPER CONSOLE</div>
          <div className="cli-meta">{cliOpen ? '[COLLAPSE]' : '[EXPAND]'}</div>
        </div>
        {cliOpen && (
          <div className="cli-body">
            {cliLog.map((l, i) => <div key={i} className={`cli-row ${l.t}`}>{l.v}</div>)}
            <div ref={cliEnd} />
            <form onSubmit={runCli} className="cli-prompt-row">
              <span className="cli-ps1">nexus $</span>
              <input className="cli-input" value={cliIn} onChange={e => setCliIn(e.target.value)} placeholder="Type help..." autoFocus />
            </form>
          </div>
        )}
      </section>

      {/* ── DIALOG OVERLAYS ── */}
      {prodModal && (
        <div className="overlay"><div className="dialog">
          <div className="dialog-head"><h3>{editProd ? 'Edit Catalog Product' : 'Add Catalog Product'}</h3><button className="btn-close" onClick={() => setProdModal(false)}><X size={18} /></button></div>
          <form onSubmit={submitProduct}>
            <div className="dialog-body">
              <div className="field"><label>Product Name</label><input value={pf.name} onChange={e => setPf({ ...pf, name: e.target.value })} required /></div>
              <div className="field"><label>SKU Value</label><input value={pf.sku} onChange={e => setPf({ ...pf, sku: e.target.value })} required /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="field"><label>Price ($)</label><input type="number" step="0.01" value={pf.price} onChange={e => setPf({ ...pf, price: +e.target.value || 0 })} required /></div>
                <div className="field"><label>Stock Volume</label><input type="number" value={pf.quantity} onChange={e => setPf({ ...pf, quantity: +e.target.value || 0 })} required /></div>
              </div>
            </div>
            <div className="dialog-foot"><button type="button" className="nx-btn nx-btn-ghost" onClick={() => setProdModal(false)}>Cancel</button><button type="submit" className="nx-btn nx-btn-primary">{editProd ? 'Save' : 'Register Product'}</button></div>
          </form>
        </div></div>
      )}

      {custModal && (
        <div className="overlay"><div className="dialog">
          <div className="dialog-head"><h3>Register New Client</h3><button className="btn-close" onClick={() => setCustModal(false)}><X size={18} /></button></div>
          <form onSubmit={submitCustomer}>
            <div className="dialog-body">
              <div className="field"><label>Full Name</label><input value={cf.name} onChange={e => setCf({ ...cf, name: e.target.value })} required /></div>
              <div className="field"><label>Email Address</label><input type="email" value={cf.email} onChange={e => setCf({ ...cf, email: e.target.value })} required /></div>
              <div className="field"><label>Phone Contact</label><input value={cf.phone} onChange={e => setCf({ ...cf, phone: e.target.value })} required /></div>
            </div>
            <div className="dialog-foot"><button type="button" className="nx-btn nx-btn-ghost" onClick={() => setCustModal(false)}>Cancel</button><button type="submit" className="nx-btn nx-btn-primary">Register Client</button></div>
          </form>
        </div></div>
      )}

      {ordModal && (
        <div className="overlay"><div className="dialog" style={{ maxWidth: 600 }}>
          <div className="dialog-head"><h3>Create Transaction</h3><button className="btn-close" onClick={() => setOrdModal(false)}><X size={18} /></button></div>
          <form onSubmit={submitOrder}>
            <div className="dialog-body">
              <div className="field"><label>Customer Identity</label>
                <select value={of.customer_id} onChange={e => setOf({ ...of, customer_id: e.target.value })} required>
                  <option value="">-- Choose Client --</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
                </select>
              </div>
              <div className="field"><label>Line Items Checkout</label>
                <div className="order-builder">
                  {of.items.map((it, i) => (
                    <div key={i} className="order-line">
                      <select value={it.product_id} onChange={e => { const n = [...of.items]; n[i].product_id = e.target.value; setOf({ ...of, items: n }); }} required>
                        <option value="">-- Choose Product --</option>
                        {products.map(p => <option key={p.id} value={p.id} disabled={p.quantity <= 0}>{p.name} (${parseFloat(p.price).toFixed(2)}) [{p.quantity} left]</option>)}
                      </select>
                      <input type="number" min="1" value={it.quantity} onChange={e => { const n = [...of.items]; n[i].quantity = +e.target.value || 1; setOf({ ...of, items: n }); }} required />
                      <button type="button" className="nx-btn nx-btn-danger nx-btn-sm" onClick={() => of.items.length > 1 && setOf({ ...of, items: of.items.filter((_, j) => j !== i) })} disabled={of.items.length === 1}><X size={12} /></button>
                    </div>
                  ))}
                  <button type="button" className="nx-btn nx-btn-ghost nx-btn-sm" onClick={() => setOf({ ...of, items: [...of.items, { product_id: '', quantity: 1 }] })} style={{ marginTop: '0.4rem' }}><Plus size={10} /> Add Item Row</button>
                </div>
              </div>
              <div className="order-total-bar"><span>ESTIMATED TRANSACTION VALUE</span><span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-1)' }}>${liveTotal.toFixed(2)}</span></div>
            </div>
            <div className="dialog-foot"><button type="button" className="nx-btn nx-btn-ghost" onClick={() => setOrdModal(false)}>Cancel</button><button type="submit" className="nx-btn nx-btn-primary">Commit Order</button></div>
          </form>
        </div></div>
      )}

      {viewOrder && (
        <div className="overlay"><div className="dialog" style={{ maxWidth: 600 }}>
          <div className="dialog-head"><h3>Receipt #TXN-{String(viewOrder.id).padStart(4, '0')}</h3><button className="btn-close" onClick={() => setViewOrder(null)}><X size={18} /></button></div>
          <div className="dialog-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <div className="m-card-label">Client Record</div>
                <div style={{ fontWeight: 700, marginTop: '0.2rem' }}>{viewOrder.customer?.name}</div>
                <div className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>{viewOrder.customer?.email}</div>
              </div>
              <div>
                <div className="m-card-label">Commit Meta</div>
                <div style={{ marginTop: '0.2rem' }}><span className="tag tag-ok">Database Committed</span></div>
                <div className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: '0.2rem' }}>{new Date(viewOrder.created_at).toLocaleString()}</div>
              </div>
            </div>
            <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
              <table className="nx-table" style={{ margin: 0 }}>
                <thead><tr><th>Line Item</th><th>SKU Value</th><th>Price at Order</th><th>Qty</th><th style={{ textAlign: 'right' }}>Subtotal</th></tr></thead>
                <tbody>
                  {viewOrder.items?.map(it => (
                    <tr key={it.id}>
                      <td style={{ fontWeight: 600 }}>{it.product?.name}</td>
                      <td><span className="tag tag-info">{it.product?.sku}</span></td>
                      <td className="mono">${parseFloat(it.price_at_order).toFixed(2)}</td>
                      <td className="mono">{it.quantity}</td>
                      <td className="mono" style={{ textAlign: 'right' }}>${(parseFloat(it.price_at_order) * it.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ textAlign: 'right', marginTop: '1.25rem' }}>
              <div className="m-card-label">Invoice Grand Total</div>
              <div className="mono cyan" style={{ fontSize: '1.8rem', fontWeight: 800 }}>${parseFloat(viewOrder.total_amount).toFixed(2)}</div>
            </div>
          </div>
          <div className="dialog-foot"><button className="nx-btn nx-btn-ghost" onClick={() => setViewOrder(null)}>Dismiss</button></div>
        </div></div>
      )}

      {/* Toasts */}
      <div className="toast-stack">
        {toasts.map(t => <div key={t.id} className={`toast-msg ${t.ok ? 'toast-ok' : 'toast-err'}`}>{t.m}</div>)}
      </div>
    </div>
  );
}
