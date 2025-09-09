import React from 'react';

export default function ErrorMessage({ message }) {
  if (!message) return null;
  return (
    <div className="alert alert--error" role="alert">
      <strong>Hiba: </strong>{message}
    </div>
  );
}
