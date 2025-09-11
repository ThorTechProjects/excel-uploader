import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient.js';

// Az oszlopok és segédfüggvények változatlanok
const COLUMNS = [
  { key: 'priority',        label: 'Priority' },
  { key: 'service_code',    label: 'Service Code' },
  { key: 'poscode',         label: 'POSCode' },
  { key: 'airline',         label: 'Airline' },
  { key: 'request_id',      label: 'Request Id' },
  { key: 'pnrno',           label: 'PNRNO' },
  { key: 'flow_type',       label: 'Flow Type' },
  { key: 'action',          label: 'Action' },
  { key: 'added',           label: 'Added' },
  { key: 'curr_stat_date',  label: 'Curr Stat Date' },
  { key: 'pending_reason',  label: 'Pending Reason' },
  { key: 'owner',           label: 'Owner' },
  { key: 'ticket_number',   label: 'Ticket Number' },
];
const PAGE_SIZE = 20;

function parseMaybeDate(s) {
  if (typeof s !== 'string' || !s.trim()) return null;
  const d = new Date(s);
  return isNaN(d.valueOf()) ? null : d;
}

function parseMonthDay(s) {
  if (typeof s !== 'string') return null;
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\//);
  if (!m) return null;
  const month = parseInt(m[1], 10);
  const day = parseInt(m[2], 10);
  if (Number.isNaN(month) || Number.isNaN(day)) return null;
  return { month, day };
}

function smartCompare(a, b) {
  const A = a ?? '';
  const B = b ?? '';
  const na = Number(A), nb = Number(B);
  const isNumA = !Number.isNaN(na) && A !== '' && /^-?\d+(\.\d+)?$/.test(String(A).trim());
  const isNumB = !Number.isNaN(nb) && B !== '' && /^-?\d+(\.\d+)?$/.test(String(B).trim());
  if (isNumA && isNumB) return na === nb ? 0 : (na < nb ? -1 : 1);
  const da = parseMaybeDate(A), db = parseMaybeDate(B);
  if (da && db) return da - db;
  const sa = String(A).toLowerCase();
  const sb = String(B).toLowerCase();
  if (sa < sb) return -1;
  if (sa > sb) return 1;
  return 0;
}

const MONTH_LABELS = [
  '', 'Január','Február','Március','Április','Május','Június',
  'Július','Augusztus','Szeptember','Október','November','December'
];

export default function Tickets() {
  const [allRows, setAllRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [page, setPage] = useState(1);
  const [order, setOrder] = useState({ key: 'ticket_number', dir: 'asc' });
  const [owners, setOwners] = useState([]);
  const [owner, setOwner] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');

  const fetchTicketsAndRole = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("A tartalom megtekintéséhez be kell jelentkezni.");
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') throw profileError;
      
      const userIsAdmin = profile && profile.role === 'admin';
      setIsAdmin(userIsAdmin);

      // A Supabase RLS policy a háttérben szűr!
      const { data, error: ticketsError } = await supabase.from('tickets').select('*');
      if (ticketsError) throw ticketsError;

      setAllRows(Array.isArray(data) ? data : []);

      // Az owner listát csak akkor töltjük le, ha a felhasználó admin
      if (userIsAdmin) {
        const uniqueOwners = [...new Set((data || []).map(r => r.owner || '').filter(Boolean))].sort();
        setOwners(uniqueOwners);
      }

    } catch (e) {
      console.error(e);
      setError(e.message || String(e));
      setAllRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTicketsAndRole();
  }, [fetchTicketsAndRole]);

  // A kliensoldali szűrés és rendezés logikája változatlan
    const filteredRows = useMemo(() => {
    if (!allRows.length || (!month && !day && !owner)) return allRows;
    const mFilter = month ? parseInt(month, 10) : null;
    const dFilter = day ? parseInt(day, 10) : null;
    const oFilter = owner || null;

    return allRows.filter(r => {
      if (oFilter && r.owner !== oFilter) return false;
      if (mFilter || dFilter) {
        const md = parseMonthDay(r.curr_stat_date);
        if (!md) return false;
        if (mFilter && md.month !== mFilter) return false;
        if (dFilter && md.day !== dFilter) return false;
      }
      return true;
    });
  }, [allRows, month, day, owner]);

  const sortedFilteredRows = useMemo(() => {
    if (!filteredRows.length) return [];
    const { key, dir } = order;
    return [...filteredRows].sort((a, b) => {
      const res = smartCompare(a[key], b[key]);
      return dir === 'asc' ? res : -res;
    });
  }, [filteredRows, order]);

  const [total, setTotal] = useState(0);

  const pageRows = useMemo(() => {
    const newTotal = sortedFilteredRows.length;
    setTotal(newTotal);
    const totalPages = Math.max(1, Math.ceil(newTotal / PAGE_SIZE));
    if (page > totalPages && newTotal > 0) setPage(1);

    const from = (page - 1) * PAGE_SIZE;
    return sortedFilteredRows.slice(from, from + PAGE_SIZE);
  }, [sortedFilteredRows, page]);
  
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const onHeaderClick = (key) => { setPage(1); setOrder(prev => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' })); };
  const goPage = (p) => { setPage(Math.min(Math.max(1, p), totalPages)); };

  if (loading) {
    return <div className="container"><h1>Adatbázis — Tickets</h1><p>Betöltés és jogosultság ellenőrzése...</p></div>;
  }
  
  if (error) {
    return <div className="container"><h1>Adatbázis — Tickets</h1><p style={{ color: 'red' }}>Hiba: {error}</p></div>;
  }
  
  // HA NEM ADMIN, és nincsenek sorai, akkor jelenítjük meg az üzenetet
  if (!isAdmin && allRows.length === 0) {
    return (
      <div className="container">
        <h1>Adatbázis — Tickets</h1>
        <div className="alert" style={{ marginTop: '2rem', textAlign: 'center' }}>
          <strong>Nincs megjeleníthető ticket.</strong>
          <p className="muted" style={{marginTop: '8px'}}>A rendszer a profilodhoz rendelt "Owner" név alapján szűri a listát. Ha úgy gondolod, látnod kellene adatokat, kérjük, vedd fel a kapcsolatot az adminisztrátorral.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Adatbázis — Tickets</h1>
      
      {/* Az eszközsort csak akkor jelenítjük meg, ha a felhasználó admin */}
      {isAdmin && (
        <div className="toolbar" style={{ gap: 12 }}>
          <span className="toolbar__label">Owner</span>
          <select className="select" value={owner} onChange={(e) => { setOwner(e.target.value); setPage(1); }}>
            <option value="">Összes owner</option>
            {owners.map(o => (<option key={o} value={o}>{o}</option>))}
          </select>
          {/* Itt lehetnének a további szűrők (hónap, nap) */}
        </div>
      )}

      {/* Info sáv */}
      <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
        Találatok: <b>{total}</b>
      </div>

      {/* Táblázat */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              {COLUMNS.map(col => (
                <th key={col.key} onClick={() => onHeaderClick(col.key)} style={{ cursor: 'pointer' }}>
                  {col.label}
                  {order.key === col.key ? (order.dir === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length > 0 ? (
              pageRows.map((row) => (
                <tr key={row.ticket_number}>
                  {COLUMNS.map(col => (
                    <td key={col.key}>{row[col.key] ?? ''}</td>
                  ))}
                </tr>
              ))
            ) : (
              <tr><td colSpan={COLUMNS.length}>Nincs a szűrésnek megfelelő adat.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Lapozás */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: 12 }}>
        <button onClick={() => goPage(1)} disabled={page <= 1}>«</button>
        <button onClick={() => goPage(page - 1)} disabled={page <= 1}>‹</button>
        <span style={{ fontSize: 12, color: '#666' }}>Oldal {page} / {totalPages}</span>
        <button onClick={() => goPage(page + 1)} disabled={page >= totalPages}>›</button>
        <button onClick={() => goPage(totalPages)} disabled={page >= totalPages}>»</button>
      </div>
    </div>
  );
}