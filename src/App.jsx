// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Uploader from './views/Uploader.jsx';
import Tickets from './views/Tickets.jsx';
import Login from './views/Login.jsx';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <main className="page-content">
        <Routes>
          <Route path="/" element={<Uploader />} />
          <Route path="/tickets" element={<Tickets />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
