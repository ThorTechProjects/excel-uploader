import React from 'react';
import { BrowserRouter, Routes, Route, Link, NavLink } from 'react-router-dom';
import Login from './views/Login.jsx';
import Uploader from './views/Uploader.jsx';
import Tickets from './views/Tickets.jsx';

function NavBar({ onLogout, isLoggedIn }) {
  return (
    <nav style={{
      background:'#fff', borderBottom:'1px solid #ddd', padding:'0.75rem 1rem',
      display:'flex', gap:'1rem', alignItems:'center', justifyContent:'space-between'
    }}>
      <div style={{display:'flex', gap:'1rem', alignItems:'center'}}>
        <Link to="/" style={{textDecoration:'none', fontWeight:700, color:'#222'}}>Excel Uploader</Link>
        {isLoggedIn && (
          <>
            <NavLink to="/upload" style={({isActive}) => ({textDecoration: isActive ? 'underline' : 'none'})}>Feltöltés</NavLink>
            <NavLink to="/tickets" style={({isActive}) => ({textDecoration: isActive ? 'underline' : 'none'})}>Adatbázis</NavLink>
          </>
        )}
      </div>
      {isLoggedIn && (
        <button onClick={onLogout} style={{background:'#e53935', border:'none', color:'#fff', padding:'0.5rem 0.9rem', borderRadius:4, cursor:'pointer'}}>
          Kijelentkezés
        </button>
      )}
    </nav>
  );
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);

  return (
    <BrowserRouter>
      <NavBar onLogout={() => setIsLoggedIn(false)} isLoggedIn={isLoggedIn} />
      <div style={{maxWidth: 1100, margin:'1.5rem auto', padding:'0 1rem'}}>
        <Routes>
          <Route path="/" element={
            isLoggedIn
              ? <Uploader onLogout={() => setIsLoggedIn(false)} />
              : <Login onLogin={() => setIsLoggedIn(true)} />
          } />
          <Route path="/upload" element={
            isLoggedIn ? <Uploader onLogout={() => setIsLoggedIn(false)} /> : <Login onLogin={() => setIsLoggedIn(true)} />
          } />
          <Route path="/tickets" element={
            isLoggedIn ? <Tickets /> : <Login onLogin={() => setIsLoggedIn(true)} />
          } />
          {/* fallback */}
          <Route path="*" element={<div>Nem található az oldal.</div>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
