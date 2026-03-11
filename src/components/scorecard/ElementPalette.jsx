import React from 'react';

const PALETTE_ITEMS = [
  { type: 'competition', label: 'Competition', bg: '#dbeafe' },
  { type: 'matchName', label: 'Match Name', bg: '#dcfce7' },
  { type: 'date', label: 'Date', bg: '#fef3c7' },
  { type: 'time', label: 'Time', bg: '#fef3c7' },
  { type: 'rink', label: 'Rink', bg: '#fce7f3' },
  { type: 'clubName', label: 'Club Name', bg: '#dbeafe' },
  { type: 'opponentName', label: 'Opponent', bg: '#dcfce7' },
  { type: 'players', label: 'Players List', bg: '#ede9fe' },
  { type: 'scoreTable', label: 'Score Table', bg: '#ede9fe' },
  { type: 'logo', label: 'Logo', bg: '#fef9c3' },
  { type: 'signatures', label: 'Signatures', bg: '#f0fdf4' },
];

export default function ElementPalette() {
  const handleDragStart = (e, type) => {
    e.dataTransfer.setData('elementType', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="w-44 bg-white border-r flex flex-col overflow-y-auto flex-shrink-0">
      <div className="p-3 border-b bg-gray-50">
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Elements</h3>
        <p className="text-xs text-gray-400 mt-0.5">Drag onto canvas</p>
      </div>
      <div className="p-2 space-y-1.5 overflow-y-auto">
        {PALETTE_ITEMS.map(item => (
          <div
            key={item.type}
            draggable
            onDragStart={(e) => handleDragStart(e, item.type)}
            className="flex items-center px-3 py-2 rounded-md border border-gray-200 cursor-grab active:cursor-grabbing hover:border-blue-300 select-none text-xs text-gray-700 font-medium transition-colors"
            style={{ backgroundColor: item.bg }}
          >
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}