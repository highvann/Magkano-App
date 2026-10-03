import { useState, useEffect } from 'react';
import './GoalsTracker.css';

// MATHEMATICAL ENGINE
const getGoalMetrics = (goal) => {
  const target = Number(goal.target_amount) || 1; 
  const saved = Math.min(Number(goal.saved_amount) || 0, target); 
  const progress = (saved / target) * 100;
  const isFinished = saved >= target;
  
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const tDate = new Date(goal.target_date);
  tDate.setHours(0,0,0,0);
  
  let createdDate = goal.created_at ? new Date(goal.created_at) : new Date(today.getFullYear(), 0, 1);
  createdDate.setHours(0,0,0,0);

  const totalDays = Math.max(Math.round((tDate - createdDate) / (1000 * 60 * 60 * 24)), 1);
  const daysElapsed = Math.max(Math.round((today - createdDate) / (1000 * 60 * 60 * 24)), 0);
  
  // Expiration logic
  const rawDaysRemaining = Math.round((tDate - today) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(rawDaysRemaining, 0);
  const isExpired = rawDaysRemaining < 0 && !isFinished;
  
  const timeProgress = Math.min(daysElapsed / totalDays, 1);
  const expectedAmount = target * timeProgress;
  const expectedPacePercentage = Math.min(timeProgress * 100, 100);
  
  const isAhead = saved >= expectedAmount;
  const varianceAmount = Math.abs(saved - expectedAmount);
  
  const dailyReq = daysRemaining > 0 ? Math.max((target - saved) / daysRemaining, 0) : 0;

  const avgDailySavings = daysElapsed > 0 ? saved / daysElapsed : 0;
  let projectedDaysRemaining = daysRemaining;
  if (isAhead && avgDailySavings > 0 && saved < target) {
    projectedDaysRemaining = Math.ceil((target - saved) / avgDailySavings);
  }

  return { 
    progress, expectedAmount, expectedPacePercentage, timeProgress, 
    isAhead, varianceAmount, dailyReq, daysRemaining, projectedDaysRemaining, 
    saved, target, createdDate, tDate, isFinished, isExpired
  };
};

function GoalsTracker() {
  const [goals, setGoals] = useState([]);
  const [selectedGoal, setSelectedGoal] = useState(null);
  
  const [currentLiquidity, setCurrentLiquidity] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [addFundsAmount, setAddFundsAmount] = useState('');
  const [newTargetDate, setNewTargetDate] = useState('');
  
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [confirmFunds, setConfirmFunds] = useState({ show: false, amount: '' });
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, goalId: null, title: '' });
  const [overfundWarning, setOverfundWarning] = useState({ show: false, maxAllowed: 0 });
  const [insufficientFunds, setInsufficientFunds] = useState(false);
  
  const [toast, setToast] = useState({ show: false, message: '' });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    const openId = sessionStorage.getItem('openGoalId');
    if (openId && goals.length > 0) {
      const found = goals.find(g => g.id.toString() === openId);
      if (found) setSelectedGoal(found);
      sessionStorage.removeItem('openGoalId');
    } else if (goals.length > 0 && !selectedGoal) {
      setSelectedGoal(goals[0]); 
    }
  }, [goals]);

  const fetchDashboardData = async () => {
    try {
      const [expRes, setRes, goalsRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/expenses`),
        fetch(`${import.meta.env.VITE_API_URL}/settings`),
        fetch(`${import.meta.env.VITE_API_URL}/goals`)
      ]);

      if (expRes.ok && setRes.ok) {
        const expensesData = await expRes.json();
        const settingsData = await setRes.json();
        const totalSpent = expensesData.reduce((sum, exp) => sum + Number(exp.amount), 0);
        setCurrentLiquidity(Number(settingsData.base_balance) - totalSpent);
      }

      if (goalsRes.ok) {
        setGoals(await goalsRes.json());
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handleSaveGoal = async (e) => {
    e.preventDefault();
    if (!title || !targetAmount || !targetDate) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          target_amount: targetAmount,
          target_date: targetDate,
          saved_amount: 0
        })
      });

      if (response.ok) {
        fetchDashboardData();
        setTitle(''); setTargetAmount(''); setTargetDate('');
        setShowForm(false);
      }
    } catch (error) {
      console.error("Error saving goal:", error);
    }
  };

  const handleAddFundsSubmit = (e) => {
    e.preventDefault();
    const amountToAdd = parseFloat(addFundsAmount);
    if (!selectedGoal || !amountToAdd || isNaN(amountToAdd)) return;

    if (amountToAdd > currentLiquidity) {
      setInsufficientFunds(true);
      return;
    }

    const currentSaved = Number(selectedGoal.saved_amount) || 0;
    const targetAmount = Number(selectedGoal.target_amount) || 1;
    const maxAllowed = targetAmount - currentSaved;

    if (amountToAdd > maxAllowed && maxAllowed > 0) {
      setOverfundWarning({ show: true, maxAllowed });
      return;
    }

    setConfirmFunds({ show: true, amount: amountToAdd });
  };

  const executeAddFunds = async () => {
    const amountToAdd = parseFloat(confirmFunds.amount);
    const currentSaved = Number(selectedGoal.saved_amount) || 0;
    const targetAmount = Number(selectedGoal.target_amount) || 1;
    
    let newSavedAmount = currentSaved + amountToAdd;
    if (newSavedAmount > targetAmount) newSavedAmount = targetAmount;

    const updatedGoal = { ...selectedGoal, saved_amount: newSavedAmount };
    setSelectedGoal(updatedGoal);
    setGoals(prevGoals => prevGoals.map(g => g.id === selectedGoal.id ? updatedGoal : g));
    
    setAddFundsAmount('');
    setConfirmFunds({ show: false, amount: '' });

    setToast({ show: true, message: `Successfully injected ₱${amountToAdd.toLocaleString()} into ${selectedGoal.title}.` });
    setTimeout(() => setToast({ show: false, message: '' }), 3500);

    try {
      await fetch(`${import.meta.env.VITE_API_URL}/goals/${selectedGoal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: updatedGoal.title,
          target_amount: updatedGoal.target_amount,
          target_date: updatedGoal.target_date,
          saved_amount: newSavedAmount
        })
      });

      await fetch(`${import.meta.env.VITE_API_URL}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: `Funded Target: ${selectedGoal.title}`,
          amount: amountToAdd,
          category: 'Goal Funding', 
          date: new Date().toISOString().split('T')[0],
          isrecurring: false
        })
      });

      fetchDashboardData();
    } catch (error) {
      console.error("Error syncing added funds to server:", error);
    }
  };

  const requestDelete = () => {
    if (selectedGoal) {
      setDeleteConfirm({ show: true, goalId: selectedGoal.id, title: selectedGoal.title });
    }
  };

  const executeDeleteGoal = async () => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/goals/${deleteConfirm.goalId}`, { method: 'DELETE' });
      setDeleteConfirm({ show: false, goalId: null, title: '' });
      setSelectedGoal(null);
      fetchDashboardData();
    } catch (error) {
      console.error("Error deleting goal:", error);
    }
  };

  const openAdjustModal = () => {
    if (selectedGoal) {
      const d = new Date(selectedGoal.target_date);
      if (!isNaN(d.getTime())) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        setNewTargetDate(`${yyyy}-${mm}-${dd}`);
      }
      setShowAdjustModal(true);
    }
  };

  const handleAdjustTimeline = async (e) => {
    e.preventDefault();
    if (!selectedGoal || !newTargetDate) return;

    const updatedGoal = { 
      ...selectedGoal, 
      target_date: newTargetDate + "T00:00:00Z" 
    };

    setSelectedGoal(updatedGoal);
    setGoals(prevGoals => prevGoals.map(g => g.id === selectedGoal.id ? updatedGoal : g));
    setShowAdjustModal(false);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/goals/${selectedGoal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: updatedGoal.title,
          target_amount: updatedGoal.target_amount,
          target_date: updatedGoal.target_date,
          saved_amount: updatedGoal.saved_amount
        })
      });
      if (response.ok) fetchDashboardData(); 
    } catch (error) {
      console.error("Error adjusting timeline:", error);
    }
  };


  const IconTarget = () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>;
  const IconTrendUp = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>;
  const IconTrendDown = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>;
  const IconSettings = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"></path><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"></path><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>;
  const IconCheckCircle = () => <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
  const IconCheckSmall = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;
  const IconTrash = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;

  return (
    <div className="wf-goals-canvas">
      
      {toast.show && (
        <div className="toast-notification">
          <span className="text-primary"><IconCheckSmall /></span> {toast.message}
        </div>
      )}

      {insufficientFunds && (
        <div className="wf-modal-overlay" onClick={() => setInsufficientFunds(false)}>
          <div className="dash-matte-card wf-modal shake-anim" onClick={e => e.stopPropagation()}>
            <span className="sad-cat-visual">😿</span>
            <h3 className="modal-title mb-xs text-white">Insufficient Liquidity</h3>
            <p className="modal-text mb-large">You do not have enough funds in your global balance to process this transaction. You currently have <strong className="text-primary">₱{currentLiquidity.toLocaleString()}</strong> available.</p>
            <button type="button" className="btn-secondary" onClick={() => setInsufficientFunds(false)}>Acknowledge</button>
          </div>
        </div>
      )}

      {overfundWarning.show && (
        <div className="wf-modal-overlay" onClick={() => setOverfundWarning({ show: false, maxAllowed: 0 })}>
          <div className="dash-matte-card wf-modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title mb-xs text-white">Target Exceeded</h3>
            <p className="modal-text mb-large">You only need <strong className="text-primary">₱{overfundWarning.maxAllowed.toLocaleString()}</strong> to complete this goal. Would you like to inject exactly this amount instead?</p>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setOverfundWarning({ show: false, maxAllowed: 0 })}>Cancel</button>
              <button type="button" className="btn-primary flex-1-center" onClick={() => {
                setAddFundsAmount(overfundWarning.maxAllowed.toString());
                setOverfundWarning({ show: false, maxAllowed: 0 });
                setConfirmFunds({ show: true, amount: overfundWarning.maxAllowed });
              }}>Auto-Adjust & Confirm</button>
            </div>
          </div>
        </div>
      )}

      {confirmFunds.show && (
        <div className="wf-modal-overlay" onClick={() => setConfirmFunds({ show: false, amount: '' })}>
          <div className="dash-matte-card wf-modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title mb-normal text-white">Confirm Injection</h3>
            <p className="modal-text mb-large">You are about to permanently inject <strong className="text-primary">₱{Number(confirmFunds.amount).toLocaleString()}</strong> into <strong>{selectedGoal?.title}</strong>. This will be deducted from your total balance.</p>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setConfirmFunds({ show: false, amount: '' })}>Cancel</button>
              <button type="button" className="btn-primary flex-1-center" onClick={executeAddFunds}>Confirm Deposit</button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm.show && (
        <div className="wf-modal-overlay" onClick={() => setDeleteConfirm({ show: false, goalId: null, title: '' })}>
          <div className="dash-matte-card wf-modal border-danger" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title mb-xs text-white">Abandon Target?</h3>
            <p className="modal-text mb-large">Are you sure you want to permanently delete <strong>{deleteConfirm.title}</strong>? This action cannot be undone and injected funds will not be refunded to your global balance.</p>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setDeleteConfirm({ show: false, goalId: null, title: '' })}>Cancel</button>
              <button type="button" className="btn-danger" onClick={executeDeleteGoal}>Abandon Target</button>
            </div>
          </div>
        </div>
      )}

      {showAdjustModal && (
        <div className="wf-modal-overlay" onClick={() => setShowAdjustModal(false)}>
          <div className="dash-matte-card wf-modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title mb-normal text-white">Adjust Timeline</h3>
            <p className="modal-text">Select a new target date for <strong>{selectedGoal?.title}</strong>. This will instantly recalculate your pace roadmap and requirements.</p>
            <form onSubmit={handleAdjustTimeline}>
              <div className="form-group mb-large align-left">
                <label>NEW TARGET DATE</label>
                <input type="date" className="dark-input" value={newTargetDate} onChange={(e) => setNewTargetDate(e.target.value)} required />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAdjustModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary flex-1-center">Confirm Pivot</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="goals-page-header">
        <div>
          <h1 className="page-title">Target Acquisitions</h1>
          <p className="page-subtitle">Track and optimize your path to major purchases.</p>
        </div>
        <div className="flex-align gap-normal">
          <p className="dash-sm-label text-muted m-0">Total Liquidity: <span className="text-white text-1rem">₱{currentLiquidity.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></p>
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ New Target'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="dash-matte-card split-horizon mb-large form-pop">
          <div className="split-horizon-header">
            <h3 className="card-title m-0">Initialize New Target</h3>
          </div>
          <div className="split-horizon-content">
            <form onSubmit={handleSaveGoal} className="target-form-row">
              <div className="form-group flex-2">
                <label>TARGET NAME</label>
                <input type="text" className="dark-input" placeholder="e.g. MacBook Pro, Vacations" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="form-group flex-1">
                <label>TARGET AMOUNT</label>
                <div className="input-wrapper">
                  <span className="currency-symbol">₱</span>
                  <input type="number" className="dark-input pl-large" placeholder="0.00" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} />
                </div>
              </div>
              <div className="form-group flex-1">
                <label>TARGET DATE</label>
                <input type="date" className="dark-input" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
              </div>
              <button type="submit" className="btn-primary h-match">Deploy</button>
            </form>
          </div>
        </div>
      )}

      <div className="goals-grid">
        
        {/* LEFT PANEL */}
        <div className="goals-list-col">
          {goals.length === 0 ? (
            <div className="dash-matte-card"><p className="empty-text">No active targets deployed.</p></div>
          ) : (
            goals.map((goal) => {
              const { progress, expectedPacePercentage, dailyReq, daysRemaining, projectedDaysRemaining, isAhead, createdDate, tDate, isFinished, isExpired } = getGoalMetrics(goal);
              const isSelected = selectedGoal && selectedGoal.id === goal.id;

              return (
                <div 
                  key={goal.id} 
                  className={`dash-matte-card split-horizon interactive-card ${isSelected ? 'selected-card' : ''}`}
                  onClick={() => setSelectedGoal(goal)}
                >
                  <div className="split-horizon-content p-normal">
                    <div className="card-header-flex mb-normal">
                      <div className="flex-align gap-normal">
                        <div className={`icon-box-modern ${isFinished ? 'text-primary' : 'text-primary'}`}>
                          {isFinished ? <IconCheckSmall /> : <IconTarget />}
                        </div>
                        <div>
                          <h2 className="card-title text-white text-1-3rem">{goal.title}</h2>
                          <span className="dash-xs-text text-muted">
                            {isFinished ? (
                              <strong className="text-primary">Acquisition Secured</strong>
                            ) : isExpired ? (
                              <strong className="text-alert">Timeline Expired</strong>
                            ) : (
                              <>Premium Upgrade • <strong className="text-white">
                                {isAhead && progress > 0 ? `${projectedDaysRemaining} Paced Days Left` : `${daysRemaining} Days Left`}
                              </strong></>
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="align-right">
                        <p className="dash-xs-text text-muted m-0 font-bold uppercase">TARGET</p>
                        <h2 className={`dash-md-amount ${isFinished ? 'text-primary' : 'text-primary'} text-1-4rem`}>₱{Number(goal.target_amount).toLocaleString()}</h2>
                      </div>
                    </div>

                    <div className="flex-between mb-xs mt-normal">
                      <span className="dash-sm-text font-bold text-white">₱{Number(goal.saved_amount).toLocaleString()} Saved</span>
                      <span className={`dash-xs-text font-bold ${isFinished || isAhead ? 'text-primary' : 'text-alert'}`}>
                        {progress.toFixed(1)}%
                      </span>
                    </div>
                    
                    <div className="progress-bar-bg-3d">
                      {!isFinished && !isExpired && (
                        <div 
                          className="pace-indicator-line" 
                          style={{ left: `${expectedPacePercentage}%` }}
                          title="Daily Requirement Pace"
                        />
                      )}

                      <div 
                        className={`progress-bar-fill-3d ${isFinished || isAhead ? 'fill-ahead' : 'fill-behind'}`} 
                        style={{ width: `${progress}%` }}
                      >
                        <div className="bar-3d-highlight"></div>
                      </div>
                    </div>

                    {isFinished ? (
                      <div className="finished-badge-container">
                        <span className="finished-badge"><IconCheckSmall /> GOAL ACCOMPLISHED</span>
                      </div>
                    ) : (
                      <div className="flex-between mt-normal padding-box-highlight">
                        <div className="flex-align gap-sm">
                          <div className="metric-block">
                            <p className="dash-xs-text text-muted m-0 font-bold uppercase tracking-wide">DAILY REQ.</p>
                            <p className={`dash-sm-text font-bold m-0 mt-xs ${isExpired ? 'text-alert' : 'text-white'}`}>
                              {isExpired ? 'Lapsed' : `₱${dailyReq > 0 ? dailyReq.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '0.00'}`}
                            </p>
                            <p className="dash-xs-text text-muted m-0 mt-xs font-bold text-xxs">Dynamic Pace</p>
                          </div>
                        </div>

                        <div className="align-right">
                          <p className="dash-xs-text text-muted m-0 font-bold uppercase tracking-wide mb-6px">
                            INIT: <span className="text-white">{createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </p>
                          <p className="dash-xs-text text-muted m-0 font-bold uppercase tracking-wide">
                            TARG: <span className="text-white">{tDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* RIGHT PANEL */}
        <div className="goal-detail-col">
          <div className="dash-matte-card split-horizon detail-sticky-card">
            {selectedGoal ? (() => {
              const { progress, expectedAmount, timeProgress, isAhead, varianceAmount, daysRemaining, saved, target, isFinished, createdDate, tDate, isExpired } = getGoalMetrics(selectedGoal);
              
              const svgW = 500; const svgH = 220;
              const padX = 30; const padY = 40; 
              const usableW = svgW - (padX * 2);
              const usableH = svgH - (padY * 2);
              
              const targetY1 = svgH - padY; 
              const targetY2 = padY; 
              
              const clampedTime = isFinished ? 1 : Math.min(Math.max(timeProgress, 0), 1);
              const actualX = padX + (clampedTime * usableW);
              const visualProgress = Math.min(progress, 100);
              const actualY = targetY1 - ((visualProgress / 100) * usableH);
              
              const expectedY = targetY1 - (clampedTime * usableH);
              
              const cpX = padX + (actualX - padX) * 0.5;
              const pathD = `M${padX},${targetY1} C${cpX},${targetY1} ${cpX},${actualY} ${actualX},${actualY}`;
              const areaD = `${pathD} L${actualX},${targetY1} Z`;

              return (
                <>
                  <div className="split-horizon-header flex-between">
                    <div>
                      <h3 className="card-title text-white mb-xs text-1-4rem">{selectedGoal.title}</h3>
                      <p className="dash-sm-text text-muted m-0">{isFinished ? 'Acquisition fully funded' : isExpired ? 'Timeline Expired' : `${daysRemaining} days remaining`}</p>
                    </div>
                    
                    <div className="flex-align gap-sm">
                      <span className={`status-pill ${isFinished ? 'active-pill' : (isAhead ? 'active-pill' : 'live-pill')}`}>
                        {isFinished ? <><IconCheckSmall /> ACQUIRED</> : (isAhead ? <><IconTrendUp /> Ahead</> : <><IconTrendDown /> Behind</>)}
                      </span>
                      <button className="icon-btn-small text-alert" title="Abandon Target" onClick={requestDelete}>
                        <IconTrash />
                      </button>
                    </div>
                  </div>

                  <div className="split-horizon-content">
                    <div className="mb-large">
                      <p className="dash-sm-label m-0 mb-normal uppercase">PACE ROADMAP</p>
                      
                      <div className="pace-graph-container">
                        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="pace-svg" preserveAspectRatio="xMidYMid meet">
                          <defs>
                            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor={isFinished || isAhead ? 'var(--accent-primary)' : 'var(--alert-red)'} stopOpacity="0.4" />
                              <stop offset="100%" stopColor={isFinished || isAhead ? 'var(--accent-primary)' : 'var(--alert-red)'} stopOpacity="0" />
                            </linearGradient>
                          </defs>

                          <line x1={padX} y1={padY} x2={svgW - padX} y2={padY} className="grid-line" />
                          <line x1={padX} y1={targetY1 - (usableH * 0.5)} x2={svgW - padX} y2={targetY1 - (usableH * 0.5)} className="grid-line" />
                          <line x1={padX} y1={targetY1} x2={svgW - padX} y2={targetY1} className="grid-line" />
                          
                          <line x1={padX} y1={targetY1} x2={svgW - padX} y2={targetY2} className="trajectory-line" />
                          
                          <path d={areaD} fill="url(#areaGradient)" className="anim-path" />
                          <path d={pathD} className={`actual-line anim-path ${isFinished || isAhead ? 'ahead' : 'behind'}`} />
                          
                          <circle cx={svgW - padX} cy={targetY2} r="4" className={`target-node ${isFinished ? 'secured-target-node' : ''}`} />
                          <text x={svgW - padX} y={targetY2 - 12} className="axis-label" textAnchor="end" fill="var(--text-main)" fontSize="12" fontWeight="700">₱{target.toLocaleString()}</text>

                          <line x1={actualX} y1={actualY} x2={actualX} y2={targetY1} className="guide-line" />
                          <text x={actualX} y={targetY1 + 20} className="axis-label axis-label-anim" textAnchor="middle" fill="var(--text-main)" fontSize="11" fontWeight="700">
                            {isExpired ? 'TIMELINE EXPIRED' : (isFinished ? 'COMPLETED' : 'TODAY')}
                          </text>

                          <g className="roadmap-node-group" style={{ transform: `translate(${actualX}px, 0px)` }}>
                            {!isFinished && !isExpired && (
                              <>
                                <line x1="0" y1={actualY} x2="0" y2={expectedY} className="variance-line" />
                                <circle cx="0" cy={expectedY} r="4" className="expected-node" />
                              </>
                            )}
                            
                            <circle cx="0" cy={actualY} r="7" className={`actual-node ${isFinished || isAhead ? 'ahead-node' : 'behind-node'}`} />
                            <circle cx="0" cy={actualY} r="40" fill="transparent" className="hover-hitbox" />

                            <g className="roadmap-tooltip" style={{ transform: `translate(0, ${Math.min(actualY, expectedY) - 10}px)` }}>
                              <rect x="-85" y="-80" width="170" height="74" rx="8" fill="var(--surface-matte)" stroke="var(--border-light)" filter="drop-shadow(0 8px 16px rgba(0,0,0,0.5))" />
                              <text x="0" y="-60" fill={isFinished || isAhead ? 'var(--accent-primary)' : 'var(--alert-red)'} fontSize="11" fontWeight="800" textAnchor="middle" className="tracking-wider">
                                {isFinished ? 'TARGET SECURED' : (isAhead ? `+₱${varianceAmount.toLocaleString(undefined, {maximumFractionDigits: 0})} AHEAD` : `-₱${varianceAmount.toLocaleString(undefined, {maximumFractionDigits: 0})} BEHIND`)}
                              </text>
                              <text x="0" y="-42" fill="var(--text-muted)" fontSize="10" fontWeight="600" textAnchor="middle">
                                Saved: <tspan fill="var(--text-main)">₱{saved.toLocaleString(undefined, {maximumFractionDigits: 0})}</tspan>
                              </text>
                              <text x="0" y="-26" fill="var(--text-muted)" fontSize="10" fontWeight="600" textAnchor="middle">
                                Expected: <tspan fill="var(--text-main)">₱{expectedAmount.toLocaleString(undefined, {maximumFractionDigits: 0})}</tspan>
                              </text>
                            </g>
                          </g>
                        </svg>
                      </div>
                    </div>

                    {isFinished ? (
                      <div className="finished-celebration-box mt-large">
                        <div className="celebration-icon"><IconCheckCircle /></div>
                        <h2 className="celebration-title">Target Acquired</h2>
                        
                        {daysRemaining > 0 && (
                          <div className="early-success-badge">
                             Goal reached {daysRemaining} days ahead of schedule!
                          </div>
                        )}

                        <p className="celebration-text">You have successfully secured <strong className="text-white">₱{target.toLocaleString()}</strong> for this acquisition.</p>
                        
                        <div className="celebration-dates">
                          <div className="date-pill">
                            <span className="date-label">INITIATED</span>
                            <span className="date-value">{createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                          <div className="date-pill highlight-pill">
                            <span className="date-label">COMPLETED</span>
                            <span className="date-value">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                          <div className="date-pill">
                            <span className="date-label">TARGET</span>
                            <span className="date-value">{tDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {/* 1. TIMELINE LAPSED WARNING */}
                        {isExpired && !showAdjustModal && (
                          <div className="dash-matte-card mt-normal mb-normal alert-banner">
                            <h4 className="text-alert m-0 mb-xs">Timeline Lapsed</h4>
                            <p className="dash-xs-text text-muted mb-normal">This goal reached its target date but the funds are incomplete. You can adjust the timeline to resume tracking.</p>
                            <button className="btn-secondary w-full btn-outline-alert" onClick={openAdjustModal}>
                              Resume & Adjust Timeline
                            </button>
                          </div>
                        )}

                        <p className="dash-sm-label m-0 mb-normal uppercase">ACTIONS</p>
                        
                        <form className="add-funds-row mb-normal" onSubmit={handleAddFundsSubmit}>
                          <div className="add-funds-input-container">
                            <span className="icon-xs text-muted input-icon-left"><IconSettings /></span>
                            <input 
                              type="number" 
                              className="dark-input pl-xl" 
                              placeholder="Injection amount..." 
                              value={addFundsAmount}
                              onChange={(e) => setAddFundsAmount(e.target.value)}
                              required
                            />
                          </div>
                          <button type="submit" className="btn-secondary add-funds-btn">
                            ⊕ Add Funds
                          </button>
                        </form>

                        <button type="button" className="btn-primary w-full flex-center" onClick={openAdjustModal}>
                          <span className="icon-margin-right"><IconSettings /></span> Adjust Timeline
                        </button>
                      </div>
                    )}
                  </div>
                </>
              );
            })() : (
              <div className="empty-state-center">
                <div className="icon-box-modern text-muted mb-normal empty-icon-lg"><IconTarget /></div>
                <h3 className="card-title text-white">No Target Selected</h3>
                <p className="dash-sm-text text-muted text-center mt-xs">Select a target acquisition to view its pace roadmap and control center.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default GoalsTracker;