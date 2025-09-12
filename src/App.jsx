import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import Navbar from './components/Navbar';
import Uploader from './views/Uploader.jsx';
import Tickets from './views/Tickets.jsx';
import Login from './views/Login.jsx';
import Registration from './views/Registration.jsx';
import ForgotPassword from './views/ForgotPassword.jsx';
import UpdatePassword from './views/UpdatePassword.jsx';
import './App.css';

// Létrehozunk egy belső komponenst, ami már hozzáfér a router adataihoz (pl. a helyzethez)
function AppLayout({ session }) {
  const location = useLocation();

  // Azok az útvonalak, ahol NEM akarjuk megjeleníteni a Navbar-t
  const noNavbarRoutes = ['/login', '/register', '/forgot-password', '/update-password'];

  // A Navbar csak akkor jelenik meg, ha van session ÉS nem vagyunk a tiltott útvonalak egyikén
  const showNavbar = session && !noNavbarRoutes.includes(location.pathname);

  return (
    <>
      {showNavbar && <Navbar />}
      <main className="page-content">
        <Routes>
          <Route path="/" element={session ? <Uploader /> : <Navigate to="/login" />} />
          <Route path="/tickets" element={session ? <Tickets /> : <Navigate to="/login" />} />
          <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
          <Route path="/register" element={!session ? <Registration /> : <Navigate to="/" />} />
          <Route path="/forgot-password" element={!session ? <ForgotPassword /> : <Navigate to="/" />} />
          <Route path="/update-password" element={<UpdatePassword />} />
        </Routes>
      </main>
    </>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // A session-kezelő logika változatlan
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return null;
  }

  return (
    <BrowserRouter>
      {/* Az AppLayout-ot a BrowserRouter-en belül hívjuk meg, így hozzáfér a useLocation-höz */}
      <AppLayout session={session} />
    </BrowserRouter>
  );
}