import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import ErrorMessage from '../components/ErrorMessage.jsx';

export default function UpdatePassword() {
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

 const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      // 1. Frissítjük a felhasználó jelszavát
      const { error: updateError } = await supabase.auth.updateUser({ password: password });
      if (updateError) throw updateError;
      
      setMessage('Jelszó sikeresen frissítve! A rendszer kilépteti, kérjük, jelentkezzen be újra.');
      
      // 2. VÁRUNK egy kicsit, hogy a felhasználó elolvashassa az üzenetet
      setTimeout(async () => {
        // 3. FONTOS: KILÉPTETJÜK a felhasználót a jelszó-visszaállító session-ből
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) throw signOutError;
        
        // 4. Átirányítjuk a bejelentkezési oldalra, ahol már az új jelszavával tud belépni
        navigate('/login');
      }, 3000);

    } catch (error) {
      setError(error.message || 'Hiba történt a jelszó frissítése során.');
      setLoading(false); // Hiba esetén a gombot újra aktívvá tesszük
    }
    // Sikeres esetben a setLoading(false) nem kell, mert elnavigálunk az oldalról
  };

  return (
    <div className="page">
      <div className="card">
        <div className="header" style={{marginBottom: 16}}>
          <h1>Új Jelszó Megadása</h1>
          <p className="muted">Kérjük, add meg az új jelszavadat.</p>
        </div>

        <form onSubmit={handleUpdatePassword}>
          <label htmlFor="password">Új jelszó</label>
          <input
            id="password"
            type="password"
            placeholder="Legalább 6 karakter"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
          
          {message && <div className="alert" style={{borderColor: 'green', color: 'green', background: '#f0fff4', marginTop: '12px'}}>{message}</div>}
          {error && <ErrorMessage message={error} />}

          <div className="actions" style={{marginTop: 12}}>
            <button type="submit" disabled={loading}>
              {loading ? 'Folyamatban...' : 'Jelszó frissítése'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}