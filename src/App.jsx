import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import Navbar from './components/Navbar';
import Uploader from './views/Uploader.jsx';
import Tickets from './views/Tickets.jsx';
import Login from './views/Login.jsx';
import Registration from './views/Registration.jsx';
import './App.css';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Első betöltéskor azonnal lekérjük az aktuális session-t, ha van.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false); // Befejeztük a kezdeti betöltést
    });

    // Ez a Supabase varázslat: figyeljük a be- és kijelentkezési eseményeket.
    // Ha a felhasználó be- vagy kijelentkezik, ez automatikusan frissíti a 'session' állapotot.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Fontos: a komponens "életciklusának" végén leiratkozunk az eseményfigyelőről.
    return () => subscription.unsubscribe();
  }, []);

  // Amíg a session állapotát ellenőrizzük, ne mutassunk semmit, hogy elkerüljük a villanást.
  if (loading) {
    return null;
  }

  return (
    <BrowserRouter>
      {/* A Navbar csak akkor jelenik meg, ha van aktív session (be van lépve a user) */}
      {session && <Navbar />}
      <main className="page-content">
        <Routes>
          {/* Főoldal és Tickets oldal: ha van session, betöltjük, ha nincs, átirányítjuk a loginra. */}
          <Route 
            path="/" 
            element={session ? <Uploader /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/tickets" 
            element={session ? <Tickets /> : <Navigate to="/login" />} 
          />
          
          {/* Login és Register oldal: ha nincs session, betöltjük, ha van, átirányítjuk a főoldalra. */}
          <Route 
            path="/login" 
            element={!session ? <Login /> : <Navigate to="/" />} 
          />
          <Route 
            path="/register"
            element={!session ? <Registration /> : <Navigate to="/" />}
          />
        </Routes>
      </main>
    </BrowserRouter>
  );
}