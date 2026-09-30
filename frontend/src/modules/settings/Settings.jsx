import { useState } from 'react';
import './Settings.css';

function Settings() {
  const [privacyBlur, setPrivacyBlur] = useState(true);
  const [aiCategorize, setAiCategorize] = useState(true);
  const [billReminders, setBillReminders] = useState(true);
  const [goalMilestones, setGoalMilestones] = useState(false);

  const IconGear = () => <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;

  return (
    <div className="wf-settings-canvas">
      <div className="profile-header">
        <h1 className="page-title flex-align gap-sm"><IconGear /> Settings</h1>
        <p className="page-subtitle">Personalize your application experience and features.</p>
      </div>

      <div className="settings-grid">
        {/* Privacy & Display */}
        <div className="dash-matte-card split-horizon">
          <div className="split-horizon-header"><h3 className="card-title">Privacy & Display</h3></div>
          <div className="split-horizon-content">
            <div className="setting-row">
              <div className="setting-info">
                <h4>Smart Privacy Blur</h4>
                <p>Hide total balances automatically when opening the app.</p>
              </div>
              <label className="switch">
                <input type="checkbox" checked={privacyBlur} onChange={() => setPrivacyBlur(!privacyBlur)} />
                <span className="slider"></span>
              </label>
            </div>
            <div className="setting-row">
              <div className="setting-info">
                <h4>AI Auto-Categorization</h4>
                <p>Let AI suggest categories based on merchant names.</p>
              </div>
              <label className="switch">
                <input type="checkbox" checked={aiCategorize} onChange={() => setAiCategorize(!aiCategorize)} />
                <span className="slider"></span>
              </label>
            </div>
            <div className="setting-row" style={{border: 'none'}}>
              <div className="setting-info">
                <h4>Ledger Display Density</h4>
                <p>Choose how tightly packed your transaction rows are.</p>
              </div>
              <select className="dark-input" style={{width: '130px'}}>
                <option>Comfortable</option>
                <option>Compact</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notifications & Reminders */}
        <div className="dash-matte-card split-horizon" style={{height: 'max-content'}}>
          <div className="split-horizon-header"><h3 className="card-title">Notifications & Reminders</h3></div>
          <div className="split-horizon-content">
            <div className="setting-row">
              <div className="setting-info">
                <h4>Bill Reminders</h4>
                <p>Receive alerts for upcoming recurring subscriptions.</p>
              </div>
              <label className="switch">
                <input type="checkbox" checked={billReminders} onChange={() => setBillReminders(!billReminders)} />
                <span className="slider"></span>
              </label>
            </div>
            <div className="setting-row" style={{border: 'none'}}>
              <div className="setting-info">
                <h4>Goal Milestones</h4>
                <p>Celebrate when you hit savings percentage milestones.</p>
              </div>
              <label className="switch">
                <input type="checkbox" checked={goalMilestones} onChange={() => setGoalMilestones(!goalMilestones)} />
                <span className="slider"></span>
              </label>
            </div>
          </div>
        </div>

        {/* Data Export (Moved to its own clean section) */}
        <div className="dash-matte-card split-horizon" style={{height: 'max-content', gridColumn: '1 / -1'}}>
          <div className="split-horizon-header"><h3 className="card-title">Data Management</h3></div>
          <div className="split-horizon-content">
            <div className="setting-row" style={{border: 'none'}}>
              <div className="setting-info">
                <h4>Download Monthly Report</h4>
                <p>Export a clean CSV file of your recent financial activity for your personal records.</p>
              </div>
              <button className="btn-secondary settings-btn-fit">Download .csv</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Settings;