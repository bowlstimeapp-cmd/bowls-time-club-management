import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Check } from 'lucide-react';

export default function CountyMemberPicker({ members, selected, onToggle }) {
  const [search, setSearch] = useState('');
  const lower = search.toLowerCase();
  const filtered = members.filter(m =>
    !search || m.name.toLowerCase().includes(lower) || m.email.toLowerCase().includes(lower)
  );

  return (
    <div>
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search county members..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>
      <div className="mt-2 border rounded-lg max-h-64 overflow-y-auto divide-y divide-gray-100">
        {filtered.length === 0 ? (
          <p className="p-4 text-sm text-gray-400 text-center">No members found.</p>
        ) : filtered.map(m => (
          <button
            key={m.email}
            type="button"
            onClick={() => onToggle(m.email)}
            className="w-full flex items-center justify-between gap-3 px-3 py-2 hover:bg-gray-50 text-left"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{m.name}</p>
              <p className="text-xs text-gray-400 truncate">{m.email}</p>
            </div>
            {selected.includes(m.email) && (
              <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium shrink-0">
                <Check className="w-4 h-4" /> Selected
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}