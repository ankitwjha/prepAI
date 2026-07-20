import React from 'react';
import { useAuth } from '../features/auth/hooks/useAuth';
import { useNavigate, Link } from 'react-router';
import './Navbar.scss';

const Navbar = () => {
  const { user, handleLogout } = useAuth();
  const navigate = useNavigate();

  const onLogout = async () => {
    const success = await handleLogout();
    if (success) {
      navigate('/login');
    }
  };

  const usernameDisplay = user?.username ? user.username.toUpperCase() : 'CANDIDATE';

  return (
    <header className="app-navbar">
      <div className="navbar-container">
        {/* Top Left: Logout Functionality */}
        <div className="nav-left">
          <button onClick={onLogout} className="logout-button" title="Sign out of your account">
            <svg
              className="logout-icon"
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Logout</span>
          </button>

          <Link to="/" className="brand-logo" title="Go to Dashboard">
            <span className="brand-dot"></span>
            <span>PrepAI</span>
          </Link>
        </div>

        {/* Top Right: User Greeting with VALAR MORGHULIS */}
        <div className="nav-right">
          <div className="valar-greeting-badge" title={`Welcome back, ${user?.username || 'User'}`}>
            <span className="dragon-icon">⚔️</span>
            <span className="greeting-text">
              VALAR MORGHULIS <strong className="username-highlight">{usernameDisplay}</strong>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
