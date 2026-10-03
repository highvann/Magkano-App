import { useState, useEffect } from 'react';
import './History.css';

function History() {
  const [transactions, setTransactions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTx, setSelectedTx] = useState(null);
  
  const [filterCategory, setFilterCategory] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    if (transactions.length > 0) {
      const openTxId = sessionStorage.getItem('openTxId');
      if (openTxId) {
        const txToOpen = transactions.find(t => t.id === parseInt(openTxId));
        if (txToOpen) {
          setSelectedTx(txToOpen);
          setNoteInput(txToOpen.notes || '');
        }
        sessionStorage.removeItem('openTxId');
      }
    }
  }, [transactions]);

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/expenses`);
      if (response.ok) {
        const data = await response.json();
        
        const historyOnly = data.filter(tx => 
          tx.isrecurring !== true && 
          String(tx.isrecurring) !== 'true' && 
          tx.isRecurring !== true && 
          String(tx.isRecurring) !== 'true'
        );
        
        const sorted = historyOnly.sort((a,b) => {
          const timeA = new Date(a.date).getTime();
          const timeB = new Date(b.date).getTime();
          if (timeA === timeB) return b.id - a.id; 
          return timeB - timeA;
        });
        
        setTransactions(sorted);
      }
    } catch (error) {
      console.error("Error fetching history:", error);
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = (
      (tx.description && tx.description.toLowerCase().includes(search)) ||
      (tx.notes && tx.notes.toLowerCase().includes(search))
    );
    const matchesCategory = filterCategory === 'All' || tx.category === filterCategory;
    
    return matchesSearch && matchesCategory;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage) || 1;
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );

  const handleRowClick = (tx) => {
    setSelectedTx(tx);
    setNoteInput(tx.notes || '');
    setIsEditingNote(false);
  };

  const closePanel = () => {
    setSelectedTx(null);
    setIsEditingNote(false);
  };

  const formatDate = (dateString, includeTime = false) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (includeTime) {
      return date.toLocaleString('en-US', { 
        month: 'short', day: 'numeric', year: 'numeric', 
        hour: 'numeric', minute: '2-digit', hour12: true 
      });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const extractTimeFromDesc = (description) => {
    const match = description.match(/- (\d{1,2}:\d{2}\s[APM]{2})\)$/);
    return match ? match[1] : null;
  };

  const handleSaveNote = async () => {
    if (!selectedTx) return;
    const updatedTx = { ...selectedTx, notes: noteInput };
    
    setSelectedTx(updatedTx);
    setTransactions(prev => prev.map(t => t.id === selectedTx.id ? updatedTx : t));
    setIsEditingNote(false);

    try {
      await fetch(`${import.meta.env.VITE_API_URL}/expenses/${selectedTx.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTx)
      });
    } catch (error) {
      console.error("Error saving note:", error);
    }
  };

  const handleDownloadInvoice = () => {
    if (!selectedTx) return;
    const printWindow = window.open('', '_blank');
    
    const invoiceHTML = `
      <html>
        <head>
          <title>Invoice - ${selectedTx.description}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #111; max-width: 800px; margin: 0 auto; }
            .header { border-bottom: 2px solid #6366f1; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end;}
            .title { color: #6366f1; font-size: 2.5rem; margin: 0; text-transform: uppercase; letter-spacing: 2px; }
            .subtitle { color: #555; margin: 5px 0 0 0; }
            .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px; }
            .detail-box { background: #f9f9f9; padding: 20px; border-radius: 8px; border: 1px solid #eee; }
            .label { font-size: 0.8rem; text-transform: uppercase; color: #888; font-weight: bold; margin: 0 0 5px 0; }
            .value { font-size: 1.1rem; margin: 0; font-weight: bold; }
            .total-box { text-align: right; margin-top: 40px; padding-top: 20px; border-top: 2px solid #eee; }
            .total-amount { font-size: 2rem; color: #6366f1; margin: 10px 0 0 0; }
            .footer { margin-top: 60px; text-align: center; color: #888; font-size: 0.85rem; border-top: 1px solid #eee; padding-top: 20px; }
          </style>
        </head>
        <body onload="window.print(); window.onafterprint = function(){ window.close() };">
          <div class="header">
            <div>
              <h1 class="title">INVOICE</h1>
              <p class="subtitle">Transaction ID: #${selectedTx.id || Math.floor(Math.random() * 10000)}</p>
            </div>
            <div style="text-align: right;">
              <p class="value">Alex Mercer</p>
              <p class="subtitle">Pro Plan Member</p>
            </div>
          </div>
          
          <div class="details-grid">
            <div class="detail-box">
              <p class="label">Billed To / Merchant</p>
              <p class="value">${selectedTx.description}</p>
            </div>
            <div class="detail-box">
              <p class="label">Date of Transaction</p>
              <p class="value">${formatDate(selectedTx.date, true)}</p>
            </div>
            <div class="detail-box">
              <p class="label">Category</p>
              <p class="value">${selectedTx.category}</p>
            </div>
            <div class="detail-box">
              <p class="label">Payment Method</p>
              <p class="value">${selectedTx.paymentMethod || 'Standard Outflow'}</p>
            </div>
          </div>

          ${selectedTx.notes ? `<div class="detail-box" style="margin-bottom: 30px;"><p class="label">Notes / Memos</p><p class="value" style="font-weight:normal;">${selectedTx.notes}</p></div>` : ''}

          <div class="total-box">
            <p class="label">Total Amount Processed</p>
            <h2 class="total-amount">PHP ${Number(selectedTx.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</h2>
          </div>

          <div class="footer">
            <p>Generated by Expense & Wealth Tracker Dashboard.</p>
            <p>This is a system-generated document.</p>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(invoiceHTML);
    printWindow.document.close();
  };

  const getCategoryIcon = (category) => {
    const cat = category?.toLowerCase() || '';
    if (cat.includes('tech') || cat.includes('electronic')) return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>;
    if (cat.includes('food') || cat.includes('dining') || cat.includes('lifestyle')) return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"></path><path d="M7 2v20"></path><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"></path></svg>;
    return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;
  };

  const IconFilter = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>;
  const IconExport = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>;
  const IconClose = () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
  const IconUser = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>;
  const IconCard = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>;
  const IconReceipt = () => <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>;
  const IconNote = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;

  return (
    <div className={`wf-history-canvas ${selectedTx ? 'panel-open' : ''}`}>
      
      {showReceiptModal && selectedTx && (
        <div className="fullscreen-overlay" onClick={() => setShowReceiptModal(false)}>
          <div className="fullscreen-image-wrapper">
             <img src={`${import.meta.env.VITE_API_URL}${selectedTx.receipt_url}`} alt="Receipt Fullscreen" />
             <button className="close-fullscreen">✕</button>
          </div>
        </div>
      )}

      <div className="main-list-area custom-scrollbar">
        
        <div className="history-top-section">
          <div>
            <h1 className="history-title">Transactions</h1>
            <p className="history-subtitle">Reviewing {filteredTransactions.length} item{filteredTransactions.length !== 1 ? 's' : ''} in the ledger</p>
          </div>
          <div className="header-actions">
            <input 
              type="text" 
              className="search-input-glass" 
              placeholder="Search history..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            
            <button className="btn-action-glass" onClick={() => setShowFilters(!showFilters)}>
              <IconFilter /> Filter
            </button>
            
            {showFilters && (
              <div className="filter-dropdown-menu">
                 <p className="filter-label">CATEGORY</p>
                 {['All', 'Operational Expense', 'Technology & SaaS', 'Food & Lifestyle', 'Logistics'].map(cat => (
                   <button 
                     key={cat} 
                     className={`filter-option ${filterCategory === cat ? 'active' : ''}`}
                     onClick={() => { setFilterCategory(cat); setShowFilters(false); }}
                   >
                     {cat}
                   </button>
                 ))}
              </div>
            )}
          </div>
        </div>

        <div className="glass-panel-heavy rounded-xl overflow-hidden mt-normal">
          <div className="grid-table-header">
            <div className="col-5">Merchant / Category</div>
            <div className="col-3">Date</div>
            <div className="col-2 align-right">Status</div>
            <div className="col-2 align-right">Amount</div>
          </div>

          <div className="grid-table-body">
            {paginatedTransactions.length === 0 ? (
              <div className="empty-state-row">No transactions found matching your criteria.</div>
            ) : (
              paginatedTransactions.map((tx) => {
                const exactTime = extractTimeFromDesc(tx.description);
                const displayDesc = exactTime ? tx.description.replace(/\(Sub Payment - .*\)/, '(Sub Payment)') : tx.description;

                return (
                  <div 
                    key={tx.id} 
                    className={`grid-table-row ${selectedTx?.id === tx.id ? 'active' : ''}`}
                    onClick={() => handleRowClick(tx)}
                  >
                    <div className="col-5 flex-align">
                      <div className="merchant-icon-box">
                        {getCategoryIcon(tx.category)}
                      </div>
                      <div>
                        <p className="merchant-name">{displayDesc}</p>
                        <p className="merchant-cat">{tx.category}</p>
                      </div>
                    </div>
                    
                    <div className="col-3 mono-text flex-col items-start">
                      <span>{formatDate(tx.date)}</span>
                    </div>
                    <div className="col-2 align-right">
                      <span className="status-pill">Cleared</span>
                    </div>
                    <div className="col-2 align-right fw-medium amount-text">
                      -₱{Number(tx.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
          {totalPages > 1 && (
            <div className="pagination-container">
              <div className="pagination-pill">
                <button 
                  className="page-arrow" 
                  disabled={currentPage === 1} 
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  &lt;
                </button>
                <span className="page-indicator">Page {currentPage} of {totalPages}</span>
                <button 
                  className="page-arrow" 
                  disabled={currentPage === totalPages} 
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  &gt;
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <aside className={`detail-side-panel ${selectedTx ? 'active' : ''}`}>
        {selectedTx && (() => {
          const exactTime = extractTimeFromDesc(selectedTx.description);
          const displayDesc = exactTime ? selectedTx.description.replace(/\(Sub Payment - .*\)/, '(Sub Payment)') : selectedTx.description;
          
          return (
            <>
              <div className="panel-top-bar">
                <h3 className="panel-title">Transaction Details</h3>
                <button className="icon-btn-close" onClick={closePanel}><IconClose /></button>
              </div>

              <div className="panel-content-scroll custom-scrollbar">
                
                <div className="panel-hero">
                  <div className="hero-icon-large text-primary">
                    {getCategoryIcon(selectedTx.category)}
                  </div>
                  <h2 className="hero-amount-text">-₱{Number(selectedTx.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</h2>
                  <p className="hero-merchant-text">{displayDesc}</p>
                  
                  <div className="hero-date-badge hero-date-stack">
                    <span>{formatDate(selectedTx.date)}</span>
                    <span className="time-sub-badge">
                      {selectedTx.created_at 
                        ? new Date(selectedTx.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) 
                        : exactTime || ''}
                    </span>
                  </div>
                </div>

                <div className="bento-meta-grid">
                  <div className="glass-panel-light p-normal rounded-lg">
                    <p className="meta-label">Status</p>
                    <p className="meta-value flex-align gap-sm">
                      <span className="dot bg-secondary"></span> Cleared
                    </p>
                  </div>
                  <div className="glass-panel-light p-normal rounded-lg">
                    <p className="meta-label">Category</p>
                    <p className="meta-value truncate-text" title={selectedTx.category}>{selectedTx.category}</p>
                  </div>
                  
                  <div className="glass-panel-light p-normal rounded-lg col-span-2">
                    <p className="meta-label">Logged By</p>
                    <div className="flex-align gap-normal mt-xs">
                      <div className="icon-box-small text-primary"><IconUser /></div>
                      <span className="fw-medium text-main truncate-text">Alex Mercer</span>
                    </div>
                  </div>

                  <div className="glass-panel-light p-normal rounded-lg col-span-2">
                    <p className="meta-label">Payment Method</p>
                    <div className="flex-align gap-normal mt-xs">
                      <div className="icon-box-small text-muted"><IconCard /></div>
                      <span className="fw-medium text-main truncate-text">
                        {selectedTx.paymentMethod || 'Standard Outflow'}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="meta-label mt-normal mb-xs">Attached Receipt</p>
                <div 
                  className={`receipt-glass-container ${selectedTx.receipt_url ? 'clickable-receipt' : ''}`}
                  onClick={() => selectedTx.receipt_url && setShowReceiptModal(true)}
                >
                  {selectedTx.receipt_url ? (
                    <>
                      <img 
                        src={`${import.meta.env.VITE_API_URL}${selectedTx.receipt_url}`} 
                        alt="Transaction Receipt" 
                        className="receipt-image-bg" 
                      />
                      <div className="receipt-overlay">
                        <span>Click to expand</span>
                      </div>
                    </>
                  ) : (
                    <div className="no-receipt-placeholder">
                      <span className="icon-wrapper text-muted mb-xs"><IconReceipt /></span> 
                      <p>No receipt attached</p>
                    </div>
                  )}
                </div>

                <div className="action-stack">
                  
                  {isEditingNote ? (
                    <div className="note-edit-box">
                      <input 
                        type="text" 
                        className="note-input" 
                        value={noteInput} 
                        onChange={(e) => setNoteInput(e.target.value)} 
                        placeholder="Add transaction details..."
                        autoFocus
                      />
                      <div className="note-actions">
                        <button className="note-btn cancel" onClick={() => setIsEditingNote(false)}>Cancel</button>
                        <button className="note-btn save" onClick={handleSaveNote}>Save</button>
                      </div>
                    </div>
                  ) : (
                    <button className="btn-action-row" onClick={() => setIsEditingNote(true)}>
                      <span className="truncate-text">{selectedTx.notes ? `Note: ${selectedTx.notes}` : 'Add Note'}</span> 
                      <span className="icon-action"><IconNote /></span>
                    </button>
                  )}

                  <button className="btn-action-row" onClick={handleDownloadInvoice}>
                    <span>Download Invoice</span> 
                    <span className="icon-action"><IconExport /></span>
                  </button>

                </div>
              </div>
            </>
          );
        })()}
      </aside>
    </div>
  );
}

export default History;