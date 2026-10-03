import { useState, useEffect, useCallback } from 'react';
import './dashboard.css';

const getNextBillingInfo = (sub) => {
  const initDateStr = sub.date;
  const initDate = new Date(initDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (sub.isPaused || String(sub.isPaused) === 'true') {
    return { daysLeft: '-', text: "PAUSED", colorCode: "#f59e0b" };
  }

  let nextDueDate = new Date(today.getFullYear(), today.getMonth(), initDate.getDate());
  if (nextDueDate < today) {
    nextDueDate.setMonth(nextDueDate.getMonth() + 1);
  }

  const diffTime = nextDueDate - today;
  const daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  if (daysLeft === 0) return { daysLeft, text: "DUE TODAY", colorCode: "var(--alert-red)" };
  if (daysLeft === 1 || daysLeft === 2) return { daysLeft, text: `DUE IN ${daysLeft}D`, colorCode: "#f97316" };
  if (daysLeft === 3) return { daysLeft, text: "DUE IN 3D", colorCode: "#eab308" };
  
  return { daysLeft, text: null, colorCode: null };
};

const IconLedger = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>;
const IconRepeat = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>;
const IconChart = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>;
const IconTarget = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>;
const IconArrowRight = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>;
const IconAlert = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg>
);
const IconCheckSm = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const getCategoryIcon = (category) => {
  const cat = category?.toLowerCase() || '';
  if (cat.includes('tech') || cat.includes('electronic')) return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>;
  if (cat.includes('food') || cat.includes('dining') || cat.includes('lifestyle')) return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"></path><path d="M7 2v20"></path><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"></path></svg>;
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;
};

function Dashboard({ setActiveTab, userProfile }) {
  const [expenses, setExpenses] = useState([]);
  const [goals, setGoals] = useState([]);
  const [baseBalance, setBaseBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [cardTheme, setCardTheme] = useState('obsidian');

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [expRes, setRes, goalsRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/expenses`),
        fetch(`${import.meta.env.VITE_API_URL}/settings`),
        fetch(`${import.meta.env.VITE_API_URL}/goals`)
      ]);

      if (!expRes.ok || !setRes.ok || !goalsRes.ok) {
        throw new Error('Failed to retrieve financial data from one or more services');
      }

      const [expData, setData, goalsData] = await Promise.all([
        expRes.json(),
        setRes.json(),
        goalsRes.json()
      ]);

      setExpenses(Array.isArray(expData) ? expData : []);
      setGoals(Array.isArray(goalsData) ? goalsData : []);
      setBaseBalance(Number(setData.base_balance) || 0);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError(err.message || "Failed to connect to the backend server");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDashboardData();
  }, [fetchDashboardData]);

  const safeExpenses = Array.isArray(expenses) ? expenses : [];
  const safeGoals = Array.isArray(goals) ? goals : [];
  const totalSpent = safeExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  const currentLiquidity = baseBalance - totalSpent;
  const liquidityRatio = baseBalance > 0 ? Math.min(100, Math.max(0, Math.round((currentLiquidity / baseBalance) * 100))) : 0;

  const totalGoalsTarget = safeGoals.reduce((sum, g) => sum + (Number(g.target_amount) || 0), 0);
  const totalGoalsSaved = safeGoals.reduce((sum, g) => sum + (Number(g.saved_amount) || 0), 0);
  const aggregateGoalsProgress = totalGoalsTarget > 0 ? Math.min(100, Math.round((totalGoalsSaved / totalGoalsTarget) * 100)) : 0;
  const completedGoalsCount = safeGoals.filter(g => (Number(g.saved_amount) || 0) >= (Number(g.target_amount) || 1)).length;

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const monthlyExpenses = safeExpenses.filter(exp => {
    const d = new Date(exp.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const monthlyOutflow = monthlyExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  const currentDay = new Date().getDate() || 1;
  const avgDailySpend = monthlyOutflow / currentDay;

  const categoryTotals = {};
  monthlyExpenses.forEach(exp => {
    categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + Number(exp.amount);
  });
  
  const sortedCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([name, amount]) => ({
      name,
      amount,
      percent: monthlyOutflow > 0 ? Math.round((amount / monthlyOutflow) * 100) : 0
    }))
    .slice(0, 4);

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

  const recurringSubscriptions = safeExpenses.filter(exp => exp.isrecurring === true || String(exp.isRecurring) === 'true' || exp.isRecurring === true).slice(0, 4);

  const handleLedgerClick = (tx) => {
    sessionStorage.setItem('openTxId', tx.id);
    if (setActiveTab) setActiveTab('history');
  };

  const handleNavigate = (tab) => {
    if (setActiveTab) setActiveTab(tab);
  };

  const handleGoalClick = (goalId) => {
    sessionStorage.setItem('openGoalId', goalId);
    if (setActiveTab) setActiveTab('goals');
  };

  const handleAnalyticsClick = (categoryName) => {
    sessionStorage.setItem('openAnalyticsCategory', categoryName);
    if (setActiveTab) setActiveTab('analytics');
  };

  const selectTheme = (themeName) => {
    setCardTheme(themeName);
    setShowThemeModal(false);
  };

  const cardThemes = [
    { id: 'obsidian', name: 'Obsidian Black' },
    { id: 'sapphire', name: 'Royal Sapphire' },
    { id: 'indigo', name: 'Deep Indigo' },
    { id: 'ruby', name: 'Crimson Ruby' },
    { id: 'titanium', name: 'Titanium Silver' }
  ];

  return (
    <div className="wf-dash-canvas">
      
      {showThemeModal && (
        <div className="wf-modal-overlay" onClick={() => setShowThemeModal(false)}>
          <div className="dash-matte-card wf-modal theme-select-modal" onClick={e => e.stopPropagation()}>
            <div className="flex-between mb-large">
               <h3 className="modal-title m-0 text-white">Select Card Design</h3>
               <button className="icon-btn-close" onClick={() => setShowThemeModal(false)}>✕</button>
            </div>
            <div className="theme-options-grid custom-scrollbar">
              {cardThemes.map(theme => (
                <div key={theme.id} className={`mini-card-preview theme-${theme.id}`} onClick={() => selectTheme(theme.id)}>
                  <div className="mini-card-bg shape-1"></div>
                  <div className="mini-card-bg shape-2"></div>
                  <div className="mini-card-top">
                    <span className="mini-amount">₱{currentLiquidity.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    <span className="mini-dots">•••</span>
                  </div>
                  <span className="mini-label">BALANCE</span>
                  <div className="mini-progress-bar"><div className="mini-progress-fill"></div></div>
                  <div className="mini-card-bottom">
                    <span className="mini-number">**** **** **** 4026</span>
                    <div className="mini-brand-logo">
                      <div className="circle-red"></div>
                      <div className="circle-yellow"></div>
                    </div>
                  </div>
                  <div className="mini-card-overlay-name">{theme.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="dash-matte-card dash-error-card mb-large" role="alert">
          <div className="dash-error-content">
            <div className="dash-error-icon-box text-alert">
              <IconAlert />
            </div>
            <div className="dash-error-text">
              <h4 className="dash-error-title">Unable to synchronize dashboard</h4>
              <p className="dash-error-desc">{error}. Verify the backend server is running on port 5000.</p>
            </div>
            <button className="btn-browse-all btn-retry-action" onClick={fetchDashboardData}>
              RETRY CONNECTION
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="dash-grid">
          <div className="dash-col-left">
            <div className="dashboard-greeting mb-large">
              <div className="dash-skeleton-text skeleton-greeting-title"></div>
              <div className="dash-skeleton-text skeleton-greeting-sub"></div>
            </div>

            <div className="dash-matte-card skeleton-card-hero">
              <div className="dash-skeleton-text skeleton-hero-amount"></div>
              <div className="dash-skeleton-text skeleton-hero-label"></div>
              <div className="dash-skeleton-meter skeleton-hero-bar"></div>
              <div className="flex-between mt-large">
                <div className="dash-skeleton-text skeleton-hero-digits"></div>
                <div className="dash-skeleton-box skeleton-hero-logo"></div>
              </div>
            </div>

            <div className="dash-matte-card split-horizon ledger-card">
              <div className="split-horizon-header">
                <div className="flex-align gap-sm">
                  <span className="icon-xs text-muted icon-wrapper"><IconLedger /></span>
                  <div className="dash-skeleton-text skeleton-header-title"></div>
                </div>
                <div className="dash-skeleton-box skeleton-btn-pill"></div>
              </div>
              <div className="split-horizon-content">
                <div className="ledger-list-container">
                  {[1, 2, 3, 4].map(idx => (
                    <div key={idx} className="ledger-row-item skeleton-row">
                      <div className="ledger-left">
                        <div className="dash-skeleton-box skeleton-icon-box"></div>
                        <div className="ledger-details">
                          <div className="dash-skeleton-text skeleton-row-name"></div>
                          <div className="dash-skeleton-text skeleton-row-meta"></div>
                        </div>
                      </div>
                      <div className="dash-skeleton-text skeleton-row-amount"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="dash-col-right">
            <div className="dash-matte-card split-horizon">
              <div className="split-horizon-header">
                <div className="flex-align gap-sm">
                  <div className="icon-box-dark small-box text-secondary"><IconRepeat /></div>
                  <div className="dash-skeleton-text skeleton-header-title"></div>
                </div>
              </div>
              <div className="split-horizon-content compact-content">
                <div className="ledger-list-container">
                  {[1, 2].map(idx => (
                    <div key={idx} className="ledger-row-item skeleton-row">
                      <div className="ledger-left">
                        <div className="dash-skeleton-box skeleton-icon-box"></div>
                        <div className="ledger-details">
                          <div className="dash-skeleton-text skeleton-row-name"></div>
                          <div className="dash-skeleton-text skeleton-row-meta"></div>
                        </div>
                      </div>
                      <div className="dash-skeleton-text skeleton-row-amount"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="dash-matte-card split-horizon">
              <div className="split-horizon-header">
                <div className="dash-skeleton-text skeleton-header-sm"></div>
                <span className="icon-xs text-primary icon-wrapper"><IconChart /></span>
              </div>
              <div className="split-horizon-content compact-content">
                <div className="analytics-highlight-box mb-normal skeleton-highlight">
                  <div className="dash-skeleton-text skeleton-highlight-label"></div>
                  <div className="dash-skeleton-text skeleton-highlight-val"></div>
                </div>
                <div className="analytics-progress-list">
                  {[1, 2].map(idx => (
                    <div key={idx} className="ledger-row-item skeleton-row mb-sm analytics-category-row">
                      <div className="flex-between mb-xs">
                        <div className="dash-skeleton-text skeleton-cat-name"></div>
                        <div className="dash-skeleton-text skeleton-cat-pct"></div>
                      </div>
                      <div className="dash-skeleton-meter"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="dash-matte-card split-horizon">
              <div className="split-horizon-header">
                <div className="flex-align gap-sm">
                  <span className="icon-xs text-main icon-wrapper"><IconTarget /></span>
                  <div className="dash-skeleton-text skeleton-header-title"></div>
                </div>
                <div className="dash-skeleton-box skeleton-btn-circle"></div>
              </div>
              <div className="split-horizon-content compact-content">
                <div className="widget-list">
                  {[1, 2].map(idx => (
                    <div key={idx} className="goal-mini-item skeleton-row">
                      <div className="flex-between mb-xs">
                        <div className="dash-skeleton-text skeleton-goal-title"></div>
                        <div className="dash-skeleton-text skeleton-goal-meta"></div>
                      </div>
                      <div className="dash-skeleton-meter"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="dash-grid">
          <div className="dash-col-left">
            <div className="dashboard-greeting mb-large">
              <h1 className="greeting-title text-main">Hello {userProfile?.firstName || 'User'},</h1> 
              <p className="greeting-subtitle text-muted">Overview of your current liquidity and active capital allocations.</p>
            </div>

            <div className={`premium-card-module theme-${cardTheme}`}>
              <div className="card-bg-shape shape-1"></div>
              <div className="card-bg-shape shape-2"></div>
              <div className="card-top-row">
                <h1 className="card-amount">₱{currentLiquidity.toLocaleString(undefined, {minimumFractionDigits: 2})}</h1>
                <button className="card-options-btn" onClick={() => setShowThemeModal(true)}>•••</button>
              </div>
              <span className="card-label">Balance</span>
              <div className="card-progress-bar mt-normal" title={`Liquidity Retention: ${liquidityRatio}%`}>
                <div className="card-progress-fill" style={{ width: `${liquidityRatio}%` }}></div>
              </div>
              <div className="card-meta-row mt-xs flex-between">
                <span className="card-meta-text">{liquidityRatio}% Liquidity Retained</span>
                <span className="card-meta-text">Mtd Outflow: ₱{monthlyOutflow.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
              </div>
              <div className="card-bottom-row mt-large">
                <span className="card-number">**** **** **** 4026</span>
                <div className="card-brand-logo">
                  <div className="circle-red"></div>
                  <div className="circle-yellow"></div>
                </div>
              </div>
            </div>

            <div className="dash-matte-card split-horizon ledger-card">
              <div className="split-horizon-header">
                <div className="flex-align gap-sm">
                  <span className="icon-xs text-muted icon-wrapper"><IconLedger /></span>
                  <h3 className="card-title">Ledger</h3>
                </div>
                <button className="btn-browse-all" onClick={() => handleNavigate('history')}>
                  BROWSE ALL <IconArrowRight />
                </button>
              </div>
              <div className="split-horizon-content">
                <div className="ledger-list-container">
                  {recentTransactions.length === 0 ? (
                    <p className="empty-text">No recent transactions.</p>
                  ) : (
                    recentTransactions.map((tx) => (
                      <div key={tx.id} className="ledger-row-item interactive-row" onClick={() => handleLedgerClick(tx)}>
                        <div className="ledger-left">
                          <div className="icon-box-dark ledger-box">{getCategoryIcon(tx.category)}</div>
                          <div className="ledger-details">
                            <p className="ledger-name">{tx.description}</p>
                            <p className="ledger-meta">
                              {tx.category.toUpperCase()} • {new Date(tx.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        <div className="ledger-right">
                          <p className="ledger-amount text-primary font-bold no-underline font-mono">-₱{Number(tx.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="dash-col-right">
            
            <div className="dash-matte-card split-horizon">
              <div className="split-horizon-header">
                <div className="flex-align gap-sm">
                  <div className="icon-box-dark small-box text-secondary"><IconRepeat /></div>
                  <h3 className="card-title m-0">Recurring Subscriptions</h3>
                </div>
              </div>
              <div className="split-horizon-content compact-content">
                <div className="ledger-list-container">
                  {recurringSubscriptions.length === 0 ? (
                    <p className="empty-text m-0">No active subscriptions.</p>
                  ) : (
                    recurringSubscriptions.map(sub => {
                      const status = getNextBillingInfo(sub);
                      return (
                        <div 
                          key={sub.id} 
                          className="ledger-row-item interactive-row" 
                          onClick={() => {
                            sessionStorage.setItem('openSubscriptionId', sub.id); 
                            if (setActiveTab) setActiveTab('subscriptions'); 
                          }}
                        >
                          <div className="ledger-left">
                            <div className="icon-box-dark ledger-box"><IconRepeat /></div>
                            <div className="ledger-details">
                              <p className="ledger-name">{sub.description}</p>
                              <div className="ledger-meta flex-align gap-sm mt-xs">
                                MONTHLY • DAY {new Date(sub.date).getDate()}
                                {status.text && (
                                   <span className="status-pill status-pill-sm" style={{
                                     background: `${status.colorCode}20`, 
                                     color: status.colorCode, 
                                     border: `1px solid ${status.colorCode}50`
                                   }}>
                                     {status.text}
                                   </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="ledger-right">
                            <p className="ledger-amount text-primary font-bold no-underline font-mono">-₱{Number(sub.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="dash-matte-card split-horizon">
              <div className="split-horizon-header">
                <p className="dash-sm-label m-0">TRANSACTION ANALYTICS</p>
                <span className="icon-xs text-primary icon-wrapper"><IconChart /></span>
              </div>
              <div className="split-horizon-content compact-content">
                <div className="analytics-highlight-box mb-normal">
                  <span className="dash-xs-text text-muted font-bold uppercase tracking-widest">Avg. Daily Spend</span>
                  <h2 className="dash-md-amount text-primary m-0 mt-xs font-mono">₱{avgDailySpend.toLocaleString(undefined, {minimumFractionDigits: 2})}</h2>
                </div>
                
                <div className="analytics-progress-list">
                  {sortedCategories.length === 0 ? (
                    <p className="empty-text m-0">No data for this cycle.</p>
                  ) : (
                    sortedCategories.map((cat, index) => (
                      <div key={index} className="ledger-row-item interactive-row mb-sm analytics-category-row" onClick={() => handleAnalyticsClick(cat.name)}>
                        <div className="flex-between mb-xs">
                          <span className="dash-sm-text font-bold text-main">{cat.name}</span>
                          <span className="dash-xs-text text-primary font-bold font-mono">{cat.percent}%</span>
                        </div>
                        <div className="progress-bar-bg">
                          <div className="progress-bar-fill primary-fill" style={{width: `${cat.percent}%`}}></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="dash-matte-card split-horizon">
              <div className="split-horizon-header">
                <div className="flex-align gap-sm">
                  <span className="icon-xs text-main icon-wrapper"><IconTarget /></span>
                  <h3 className="card-title">Target Acquisitions</h3>
                </div>
                <button className="icon-btn-small" onClick={(e) => { e.stopPropagation(); handleNavigate('goals'); }}>+</button>
              </div>
              <div className="split-horizon-content compact-content">
                
                {/* Aggregate Goals Milestone Accumulator */}
                {safeGoals.length > 0 && (
                  <div className="goals-aggregate-card mb-normal">
                    <div className="flex-between mb-xs">
                      <span className="dash-xs-text text-muted font-bold uppercase tracking-widest">
                        Portfolio Targets ({completedGoalsCount}/{safeGoals.length} Completed)
                      </span>
                      <span className={`goal-pct-pill ${aggregateGoalsProgress >= 100 ? 'pct-completed' : ''}`}>
                        {aggregateGoalsProgress}%
                      </span>
                    </div>
                    <div className="dash-progress-track">
                      <div 
                        className={`dash-progress-fill ${aggregateGoalsProgress >= 100 ? 'fill-completed' : ''}`} 
                        style={{ width: `${aggregateGoalsProgress}%` }}
                      ></div>
                    </div>
                    <div className="flex-between mt-xs dash-xs-text text-muted font-mono">
                      <span>₱{totalGoalsSaved.toLocaleString()} accumulated</span>
                      <span>₱{totalGoalsTarget.toLocaleString()} total</span>
                    </div>
                  </div>
                )}

                <div className="widget-list target-scroll-container custom-scrollbar">
                  {safeGoals.length === 0 ? (
                    <div className="empty-goals-state">
                      <div className="empty-goals-icon"><IconTarget /></div>
                      <p className="empty-goals-title">No active financial goals</p>
                      <p className="empty-goals-subtitle">Define target acquisitions to track your savings progress.</p>
                      <button className="btn-browse-all btn-create-goal" onClick={(e) => { e.stopPropagation(); handleNavigate('goals'); }}>
                        + SET A GOAL
                      </button>
                    </div>
                  ) : (
                    safeGoals.map(goal => {
                      const saved = Number(goal.saved_amount) || 0;
                      const target = Number(goal.target_amount) || 1;
                      const rawProgress = target > 0 ? (saved / target) * 100 : 0;
                      const progress = Math.min(Math.max(rawProgress, 0), 100);
                      const isCompleted = saved >= target;
                      const remaining = Math.max(0, target - saved);

                      let daysLeftText = null;
                      let isOverdue = false;
                      if (goal.target_date) {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const tDate = new Date(goal.target_date);
                        tDate.setHours(0, 0, 0, 0);
                        const diffDays = Math.ceil((tDate - today) / (1000 * 60 * 60 * 24));
                        if (diffDays < 0 && !isCompleted) {
                          daysLeftText = 'OVERDUE';
                          isOverdue = true;
                        } else if (diffDays === 0 && !isCompleted) {
                          daysLeftText = 'DUE TODAY';
                        } else if (diffDays > 0 && !isCompleted) {
                          daysLeftText = `${diffDays}D LEFT`;
                        }
                      }

                      return (
                        <div key={goal.id} className="goal-mini-item interactive-row" onClick={(e) => { e.stopPropagation(); handleGoalClick(goal.id); }}>
                          <div className="flex-between mb-xs">
                            <div className="flex-align gap-sm goal-title-wrap">
                              <span className={`dot ${isCompleted ? 'bg-completed' : isOverdue ? 'bg-alert' : 'bg-primary'}`}></span>
                              <span className="dash-sm-text text-main goal-title-text">{goal.title}</span>
                              {isCompleted ? (
                                <span className="goal-status-badge badge-completed">
                                  <IconCheckSm /> COMPLETED
                                </span>
                              ) : daysLeftText ? (
                                <span className={`goal-status-badge ${isOverdue ? 'badge-overdue' : 'badge-days'}`}>
                                  {daysLeftText}
                                </span>
                              ) : null}
                            </div>
                            <div className="flex-align gap-xs goal-values-wrap">
                              <span className="dash-xs-text text-muted font-mono font-bold no-underline">
                                ₱{saved.toLocaleString()} / ₱{target.toLocaleString()}
                              </span>
                              <span className={`goal-pct-pill ${isCompleted ? 'pct-completed' : ''}`}>
                                {Math.round(progress)}%
                              </span>
                            </div>
                          </div>
                          <div className="dash-progress-track">
                            <div 
                              className={`dash-progress-fill ${isCompleted ? 'fill-completed' : ''}`} 
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                          <div className="flex-between mt-xs goal-sub-meta">
                            <span className="dash-xs-text text-muted font-mono">
                              {isCompleted ? 'Target fully accumulated' : `₱${remaining.toLocaleString()} remaining`}
                            </span>
                            {goal.target_date && (
                              <span className="dash-xs-text text-muted font-mono">
                                Target: {new Date(goal.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;