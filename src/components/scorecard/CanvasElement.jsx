import React, { useRef } from 'react';

const ELEMENT_LABELS = {
  competition: 'Competition',
  matchName: 'Match Name',
  date: 'Date',
  time: 'Time',
  rink: 'Rink',
  clubName: 'Club Name',
  opponentName: 'Opponent',
  players: 'Players List',
  scoreTable: 'Score Table',
  logo: 'Logo',
  signatures: 'Signatures',
};

function ElementContent({ type, styles }) {
  const fs = Math.min(styles?.fontSize || 11, 14);
  switch (type) {
    case 'competition':
      return <div style={{ fontSize: fs }} className="px-1 font-bold truncate">Competition Name</div>;
    case 'matchName':
      return <div style={{ fontSize: fs }} className="px-1 truncate">vs Opponent BC</div>;
    case 'date':
      return <div style={{ fontSize: fs }} className="px-1 truncate">12 March 2026</div>;
    case 'time':
      return <div style={{ fontSize: fs }} className="px-1 truncate">14:00</div>;
    case 'rink':
      return <div style={{ fontSize: fs }} className="px-1 truncate">Rink 1</div>;
    case 'clubName':
      return <div style={{ fontSize: fs }} className="px-1 font-bold truncate">Your Bowls Club</div>;
    case 'opponentName':
      return <div style={{ fontSize: fs }} className="px-1 truncate">Opponent BC</div>;
    case 'players':
      return (
        <div className="px-1 overflow-hidden" style={{ fontSize: Math.min(fs, 10) }}>
          <div className="font-semibold mb-0.5">Players</div>
          {['1. Skip', '2. Third', '3. Second', '4. Lead'].map((p, i) => (
            <div key={i}>{p}</div>
          ))}
        </div>
      );
    case 'scoreTable':
      return (
        <div className="px-1 overflow-hidden w-full h-full">
          <table className="w-full border-collapse" style={{ fontSize: 8 }}>
            <thead>
              <tr>
                <th className="border border-gray-400 px-0.5 bg-gray-100">End</th>
                {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21].map(n => (
                  <th key={n} className="border border-gray-400 px-0.5 bg-gray-100 text-center">{n}</th>
                ))}
                <th className="border border-gray-400 px-0.5 bg-gray-100">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-400 px-0.5 font-semibold">H</td>
                {[...Array(21)].map((_, i) => <td key={i} className="border border-gray-400 text-center">&nbsp;</td>)}
                <td className="border border-gray-400">&nbsp;</td>
              </tr>
              <tr>
                <td className="border border-gray-400 px-0.5 font-semibold">A</td>
                {[...Array(21)].map((_, i) => <td key={i} className="border border-gray-400 text-center">&nbsp;</td>)}
                <td className="border border-gray-400">&nbsp;</td>
              </tr>
            </tbody>
          </table>
        </div>
      );
    case 'logo':
      return (
        <div className="flex items-center justify-center w-full h-full">
          <div className="border-2 border-dashed border-gray-300 rounded text-gray-400 text-xs px-3 py-1">
            Club Logo
          </div>
        </div>
      );
    case 'signatures':
      return (
        <div className="px-2 py-1 grid grid-cols-2 gap-6" style={{ fontSize: Math.min(fs, 10) }}>
          <div>
            <div className="font-semibold mb-3">Home Skip Signature:</div>
            <div className="border-b border-gray-500">&nbsp;</div>
          </div>
          <div>
            <div className="font-semibold mb-3">Away Skip Signature:</div>
            <div className="border-b border-gray-500">&nbsp;</div>
          </div>
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
      width: Math.max(40, resizeRef.current.startW + dx),
      height: Math.max(18, resizeRef.current.startH + dy),
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
        fontSize: styles.fontSize ? `${styles.fontSize}px` : '11px',
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
          <div
            style={{
              position: 'absolute', top: -18, left: 0,
              fontSize: 9, background: '#2563eb', color: 'white',
              padding: '1px 5px', whiteSpace: 'nowrap', pointerEvents: 'none',
              borderRadius: '2px 2px 0 0',
            }}
          >
            {ELEMENT_LABELS[element.type]}
          </div>

          <div
            style={{
              position: 'absolute', top: -8, right: -8,
              width: 16, height: 16, background: '#ef4444',
              borderRadius: '50%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', color: 'white',
              fontSize: 12, zIndex: 20, lineHeight: 1,
            }}
            onPointerDown={(e) => { e.stopPropagation(); onDelete(element.id); }}
          >
            ×
          </div>

          <div
            style={{
              position: 'absolute', bottom: -5, right: -5,
              width: 10, height: 10, background: '#2563eb',
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