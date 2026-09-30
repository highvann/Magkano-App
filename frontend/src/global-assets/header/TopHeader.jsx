import { useState, useEffect } from 'react';
import './TopHeader.css';

function TopHeader({ theme, toggleTheme, setActiveTab }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const IconSearch = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
  const IconSun = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>;
  const IconMoon = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>;
  const IconBell = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>;
  const IconAlertCircle = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>;
  const IconRepeat = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>;

  const notifications = [
    { id: 1, type: 'urgent', title: "Netflix Due Today", message: "Your recurring bill of ₱1,200 for Netflix is due today.", icon: <IconRepeat /> },
    { id: 2, type: 'warning', title: "Timeline Lapsed", message: "Your target for 'Boracay' has missed its target deadline.", icon: <IconAlertCircle /> },
    { id: 3, type: 'info', title: "System Active", message: "All transactions and analytics are up to date.", icon: <IconBell /> }
  ];

  return (
    <header className="top-header">
      <div className="search-bar">
        <span className="search-icon"><IconSearch /></span>
        <input type="text" placeholder="Search wealth, assets, or analytics..." />
      </div>
      
      <div className="header-actions">
        
        <button className="btn-theme-toggle" onClick={toggleTheme}>
          {theme === 'dark' ? <><IconSun /> Light Mode</> : <><IconMoon /> Dark Mode</>}
        </button>

        <div className="live-clock">
          <span className="clock-time">
            {currentTime.toLocaleTimeString('en-US', { 
              timeZone: 'Asia/Manila', 
              hour: 'numeric', 
              minute: '2-digit', 
              hour12: true 
            })}
          </span>
          <span className="clock-date">
            {currentTime.toLocaleDateString('en-US', { 
              timeZone: 'Asia/Manila', 
              weekday: 'short', 
              month: 'short', 
              day: 'numeric' 
            })}
          </span>
        </div>

        <div className="icon-group" style={{ position: 'relative' }}>
          <button 
            className="header-icon-btn" 
            onClick={() => setShowNotifications(!showNotifications)}
            style={{ position: 'relative' }}
          >
            <IconBell />
            <span style={{position: 'absolute', top: '6px', right: '8px', width: '8px', height: '8px', background: 'var(--alert-red)', borderRadius: '50%'}}></span>
          </button>

          {showNotifications && (
            <div className="dash-matte-card" style={{
              position: 'absolute', top: '50px', right: '0', width: '320px', zIndex: 1000, 
              padding: '16px', 
              backgroundColor: 'var(--theme-bg)', /* FIXED: Changed to solid opaque background */
              border: '1px solid var(--border-light)',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)' /* FIXED: Added shadow to separate from background */
            }}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center'}}>
                <h4 style={{margin: 0, color: 'var(--text-main)'}}>Notifications</h4>
                <span style={{fontSize: '0.75rem', color: 'var(--accent-primary)', cursor: 'pointer'}}>Mark all as read</span>
              </div>
              
              <div className="custom-scrollbar" style={{maxHeight: '300px', overflowY: 'auto'}}>
                {notifications.map(notif => (
                  <div key={notif.id} style={{display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'flex-start'}}>
                    <div style={{
                      color: notif.type === 'urgent' ? 'var(--alert-red)' : notif.type === 'warning' ? '#f59e0b' : 'var(--accent-primary)',
                      background: 'var(--input-bg)', padding: '8px', borderRadius: '8px', display: 'flex'
                    }}>
                      {notif.icon}
                    </div>
                    <div>
                      <h5 style={{margin: '0 0 4px 0', color: 'var(--text-main)', fontSize: '0.85rem'}}>{notif.title}</h5>
                      <p style={{margin: 0, color: 'var(--text-muted)', fontSize: '0.75rem', lineHeight: '1.4'}}>{notif.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="header-divider"></div>
      </div>
    </header>
  );
}

export default TopHeader;