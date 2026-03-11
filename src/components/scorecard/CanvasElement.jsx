import React, { useRef } from 'react';

export const ELEMENT_LABELS = {
  logo: 'Logo',
  competition: 'Competition',
  matchName: 'Club vs Opponent',
  date: 'Date & Time',
  matchDetailsBar: 'Match Details Bar',
  teamsRow: 'Teams Row',
  players: 'Players List',
  scoreTable: 'Score Table',
  signatures: 'Signatures',
};

function ElementContent({ type, styles }) {
  const fs = styles?.fontSize || 8;

  switch (type) {
    case 'logo':
      return (
        <div className="flex items-center justify-center w-full h-full">
          <div className="border border-dashed border-gray-400 rounded text-gray-400 flex items-center justify-center w-4/5 h-4/5"
            style={{ fontSize: Math.min(fs, 9) }}>
            Club Logo
          </div>
        </div>
      );

    case 'competition':
      return (
        <div className="flex items-start w-full h-full p-0.5" style={{ fontSize: fs, fontWeight: 'bold', lineHeight: 1.2 }}>
          League / Competition Name
        </div>
      );

    case 'matchName':
      return (
        <div className="flex items-center w-full h-full p-0.5" style={{ fontSize: fs, lineHeight: 1.2 }}>
          Home Club vs Opponents
        </div>
      );

    case 'date':
      return (
        <div className="flex items-center w-full h-full p-0.5" style={{ fontSize: fs, lineHeight: 1.2 }}>
          12 Mar 2026 · 14:00 to 16:00
        </div>
      );

    case 'matchDetailsBar':
      return (
        <div className="flex flex-col items-center justify-center w-full h-full text-center p-0.5"
          style={{ fontSize: fs, fontWeight: 'bold', lineHeight: 1.3 }}>
          <div>Wednesday - 12 Mar 2026</div>
          <div>Competition · Rink 1 (Home)</div>
        </div>
      );

    case 'teamsRow':
      return (
        <div className="flex items-center justify-between w-full h-full px-1"
          style={{ fontSize: fs, fontWeight: 'bold' }}>
          <span>Home Club</span>
          <span style={{ fontSize: Math.max(fs - 1, 6) }}>Vs</span>
          <span>Opponents</span>
        </div>
      );

    case 'players': {
      const positions = ['Lead', '2', '3', 'Skip'];
      return (
        <div className="w-full h-full overflow-hidden" style={{ fontSize: fs }}>
          {positions.map((pos, i) => (
            <div key={i} className="grid border-b border-gray-300 items-center"
              style={{ gridTemplateColumns: '1fr 20px 1fr', height: '25%', padding: '0 2px', fontWeight: 'bold' }}>
              <span className="truncate">Player Name</span>
              <span className="text-center" style={{ fontSize: Math.max(fs - 1, 6) }}>{pos === 'Lead' ? '1' : pos}</span>
              <span></span>
            </div>
          ))}
        </div>
      );
    }

    case 'scoreTable':
      return (
        <div className="w-full h-full overflow-hidden">
          <table className="w-full border-collapse h-full" style={{ fontSize: Math.max(fs - 2, 5) }}>
            <thead>
              <tr>
                {['Score', 'Total', 'Ends', 'Score', 'Total'].map((h, i) => (
                  <th key={i} className="border border-gray-500 text-center bg-gray-200 py-0" style={{ fontSize: Math.max(fs - 1, 6), fontWeight: 'bold' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 12 }, (_, i) => (
                <tr key={i}>
                  <td className="border border-gray-300" style={{ height: '5%' }}></td>
                  <td className="border border-gray-300"></td>
                  <td className="border border-gray-300 text-center bg-gray-50" style={{ fontSize: Math.max(fs - 2, 5) }}>{i + 1}</td>
                  <td className="border border-gray-300"></td>
                  <td className="border border-gray-300"></td>
                </tr>
              ))}
              <tr className="bg-gray-200">
                <td className="border border-gray-500 px-0.5" style={{ fontWeight: 'bold', fontSize: Math.max(fs - 1, 6) }}>Total</td>
                <td className="border border-gray-500"></td>
                <td className="border border-gray-500"></td>
                <td className="border border-gray-500 px-0.5" style={{ fontWeight: 'bold', fontSize: Math.max(fs - 1, 6) }}>Total</td>
                <td className="border border-gray-500"></td>
              </tr>
            </tbody>
          </table>
        </div>
      );

    case 'signatures':
      return (
        <div className="flex items-center justify-center w-full h-full" style={{ fontSize: fs }}>
          <span>Signatures of Skips</span>
        </div>
      );

    default:
      return <div className="px-1 text-xs text-gray-400 truncate">{ELEMENT_LABELS[type] || type}</div>;
  }
}

export default function CanvasElement({ element, scale, isSelected, onSelect, onUpdate, onDelete }) {
  const dragRef = useRef({ active: false });
  const resizeRef = useRef({ active: false });

  const handlePointerDown = (e) => {
    e.stopPropagation();
    onSelect(element.id);
    dragRef.current = {
      active: true,
      startPx: e.clientX,
      startPy: e.clientY,
      startEx: element.x,
      startEy: element.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!dragRef.current.active) return;
    const dx = (e.clientX - dragRef.current.startPx) / scale;
    const dy = (e.clientY - dragRef.current.startPy) / scale;
    onUpdate(element.id, {
      x: Math.max(0, dragRef.current.startEx + dx),
      y: Math.max(0, dragRef.current.startEy + dy),
    });
  };

  const handlePointerUp = () => { dragRef.current.active = false; };

  const handleResizePointerDown = (e) => {
    e.stopPropagation();
    resizeRef.current = {
      active: true,
      startPx: e.clientX,
      startPy: e.clientY,
      startW: element.width,
      startH: element.height,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleResizePointerMove = (e) => {
    if (!resizeRef.current.active) return;
    const dx = (e.clientX - resizeRef.current.startPx) / scale;
    const dy = (e.clientY - resizeRef.current.startPy) / scale;
    onUpdate(element.id, {
      width: Math.max(30, resizeRef.current.startW + dx),
      height: Math.max(16, resizeRef.current.startH + dy),
    });
  };

  const handleResizePointerUp = () => { resizeRef.current.active = false; };

  const styles = element.styles || {};
  const hasBorder = styles.borderColor && styles.borderColor !== '';

  return (
    <div
      style={{
        position: 'absolute',
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        cursor: 'move',
        border: isSelected
          ? '2px solid #2563eb'
          : hasBorder
            ? `1px solid ${styles.borderColor}`
            : '1px dashed #cbd5e1',
        backgroundColor: styles.backgroundColor || 'transparent',
        fontSize: styles.fontSize ? `${styles.fontSize}px` : '8px',
        fontWeight: styles.fontWeight || 'normal',
        textAlign: styles.textAlign || 'left',
        overflow: 'hidden',
        userSelect: 'none',
        touchAction: 'none',
        boxSizing: 'border-box',
        zIndex: isSelected ? 10 : 1,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <ElementContent type={element.type} styles={styles} />

      {isSelected && (
        <>
          <div style={{
            position: 'absolute', top: -16, left: 0,
            fontSize: 8, background: '#2563eb', color: 'white',
            padding: '1px 5px', whiteSpace: 'nowrap', pointerEvents: 'none',
            borderRadius: '2px 2px 0 0',
          }}>
            {ELEMENT_LABELS[element.type]}
          </div>

          <div
            style={{
              position: 'absolute', top: -7, right: -7,
              width: 14, height: 14, background: '#ef4444',
              borderRadius: '50%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', color: 'white',
              fontSize: 11, zIndex: 20, lineHeight: 1,
            }}
            onPointerDown={(e) => { e.stopPropagation(); onDelete(element.id); }}
          >
            ×
          </div>

          <div
            style={{
              position: 'absolute', bottom: -4, right: -4,
              width: 9, height: 9, background: '#2563eb',
              borderRadius: 2, cursor: 'se-resize', zIndex: 20,
              touchAction: 'none',
            }}
            onPointerDown={handleResizePointerDown}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
          />
        </>
      )}
    </div>
  );
}