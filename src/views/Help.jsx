import React from 'react';
import { Link } from 'react-router-dom';

// --- 1. LÉPÉS: A kép importálása ---
import helpImage from '../assets/help-image.png'; // Győződj meg róla, hogy az útvonal és a fájlnév helyes!

export default function Help() {
  return (
    <div className="container" style={{ maxWidth: '900px', margin: '2rem auto' }}>
      <div className="header">
        <h1>Help / Guide</h1>
        <p className="muted">
          This guide will help you navigate the application's features.
        </p>
      </div>

      {/* --- 2. LÉPÉS: A kép megjelenítése --- */}
      <img 
        src={helpImage} 
        alt="A diagram showing the upload process" 
        style={{ 
          maxWidth: '100%', 
          height: 'auto', 
          borderRadius: 'var(--radius)', 
          margin: '2rem 0',
          border: '1px solid var(--border)' // Opcionális keret
        }} 
      />

      <div style={{ margin: '2rem 0', paddingTop: '2rem', borderTop: '1px solid var(--border)', textAlign: 'left' }}>
        <h2>Main Features</h2>
        <ul style={{ paddingLeft: '20px' }}>
          <li style={{ marginBottom: '1rem' }}>
            <strong>Uploader:</strong> Under the <Link to="/" style={{color: 'var(--primary)'}}>Uploader</Link> menu, you can process and save new Excel files to the database.
          </li>
          <li style={{ marginBottom: '1rem' }}>
            <strong>Tickets:</strong> In the <Link to="/tickets" style={{color: 'var(--primary)'}}>Tickets</Link> section, you can view, filter, and sort the uploaded data according to your permissions.
          </li>
        </ul>
      </div>

      <div className="actions" style={{ justifyContent: 'center' }}>
        <Link to="/" className="btn">
          Go to Uploader
        </Link>
      </div>
    </div>
  );
}