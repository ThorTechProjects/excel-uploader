import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Link } from 'react-router-dom';
import ErrorMessage from '../components/ErrorMessage.jsx';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // Sikeres bejelentkezés után az App.jsx 'onAuthStateChange' eseménye
      // frissíti a session-t, és automatikusan megtörténik az átirányítás.
    } catch (error) {
      setError(error.message || 'Hiba a bejelentkezés során. Ellenőrizd az adatokat!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="card">
        <div className="header" style={{ marginBottom: 16 }}>
          <h1>Bejelentkezés</h1>
          <p className="muted">Kérjük, jelentkezz be a folytatáshoz.</p>
        </div>

        <form onSubmit={handleLogin}>
          <label htmlFor="email">Email cím</label>
          <input
            id="email"
            type="email"
            placeholder="nev@domain.hu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />

          <label htmlFor="password">Jelszó</label>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />

          <div style={{ textAlign: 'right', fontSize: '12px', marginTop: '8px' }}>
            <Link to="/forgot-password" style={{ color: 'var(--muted)' }}>Elfelejtett jelszó?</Link>
          </div>

          {error && <ErrorMessage message={error} />}

          <div className="actions" style={{ marginTop: 12 }}>
            <button type="submit" disabled={loading}>
              {loading ? 'Folyamatban...' : 'Belépés'}
            </button>
          </div>
        </form>
        <div className="auth-switcher">
          Nincs még fiókod? <Link to="/register">Regisztrálj egyet!</Link>
        </div>
      </div>
    </div>
  );
}