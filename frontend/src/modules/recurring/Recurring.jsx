import { useState, useEffect } from 'react';
import './Recurring.css';

const getNextBillingInfo = (sub) => {
  const initDateStr = sub.original_date || sub.created_at || sub.date;
  const initDate = new Date(initDateStr);

  const nextDueDate = new Date(sub.date);
  nextDueDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (sub.isPaused || String(sub.isPaused) === 'true') {
    return {
      initDate,
      nextDueDate: null,
      daysLeft: '-',
      statusTag: { text: "PAUSED", urgent: false, isToday: false, isPaused: true, colorCode: "#f59e0b" }
    };
  }

  const diffTime = nextDueDate - today;
  const daysLeftRaw = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const daysLeft = Math.max(0, daysLeftRaw);

  let statusTag = { text: `${daysLeft} Days Left`, urgent: false, isToday: false, colorCode: "var(--text-muted)" };

  if (daysLeftRaw <= 0) {
    statusTag = { text: "DUE TODAY", urgent: true, isToday: true, colorCode: "var(--alert-red)" };
  } else if (daysLeft === 1 || daysLeft === 2) {
    statusTag = { text: `DUE IN ${daysLeft} DAYS`, urgent: true, isToday: false, colorCode: "#f97316" };
  } else if (daysLeft === 3) {
    statusTag = { text: "DUE IN 3 DAYS", urgent: true, isToday: false, colorCode: "#eab308" };
  }

  return { initDate, nextDueDate, daysLeft, statusTag };
};

function Recurring() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [selectedSub, setSelectedSub] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [billingDate, setBillingDate] = useState('');
  const [category, setCategory] = useState('Technology & SaaS');

  const [toast, setToast] = useState({ show: false, message: '', stage: 'hidden' });
  const [pauseModal, setPauseModal] = useState({ show: false, sub: null });
  const [cancelModal, setCancelModal] = useState({ show: false, sub: null });

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  useEffect(() => {
    const openSubId = sessionStorage.getItem('openSubscriptionId');
    if (openSubId && subscriptions.length > 0) {
      const found = subscriptions.find(s => s.id.toString() === openSubId.toString());
      if (found) setSelectedSub(found);
      sessionStorage.removeItem('openSubscriptionId');
    }
  }, [subscriptions]);

  const fetchSubscriptions = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/expenses`);
      if (response.ok) {
        const data = await response.json();
        const recurringData = data.filter(exp => exp.isrecurring === true || String(exp.isRecurring) === 'true');
        setSubscriptions(recurringData);
      }
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
    }
  };

  const handleSaveSubscription = async (e) => {
    e.preventDefault();
    if (!merchant || !amount || !billingDate) return;

    const newSub = {
      description: merchant,
      amount: amount,
      category: category,
      date: billingDate,
      original_date: billingDate,
      created_at: new Date().toISOString(),
      isRecurring: true,
      isrecurring: true,
      isPaused: false
    };

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSub),
      });

      if (response.ok) {
        fetchSubscriptions();
        setMerchant(''); setAmount(''); setBillingDate(''); setShowForm(false);
      }
    } catch (error) {
      console.error("Error saving subscription:", error);
    }
  };

  const handleMarkAsPaid = async (e, sub) => {
    e.stopPropagation();
    try {
      const exactTimeStr = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

      const currentDate = new Date(sub.date);
      currentDate.setMonth(currentDate.getMonth() + 1);
      const yyyy = currentDate.getFullYear();
      const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
      const dd = String(currentDate.getDate()).padStart(2, '0');
      const newDateStr = `${yyyy}-${mm}-${dd}`;

      const updatedSub = { ...sub, date: newDateStr, isrecurring: true, isRecurring: true };

      setSelectedSub(null);
      sessionStorage.removeItem('openSubscriptionId');
      setSubscriptions(prev => prev.map(s => s.id === sub.id ? updatedSub : s));

      setToast({ show: true, message: `Successfully paid ₱${Number(sub.amount).toLocaleString()} for ${sub.description}.`, stage: 'entering' });
      setTimeout(() => setToast(prev => ({ ...prev, stage: 'entered' })), 50);
      setTimeout(() => setToast(prev => ({ ...prev, stage: 'exiting' })), 3000);
      setTimeout(() => setToast({ show: false, message: '', stage: 'hidden' }), 3600);

      const paymentData = {
        description: `${sub.description} (Sub Payment - ${exactTimeStr})`,
        amount: sub.amount,
        category: sub.category,
        date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        isrecurring: false,
        isRecurring: false
      };

      await fetch(`${import.meta.env.VITE_API_URL}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      });

      await new Promise(resolve => setTimeout(resolve, 250));

      await fetch(`${import.meta.env.VITE_API_URL}/expenses/${sub.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSub)
      });

      fetchSubscriptions();

    } catch (error) {
      console.error("Error rolling over subscription:", error);
    }
  };

  const executePauseToggle = async (e, sub, toPause) => {
    e.stopPropagation();
    try {
      const updatedData = { ...sub, isPaused: toPause };
      if (!toPause) {
        updatedData.date = new Date().toISOString().split('T')[0];
      }

      setSubscriptions(prev => prev.map(s => s.id === sub.id ? { ...s, ...updatedData } : s));
      setSelectedSub(prev => prev?.id === sub.id ? { ...prev, ...updatedData } : prev);
      setPauseModal({ show: false, sub: null });

      await fetch(`${import.meta.env.VITE_API_URL}/expenses/${sub.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });

    } catch (error) {
      console.error("Error pausing/unpausing:", error);
    }
  };

  const executeCancel = async (id) => {
    try {
      setSubscriptions(prev => prev.filter(s => s.id !== id));
      setSelectedSub(null);
      setCancelModal({ show: false, sub: null });

      await fetch(`${import.meta.env.VITE_API_URL}/expenses/${id}`, { method: 'DELETE' });
    } catch (error) {
      console.error("Error deleting subscription:", error);
    }
  };

  const activeSubs = subscriptions.filter(sub => !sub.isPaused && String(sub.isPaused) !== 'true');
  const totalMonthly = activeSubs.reduce((sum, sub) => sum + Number(sub.amount), 0);
  const annualizedCommitment = totalMonthly * 12;

  let nextCharge = null;
  let minDaysDiff = Infinity;

  activeSubs.forEach(sub => {
    const { daysLeft } = getNextBillingInfo(sub);
    if (daysLeft !== '-' && daysLeft < minDaysDiff) {
      minDaysDiff = daysLeft;
      nextCharge = { ...sub, daysLeft };
    }
  });

  const IconSync = () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>;
  const IconCalendar = () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;
  const IconShield = () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>;
  const IconRepeat = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>;
  const IconClose = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
  const IconCheck = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;
  const IconPause = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>;
  const IconPlay = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>;
  const IconAlert = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>;

  return (
    <div className={`wf-recurring-canvas ${selectedSub ? 'panel-open' : ''}`}>

      {/* Toast strictly uses CSS classes now */}
      <div className={`recurring-toast toast-${toast.stage}`}>
        <span style={{ display: 'flex' }}><IconCheck /></span>
        <span className="font-bold" style={{ fontSize: '0.95rem' }}>{toast.message}</span>
      </div>

      {pauseModal.show && pauseModal.sub && (
        <div className="wf-modal-overlay" onClick={() => setPauseModal({ show: false, sub: null })}>
          <div className="dash-matte-card wf-modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title mb-normal text-white">Pause Tracking?</h3>
            <p className="modal-text mb-large">You are about to pause automation for <strong>{pauseModal.sub.description}</strong>. It will stop calculating remaining days. When you unpause, the cycle will restart on that exact day.</p>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setPauseModal({ show: false, sub: null })}>Go Back</button>
              <button type="button" className="btn-primary" style={{ flex: 1, justifyContent: 'center', background: '#f59e0b', borderColor: '#f59e0b', color: '#fff' }} onClick={(e) => executePauseToggle(e, pauseModal.sub, true)}>Confirm Pause</button>
            </div>
          </div>
        </div>
      )}

      {cancelModal.show && cancelModal.sub && (
        <div className="wf-modal-overlay" onClick={() => setCancelModal({ show: false, sub: null })}>
          <div className="dash-matte-card wf-modal border-danger" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title mb-xs text-white">Cancel Subscription?</h3>
            <p className="modal-text mb-large">Are you sure you want to permanently delete <strong>{cancelModal.sub.description}</strong>? If you just need a break, you can pause it instead to keep the record.</p>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" style={{ borderColor: '#f59e0b', color: '#f59e0b' }} onClick={(e) => { setCancelModal({ show: false, sub: null }); executePauseToggle(e, cancelModal.sub, true); }}>Pause Instead</button>
              <button type="button" className="btn-danger" style={{ flex: 1 }} onClick={() => executeCancel(cancelModal.sub.id)}>Cancel Permanently</button>
            </div>
          </div>
        </div>
      )}

      <div className="main-list-area">
        <div className="recurring-page-header">
          <div>
            <h1 className="page-title">Automated Outflow</h1>
            <p className="page-subtitle">Manage your subscriptions, recurring bills, and fixed overhead.</p>
          </div>
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ New Subscription'}
          </button>
        </div>

        {showForm && (
          <div className="dash-matte-card mb-large form-pop">
            <form onSubmit={handleSaveSubscription} className="target-form-row">
              <div className="form-group">
                <label className="mono-label-sm">SERVICE NAME</label>
                <input type="text" className="dark-input" placeholder="e.g. Netflix, AWS" value={merchant} onChange={(e) => setMerchant(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="mono-label-sm">AMOUNT (PHP)</label>
                <div className="input-wrapper">
                  <span className="currency-symbol">₱</span>
                  <input type="number" className="dark-input pl-large" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="mono-label-sm">BILLING DATE</label>
                <input type="date" className="dark-input" value={billingDate} onChange={(e) => setBillingDate(e.target.value)} />
              </div>
              <button type="submit" className="btn-primary h-match">Deploy Tracker</button>
            </form>
          </div>
        )}

        <div className="recurring-kpi-grid mb-normal">
          <div className="dash-matte-card kpi-card">
            <div className="icon-box-modern text-primary mb-xs"><IconSync /></div>
            <p className="dash-sm-label">MONTHLY FIXED OUTFLOW</p>
            <h2 className="dash-md-amount text-primary">₱{totalMonthly.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
          </div>

          <div className="dash-matte-card kpi-card">
            <div className="icon-box-modern text-secondary mb-xs"><IconShield /></div>
            <p className="dash-sm-label">ANNUALIZED COMMITMENT</p>
            <h2 className="dash-md-amount">₱{annualizedCommitment.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
          </div>

          <div className="dash-matte-card kpi-card">
            <div className="icon-box-modern text-main mb-xs"><IconCalendar /></div>
            <p className="dash-sm-label">NEXT IMPENDING CHARGE</p>
            {nextCharge ? (
              <>
                <h2 className="dash-md-amount truncate-text">{nextCharge.description}</h2>
                <p className="dash-xs-text m-0 mt-xs font-bold" style={{ color: '#f97316' }}>₱{Number(nextCharge.amount).toLocaleString()} due in {nextCharge.daysLeft} days</p>
              </>
            ) : (
              <h2 className="dash-md-amount text-muted">No Data</h2>
            )}
          </div>
        </div>

        <div className="dash-matte-card">
          <div className="card-header-flex mb-normal">
            <h3 className="card-title">Active Trackers</h3>
            <span className="status-pill active-pill">{activeSubs.length} Running</span>
          </div>

          <div className="table-responsive">
            <table className="wf-table">
              <thead>
                <tr>
                  <th className="align-left">SERVICE / PAYEE</th>
                  <th className="align-left">CYCLE</th>
                  <th className="align-left">NEXT BILLING</th>
                  <th className="align-center">STATUS</th>
                  <th className="align-right">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="empty-text">No recurring subscriptions deployed.</td>
                  </tr>
                ) : (
                  subscriptions.map((sub) => {
                    const { nextDueDate, statusTag } = getNextBillingInfo(sub);
                    const isPaused = sub.isPaused || String(sub.isPaused) === 'true';
                    const isSelected = selectedSub?.id === sub.id;

                    return (
                      <tr
                        key={sub.id}
                        className={`clickable-row ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedSub(sub)}
                      >
                        <td className="align-left font-bold text-main">
                          <div className={`flex-align gap-normal ${isPaused ? 'dimmed-element' : ''}`}>
                            <div className="icon-box-dark ledger-box">
                              <IconRepeat />
                            </div>
                            <span style={{ fontSize: '0.95rem' }}>{sub.description}</span>
                          </div>
                        </td>
                        <td className="align-left">
                          <span className="dash-xs-text text-muted font-bold" style={{ textTransform: 'uppercase' }}>Monthly</span>
                        </td>
                        <td className="align-left">
                          <span className={`dash-xs-text font-bold ${isPaused ? 'text-muted' : 'text-main'}`} style={{ textTransform: 'uppercase' }}>
                            {nextDueDate ? nextDueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Suspended'}
                          </span>
                        </td>
                        <td className="align-center">
                          {statusTag.urgent || isPaused ? (
                            <span className="status-pill live-pill" style={{
                              background: isPaused ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239,68,68,0.15)',
                              color: statusTag.colorCode,
                              border: `1px solid ${statusTag.colorCode}40`
                            }}>
                              {statusTag.urgent && <span style={{ display: 'flex', marginRight: '4px' }}><IconAlert /></span>} {statusTag.text}
                            </span>
                          ) : (
                            <span className="status-pill active-pill">Active</span>
                          )}
                        </td>
                        <td className={`align-right font-bold ${isPaused ? 'text-muted' : 'text-primary'}`} style={{ fontSize: '1.05rem' }}>
                          -₱{Number(sub.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <aside className={`detail-side-panel ${selectedSub ? 'active' : ''}`}>
        {selectedSub && (() => {
          const { initDate, nextDueDate, daysLeft, statusTag } = getNextBillingInfo(selectedSub);
          const isPaused = selectedSub.isPaused || String(selectedSub.isPaused) === 'true';

          return (
            <>
              <div className="panel-top-bar">
                <h3 className="panel-title">Subscription Hub</h3>
                <button className="icon-btn-close" onClick={() => setSelectedSub(null)}><IconClose /></button>
              </div>

              <div className="panel-content-scroll custom-scrollbar">
                <div className="panel-hero align-left mb-large">
                  <h2 className={`hero-amount-text ${isPaused ? 'text-muted' : 'text-main'}`} style={{ fontSize: '2.2rem', margin: '0 0 8px 0' }}>{selectedSub.description}</h2>
                  <div className="flex-align gap-sm">
                    <p className={`dash-sm-label font-bold m-0 ${isPaused ? 'text-muted' : 'text-primary'}`}>₱{Number(selectedSub.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} / Month</p>
                  </div>
                </div>

                {daysLeft === 0 && !isPaused && (
                  <div className="dash-matte-card p-normal rounded-lg mb-large" style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                    <h3 className="text-alert m-0 mb-xs flex-align gap-sm"><IconCheck /> Billing Date Reached</h3>
                    <p className="dash-xs-text text-muted mb-normal">Has this subscription been paid? Mark it as paid to log the transaction and calculate the next rollover date.</p>
                    <button className="btn-primary w-full" onClick={(e) => handleMarkAsPaid(e, selectedSub)} style={{ background: 'var(--alert-red)', color: '#fff', justifyContent: 'center' }}>
                      Mark as Paid & Roll Cycle
                    </button>
                  </div>
                )}

                <div className="dash-matte-card p-normal rounded-lg mb-normal" style={{ padding: '20px', background: 'var(--input-bg)' }}>
                  <span className="mono-label-sm mb-normal display-block">BILLING TIMELINE</span>

                  <div className="flex-between mb-sm">
                    <span className="dash-xs-text text-muted font-bold">INITIATED DATE</span>
                    <span className="dash-xs-text text-white font-bold">{initDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>

                  <div className="flex-between mb-sm">
                    <span className="dash-xs-text text-muted font-bold">NEXT DUE DATE</span>
                    <span className={`dash-xs-text font-bold ${isPaused ? 'text-muted' : 'text-primary'}`}>
                      {nextDueDate ? nextDueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Suspended'}
                    </span>
                  </div>

                  <div className="flex-between">
                    <span className="dash-xs-text text-muted font-bold">DAYS REMAINING</span>
                    <span className={`dash-xs-text font-bold`} style={{ color: statusTag.colorCode }}>{daysLeft} {daysLeft !== '-' && 'Days'}</span>
                  </div>
                </div>

                <div className="dash-matte-card p-normal rounded-lg mb-normal" style={{ padding: '20px', background: 'var(--input-bg)' }}>
                  <div className="flex-align gap-sm mb-xs">
                    <span className={`icon-xs ${isPaused ? 'text-muted' : 'text-primary'}`} style={{ display: 'flex' }}><IconSync /></span>
                    <span className="mono-label-sm m-0">ANNUAL OVERHEAD ESTIMATE</span>
                  </div>
                  <h2 className={`dash-md-amount mt-xs ${isPaused ? 'text-muted' : 'text-main'}`} style={{ fontSize: '1.8rem' }}>₱{(Number(selectedSub.amount) * 12).toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
                  <p className="dash-xs-text text-muted m-0 mt-xs">Calculated over 12 billing cycles</p>
                </div>

                <div className="dash-matte-card p-normal rounded-lg mb-normal" style={{ padding: '20px', background: 'var(--input-bg)' }}>
                  <span className="mono-label-sm mb-normal display-block">CONTROL CENTER</span>

                  <div className="action-stack mt-normal">
                    {isPaused ? (
                      <button className="btn-primary w-full mb-normal flex-align gap-sm" style={{ justifyContent: 'center' }} onClick={(e) => executePauseToggle(e, selectedSub, false)}>
                        <span className="icon-small" style={{ display: 'flex' }}><IconPlay /></span> Unpause & Restart Cycle
                      </button>
                    ) : (
                      <button className="btn-secondary w-full mb-normal flex-align gap-sm" style={{ justifyContent: 'center' }} onClick={() => setPauseModal({ show: true, sub: selectedSub })}>
                        <span className="icon-small" style={{ display: 'flex' }}><IconPause /></span> Pause Tracker
                      </button>
                    )}

                    <button className="btn-action-danger w-full mt-xs flex-align gap-sm" style={{ justifyContent: 'center' }} onClick={() => setCancelModal({ show: true, sub: selectedSub })}>
                      <span className="icon-small" style={{ display: 'flex' }}><IconClose /></span> Cancel Subscription
                    </button>
                  </div>
                </div>
              </div>
            </>
          );
        })()}
      </aside>

    </div>
  );
}

export default Recurring;