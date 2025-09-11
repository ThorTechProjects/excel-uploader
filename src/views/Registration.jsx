import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Link } from 'react-router-dom';
import ErrorMessage from '../components/ErrorMessage.jsx';

export default function Registration() {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);
        try {
            const { error } = await supabase.auth.signUp({ email, password });
            if (error) throw error;
            setMessage('Sikeres regisztráció! Kérlek, erősítsd meg az e-mail címedet a kapott linken keresztül a bejelentkezés előtt.');
        } catch (error) {
            setError(error.message || 'Hiba a regisztráció során.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page">
            <div className="card">
                <div className="header" style={{ marginBottom: 16 }}>
                    <h1>Regisztráció</h1>
                    <p className="muted">Hozzon létre egy új fiókot a folytatáshoz.</p>
                </div>

                <form onSubmit={handleRegister}>
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
                        placeholder="Legalább 6 karakter"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                    />

                    {message && <div className="alert" style={{ borderColor: 'green', color: 'green', background: '#f0fff4', marginTop: '12px' }}>{message}</div>}
                    {error && <ErrorMessage message={error} />}

                    <div className="actions" style={{ marginTop: 12 }}>
                        <button type="submit" disabled={loading}>
                            {loading ? 'Folyamatban...' : 'Regisztráció'}
                        </button>
                    </div>
                </form>
                <div className="auth-switcher">
                    Már van fiókod? <Link to="/login">Jelentkezz be!</Link>
                </div>
            </div>
        </div>
    );
}