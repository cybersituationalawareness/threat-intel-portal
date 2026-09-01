import React from 'react';

function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(
          <button
            key={i}
            onClick={() => onPageChange(i)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '5px 10px',
              fontSize: '15px',
              fontWeight: currentPage === i ? 'bold' : 'normal',
              color: currentPage === i ? 'var(--accent)' : 'var(--text-color)'
            }}
          >
            {i}
          </button>
        );
      }
    } else {
      let startPage = Math.max(1, currentPage - 2);
      let endPage = Math.min(totalPages, currentPage + 2);

      if (currentPage <= 3) {
        endPage = maxVisiblePages;
      }
      if (currentPage >= totalPages - 2) {
        startPage = totalPages - maxVisiblePages + 1;
      }

      if (startPage > 1) {
        pages.push(
          <button key={1} onClick={() => onPageChange(1)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '5px 10px', fontSize: '15px', fontWeight: currentPage === 1 ? 'bold' : 'normal', color: currentPage === 1 ? 'var(--accent)' : 'var(--text-color)' }}>
            1
          </button>
        );
        if (startPage > 2) {
          pages.push(<span key="ellipsis-start" style={{ padding: '5px 10px', color: 'var(--text-dim)' }}>...</span>);
        }
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(
          <button
            key={i}
            onClick={() => onPageChange(i)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '5px 10px',
              fontSize: '15px',
              fontWeight: currentPage === i ? 'bold' : 'normal',
              color: currentPage === i ? 'var(--accent)' : 'var(--text-color)'
            }}
          >
            {i}
          </button>
        );
      }

      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          pages.push(<span key="ellipsis-end" style={{ padding: '5px 10px', color: 'var(--text-dim)' }}>...</span>);
        }
        pages.push(
          <button key={totalPages} onClick={() => onPageChange(totalPages)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '5px 10px', fontSize: '15px', fontWeight: currentPage === totalPages ? 'bold' : 'normal', color: currentPage === totalPages ? 'var(--accent)' : 'var(--text-color)' }}>
            {totalPages}
          </button>
        );
      }
    }
    return pages;
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '15px 0', gap: '5px', width: '100%', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-panel)' }}>
      <button 
        onClick={() => onPageChange(currentPage - 1)} 
        disabled={currentPage === 1}
        style={{
          background: 'var(--bg-glass)',
          border: '1px solid var(--border-color)',
          borderRadius: '4px',
          color: currentPage === 1 ? 'var(--text-dim)' : 'var(--text-color)',
          cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
          padding: '6px 12px',
          marginRight: '10px'
        }}
      >
        &larr;
      </button>
      {renderPageNumbers()}
      <button 
        onClick={() => onPageChange(currentPage + 1)} 
        disabled={currentPage === totalPages}
        style={{
          background: 'var(--bg-glass)',
          border: '1px solid var(--border-color)',
          borderRadius: '4px',
          color: currentPage === totalPages ? 'var(--text-dim)' : 'var(--text-color)',
          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
          padding: '6px 12px',
          marginLeft: '10px'
        }}
      >
        &rarr;
      </button>
    </div>
  );
}

export default Pagination;
