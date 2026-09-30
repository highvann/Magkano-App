import { useState } from 'react';
import { supabase } from '../../supabaseClient';
import './UserProfile.css';

function UserProfile({ userProfile, onLogout }) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      if (onLogout) {
        await onLogout();
      } else {
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.error("Error logging out:", error.message);
        }
      }
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleDelete = () => {
    alert("Account permanently deleted."); // Replace with actual deletion logic
    setShowDeleteModal(false);
  };

  const IconLogOut = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>;
  const IconWarning = () => <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>;

  return (
    <div className="wf-profile-canvas">
      <div className="profile-header text-center">
        <h1 className="page-title">User Profile</h1>
        <p className="page-subtitle">Manage your identity and session.</p>
      </div>

      <div className="profile-grid">
        <div className="dash-matte-card identity-panel">
        <div className="avatar-large">
          {userProfile?.firstName?.charAt(0) || ''}{userProfile?.lastName?.charAt(0) || ''}
        </div>
        <h2 className="profile-name">
          {userProfile?.firstName || 'User'} {userProfile?.lastName || ''}
        </h2>
        <p className="profile-handle">
          @{userProfile?.firstName?.toLowerCase() || 'user'}{userProfile?.lastName?.toLowerCase() || ''}
        </p>

          <button className="btn-secondary btn-profile-action" onClick={handleLogout} disabled={isLoggingOut}>
            <IconLogOut /> {isLoggingOut ? 'Signing Out...' : 'Secure Sign Out'}
          </button>
        </div>

        <div className="dash-matte-card" style={{borderColor: 'rgba(248, 113, 113, 0.3)', background: 'rgba(248, 113, 113, 0.02)', textAlign: 'center', padding: '32px 20px'}}>
           <h3 className="card-title text-alert mb-normal">Danger Zone</h3>
           <p className="text-muted" style={{fontSize: '0.85rem', marginBottom: '24px'}}>Once you delete your account, there is no going back. Please be certain.</p>
           <button className="btn-danger btn-profile-action" onClick={() => setShowDeleteModal(true)}>
             Delete Account
           </button>
        </div>
      </div>

      {/* The Intercept Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-icon"><IconWarning /></div>
            <h3>Are you absolutely sure?</h3>
            <p>Permanently deleting your account will erase all your transaction history and goals. If you just need a break, you can log out instead.</p>
            
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowDeleteModal(false)} disabled={isLoggingOut}>Cancel</button>
              <button className="btn-primary" onClick={handleLogout} disabled={isLoggingOut}>{isLoggingOut ? 'Signing Out...' : 'Log Out Instead'}</button>
              <button className="btn-danger" onClick={handleDelete} disabled={isLoggingOut}>Permanently Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserProfile;