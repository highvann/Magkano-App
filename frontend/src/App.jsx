import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Navbar from './global-assets/navbar/Navbar';
import TopHeader from './global-assets/header/TopHeader';
import ExpenseTracker from './modules/expenses/ExpenseTracker';
import Dashboard from './modules/dashboard/Dashboard';
import GoalsTracker from './modules/goals/GoalsTracker'; 
import History from './modules/history/History';
import Analytics from './modules/analytics/Analytics';
import Recurring from './modules/recurring/Recurring';
import Chatbot from './global-assets/chatbot/chatbot';
import UserProfile from './modules/profile/UserProfile';
import Settings from './modules/settings/Settings';
import Auth from './modules/auth/Auth';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState('dark');
  
  // 1. Add state to hold the user's name globally
  const [userProfile, setUserProfile] = useState({ firstName: 'User', lastName: '' });

  useEffect(() => {
    // Helper function to extract and set the name from the session
    const updateProfileFromSession = (session) => {
      if (session?.user?.user_metadata) {
        setUserProfile({
          firstName: session.user.user_metadata.first_name || 'User',
          lastName: session.user.user_metadata.last_name || ''
        });
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      updateProfileFromSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      updateProfileFromSession(session);
      if (!session) {
        setActiveTab('dashboard');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setIsAuthenticated(false);
      setActiveTab('dashboard');
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  if (!isAuthenticated) {
    return <Auth />;
  }
  
  return (
    <div className="app-master-layout">
      <div className="aurora-mesh-bg">
        <div className="aurora-orb orb-1"></div>
        <div className="aurora-orb orb-2"></div>
      </div>

      {/* 2. Pass the userProfile prop to the Navbar */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} userProfile={userProfile} />
      
      <div className="main-content-wrapper">  
        <TopHeader theme={theme} toggleTheme={toggleTheme} setActiveTab={setActiveTab} />
        
        <main>
          {/* 3. Pass the userProfile prop to the Dashboard (and any other component that needs it) */}
          {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} userProfile={userProfile} />}
          {activeTab === 'expenses' && <ExpenseTracker setActiveTab={setActiveTab} />}
          {activeTab === 'history' && <History />}
          {activeTab === 'goals' && <GoalsTracker />} 
          {activeTab === 'analytics' && <Analytics setActiveTab={setActiveTab} />} 
          {(activeTab === 'subscriptions' || activeTab === 'recurring') && <Recurring />}
          {activeTab === 'profile' && <UserProfile setActiveTab={setActiveTab} userProfile={userProfile} onLogout={handleLogout} />}
          {activeTab === 'settings' && <Settings />}
        </main>
      </div>

      <Chatbot />
    </div>
  );
}

export default App;