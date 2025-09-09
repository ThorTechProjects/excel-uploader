import React from 'react';
import { supabase } from '../lib/supabaseClient.js'; // ha nálad default export: import supabase from '../lib/supabaseClient.js';

// oszlopok (ugyanazok, mint a DB/Excel-ben) – Contact Name kivéve
const COLUMNS = [
  { key: 'priority',        label: 'Priority' },
  { key: 'service_code',    label: 'Service Code' },
  { key: 'poscode',         label: 'POSCode' },
  { key: 'airline',         label: 'Airline' },
  { key: 'request_id',      label: 'Request Id' },
  { key: 'pnrno',           label: 'PNRNO' },
  { key: 'flow_type',       label: 'Flow Type' },
  { key: 'action',          label: 'Action' },
  { key: 'added',           label: 'Added' },            // TEXT: "M/D/YYYY  h:mm:ss AM/PM"
  { key: 'curr_stat_date',  label: 'Curr Stat Date' },   // TEXT
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

// Gyors, laza parser csak hónap/nap kivételére "M/D/YYYY ..." TEXT-ből
function parseMonthDay(s) {
  if (typeof s !== 'string') return null;
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\//); // csak az elejét nézzük
  if (!m) return null;
  const month = parseInt(m[1], 10);
  const day = parseInt(m[2], 10);
  if (Number.isNaN(month) || Number.isNaN(day)) return null;
  return { month, day };
}

function smartCompare(a, b) {
  const A = a ?? '';
  const B = b ?? '';

  // szám?
  const na = Number(A), nb = Number(B);
  const isNumA = !Number.isNaN(na) && A !== '' && /^-?\d+(\.\d+)?$/.test(String(A).trim());
  const isNumB = !Number.isNaN(nb) && B !== '' && /^-?\d+(\.\d+)?$/.test(String(B).trim());
  if (isNumA && isNumB) return na === nb ? 0 : (na < nb ? -1 : 1);

  // dátum?
  const da = parseMaybeDate(A), db = parseMaybeDate(B);
  if (da && db) return da - db;

  // szöveg (kis/nagy független)
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
  const [allRows, setAllRows] = React.useState([]);   // minden találat (owner szerint szűrve a szerveren)
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);

  // Rendezés (kliens oldalon MINDEN sorra)
  const [order, setOrder] = React.useState({ key: 'ticket_number', dir: 'asc' });

  // Owner szűrő
  const [owners, setOwners] = React.useState([]);   // distinct owner értékek
  const [owner, setOwner] = React.useState('');     // kiválasztott owner ('' = mind)

  // ÚJ: Hónap/Nap szűrők (kliens oldalon, curr_stat_date alapján)
  const [month, setMonth] = React.useState('');     // '' = összes, egyébként "1".."12"
  const [day, setDay] = React.useState('');         // '' = összes, egyébként "1".."31"

  // DISTINCT ownerek (mountkor)
  const fetchOwners = React.useCallback(async () => {
    try {
      const { data, error: err } = await supabase
        .from('tickets')
        .select('owner');
      if (err) throw err;

      const uniq = Array.from(
        new Set(
          (data || [])
            .map(r => (r.owner ?? '').toString().trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b, 'hu'));

      setOwners(uniq);
    } catch (e) {
      console.error(e);
    }
  }, []);

  // ÖSSZES találat lehúzása (owner szerint) — egyszerű kliens oldali lapozás/rendezés/szűrés
  const fetchTickets = React.useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      let query = supabase
        .from('tickets')
        .select('*'); // mindent lehúzunk (owner szerint szűrve)

      if (owner) {
        query = query.eq('owner', owner);
      }

      const { data, error: err } = await query;
      if (err) throw err;

      const arr = Array.isArray(data) ? data : [];
      setAllRows(arr);
      setTotal(arr.length);
      // page marad; owner váltáskor úgyis 1-re tesszük
    } catch (e) {
      console.error(e);
      setError(e.message || String(e));
      setAllRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [owner]);

  React.useEffect(() => { fetchOwners(); }, [fetchOwners]);
  React.useEffect(() => { fetchTickets(); }, [fetchTickets]);

  // Kliens oldali SZŰRÉS hónap/nap szerint a curr_stat_date TEXT alapján
  const filteredRows = React.useMemo(() => {
    if (!allRows.length || (!month && !day)) return allRows;
    const mFilter = month ? parseInt(month, 10) : null;
    const dFilter = day ? parseInt(day, 10) : null;

    return allRows.filter(r => {
      const md = parseMonthDay(r.curr_stat_date);
      if (!md) return false; // ha nincs dátum vagy rossz formátum, kiesik
      if (mFilter && md.month !== mFilter) return false;
      if (dFilter && md.day !== dFilter) return false;
      return true;
    });
  }, [allRows, month, day]);

  // KLIENS rendezés (a SZŰRT tömbön!)
  const sortedFilteredRows = React.useMemo(() => {
    if (!filteredRows.length) return filteredRows;
    const { key, dir } = order;
    const sorted = [...filteredRows].sort((a, b) => {
      const res = smartCompare(a[key], b[key]);
      return dir === 'asc' ? res : -res;
    });
    return sorted;
  }, [filteredRows, order]);

  // Oldal szelet
  const pageRows = React.useMemo(() => {
    const newTotal = sortedFilteredRows.length;
    const pages = Math.max(1, Math.ceil(newTotal / PAGE_SIZE));
    // ha szűrés megváltoztatta a teljes elemszámot, és a page túlcsúszna, visszarántjuk
    if (page > pages) setPage(1);
    setTotal(newTotal);

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE;
    return sortedFilteredRows.slice(from, to);
  }, [sortedFilteredRows, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const onHeaderClick = (key) => {
    // vissza 1. oldal + irányváltás
    setPage(1);
    if (order.key === key) {
      setOrder({ key, dir: order.dir === 'asc' ? 'desc' : 'asc' });
    } else {
      setOrder({ key, dir: 'asc' });
    }
  };

  const goPage = (p) => {
    const clamped = Math.min(Math.max(1, p), totalPages);
    setPage(clamped);
  };

  return (
    <div className="container">
      <h1>Adatbázis — Tickets</h1>

      {/* Eszköztár: Owner + Hónap + Nap */}
      <div className="toolbar" style={{ gap: 12 }}>
        <span className="toolbar__label">Owner</span>
        <select
          className="select"
          value={owner}
          onChange={(e) => { setOwner(e.target.value); setPage(1); }}
          aria-label="Owner szűrő"
        >
          <option value="">Összes owner</option>
          {owners.map(o => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>

        <span className="toolbar__label" style={{ marginLeft: 8 }}>Hónap</span>
        <select
          className="select"
          value={month}
          onChange={(e) => { setMonth(e.target.value); setPage(1); }}
          aria-label="Hónap szűrő (curr_stat_date)"
        >
          <option value="">Összes hónap</option>
          {Array.from({ length: 12 }).map((_, i) => {
            const idx = i + 1;
            return (
              <option key={idx} value={idx}>{MONTH_LABELS[idx]}</option>
            );
          })}
        </select>

        <span className="toolbar__label" style={{ marginLeft: 8 }}>Nap</span>
        <select
          className="select"
          value={day}
          onChange={(e) => { setDay(e.target.value); setPage(1); }}
          aria-label="Nap szűrő (curr_stat_date)"
        >
          <option value="">Összes nap</option>
          {Array.from({ length: 31 }).map((_, i) => {
            const d = i + 1;
            return <option key={d} value={d}>{d}</option>;
          })}
        </select>
      </div>

      {/* Info sáv */}
      <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
        Összes találat: <b>{total}</b>
        {' '}• Oldal: <b>{page}/{totalPages}</b>
        {' '}• Rendezés: <b>{order.key}</b> ({order.dir})
        {owner ? <> • Owner: <b>{owner}</b></> : null}
        {month ? <> • Hónap: <b>{MONTH_LABELS[parseInt(month,10)]}</b></> : null}
        {day ? <> • Nap: <b>{day}</b></> : null}
      </div>

      {/* Tábla */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  onClick={() => onHeaderClick(col.key)}
                  style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
                  title="Rendezés oszlop szerint"
                >
                  {col.label}
                  {order.key === col.key ? (order.dir === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={COLUMNS.length}>Betöltés…</td></tr>
            ) : error ? (
              <tr><td colSpan={COLUMNS.length} style={{ color: 'red' }}>Hiba: {error}</td></tr>
            ) : pageRows.length ? (
              pageRows.map((row, i) => (
                <tr key={row.ticket_number ?? `${row.request_id}-${i}`}>
                  {COLUMNS.map(col => (
                    <td key={col.key}>
                      {row[col.key] ?? ''}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr><td colSpan={COLUMNS.length}>Nincs adat.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Lapozás */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: 12 }}>
        <button onClick={() => goPage(1)} disabled={page <= 1}>« Első</button>
        <button onClick={() => goPage(page - 1)} disabled={page <= 1}>‹ Előző</button>
        <span style={{ fontSize: 12, color: '#666' }}>Oldal {page} / {totalPages}</span>
        <button onClick={() => goPage(page + 1)} disabled={page >= totalPages}>Következő ›</button>
        <button onClick={() => goPage(totalPages)} disabled={page >= totalPages}>Utolsó »</button>
      </div>
    </div>
  );
}
