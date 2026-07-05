import React, { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Upload } from 'lucide-react';

export const PALETTE_ITEMS = [
  { type: 'logo', label: 'Logo', bg: '#fef9c3' },
  { type: 'competition', label: 'Competition', bg: '#dbeafe' },
  { type: 'matchName', label: 'Club vs Opponent', bg: '#dcfce7' },
  { type: 'date', label: 'Date & Time', bg: '#fef3c7' },
  { type: 'matchDetailsBar', label: 'Match Details Bar', bg: '#e5e7eb' },
  { type: 'teamsRow', label: 'Teams Row', bg: '#d1d5db' },
  { type: 'players', label: 'Players List', bg: '#ede9fe' },
  { type: 'scoreTable', label: 'Score Table', bg: '#f0fdf4' },
  { type: 'signatures', label: 'Signatures', bg: '#fce7f3' },
];

export default function ElementPalette({ onImageUploaded, extracting }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleDragStart = (e, type) => {
    e.dataTransfer.setData('elementType', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate it's an image
    if (!file.type.startsWith('image/')) {
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (onImageUploaded) onImageUploaded(file_url);
    } catch (err) {
      // Silently fail — toast handled by parent if needed
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="w-44 bg-white border-r flex flex-col overflow-y-auto flex-shrink-0">
      <div className="p-3 border-b bg-gray-50">
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Elements</h3>
        <p className="text-xs text-gray-400 mt-0.5">Drag onto canvas</p>
      </div>

      <div className="p-2 space-y-1.5 overflow-y-auto">
        {/* Upload sample scorecard */}
        <div className="pb-2 mb-1 border-b border-gray-100">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || extracting}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-dashed border-blue-400 bg-blue-50 hover:bg-blue-100 disabled:opacity-60 cursor-pointer select-none text-xs text-blue-700 font-medium transition-colors"
          >
            {uploading ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…</>
            ) : extracting ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analysing…</>
            ) : (
              <><Upload className="w-3.5 h-3.5" /> Upload Scorecard</>
            )}
          </button>
          <p className="text-[10px] text-gray-400 mt-1 text-center leading-tight">
            {extracting
              ? 'AI is detecting editable elements from your scorecard…'
              : 'Upload a sample scorecard to auto-detect editable elements'}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

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