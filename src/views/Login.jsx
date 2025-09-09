import React from 'react';

export default function Login({ onLogin }) {
  const [email, setEmail] = React.useState('felhasznalo@email.com');
  const [password, setPassword] = React.useState('jelszo123');
  const [error, setError] = React.useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email === 'felhasznalo@email.com' && password === 'jelszo123') {
      setError('');
      onLogin();
    } else {
      setError('Helytelen email cím vagy jelszó.');
    }
  };

  return (
    <div className="page">
      <div className="card">
        <div className="header" style={{marginBottom: 16}}>
          <h1>Bejelentkezés</h1>
          <p className="muted">Kérjük, jelentkezz be a folytatáshoz.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email cím</label>
          <input
            id="email"
            type="email"
            placeholder="pl. nev@domain.hu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label htmlFor="password">Jelszó</label>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error ? <div className="alert alert--error">{error}</div> : null}

          <div className="actions" style={{marginTop: 12}}>
            <button type="submit">Belépés</button>
          </div>
        </form>

        <div className="footer-note">
          Teszt adatok: <strong>felhasznalo@email.com</strong> / <strong>jelszo123</strong>
        </div>
      </div>
    </div>
  );
}
