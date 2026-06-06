import React, { useState, useEffect, useRef } from 'react';
import { 
  Package, 
  Users, 
  ShoppingBag, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Edit, 
  Eye, 
  X, 
  Menu,
  Terminal,
  Activity,
  Cpu,
  RefreshCw,
  Trash
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Data States
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [dashboardSummary, setDashboardSummary] = useState({
    total_products: 0,
    total_customers: 0,
    total_orders: 0,
    low_stock_products: 0,
    low_stock_details: []
  });

  // Modal States
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  // Form States
  const [productForm, setProductForm] = useState({ name: '', sku: '', price: 0, quantity: 0 });
  const [customerForm, setCustomerForm] = useState({ name: '', email: '', phone: '' });
  const [orderForm, setOrderForm] = useState({ customer_id: '', items: [{ product_id: '', quantity: 1 }] });

  // Notifications State
  const [toasts, setToasts] = useState([]);

  // --- CLI TERMINAL CONSOLE STATES ---
  const [isTerminalExpanded, setIsTerminalExpanded] = useState(false);
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalLogs, setTerminalLogs] = useState([
    { type: 'system', text: '[SYSTEM] StockFlow Developer Console v1.0.0 initialized.' },
    { type: 'system', text: 'Type "help" to view available terminal commands.' }
  ]);
  const terminalEndRef = useRef(null);

  // --- TELEMETRY / AUDIT STATES ---
  const [telemetryLogs, setTelemetryLogs] = useState([
    { id: 1, timestamp: new Date().toLocaleTimeString(), tag: 'SYS', message: 'Engine system online', latency: '0.00ms' }
  ]);

  // Fetch Data on Load
  useEffect(() => {
    fetchAllData();
  }, []);

  // Scroll terminal to bottom
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLogs]);

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const addTelemetryLog = (tag, message, latency = '0.00ms') => {
    const log = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toLocaleTimeString(),
      tag,
      message,
      latency
    };
    setTelemetryLogs(prev => [log, ...prev].slice(0, 50)); // Keep last 50
  };

  // Measured API requests wrapping
  const measuredFetch = async (url, options = {}) => {
    const start = performance.now();
    const method = options.method || 'GET';
    const cleanUrl = url.replace(API_URL, '');
    
    try {
      const res = await fetch(url, options);
      const end = performance.now();
      const latency = `${(end - start).toFixed(2)}ms`;
      addTelemetryLog(method, `${cleanUrl} -> Status ${res.status}`, latency);
      return res;
    } catch (err) {
      const end = performance.now();
      const latency = `${(end - start).toFixed(2)}ms`;
      addTelemetryLog(method, `${cleanUrl} -> CRITICAL EXCEPTION`, latency);
      throw err;
    }
  };

  const fetchAllData = async () => {
    await Promise.all([
      fetchDashboard(),
      fetchProducts(),
      fetchCustomers(),
      fetchOrders()
    ]);
  };

  const fetchDashboard = async () => {
    try {
      const res = await measuredFetch(`${API_URL}/dashboard/summary`);
      if (!res.ok) throw new Error('Failed to fetch dashboard telemetry');
      const data = await res.json();
      setDashboardSummary(data);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await measuredFetch(`${API_URL}/products`);
      if (!res.ok) throw new Error('Failed to fetch product catalog');
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await measuredFetch(`${API_URL}/customers`);
      if (!res.ok) throw new Error('Failed to fetch customer directory');
      const data = await res.json();
      setCustomers(data);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await measuredFetch(`${API_URL}/orders`);
      if (!res.ok) throw new Error('Failed to fetch transaction logs');
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Product CRUD Operations
  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if (productForm.price < 0 || productForm.quantity < 0) {
      showToast('Price and quantity must be non-negative', 'error');
      return;
    }
    try {
      let res;
      if (editingProduct) {
        res = await measuredFetch(`${API_URL}/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productForm)
        });
      } else {
        res = await measuredFetch(`${API_URL}/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productForm)
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Transaction failed');

      showToast(`Product ${editingProduct ? 'updated' : 'inserted'}!`);
      setProductModalOpen(false);
      setEditingProduct(null);
      setProductForm({ name: '', sku: '', price: 0, quantity: 0 });
      fetchAllData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      sku: product.sku,
      price: product.price,
      quantity: product.quantity
    });
    setProductModalOpen(true);
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Erase this product record?')) return;
    try {
      const res = await measuredFetch(`${API_URL}/products/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Deletion failed');
      
      showToast('Record erased');
      fetchAllData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Customer CRUD Operations
  const handleCustomerSubmit = async (e) => {
    e.preventDefault();
    const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
    if (!emailRegex.test(customerForm.email)) {
      showToast('Invalid email formatting', 'error');
      return;
    }
    try {
      const res = await measuredFetch(`${API_URL}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Customer registration failed');

      showToast('Customer registered!');
      setCustomerModalOpen(false);
      setCustomerForm({ name: '', email: '', phone: '' });
      fetchAllData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteCustomer = async (id) => {
    if (!window.confirm('Delete customer account?')) return;
    try {
      const res = await measuredFetch(`${API_URL}/customers/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Deletion failed');

      showToast('Customer deleted');
      fetchAllData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Order Operations
  const handleAddOrderItem = () => {
    setOrderForm(prev => ({
      ...prev,
      items: [...prev.items, { product_id: '', quantity: 1 }]
    }));
  };

  const handleRemoveOrderItem = (index) => {
    if (orderForm.items.length === 1) return;
    setOrderForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleOrderItemChange = (index, field, value) => {
    const newItems = [...orderForm.items];
    newItems[index][field] = value;
    setOrderForm(prev => ({ ...prev, items: newItems }));
  };

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    if (!orderForm.customer_id) {
      showToast('No customer selected', 'error');
      return;
    }
    const invalid = orderForm.items.some(item => !item.product_id || item.quantity <= 0);
    if (invalid) {
      showToast('Check items selection/quantity', 'error');
      return;
    }

    try {
      const payload = {
        customer_id: parseInt(orderForm.customer_id),
        items: orderForm.items.map(item => ({
          product_id: parseInt(item.product_id),
          quantity: parseInt(item.quantity)
        }))
      };

      const res = await measuredFetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Checkout transaction aborted');

      showToast('Checkout transaction committed!');
      setOrderModalOpen(false);
      setOrderForm({ customer_id: '', items: [{ product_id: '', quantity: 1 }] });
      fetchAllData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteOrder = async (id) => {
    if (!window.confirm('Rollback transaction? Ordered stock will be returned to inventory.')) return;
    try {
      const res = await measuredFetch(`${API_URL}/orders/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Rollback failed');

      showToast('Transaction cancelled & inventory restored');
      fetchAllData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Live total helper
  const getLiveOrderTotal = () => {
    return orderForm.items.reduce((sum, item) => {
      const prod = products.find(p => p.id === parseInt(item.product_id));
      if (!prod) return sum;
      return sum + (prod.price * (parseInt(item.quantity) || 0));
    }, 0);
  };

  // --- TERMINAL COMMAND INTERPRETER ENGINE ---
  const parseCLIArgs = (cmdStr) => {
    const args = {};
    const regex = /--([a-zA-Z0-9\-]+)\s+("[^"]*"|[^\s]+)/g;
    let match;
    while ((match = regex.exec(cmdStr)) !== null) {
      let val = match[2];
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      }
      args[match[1]] = val;
    }
    return args;
  };

  const handleTerminalSubmit = async (e) => {
    e.preventDefault();
    const input = terminalInput.trim();
    if (!input) return;

    setTerminalLogs(prev => [...prev, { type: 'input', text: `> ${input}` }]);
    setTerminalInput('');

    const tokens = input.split(/\s+/);
    const command = tokens[0].toLowerCase();

    try {
      if (command === 'help') {
        setTerminalLogs(prev => [
          ...prev,
          { type: 'output', text: 'Available Command-line Interfaces:' },
          { type: 'output', text: '  clear                         - Clear CLI outputs' },
          { type: 'output', text: '  products                      - View catalog lists' },
          { type: 'output', text: '  customers                     - List directory names' },
          { type: 'output', text: '  orders                        - View active transactions' },
          { type: 'output', text: '  sys-info                      - Print CPU/DB connection stats' },
          { type: 'output', text: '  add-product --name "X" --sku "Y" --price 10 --qty 50' },
          { type: 'output', text: '  add-customer --name "X" --email "Y" --phone "Z"' }
        ]);
      } 
      else if (command === 'clear') {
        setTerminalLogs([]);
      } 
      else if (command === 'sys-info') {
        setTerminalLogs(prev => [
          ...prev,
          { type: 'output', text: `[STATUS] Engine Telemetry Core Online` },
          { type: 'output', text: `[STATUS] Database: PostgreSQL 15 - Connected` },
          { type: 'output', text: `[STATUS] Total Products: ${products.length}` },
          { type: 'output', text: `[STATUS] Total Customers: ${customers.length}` },
          { type: 'output', text: `[STATUS] Total Orders: ${orders.length}` },
          { type: 'output', text: `[STATUS] Active sessions: 1 (Developer console)` }
        ]);
      } 
      else if (command === 'products') {
        const res = await fetch(`${API_URL}/products`);
        const data = await res.json();
        if (data.length === 0) {
          setTerminalLogs(prev => [...prev, { type: 'output', text: 'Catalog is empty.' }]);
        } else {
          setTerminalLogs(prev => [
            ...prev,
            { type: 'output', text: 'ID\tSKU\t\tPRICE\tQTY\tNAME' },
            ...data.map(p => ({ type: 'output', text: `${p.id}\t${p.sku.padEnd(12)}\t$${parseFloat(p.price).toFixed(2)}\t${p.quantity}\t${p.name}` }))
          ]);
        }
      } 
      else if (command === 'customers') {
        const res = await fetch(`${API_URL}/customers`);
        const data = await res.json();
        if (data.length === 0) {
          setTerminalLogs(prev => [...prev, { type: 'output', text: 'No registered customers.' }]);
        } else {
          setTerminalLogs(prev => [
            ...prev,
            { type: 'output', text: 'ID\tEMAIL\t\t\tNAME' },
            ...data.map(c => ({ type: 'output', text: `${c.id}\t${c.email.padEnd(20)}\t${c.name}` }))
          ]);
        }
      } 
      else if (command === 'orders') {
        const res = await fetch(`${API_URL}/orders`);
        const data = await res.json();
        if (data.length === 0) {
          setTerminalLogs(prev => [...prev, { type: 'output', text: 'No order ledger logs.' }]);
        } else {
          setTerminalLogs(prev => [
            ...prev,
            { type: 'output', text: 'ID\tTOTAL\tITEMS\tDATE' },
            ...data.map(o => ({ type: 'output', text: `${o.id}\t$${parseFloat(o.total_amount).toFixed(2)}\t${o.items?.length}\t${new Date(o.created_at).toLocaleDateString()}` }))
          ]);
        }
      } 
      else if (command === 'add-product') {
        const args = parseCLIArgs(input);
        if (!args.name || !args.sku || !args.price || !args.qty) {
          throw new Error('Missing arguments! Format: add-product --name "Product Name" --sku "SKU-CODE" --price 19.99 --qty 100');
        }
        
        const price = parseFloat(args.price);
        const quantity = parseInt(args.qty);
        if (isNaN(price) || price < 0 || isNaN(quantity) || quantity < 0) {
          throw new Error('Price and quantity must be non-negative numbers.');
        }

        const res = await measuredFetch(`${API_URL}/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: args.name, sku: args.sku, price, quantity })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'API insertion rejected');

        setTerminalLogs(prev => [...prev, { type: 'output', text: `[SUCCESS] Product '${data.name}' created with SKU ${data.sku}` }]);
        fetchAllData();
      } 
      else if (command === 'add-customer') {
        const args = parseCLIArgs(input);
        if (!args.name || !args.email || !args.phone) {
          throw new Error('Missing arguments! Format: add-customer --name "Alice" --email "alice@email.com" --phone "123"');
        }

        const res = await measuredFetch(`${API_URL}/customers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: args.name, email: args.email, phone: args.phone })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'API insertion rejected');

        setTerminalLogs(prev => [...prev, { type: 'output', text: `[SUCCESS] Customer registered with ID #${data.id}` }]);
        fetchAllData();
      } 
      else {
        setTerminalLogs(prev => [...prev, { type: 'error', text: `CLI: Command not recognized: "${command}". Type "help" for instructions.` }]);
      }
    } catch (err) {
      setTerminalLogs(prev => [...prev, { type: 'error', text: `CLI ERROR: ${err.message}` }]);
    }
  };

  return (
    <div className="app-container">
      {/* Visual CRT Scanline filter */}
      <div className="scanlines"></div>
      
      {/* Glow backgrounds */}
      <div className="bg-glow"></div>
      <div className="bg-glow-2"></div>

      {/* Mobile Top Header */}
      <header className="mobile-header">
        <div className="brand" style={{ marginBottom: 0 }}>
          <span>📦</span>
          <span>StockFlow<span className="brand-dot">_</span></span>
        </div>
        <button className="btn-close" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          <Menu size={20} />
        </button>
      </header>

      {/* Sidebar Command Console Navigation */}
      <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="brand">
          <span>📦</span>
          <span>StockFlow<span className="brand-dot">_</span></span>
        </div>
        <nav>
          <ul className="nav-links">
            <li className={`nav-item ${currentTab === 'dashboard' ? 'active' : ''}`}>
              <button onClick={() => { setCurrentTab('dashboard'); setMobileMenuOpen(false); }}>
                <Activity size={16} />
                Overview Summary
              </button>
            </li>
            <li className={`nav-item ${currentTab === 'products' ? 'active' : ''}`}>
              <button onClick={() => { setCurrentTab('products'); setMobileMenuOpen(false); }}>
                <Package size={16} />
                Product Catalog
              </button>
            </li>
            <li className={`nav-item ${currentTab === 'customers' ? 'active' : ''}`}>
              <button onClick={() => { setCurrentTab('customers'); setMobileMenuOpen(false); }}>
                <Users size={16} />
                Customer Directory
              </button>
            </li>
            <li className={`nav-item ${currentTab === 'orders' ? 'active' : ''}`}>
              <button onClick={() => { setCurrentTab('orders'); setMobileMenuOpen(false); }}>
                <ShoppingBag size={16} />
                Orders Ledger
              </button>
            </li>
          </ul>
        </nav>

        {/* Diagnostic Mini panel */}
        <div style={{ marginTop: '2rem', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '4px', background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--color-cyan)' }}>
            <Cpu size={12} />
            <span>CORE STATUS: OK</span>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            <span>DB CONNECTED | SSL</span>
          </div>
        </div>

        <div className="sidebar-footer">
          <p>ENGINE V1.0.0</p>
          <p>© 2026 ANTIGRAVITY</p>
        </div>
      </aside>

      {/* Main View Port */}
      <main className="main-content">
        
        {currentTab === 'dashboard' && (
          <div>
            <div className="page-header">
              <div className="page-title">
                <h1>System Overview Dashboard</h1>
                <p>Command telemetry and database synchronization monitoring.</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary" onClick={fetchAllData}>
                  <RefreshCw size={12} /> Sync
                </button>
                <button className="btn btn-primary" onClick={() => setOrderModalOpen(true)}>
                  <Plus size={12} /> Create Order
                </button>
              </div>
            </div>

            {/* Metrics cards grid */}
            <div className="metrics-grid">
              <div className="glass-card metric-card metric-products">
                <div className="metric-info">
                  <h3>Total Products</h3>
                  <div className="value">{dashboardSummary.total_products}</div>
                </div>
                <div className="metric-icon">
                  <Package size={20} />
                </div>
              </div>
              <div className="glass-card metric-card metric-customers">
                <div className="metric-info">
                  <h3>Customers</h3>
                  <div className="value">{dashboardSummary.total_customers}</div>
                </div>
                <div className="metric-icon">
                  <Users size={20} />
                </div>
              </div>
              <div className="glass-card metric-card metric-orders">
                <div className="metric-info">
                  <h3>Orders Placed</h3>
                  <div className="value">{dashboardSummary.total_orders}</div>
                </div>
                <div className="metric-icon">
                  <ShoppingBag size={20} />
                </div>
              </div>
              <div className="glass-card metric-card metric-lowstock">
                <div className="metric-info">
                  <h3>Low Stock Alert</h3>
                  <div className="value">{dashboardSummary.low_stock_products}</div>
                </div>
                <div className="metric-icon">
                  <AlertTriangle size={20} />
                </div>
              </div>
            </div>

            {/* Live Audit Log and Recent orders dashboard details */}
            <div className="dashboard-details">
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="section-header" style={{ marginBottom: '1rem' }}>
                  <h2>Recent Database Transactions</h2>
                </div>
                {orders.length === 0 ? (
                  <div className="empty-state">No active orders registered in DB ledger.</div>
                ) : (
                  <div className="table-container">
                    <table className="table-glass">
                      <thead>
                        <tr>
                          <th>Txn ID</th>
                          <th>Customer</th>
                          <th>Total Amount</th>
                          <th>Timestamp</th>
                          <th className="text-right">Ledger</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.slice(0, 5).map(o => (
                          <tr key={o.id}>
                            <td className="mono-cell">#{o.id}</td>
                            <td>{o.customer?.name}</td>
                            <td className="mono-cell">${parseFloat(o.total_amount).toFixed(2)}</td>
                            <td>{new Date(o.created_at).toLocaleDateString()}</td>
                            <td className="text-right">
                              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedOrder(o)}>
                                <Eye size={12} /> View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="section-header">
                  <h2>System Telemetry Feed</h2>
                </div>
                <div className="telemetry-feed">
                  {telemetryLogs.map(log => (
                    <div key={log.id} className="telemetry-row">
                      <span className="telemetry-time">[{log.timestamp}]</span>
                      <span className="telemetry-tag">[{log.tag}]</span>
                      <span className="telemetry-msg">{log.message}</span>
                      <span className="telemetry-latency">{log.latency}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {currentTab === 'products' && (
          <div>
            <div className="page-header">
              <div className="page-title">
                <h1>Product Catalog Database</h1>
                <p>Register catalog details, monitor prices, and inventory stock indices.</p>
              </div>
              <button className="btn btn-primary" onClick={() => {
                setEditingProduct(null);
                setProductForm({ name: '', sku: '', price: 0, quantity: 0 });
                setProductModalOpen(true);
              }}>
                <Plus size={12} /> Add Product record
              </button>
            </div>

            <div className="glass-card">
              {products.length === 0 ? (
                <div className="empty-state">
                  <Package size={36} />
                  <p>Product database empty.</p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="table-glass">
                    <thead>
                      <tr>
                        <th>Product Name</th>
                        <th>Unique SKU</th>
                        <th>Standard Price</th>
                        <th>Stock Level</th>
                        <th className="text-right">Operations</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map(p => (
                        <tr key={p.id}>
                          <td style={{ fontWeight: '600' }}>{p.name}</td>
                          <td className="mono-cell">{p.sku}</td>
                          <td className="mono-cell">${parseFloat(p.price).toFixed(2)}</td>
                          <td>
                            <span className={`badge ${p.quantity < 10 ? 'badge-danger' : 'badge-success'}`}>
                              {p.quantity} units
                            </span>
                          </td>
                          <td className="text-right">
                            <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                              <button className="btn btn-secondary btn-sm" onClick={() => handleEditProduct(p)}>
                                <Edit size={12} />
                              </button>
                              <button className="btn btn-danger-outline btn-sm" onClick={() => handleDeleteProduct(p.id)}>
                                <Trash2 size={12} />
                              </button>
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

        {currentTab === 'customers' && (
          <div>
            <div className="page-header">
              <div className="page-title">
                <h1>Customer Identity Directory</h1>
                <p>Record, audit, and monitor customer credentials.</p>
              </div>
              <button className="btn btn-primary" onClick={() => setCustomerModalOpen(true)}>
                <Plus size={12} /> Register Customer
              </button>
            </div>

            <div className="glass-card">
              {customers.length === 0 ? (
                <div className="empty-state">
                  <Users size={36} />
                  <p>Customer directory empty.</p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="table-glass">
                    <thead>
                      <tr>
                        <th>Registry ID</th>
                        <th>Full Name</th>
                        <th>Email Registry</th>
                        <th>Phone Link</th>
                        <th className="text-right">Operations</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customers.map(c => (
                        <tr key={c.id}>
                          <td className="mono-cell">#CUST-{String(c.id).padStart(3, '0')}</td>
                          <td style={{ fontWeight: '600' }}>{c.name}</td>
                          <td className="mono-cell">{c.email}</td>
                          <td className="mono-cell">{c.phone}</td>
                          <td className="text-right">
                            <button className="btn btn-danger-outline btn-sm" onClick={() => handleDeleteCustomer(c.id)}>
                              <Trash2 size={12} /> Erase
                            </button>
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

        {currentTab === 'orders' && (
          <div>
            <div className="page-header">
              <div className="page-title">
                <h1>Ledger Transactions</h1>
                <p>Audit checkout ledgers, verify pricing totals, and manage rollbacks.</p>
              </div>
              <button className="btn btn-primary" onClick={() => setOrderModalOpen(true)}>
                <Plus size={12} /> Create Order
              </button>
            </div>

            <div className="glass-card">
              {orders.length === 0 ? (
                <div className="empty-state">
                  <ShoppingBag size={36} />
                  <p>No active ledger transactions registered.</p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="table-glass">
                    <thead>
                      <tr>
                        <th>Receipt ID</th>
                        <th>Client Reference</th>
                        <th>Total Settled</th>
                        <th>Items Count</th>
                        <th>Settled Time</th>
                        <th className="text-right">Operations</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(o => (
                        <tr key={o.id}>
                          <td className="mono-cell">#TXN-{String(o.id).padStart(4, '0')}</td>
                          <td style={{ fontWeight: '600' }}>{o.customer?.name}</td>
                          <td className="mono-cell">${parseFloat(o.total_amount).toFixed(2)}</td>
                          <td className="mono-cell">{o.items?.length || 0} categories</td>
                          <td>{new Date(o.created_at).toLocaleString()}</td>
                          <td className="text-right">
                            <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedOrder(o)}>
                                <Eye size={12} /> Audit
                              </button>
                              <button className="btn btn-danger-outline btn-sm" onClick={() => handleDeleteOrder(o.id)}>
                                <Trash size={12} /> Rollback
                              </button>
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

      {/* --- COLLAPSIBLE DEVELOPER COMMAND SHELL CONSOLE --- */}
      <section className={`terminal-drawer ${isTerminalExpanded ? 'expanded' : 'collapsed'}`}>
        <div className="terminal-header" onClick={() => setIsTerminalExpanded(!isTerminalExpanded)}>
          <div className="terminal-title">
            <Terminal size={14} />
            <span>STOCKFLOW COMMAND-LINE INTERFACE SHELL</span>
          </div>
          <div className="terminal-header-actions">
            <span>[SESSION: DEV]</span>
            <span>{isTerminalExpanded ? 'CLICK TO SHRINK [-]' : 'CLICK TO EXPAND [+]'}</span>
          </div>
        </div>
        {isTerminalExpanded && (
          <div className="terminal-body">
            {terminalLogs.map((log, index) => (
              <div key={index} className={`terminal-log-row ${log.type}`}>
                {log.text}
              </div>
            ))}
            <div ref={terminalEndRef} />
            
            <form onSubmit={handleTerminalSubmit} className="terminal-input-line">
              <span className="terminal-prompt">developer@stockflow:~$</span>
              <input 
                type="text" 
                className="terminal-input"
                value={terminalInput}
                onChange={e => setTerminalInput(e.target.value)}
                placeholder="Enter shell command (e.g. 'help', 'products', 'sys-info')..."
                autoFocus
              />
            </form>
          </div>
        )}
      </section>

      {/* --- FORM DIALOG MODALS --- */}

      {/* Product Register Dialog */}
      {productModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingProduct ? 'Edit Product Register' : 'Register Product Record'}</h3>
              <button className="btn-close" onClick={() => setProductModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleProductSubmit}>
              <div className="modal-body" style={{ padding: '1.5rem' }}>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label>Product Label</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={productForm.name} 
                    onChange={e => setProductForm({...productForm, name: e.target.value})} 
                    required 
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label>Database SKU / Product Key</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={productForm.sku} 
                    onChange={e => setProductForm({...productForm, sku: e.target.value})} 
                    required 
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label>Catalog Price ($)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      className="form-control" 
                      value={productForm.price} 
                      onChange={e => setProductForm({...productForm, price: parseFloat(e.target.value) || 0})} 
                      required 
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label>Initial Stock Volume</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={productForm.quantity} 
                      onChange={e => setProductForm({...productForm, quantity: parseInt(e.target.value) || 0})} 
                      required 
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer" style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justify: 'end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setProductModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingProduct ? 'Commit Changes' : 'Write Record'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Registry Dialog */}
      {customerModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Register Client Identity</h3>
              <button className="btn-close" onClick={() => setCustomerModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCustomerSubmit}>
              <div className="modal-body" style={{ padding: '1.5rem' }}>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label>Legal Full Name</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={customerForm.name} 
                    onChange={e => setCustomerForm({...customerForm, name: e.target.value})} 
                    required 
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label>Secure Email Address</label>
                  <input 
                    type="email" 
                    className="form-control" 
                    value={customerForm.email} 
                    onChange={e => setCustomerForm({...customerForm, email: e.target.value})} 
                    required 
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label>Phone Connection Link</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={customerForm.phone} 
                    onChange={e => setCustomerForm({...customerForm, phone: e.target.value})} 
                    required 
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justify: 'end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setCustomerModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Commit Registry</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Checkout Transaction Order Dialog */}
      {orderModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h3>Initiate Checkout Ledger</h3>
              <button className="btn-close" onClick={() => setOrderModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleOrderSubmit}>
              <div className="modal-body" style={{ padding: '1.5rem' }}>
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label>Client Reference Link</label>
                  <select 
                    className="form-control"
                    value={orderForm.customer_id}
                    onChange={e => setOrderForm({...orderForm, customer_id: e.target.value})}
                    required
                  >
                    <option value="">-- Associate Customer Registry --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
                    <span>Associate Line Items</span>
                  </label>
                  
                  <div className="order-items-builder">
                    {orderForm.items.map((item, index) => {
                      const selectedProd = products.find(p => p.id === parseInt(item.product_id));
                      return (
                        <div key={index} className="order-item-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '0.75rem', marginBottom: '0.75rem', alignItems: 'center' }}>
                          <div>
                            <select 
                              className="form-control"
                              value={item.product_id}
                              onChange={e => handleOrderItemChange(index, 'product_id', e.target.value)}
                              required
                            >
                              <option value="">-- Choose Product --</option>
                              {products.map(p => (
                                <option key={p.id} value={p.id} disabled={p.quantity <= 0}>
                                  {p.name} (${parseFloat(p.price).toFixed(2)}) [Vol: {p.quantity}]
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <input 
                              type="number"
                              className="form-control"
                              min="1"
                              max={selectedProd ? selectedProd.quantity : undefined}
                              value={item.quantity}
                              placeholder="Qty"
                              onChange={e => handleOrderItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                              required
                            />
                          </div>
                          <div>
                            <button 
                              type="button" 
                              className="btn btn-danger-outline btn-sm"
                              onClick={() => handleRemoveOrderItem(index)}
                              disabled={orderForm.items.length === 1}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddOrderItem} style={{ marginTop: '0.5rem' }}>
                      <Plus size={10} /> Add Item Line
                    </button>
                  </div>
                </div>

                {/* Real-time Order Summary */}
                <div style={{ padding: '1rem', background: 'rgba(0, 242, 254, 0.04)', borderRadius: '4px', border: '1px solid rgba(0, 242, 254, 0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '600', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>ESTIMATED TOTAL:</span>
                  <span style={{ fontSize: '1.25rem', fontFamily: 'var(--font-mono)', fontWeight: '700', color: 'var(--color-cyan)' }}>
                    ${getLiveOrderTotal().toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="modal-footer" style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justify: 'end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setOrderModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Commit Checkout</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction Details/Audit modal */}
      {selectedOrder && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>Auditing Receipt ID #TXN-{String(selectedOrder.id).padStart(4, '0')}</h3>
              <button className="btn-close" onClick={() => setSelectedOrder(null)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem' }}>
              
              <div style={{ marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Client Credentials</div>
                  <div style={{ fontWeight: '600', fontSize: '1.05rem', marginTop: '0.25rem' }}>{selectedOrder.customer?.name}</div>
                  <div style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{selectedOrder.customer?.email}</div>
                  <div style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{selectedOrder.customer?.phone}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Logistics Telemetry</div>
                  <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>State:</span> <span className="badge badge-success">Committed</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>UTC-stamp:</span> {new Date(selectedOrder.created_at).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Receipt Line Items</div>
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                <table className="table-glass" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Label</th>
                      <th>SKU</th>
                      <th>Price</th>
                      <th>Qty</th>
                      <th className="text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items?.map(item => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: '600' }}>{item.product?.name}</td>
                        <td className="mono-cell">{item.product?.sku}</td>
                        <td className="mono-cell">${parseFloat(item.price_at_order).toFixed(2)}</td>
                        <td className="mono-cell">{item.quantity}</td>
                        <td className="text-right mono-cell">${(parseFloat(item.price_at_order) * item.quantity).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Grand Total */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Settled Total</div>
                  <div style={{ fontSize: '1.8rem', fontFamily: 'var(--font-mono)', fontWeight: '700', color: 'var(--color-cyan)', marginTop: '0.25rem' }}>
                    ${parseFloat(selectedOrder.total_amount).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justify: 'end' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedOrder(null)}>Dismiss Audit</button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts Container */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span>{t.message}</span>
          </div>
        ))}
      </div>

    </div>
  );
}

export default App;
