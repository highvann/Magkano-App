import { useState, useEffect } from 'react';
import './ExpenseTracker.css';

function ExpenseTracker({ setActiveTab }) {
  const [expenses, setExpenses] = useState([]);
  
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Operational Expense');
  const [date, setDate] = useState('');
  const [paymentOption, setPaymentOption] = useState('Cash');
  const [notes, setNotes] = useState(''); 
  
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);

  const [baseBalance, setBaseBalance] = useState(0);
  const [baseInput, setBaseInput] = useState(0);
  const [addFundsInput, setAddFundsInput] = useState('');

  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  
  const [insufficientFunds, setInsufficientFunds] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '' });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const expRes = await fetch('http://localhost:5000/expenses');
      if (expRes.ok) {
         const expData = await expRes.json();
         setExpenses(Array.isArray(expData) ? expData : []);
      }
      const setRes = await fetch('http://localhost:5000/settings');
      if (setRes.ok) {
        const setData = await setRes.json();
        const currentBase = Number(setData.base_balance);
        setBaseBalance(currentBase);
        setBaseInput(currentBase);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setReceiptFile(file);
      setReceiptPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveReceipt = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setReceiptFile(null);
    setReceiptPreview(null);
    const fileInput = document.getElementById('receipt-upload');
    if (fileInput) fileInput.value = '';
  };

  const safeExpenses = Array.isArray(expenses) ? expenses : [];
  const totalSpent = safeExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  const currentLiquidity = baseBalance - totalSpent;

  const handleSaveTransaction = async (e) => {
    e.preventDefault();
    if (!merchant || !amount) return;

    if (Number(amount) > currentLiquidity) {
      setInsufficientFunds(true);
      return; 
    }

    const formData = new FormData();
    formData.append('description', merchant);
    formData.append('amount', amount);
    formData.append('category', category);
    formData.append('date', date || new Date().toISOString().split('T')[0]);
    formData.append('paymentMethod', paymentOption); 
    formData.append('isRecurring', false); 
    formData.append('notes', notes);
    formData.append('is_cleared', true); 
    if (receiptFile) {
      formData.append('receipt', receiptFile);
    }

    try {
      const response = await fetch('http://localhost:5000/expenses', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        fetchAllData();
        setToast({ show: true, message: `Successfully logged ₱${Number(amount).toLocaleString()} to ${merchant}.` });
        setTimeout(() => setToast({ show: false, message: '' }), 3500);

        setMerchant(''); setAmount(''); setCategory('Operational Expense');
        setDate(''); setPaymentOption('Cash'); setNotes('');
        setReceiptFile(null); setReceiptPreview(null);
      } else {
        const errorText = await response.text();
        alert(`BACKEND REJECTION: ${errorText}`);
        console.error("Backend Error:", errorText);
      }
    } catch (error) {
      alert(`NETWORK ERROR: ${error.message}`);
      console.error("Network Error:", error);
    }
  };

  const confirmUpdateBase = async () => {
    try {
      const response = await fetch('http://localhost:5000/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base_balance: baseInput })
      });
      if (response.ok) {
        const updatedSettings = await response.json();
        setBaseBalance(Number(updatedSettings.base_balance));
        setShowUpdateModal(false);
      }
    } catch (error) {
      console.error("Error updating base balance:", error);
    }
  };

  const confirmAddFunds = async () => {
    if (!addFundsInput) return;
    try {
      const response = await fetch('http://localhost:5000/settings/add', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ add_amount: parseFloat(addFundsInput) })
      });
      if (response.ok) {
        const updatedSettings = await response.json();
        setBaseBalance(Number(updatedSettings.base_balance));
        setBaseInput(Number(updatedSettings.base_balance));
        setAddFundsInput('');
        setShowAddFundsModal(false);
      }
    } catch (error) {
      console.error("Error adding funds:", error);
    }
  };

  const handleRowClick = (tx) => {
    sessionStorage.setItem('openTxId', tx.id);
    if (setActiveTab) setActiveTab('history');
  };

  const liquidityRatio = baseBalance > 0 ? Math.max(Math.round((currentLiquidity / baseBalance) * 100), 0) : 0;
  
  const recentTransactions = safeExpenses.filter(exp => {
    if (exp.isrecurring === true || String(exp.isRecurring) === 'true') {
      const txDate = new Date(exp.date);
      const today = new Date();
      txDate.setHours(0,0,0,0);
      today.setHours(0,0,0,0);
      return txDate <= today;
    }
    return true; 
  })
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id - a.id)
  .slice(0, 5);

  const IconDownload = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>;
  const IconFile = () => <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>;
  const IconSend = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>;
  const IconSettings = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;
  const IconArrowRight = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>;
  const IconCheckSmall = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;

  return (
    <div className="wf-expense-canvas">
      
      {toast.show && (
        <div className="toast-notification">
          <span className="text-primary icon-wrapper"><IconCheckSmall /></span> {toast.message}
        </div>
      )}

      {insufficientFunds && (
        <div className="wf-modal-overlay" onClick={() => setInsufficientFunds(false)}>
          <div className="dash-matte-card wf-modal shake-anim" onClick={e => e.stopPropagation()}>
            <span className="sad-cat-visual">😿</span>
            <h3 className="modal-title mb-xs text-white">Insufficient Liquidity</h3>
            <p className="modal-text mb-large">You do not have enough funds to process this transaction. You currently have <strong className="text-primary">₱{currentLiquidity.toLocaleString(undefined, {minimumFractionDigits: 2})}</strong> available.</p>
            <button type="button" className="btn-secondary w-full" onClick={() => setInsufficientFunds(false)}>Acknowledge</button>
          </div>
        </div>
      )}

      {showUpdateModal && (
        <div className="wf-modal-overlay">
          <div className="dash-matte-card wf-modal">
            <h3 className="modal-title">Confirm Base Update</h3>
            <p className="modal-text">Are you sure you want to overwrite your base balance to <strong className="text-primary">₱{Number(baseInput).toLocaleString()}</strong>? This will recalculate your net liquidity.</p>
            <div className="modal-actions">
              <button className="btn-secondary btn-hover-anim" onClick={() => setShowUpdateModal(false)}>Cancel</button>
              <button className="btn-primary btn-hover-anim" onClick={confirmUpdateBase}>Confirm Update</button>
            </div>
          </div>
        </div>
      )}

      {showAddFundsModal && (
        <div className="wf-modal-overlay">
          <div className="dash-matte-card wf-modal">
            <h3 className="modal-title">Add Funds</h3>
            <p className="modal-text">Enter the amount to add to your current base balance.</p>
            <div className="input-wrapper mb-large">
              <span className="currency-symbol">₱</span>
              <input 
                type="number" 
                className="dark-input pl-large" 
                placeholder="0.00"
                value={addFundsInput}
                onChange={(e) => setAddFundsInput(e.target.value)}
              />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary btn-hover-anim" onClick={() => setShowAddFundsModal(false)}>Cancel</button>
              <button className="btn-success btn-hover-anim" onClick={confirmAddFunds}>⊕ Confirm Deposit</button>
            </div>
          </div>
        </div>
      )}

      <div className="expense-page-header">
        <div>
          <h1 className="page-title">Balance & Transactions</h1>
          <p className="page-subtitle">Manage your liquidity and log high-frequency expenditures.</p>
        </div>
        <button className="export-btn">
          <span className="icon-wrapper"><IconDownload /></span> Export CSV
        </button>
      </div>

      <div className="expense-grid">
        
        <div className="expense-col-left">
          <div className="dash-matte-card balance-card premium-balance-card">
            <div className="balance-glow-orb"></div>
            
            <div className="balance-header">
              <h3 className="card-label">TOTAL BALANCE</h3>
              <div className="balance-display m-0">
                <span className="balance-amount">₱{currentLiquidity.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>

              <div className="liquidity-progress-container mt-normal">
                <div className="flex-between mb-xs">
                  <span className="dash-xs-text text-muted font-bold uppercase">Liquidity Ratio</span>
                  <span className="dash-xs-text text-white font-bold">{liquidityRatio}%</span>
                </div>
                
                <div className="progress-bar-bg-3d summary-3d-bar">
                  <div className="progress-bar-fill-3d fill-primary" style={{width: `${liquidityRatio}%`}}>
                    <div className="bar-3d-highlight"></div>
                  </div>
                </div>

                <div className="flex-between mt-sm">
                  <div>
                    <span className="dash-xs-text text-muted display-block font-bold">INITIAL BASE</span>
                    <span className="dash-sm-text text-white font-bold">₱{Number(baseBalance).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className="align-right">
                    <span className="dash-xs-text text-muted display-block font-bold">OUTFLOW</span>
                    <span className="dash-sm-text text-primary font-bold">-₱{Number(totalSpent).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="balance-controls-zone highlight-zone mt-auto">
              <div className="flex-align gap-sm mb-xs">
                <span className="text-primary icon-wrapper"><IconSettings /></span>
                <span className="dash-sm-text text-white font-bold uppercase tracking-widest">Capital Management</span>
              </div>
              <p className="dash-xs-text text-muted mb-normal">Input your initial base capital or inject funds.</p>

              <div className="input-wrapper mb-normal">
                <span className="currency-symbol capital-symbol">₱</span>
                <input 
                  type="number" 
                  value={baseInput}
                  onChange={(e) => setBaseInput(Number(e.target.value))}
                  className="dark-input capital-input" 
                />
              </div>
              <div className="balance-buttons">
                <button className="btn-secondary btn-hover-anim" onClick={() => setShowUpdateModal(true)}>Update Base</button>
                <button className="btn-success btn-hover-anim" onClick={() => setShowAddFundsModal(true)}>⊕ Add Funds</button>
              </div>
            </div>
          </div>
        </div>

        <div className="expense-col-right">
          <div className="dash-matte-card split-horizon h-full flex-col">
            <div className="split-horizon-header">
              <h2 className="section-title m-0">New Transaction Entry</h2>
            </div>

            <form onSubmit={handleSaveTransaction} className="split-horizon-content flex-col flex-1">
              <div className="form-row-2">
                <div className="form-group">
                  <label>MERCHANT / PAYEE</label>
                  <input type="text" className="dark-input" placeholder="e.g. AWS Cloud Services" value={merchant} onChange={(e) => setMerchant(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>AMOUNT (PHP)</label>
                  <div className="input-wrapper">
                    <span className="currency-symbol">₱</span>
                    <input type="number" className="dark-input pl-large" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="form-row-3">
                <div className="form-group">
                  <label>CATEGORY</label>
                  <select className="dark-input" value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option>Operational Expense</option>
                    <option>Technology & SaaS</option>
                    <option>Food & Lifestyle</option>
                    <option>Logistics</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>DATE</label>
                  <input type="date" className="dark-input" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>PAYMENT OPTION</label>
                  <select className="dark-input" value={paymentOption} onChange={(e) => setPaymentOption(e.target.value)}>
                    <option value="Cash">Cash</option>
                    <option value="E-Wallets">E-Wallets</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                  </select>
                </div>
              </div>

              <div className="form-row-extra">
                <div className="form-group">
                  <label>NOTES (OPTIONAL)</label>
                  <textarea className="dark-input textarea-input" placeholder="Add transaction details, tags, or context..." value={notes} onChange={(e) => setNotes(e.target.value)}></textarea>
                </div>
                <div className="form-group">
                  <label>ATTACH RECEIPT</label>
                  <input 
                    type="file" 
                    id="receipt-upload" 
                    className="hidden-file-input" 
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                  <label htmlFor="receipt-upload" className="upload-dropzone">
                    {receiptPreview ? (
                      <>
                        <button className="remove-receipt-btn" onClick={handleRemoveReceipt} title="Discard Image">✕</button>
                        <img src={receiptPreview} alt="Receipt Preview" className="receipt-preview-img" />
                      </>
                    ) : (
                      <>
                        <span className="icon text-muted mb-12 display-block"><IconFile /></span>
                        <p>Drag & drop or <span className="text-primary-link">browse</span></p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <div className="form-actions mt-auto">
                <p className="form-hint m-0">Standard outflow tracking.</p>
                <div className="action-buttons">
                  <button type="button" className="btn-text btn-discard" onClick={() => {setMerchant(''); setAmount(''); setNotes(''); setPaymentOption('Cash'); setReceiptPreview(null); setReceiptFile(null);}}>Discard</button>
                  <button type="submit" className="btn-primary">
                    Save Transaction <span className="icon-wrapper"><IconSend /></span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className="dash-matte-card split-horizon mt-normal">
        <div className="split-horizon-header">
          <h2 className="section-title m-0">Recent Transactions</h2>
          <button className="btn-browse-all" onClick={() => {if(setActiveTab) setActiveTab('history')}}>
            BROWSE ALL <span className="icon-wrapper"><IconArrowRight /></span>
          </button>
        </div>
        
        <div className="split-horizon-content p-20-28">
          <div className="table-responsive">
            <table className="wf-table">
              <thead>
                <tr>
                  <th className="align-left">DATE</th>
                  <th className="align-left">MERCHANT / PAYEE</th>
                  <th className="align-left">CATEGORY</th>
                  <th className="align-right">AMOUNT</th>
                  <th className="align-center">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="empty-state-row">No transactions recorded yet.</td>
                  </tr>
                ) : (
                  recentTransactions.map((tx, index) => (
                    <tr key={index} className="clickable-row" onClick={() => handleRowClick(tx)} title="Click to view details in History">
                      <td className="align-left">{tx.date ? new Date(tx.date).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'}) : 'N/A'}</td>
                      <td className="align-left fw-bold">{tx.description}</td>
                      <td className="align-left"><span className="category-tag">{tx.category}</span></td>
                      <td className="align-right fw-bold text-primary">-₱{Number(tx.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                      <td className="align-center">
                        <span className="status-badge cleared">CLEARED</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExpenseTracker;