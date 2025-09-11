// src/views/Uploader.jsx

import React from 'react';
import * as XLSX from 'xlsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import DataTable from '../components/DataTable.jsx';
import { supabase } from '../lib/supabaseClient.js';

/** ===== Oszlopszélesség ===== */
function computeColWidthsFromAOA(aoa, charPx = 8, minPx = 64, maxPx = 360) {
  const maxCols = aoa.reduce((m, row) => Math.max(m, row?.length || 0), 0);
  const widths = new Array(maxCols).fill(0);
  for (let r = 0; r < aoa.length; r++) {
    const row = aoa[r] || [];
    for (let c = 0; c < maxCols; c++) {
      const cellVal = row[c];
      const len = cellVal == null ? 0 : String(cellVal).trim().length;
      widths[c] = Math.max(widths[c], len);
    }
  }
  return widths.map((len) => {
    const px = Math.round(len * charPx + 24);
    return Math.max(minPx, Math.min(maxPx, px));
  });
}
function injectColgroup(html, widthsPx) {
  if (!widthsPx?.length) return html;
  const cols = widthsPx.map((w) => `<col style="width:${w}px">`).join('');
  const colgroup = `<colgroup>${cols}</colgroup>`;
  return html.replace(/<table([^>]*)>/i, `<table$1>${colgroup}`);
}

/** ===== Header segédek ===== */
function normHeader(h) {
  return String(h ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}
function findColumnIndexes(headerRow) {
  const idx = {};
  headerRow.forEach((h, i) => {
    const n = normHeader(h);
    idx[n] = i;
  });
  const reqId =
    idx['request id'] ??
    idx['requestid'] ??
    idx['request-id'] ??
    idx['request_id'];
  const ticket =
    idx['ticket number'] ??
    idx['ticketnumber'] ??
    idx['ticket-number'] ??
    idx['ticket_no'] ??
    idx['ticketno'];
  const added =
    idx['added'] ?? idx['added date'] ?? idx['added datetime'];
  const currStatDate =
    idx['curr stat date'] ?? idx['curr stat datetime'] ?? idx['current status date'];
  return { reqId, ticket, added, currStatDate };
}

/** ===== Adatsorok számolása (fejléc nélkül, üres sorokat kihagyva) ===== */
function isRowEmpty(row) {
  const r = row || [];
  return !r.some((cell) => !(cell == null || String(cell).trim() === ''));
}
function countDataRows(aoa) {
  if (!aoa || aoa.length <= 1) return 0;
  return aoa.slice(1).filter((row) => !isRowEmpty(row)).length;
}

/** ===== Dátum formátum ===== */
function excelSerialToUTCDate(serial) {
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  return new Date(ms);
}
function formatMDY_hms_AMPM_2space(d) {
  const M = d.getUTCMonth() + 1;
  const D = d.getUTCDate();
  const Y = d.getUTCFullYear();
  let h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const s = d.getUTCSeconds();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  // JAVÍTVA: Itt egy sima dupla szóköz van
  return `${M}/${D}/${Y}  ${h}:${mm}:${ss} ${ampm}`;
}
/** Megjelenítendő/mentendő stringgé alakít */
function normalizeDateDisplay(val) {
  if (val == null || val === '') return '';
  const already = /^\d{1,2}\/\d{1,2}\/\d{4}\s{2}\d{1,2}:\d{2}:\d{2}\s(AM|PM)$/i;
  if (typeof val === 'string' && already.test(val)) return val;

  if (typeof val === 'number' && isFinite(val)) {
    const d = excelSerialToUTCDate(val);
    return formatMDY_hms_AMPM_2space(d);
  }
  if (typeof val === 'string') {
    const d = new Date(val);
    if (!isNaN(d.valueOf())) return formatMDY_hms_AMPM_2space(d);
    return val;
  }
  if (val instanceof Date && !isNaN(val.valueOf())) {
    return formatMDY_hms_AMPM_2space(val);
  }
  return String(val);
}
/** worksheet-re is ráégetjük a stringet, hogy a táblában is így látszódjon */
function enforceDateColumnsFormat(ws, header, dateColIdxs) {
  if (!ws || !ws['!ref'] || !dateColIdxs?.length) return;
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let r = range.s.r + 1; r <= range.e.r; r++) {
    for (const c of dateColIdxs) {
      if (c == null) continue;
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = ws[addr];
      if (!cell) continue;
      const formatted = normalizeDateDisplay(cell.v != null ? cell.v : cell.w);
      cell.t = 's';
      cell.v = formatted;
      cell.w = formatted;
      if (cell.z) delete cell.z;
      ws[addr] = cell;
    }
  }
}

/** ===== Okos összehasonlító: szám → dátum → string ===== */
function smartCompare(a, b) {
  const A = a ?? '';
  const B = b ?? '';
  const na = Number(A), nb = Number(B);
  const isNumA = !Number.isNaN(na) && A !== '' && /^-?\d+(\.\d+)?$/.test(String(A).trim());
  const isNumB = !Number.isNaN(nb) && B !== '' && /^-?\d+(\.\d+)?$/.test(String(B).trim());
  if (isNumA && isNumB) return na === nb ? 0 : (na < nb ? -1 : 1);
  const da = new Date(A), db = new Date(B);
  const isDateA = !isNaN(da.valueOf());
  const isDateB = !isNaN(db.valueOf());
  if (isDateA && isDateB) return da - db;
  const sa = String(A).toLowerCase();
  const sb = String(B).toLowerCase();
  if (sa < sb) return -1;
  if (sa > sb) return 1;
  return 0;
}

/** ===== AOA -> objektumok (csak Excel-oszlopok, snake_case táblamezők) ===== */
const HEADER_MAP = {
  'priority': 'priority',
  'service code': 'service_code',
  'poscode': 'poscode',
  'airline': 'airline',
  'request id': 'request_id',
  'contact name': 'contact_name',
  'pnrno': 'pnrno',
  'flow type': 'flow_type',
  'action': 'action',
  'added': 'added',
  'curr stat date': 'curr_stat_date',
  'pending reason': 'pending_reason',
  'owner': 'owner',
  'ticket number': 'ticket_number',
};
function headerToKey(h) {
  return String(h ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
}
function aoaToObjectsExcelSet(aoa) {
  if (!aoa || aoa.length <= 1) return [];
  const header = aoa[0] || [];
  const mapIdx = header.map((h) => HEADER_MAP[headerToKey(h)] || null);

  const rows = [];
  for (let r = 1; r < aoa.length; r++) {
    const row = aoa[r] || [];
    if (isRowEmpty(row)) continue;
    const obj = {};
    for (let c = 0; c < mapIdx.length; c++) {
      const key = mapIdx[c];
      if (!key) continue;
      let v = row[c];
      obj[key] = v ?? '';
    }
    // DÁTUMOK egységesítése stringgé
    if ('added' in obj) obj.added = normalizeDateDisplay(obj.added);
    if ('curr_stat_date' in obj) obj.curr_stat_date = normalizeDateDisplay(obj.curr_stat_date);

    rows.push(obj);
  }
  return rows;
}

// A felesleges 'onLogout' propot kivettük
export default function Uploader() {
  const [fileName, setFileName] = React.useState('');
  const [tableHtml, setTableHtml] = React.useState('');
  const [error, setError] = React.useState('');
  const [sheetName, setSheetName] = React.useState('');
  const [rowCount, setRowCount] = React.useState(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const [sheetNames, setSheetNames] = React.useState([]);
  const [selectedSheet, setSelectedSheet] = React.useState('');
  const [infoMsg, setInfoMsg] = React.useState('');

  // Rendezés UI
  const [columns, setColumns] = React.useState([]);
  const [sortColIdx, setSortColIdx] = React.useState(0);
  const [sortDir, setSortDir] = React.useState('asc');

  const workbookRef = React.useRef(null);
  const fileInputRef = React.useRef(null);
  const allowedExtensions = /\.(xlsx|xls|csv)$/i;

  /** Renderelés */
  const renderSheet = React.useCallback((wb, sheet) => {
    if (!wb || !sheet) return;
    const ws = wb.Sheets[sheet];
    if (!ws) return;

    let html = XLSX.utils.sheet_to_html(ws, { raw: true });
    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });

    const header = aoa[0] || [];
    setColumns(header.map((h, i) => (h == null || h === '' ? `Oszlop ${i+1}` : String(h))));

    const widthsPx = computeColWidthsFromAOA(aoa);
    html = injectColgroup(html, widthsPx);

    setTableHtml(html);
    setSheetName(sheet);
    setRowCount(countDataRows(aoa));
  }, []);

  /** Fájl beolvasása */
  const processFile = (file) => {
    // DIAGNOSZTIKA: Elindult-e a feldolgozás?
    console.log('processFile elindult:', file.name);

    setError('');
    setInfoMsg('');
    if (!allowedExtensions.test(file.name)) {
      setError('Kérlek, csak .xlsx, .xls vagy .csv kiterjesztésű fájlt tölts fel.');
      return;
    }
    setFileName(file.name);
    setTableHtml('<p class="muted" style="text-align:center; padding:10px 0;">Feldolgozás...</p>');

    const reader = new FileReader();
    reader.onload = (e) => {
      // DIAGNOSZTIKA: Sikeres volt-e a fájl beolvasása?
      console.log('FileReader onload: a fájl beolvasva.');
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, {
          type: 'array',
          cellText: true,
          cellDates: false,
        });
        workbookRef.current = wb;

        // DIAGNOSZTIKA: Sikeres volt-e az Excel/CSV parse?
        console.log('XLSX.read sikeres, workbook objektum:', wb);

        const names = wb.SheetNames || [];
        setSheetNames(names);
        const first = names[0] || '';
        setSelectedSheet(first);

        if (first) {
            renderSheet(wb, first);
            console.log('renderSheet meghívva a(z)', first, 'munkalappal.');
        } else {
            console.warn('Nem található munkalap a fájlban.');
            setError('A fájl nem tartalmaz egyetlen munkalapot sem.');
        }
      } catch (err) {
        // DIAGNOSZTIKA: Hiba a feldolgozás közben
        console.error('Hiba a try...catch blokkban:', err);
        setError('Hiba történt az Excel/CSV feldolgozása közben. Lehet, hogy a fájl sérült.');
        setTableHtml('');
        setFileName('');
        setSheetName('');
        setRowCount(null);
        setSheetNames([]);
        setSelectedSheet('');
        workbookRef.current = null;
      }
    };
    reader.onerror = (err) => {
      // DIAGNOSZTIKA: Hiba a fájl olvasása közben
      console.error('FileReader hiba:', err);
      setError('Hiba történt a fájl olvasása közben.');
      setTableHtml('');
      setFileName('');
      setSheetName('');
      setRowCount(null);
      setSheetNames([]);
      setSelectedSheet('');
      workbookRef.current = null;
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) processFile(files[0]);
  };

  /** Drag & Drop */
  const onDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
      e.dataTransfer.clearData();
    }
  };
  const onDragOver = (e) => { e.preventDefault(); e.stopPropagation(); if (!isDragging) setIsDragging(true); };
  const onDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };

  /** Sheet váltás */
  const onSelectSheet = (e) => {
    const name = e.target.value;
    setSelectedSheet(name);
    setInfoMsg('');
    if (workbookRef.current && name) renderSheet(workbookRef.current, name);
  };

  /** Duplikátum törlés: Ticket Number alapján */
  const removeDuplicatesByTicketNumber = () => {
    setError('');
    setInfoMsg('');

    const wb = workbookRef.current;
    if (!wb || !selectedSheet) return;
    const ws = wb.Sheets[selectedSheet];
    if (!ws) return;

    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
    if (!aoa.length) return;

    const header = aoa[0] || [];
    const { ticket, added, currStatDate } = findColumnIndexes(header);

    if (ticket == null) {
      setError('Nem található a "Ticket Number" oszlop a fejlécben.');
      return;
    }

    const seen = new Set();
    const newAOA = [header];
    let deleted = 0;

    for (let r = 1; r < aoa.length; r++) {
      const row = aoa[r] || [];
      const tRaw = row[ticket];
      const t = tRaw == null ? '' : String(tRaw).trim();

      if (t === '') { newAOA.push(row); continue; }

      if (seen.has(t)) {
        deleted++;
      } else {
        seen.add(t);
        newAOA.push(row);
      }
    }

    const newWS = XLSX.utils.aoa_to_sheet(newAOA);
    enforceDateColumnsFormat(newWS, header, [added, currStatDate]);
    wb.Sheets[selectedSheet] = newWS;

    renderSheet(wb, selectedSheet);
    setInfoMsg(`Kész: "${header[ticket]}" alapján ${deleted} duplikált sort töröltem (első előfordulások megmaradtak).`);
  };

  /** Rendezés kiválasztott oszlop szerint */
  const sortBySelectedColumn = () => {
    setError('');
    setInfoMsg('');

    const wb = workbookRef.current;
    if (!wb || !selectedSheet) return;
    const ws = wb.Sheets[selectedSheet];
    if (!ws) return;

    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
    if (aoa.length <= 1) return;

    const header = aoa[0];
    const rows = aoa.slice(1);
    const colIdx = Number(sortColIdx) || 0;
    const dir = sortDir === 'desc' ? 'desc' : 'asc';

    rows.sort((ra, rb) => {
      const res = smartCompare(ra[colIdx], rb[colIdx]);
      return dir === 'asc' ? res : -res;
    });

    const newAOA = [header, ...rows];
    const newWS = XLSX.utils.aoa_to_sheet(newAOA);

    const { added, currStatDate } = findColumnIndexes(header);
    enforceDateColumnsFormat(newWS, header, [added, currStatDate]);

    wb.Sheets[selectedSheet] = newWS;

    renderSheet(wb, selectedSheet);
    setInfoMsg(`Rendezve: "${header[colIdx] ?? `Oszlop ${colIdx+1}`}" (${dir === 'asc' ? 'növekvő' : 'csökkenő'}).`);
  };

  /** Mentés Supabase-be: csak Excel-oszlopok, dátum stringként egységesítve */
  const saveCurrentSheetToSupabase = async () => {
    // --- DIAGNOSZTIKA KEZDETE ---
    console.log('Mentés gomb megnyomva, a saveCurrentSheetToSupabase funkció elindult.');
    setError('');
    setInfoMsg('');

    const wb = workbookRef.current;
    if (!wb || !selectedSheet) {
      console.error('Mentés leállt! Nincs feltöltött fájl (workbook) vagy nincs kiválasztott munkalap (selectedSheet).');
      setError('A mentéshez először tölts fel egy fájlt és válassz munkalapot.');
      return;
    }
    console.log('Fájl és munkalap rendben, a mentés folytatódik.');
    // --- DIAGNOSZTIKA VÉGE ---

    const ws = wb.Sheets[selectedSheet];
    if (!ws) {
        console.error('Hiba: a kiválasztott munkalap nem található a workbookban.');
        setError('Hiba történt a munkalap beolvasásakor.');
        return;
    }

    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
    if (aoa.length <= 1) {
      setInfoMsg('Nincs menthető adat a munkalapon.');
      return;
    }

    const rows = aoaToObjectsExcelSet(aoa);
    if (!rows.length) {
      setInfoMsg('Nincs menthető adat a szűrés/rendezés után.');
      return;
    }

    console.log(`Mentés előkészítve, ${rows.length} sor fog a Supabase-be kerülni.`);
    setInfoMsg('Mentés folyamatban...');

    try {
      const chunk = 1000;
      for (let i = 0; i < rows.length; i += chunk) {
        const slice = rows.slice(i, i + chunk);
        const { error: upErr } = await supabase
          .from('tickets')
          .upsert(slice, { onConflict: 'ticket_number' }); // ticket_number a PRIMARY KEY
        if (upErr) throw upErr;
      }
      setInfoMsg(`Sikeres mentés! ${rows.length} sor mentve a Supabase adatbázisba.`);
      console.log('Sikeres upsert a Supabase-be.');
    } catch (e) {
      console.error('Supabase hiba a mentés során:', e);
      setError(`Supabase hiba: ${e.message || e.toString()}`);
      setInfoMsg(''); // Töröljük a "Mentés folyamatban..." üzenetet hiba esetén
    }
  };

  return (
    <div className="page">
      <div className="container">
        <div className="header">
          <h1>Excel Fájl Feltöltő</h1>
          <p className="muted">Húzd ide a fájlt, vagy kattints a kiválasztáshoz.</p>
        </div>

        {/* Dropzone */}
        <div
          className={`dropzone${isDragging ? ' drag' : ''}`}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          aria-label="Fájl kiválasztása vagy idehúzása"
        >
          <div style={{fontWeight:700, fontSize:16}}>Húzd ide a fájlt</div>
          <div className="hint">.xlsx, .xls vagy .csv</div>
          <div style={{marginTop:12}}>
            <span className="btn">Válassz fájlt</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden-input"
            onChange={handleFileChange}
            accept=".xlsx,.xls,.csv"
          />
        </div>

        {/* Sheet-választó + Műveletek */}
        {sheetName && (
          <div style={{marginTop:16, display:'flex', gap:12, alignItems:'center', flexWrap:'wrap'}}>
            {sheetNames.length > 1 && (
              <>
                <label htmlFor="sheetSel" style={{margin:0}}>Munkalap:</label>
                <select
                  id="sheetSel"
                  value={selectedSheet}
                  onChange={onSelectSheet}
                  style={{
                    border:'1px solid var(--border)',
                    background:'var(--surface)',
                    color:'var(--fg)',
                    padding:'8px 10px',
                    borderRadius:'8px',
                    outline:'none'
                  }}
                >
                  {sheetNames.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </>
            )}

            {/* Rendezés UI */}
            {columns.length > 0 && (
              <>
                <label htmlFor="sortCol" style={{margin:0}}>Rendezés oszlop:</label>
                <select
                  id="sortCol"
                  value={sortColIdx}
                  onChange={(e) => setSortColIdx(Number(e.target.value))}
                  style={{
                    border:'1px solid var(--border)',
                    background:'var(--surface)',
                    color:'var(--fg)',
                    padding:'8px 10px',
                    borderRadius:'8px',
                    outline:'none'
                  }}
                >
                  {columns.map((name, i) => (
                    <option key={i} value={i}>{name}</option>
                  ))}
                </select>

                <select
                  value={sortDir}
                  onChange={(e) => setSortDir(e.target.value)}
                  style={{
                    border:'1px solid var(--border)',
                    background:'var(--surface)',
                    color:'var(--fg)',
                    padding:'8px 10px',
                    borderRadius:'8px',
                    outline:'none'
                  }}
                >
                  <option value="asc">Növekvő</option>
                  <option value="desc">Csökkenő</option>
                </select>

                <button className="btn-secondary" onClick={sortBySelectedColumn}>
                  Rendezés
                </button>
              </>
            )}

            <button
              className="btn-secondary"
              onClick={removeDuplicatesByTicketNumber}
              title='Azonos "Ticket Number" sorokból csak az első marad, a többi törlődik. Üreseket nem deduplikálunk.'
            >
              Duplikátumok törlése (Ticket Number)
            </button>

            <button className="btn" onClick={saveCurrentSheetToSupabase}>
              Mentés Supabase-be
            </button>

            {rowCount != null && <span className="muted">Jelenlegi sorok: {rowCount}</span>}
          </div>
        )}

        {/* Üzenetek */}
        {error && <ErrorMessage message={error} />}
        {infoMsg && <div className="alert" style={{ borderColor: 'var(--border)' }}>{infoMsg}</div>}

        {/* Tábla */}
        <div style={{marginTop: 18}}>
          <DataTable
            htmlString={tableHtml}
            fileName={fileName}
            sheetName={sheetName}
            rowCount={rowCount}
          />
        </div>
      </div>
    </div>
  );
}