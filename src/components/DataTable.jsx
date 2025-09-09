import React from 'react';

/**
 * A SheetJS sheet_to_html kimenetet biztonságosan becsatornázzuk és rárakjuk a saját wrapperünket.
 * Tipp: ha szeretnél extra osztályokat ráerőltetni az outputra, lehet regex-szel bővíteni.
 */
export default function DataTable({ htmlString, fileName, sheetName, rowCount }) {
  if (!htmlString) return null;

  // Opcionális: a SheetJS által generált <table> kapjon egy data-table attribútumot (CSS targethez nem szükséges).
  const enhancedHtml = htmlString
    .replace('<table', '<table data-generated="sheetjs"');

  return (
    <div>
      <div className="table-info">
        <div><strong>Fájl:</strong> {fileName || '-'}</div>
        {sheetName ? <div><strong>Munkalap:</strong> {sheetName}</div> : null}
        {typeof rowCount === 'number' ? <div><strong>Összes sor:</strong> {rowCount}</div> : null}
      </div>
      <div className="table-wrapper" dangerouslySetInnerHTML={{ __html: enhancedHtml }} />
    </div>
  );
}
