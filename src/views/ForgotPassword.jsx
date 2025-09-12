import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Link } from 'react-router-dom';
import ErrorMessage from '../components/ErrorMessage.jsx';

export default function ForgotPassword() {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/update-password`, // <-- Frissítve erre
            });
            if (error) throw error;
            setMessage('Ha létezik fiók ezzel az e-mail címmel, küldtünk egy jelszó-visszaállító linket.');
        } catch (error) {
            setError(error.message || 'Hiba történt a jelszó-visszaállítás során.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page">
            <div className="card">
                <div className="header" style={{ marginBottom: 16 }}>
                    <h1>Elfelejtett Jelszó</h1>
                    <p className="muted">Add meg az e-mail címedet, és küldünk egy linket, amivel új jelszót adhatsz meg.</p>
                </div>

                <form onSubmit={handlePasswordReset}>
                    <label htmlFor="email">Regisztrált e-mail cím</label>
                    <input
                        id="email"
                        type="email"
                        placeholder="nev@domain.hu"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={loading}
                    />

                    {message && <div className="alert" style={{ borderColor: 'green', color: 'green', background: '#f0fff4', marginTop: '12px' }}>{message}</div>}
                    {error && <ErrorMessage message={error} />}

                    <div className="actions" style={{ marginTop: 12 }}>
                        <button type="submit" disabled={loading}>
                            {loading ? 'Folyamatban...' : 'Visszaállító link küldése'}
                        </button>
                    </div>
                </form>
                <div className="auth-switcher">
                    Eszébe jutott? <Link to="/login">Vissza a bejelentkezéshez</Link>
                </div>
            </div>
        </div>
    );
}