import React from 'react';
import { NavLink } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import './Navbar.css';

export default function Navbar() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    // A kijelentkezés után az App.jsx 'onAuthStateChange' eseménye
    // null-ra állítja a session-t, és automatikusan a login oldalra irányít.
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
          {/* Kijelentkezés gomb */}
          <button onClick={handleLogout} className="nav__link" style={{border:0, background:'transparent', cursor:'pointer'}}>
            Kijelentkezés
          </button>
        </nav>
      </div>
    </header>
  );
}