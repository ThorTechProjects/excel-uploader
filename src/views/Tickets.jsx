import React from 'react';
import { supabase } from '../lib/supabaseClient.js';

// oszlopok (ugyanazok, mint a DB/Excel-ben)
const COLUMNS = [
  { key: 'priority',        label: 'Priority' },
  { key: 'service_code',    label: 'Service Code' },
  { key: 'poscode',         label: 'POSCode' },
  { key: 'airline',         label: 'Airline' },
  { key: 'request_id',      label: 'Request Id' },
  { key: 'contact_name',    label: 'Contact Name' },
  { key: 'pnrno',           label: 'PNRNO' },
  { key: 'flow_type',       label: 'Flow Type' },
  { key: 'action',          label: 'Action' },
  { key: 'added',           label: 'Added' },           // TEXT: "M/D/YYYY  h:mm:ss AM/PM"
  { key: 'curr_stat_date',  label: 'Curr Stat Date' },  // TEXT
  { key: 'pending_reason',  label: 'Pending Reason' },
  { key: 'owner',           label: 'Owner' },
  { key: 'ticket_number',   label: 'Ticket Number' },
];

const PAGE_SIZE = 20;

function parseMaybeDate(s) {
  // próbálunk dátumot parsolni (a te string formátumod gyakran értelmezhető),
  // ha nem megy, visszaadjuk null-t
  if (typeof s !== 'string' || !s.trim()) return null;
  const d = new Date(s);
  return isNaN(d.valueOf()) ? null : d;
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

export default function Tickets() {
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);

  const [q, setQ] = React.useState('');             // kereső
  const [order, setOrder] = React.useState({ key: 'ticket_number', dir: 'asc' }); // kliens oldali sorrend

  // server oldali lekérés — page & search szerint
  const fetchTickets = React.useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const from = (page - 1) * PAGE_SIZE;
      const to   = from + PAGE_SIZE - 1;

      // alap select
      let query = supabase
        .from('tickets')
        .select('*', { count: 'exact' }); // count a lapozáshoz

      // egyszerű keresés több mezőn
      if (q.trim()) {
        const term = q.trim();
        query = query.or(
          [
            `ticket_number.ilike.%${term}%`,
            `request_id.ilike.%${term}%`,
            `contact_name.ilike.%${term}%`,
          ].join(',')
        );
      }

      // szerver oldali fix rendezés: ticket_number asc (stabil, hogy ne ugráljon)
      // (a valódi rendezést kliensen alkalmazzuk bármely oszlopra)
      query = query.order('ticket_number', { ascending: true });

      // range (lapozás)
      query = query.range(from, to);

      const { data, error: err, count } = await query;
      if (err) throw err;

      setRows(Array.isArray(data) ? data : []);
      setTotal(typeof count === 'number' ? count : 0);
    } catch (e) {
      console.error(e);
      setError(e.message || String(e));
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, q]);

  React.useEffect(() => { fetchTickets(); }, [fetchTickets]);

  // kliens oldali rendezés (a jelenlegi oldalon)
  const sortedRows = React.useMemo(() => {
    if (!rows.length) return rows;
    const { key, dir } = order;
    const sorted = [...rows].sort((a, b) => {
      const res = smartCompare(a[key], b[key]);
      return dir === 'asc' ? res : -res;
    });
    return sorted;
  }, [rows, order]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const onHeaderClick = (key) => {
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

      {/* Kereső */}
      <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', margin:'0.5rem 0 1rem'}}>
        <input
          value={q}
          onChange={(e) => { setPage(1); setQ(e.target.value); }}
          placeholder="Keresés: Ticket Number / Request Id / Contact Name"
          style={{flex:'1 1 320px', padding:'0.5rem', border:'1px solid #ccc', borderRadius:4}}
        />
        <button onClick={() => { setPage(1); fetchTickets(); }}>
          Keresés
        </button>
        <button onClick={() => { setQ(''); setPage(1); fetchTickets(); }} style={{background:'#757575', marginLeft:4}}>
          Törlés
        </button>
      </div>

      {/* Info sáv */}
      <div style={{fontSize:12, color:'#666', marginBottom:8}}>
        Összes találat: <b>{total}</b> • Oldal: <b>{page}/{totalPages}</b> • Rendezés: <b>{order.key}</b> ({order.dir})
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
                  style={{cursor:'pointer', whiteSpace:'nowrap'}}
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
              <tr><td colSpan={COLUMNS.length} style={{color:'red'}}>Hiba: {error}</td></tr>
            ) : sortedRows.length ? (
              sortedRows.map((row, i) => (
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
      <div style={{display:'flex', gap:8, alignItems:'center', justifyContent:'center', marginTop:12}}>
        <button onClick={() => goPage(1)} disabled={page<=1}>« Első</button>
        <button onClick={() => goPage(page-1)} disabled={page<=1}>‹ Előző</button>
        <span style={{fontSize:12, color:'#666'}}>Oldal {page} / {totalPages}</span>
        <button onClick={() => goPage(page+1)} disabled={page>=totalPages}>Következő ›</button>
        <button onClick={() => goPage(totalPages)} disabled={page>=totalPages}>Utolsó »</button>
      </div>
    </div>
  );
}
