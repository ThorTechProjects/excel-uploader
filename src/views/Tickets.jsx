import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient.js';

// Az oszlopok, kibővítve a work_date-tel a megjelenítéshez
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
  { key: 'work_date',       label: 'Work Date' },
];
const PAGE_SIZE = 20;

// === SEGÉDFÜGGVÉNYEK ===

// Bármilyen dátum stringet átalakít YYYY-MM-DD formátumra.
function formatDateToYYYYMMDD(dateStr) {
  if (!dateStr) return null;
  const dateObj = new Date(dateStr);
  if (isNaN(dateObj.valueOf())) return null;
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Összehasonlítja a két dátumot, miután egységes formátumra hozta őket.
function isWithinTwoDays(currStatDateStr, workDateStr) {
  if (!currStatDateStr || !workDateStr) return false;
  const normalizedCurrStatDate = formatDateToYYYYMMDD(currStatDateStr);
  const normalizedWorkDate = formatDateToYYYYMMDD(workDateStr);
  if (!normalizedCurrStatDate || !normalizedWorkDate) return false;
  const currStatTime = new Date(normalizedCurrStatDate).getTime();
  const workTime = new Date(normalizedWorkDate).getTime();
  const differenceInMillis = currStatTime - workTime;
  const differenceInDays = differenceInMillis / (1000 * 60 * 60 * 24);
  return differenceInDays >= 0 && differenceInDays <= 2;
}

// Függvény a YYYY-MM-DD formátumú 'work_date' hónapjának és napjának kinyerésére a szűrőhöz.
function parseWorkDate(dateString) {
  if (typeof dateString !== 'string') return null;
  const parts = dateString.split('-');
  if (parts.length !== 3) return null;
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (isNaN(month) || isNaN(day)) return null;
  return { month, day };
}

function smartCompare(a, b) {
  const A = a ?? '';
  const B = b ?? '';
  const na = Number(A), nb = Number(B);
  const isNumA = !Number.isNaN(na) && A !== '' && /^-?\d+(\.\d+)?$/.test(String(A).trim());
  const isNumB = !Number.isNaN(nb) && B !== '' && /^-?\d+(\.\d+)?$/.test(String(B).trim());
  if (isNumA && isNumB) return na === nb ? 0 : (na < nb ? -1 : 1);
  const da = new Date(A), db = new Date(B);
  if (!isNaN(da.valueOf()) && !isNaN(db.valueOf())) return da - db;
  const sa = String(A).toLowerCase();
  const sb = String(B).toLowerCase();
  if (sa < sb) return -1;
  if (sa > sb) return 1;
  return 0;
}

const MONTH_LABELS = [
  '', 'Január', 'Február', 'Március', 'Április', 'Május', 'Június',
  'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'
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
      const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (profileError && profileError.code !== 'PGRST116') throw profileError;
      const userIsAdmin = profile && profile.role === 'admin';
      setIsAdmin(userIsAdmin);
      const { data, error: ticketsError } = await supabase.from('tickets').select('*');
      if (ticketsError) throw ticketsError;
      const ticketData = Array.isArray(data) ? data : [];
      setAllRows(ticketData);
      if (userIsAdmin) {
        const uniqueOwners = [...new Set(ticketData.map(r => r.owner || '').filter(Boolean))].sort();
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

  const filteredRows = useMemo(() => {
    if (!allRows) return [];
    const mFilter = month ? parseInt(month, 10) : null;
    const dFilter = day ? parseInt(day, 10) : null;
    const oFilter = owner || null;
    if (!mFilter && !dFilter && !oFilter) return allRows;
    return allRows.filter(r => {
      if (oFilter && r.owner !== oFilter) return false;
      if (mFilter || dFilter) {
        const md = parseWorkDate(r.work_date);
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
  
  const transferStats = useMemo(() => {
    const sourceRows = filteredRows;
    if (!sourceRows || sourceRows.length === 0) return { percentage: 0, display: 'N/A' };
    const totalTicketsInView = sourceRows.length;
    const uniqueUploadsByDate = new Map();
    for (const row of sourceRows) {
      if (row.work_date && row.request_count != null) {
        uniqueUploadsByDate.set(row.work_date, Number(row.request_count));
      }
    }
    let totalTransferredCount = 0;
    for (const count of uniqueUploadsByDate.values()) {
      totalTransferredCount += count;
    }
    if (totalTicketsInView === 0) return { percentage: 0, display: '0%' };
    const percentage = (totalTransferredCount / totalTicketsInView) * 100;
    return { percentage, display: `${percentage.toFixed(1)}%` };
  }, [filteredRows]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const onHeaderClick = (key) => { setPage(1); setOrder(prev => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' })); };
  const goPage = (p) => { setPage(Math.min(Math.max(1, p), totalPages)); };

  if (loading) {
    return <div className="container"><h1>Adatbázis — Tickets</h1><p>Betöltés és jogosultság ellenőrzése...</p></div>;
  }
  
  if (error) {
    return <div className="container"><h1>Adatbázis — Tickets</h1><p style={{ color: 'red' }}>Hiba: {error}</p></div>;
  }
  
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
      <div className="toolbar" style={{ gap: 12, alignItems: 'center' }}>
        {isAdmin && (
          <>
            <span className="toolbar__label">Owner</span>
            <select className="select" value={owner} onChange={(e) => { setOwner(e.target.value); setPage(1); }}>
              <option value="">Összes owner</option>
              {owners.map(o => (<option key={o} value={o}>{o}</option>))}
            </select>
          </>
        )}
        <span className="toolbar__label" style={{ marginLeft: isAdmin ? '8px' : '0' }}>Hónap</span>
        <select className="select" value={month} onChange={(e) => { setMonth(e.target.value); setPage(1); }} aria-label="Hónap szűrő (work_date)">
          <option value="">Összes hónap</option>
          {MONTH_LABELS.map((label, i) => i > 0 && (<option key={i} value={i}>{label}</option>))}
        </select>
        <span className="toolbar__label" style={{ marginLeft: '8px' }}>Nap</span>
        <select className="select" value={day} onChange={(e) => { setDay(e.target.value); setPage(1); }} aria-label="Nap szűrő (work_date)">
          <option value="">Összes nap</option>
          {Array.from({ length: 31 }).map((_, i) => {
            const d = i + 1;
            return <option key={d} value={d}>{d}</option>;
          })}
        </select>
      </div>
      <div style={{ fontSize: 12, color: '#666', marginBottom: 8, display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span>Találatok: <b>{total}</b></span>
        <span>•</span>
        <span>Oldal: <b>{page}/{totalPages}</b></span>
        <span>•</span>
        <span>Transzferált:<b style={{ color: transferStats.percentage < 10 ? 'green' : 'red', marginLeft: '4px' }}>{transferStats.display}</b></span>
      </div>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              {COLUMNS.map(col => (
                <th key={col.key} onClick={() => onHeaderClick(col.key)} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {col.label}
                  {order.key === col.key ? (order.dir === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length > 0 ? (
              pageRows.map((row) => {
                const isRecent = isWithinTwoDays(row.curr_stat_date, row.work_date);
                return (
                  <tr key={row.ticket_number}>
                    {COLUMNS.map(col => {
                      const cellStyle = {};
                      if (col.key === 'curr_stat_date' && isRecent) {
                        cellStyle.backgroundColor = 'hsl(130, 70%, 94%)';
                        cellStyle.fontWeight = 'bold';
                        cellStyle.color = 'hsl(130, 50%, 25%)';
                        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                            cellStyle.backgroundColor = 'hsl(130, 30%, 20%)';
                            cellStyle.color = 'hsl(130, 50%, 85%)';
                        }
                      }
                      return (<td key={col.key} style={cellStyle}>{row[col.key] ?? ''}</td>);
                    })}
                  </tr>
                );
              })
            ) : (
              <tr><td colSpan={COLUMNS.length}>Nincs a szűrésnek megfelelő adat.</td></tr>
            )}
          </tbody>
        </table>
      </div>
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