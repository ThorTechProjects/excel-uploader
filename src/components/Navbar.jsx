// src/components/Navbar.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import './Navbar.css';

export default function Navbar() {
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
          <NavLink to="/login" className={({isActive}) => 'nav__link' + (isActive ? ' is-active' : '')}>
            Belépés
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
