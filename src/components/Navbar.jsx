import React, { useState, useEffect } from 'react'; // useEffect és useState hozzáadása
import { NavLink } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import './Navbar.css';

export default function Navbar() {
  const [userEmail, setUserEmail] = useState(null);

  useEffect(() => {
    // Lekérjük az aktuális felhasználó adatait, amikor a komponens betöltődik
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email);
      }
    };

    fetchUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <header className="topbar">
      <div className="topbar__inner">
        <div className="brand">
          <span className="brand__logo">📊</span>
          <span className="brand__name">Excel Uploader</span>
        </div>

        <nav className="nav">
          <NavLink to="/" end className={({isActive}) => 'nav__link' + (isActive ? ' is-active' : '')}>
            Feltöltés
          </NavLink>
          <NavLink to="/tickets" className={({isActive}) => 'nav__link' + (isActive ? ' is-active' : '')}>
            Ticketek
          </NavLink>
        </nav>

        {/* ÚJ RÉSZ: Felhasználói menü */}
        <div className="user-menu" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {userEmail && <span style={{ color: 'var(--tb-muted)', fontSize: '13px' }}>{userEmail}</span>}
          <button onClick={handleLogout} className="btn-secondary" style={{ padding: '7px 12px', fontSize: '13px' }}>
            Kijelentkezés
          </button>
        </div>
      </div>
    </header>
  );
}