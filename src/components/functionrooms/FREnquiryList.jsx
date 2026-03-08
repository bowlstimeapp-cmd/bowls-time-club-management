import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Search, Users, AlertTriangle } from 'lucide-react';
import { STATUS_CONFIG, PIPELINE_STATUSES, CLOSED_STATUSES, getConflicts } from './frUtils';

const ALL_FILTER_STATUSES = ['all', ...PIPELINE_STATUSES];

const FILTER_LABELS = {
  all: 'All',
  new_enquiry: 'New',
  contacted: 'Contacted',
  awaiting_response: 'Awaiting',
  provisional_hold: 'Provisional',
  confirmed: 'Confirmed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  completed: 'Completed',
};

export default function FREnquiryList({ bookings, onSelect }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = bookings.filter(b => {
    const normalised = ['pending', 'approved'].includes(b.status) 
      ? (b.status === 'pending' ? 'new_enquiry' : 'confirmed') 
      : b.status;
    const statusMatch = statusFilter === 'all' || normalised === statusFilter || b.status === statusFilter;
    const q = search.toLowerCase();
    const searchMatch = !q || 
      b.contact_name?.toLowerCase().includes(q) ||
      b.contact_email?.toLowerCase().includes(q) ||
      b.organisation?.toLowerCase().includes(q) ||
      b.room_name?.toLowerCase().includes(q);
    return statusMatch && searchMatch;
  });

  const sorted = [...filtered].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const countForStatus = (s) => {
    if (s === 'all') return bookings.length;
    return bookings.filter(b => b.status === s || (s === 'new_enquiry' && b.status === 'pending') || (s === 'confirmed' && b.status === 'approved')).length;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {ALL_FILTER_STATUSES.map(s => {
          const count = countForStatus(s);
          const isActive = statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                isActive 
                  ? 'bg-emerald-600 text-white border-emerald-600' 
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {FILTER_LABELS[s]}
              <span className={`ml-1.5 text-xs ${isActive ? 'text-emerald-100' : 'text-gray-400'}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          className="pl-9"
          placeholder="Search by name, email, organisation, room..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      <Card>
        <CardContent className="p-0">
          {sorted.length === 0 ? (
            <div className="text-center py-14">
              <CalendarDays className="w-12 h-12 mx-auto mb-3 text-gray-200" />
              <p className="text-gray-400">No enquiries found</p>
            </div>
          ) : (
            <div className="divide-y">
              {sorted.map(b => {
                const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG['new_enquiry'];
                const conflicts = getConflicts(b, bookings);
                const hasConflict = conflicts.length > 0 && !CLOSED_STATUSES.includes(b.status);

                return (
                  <div
                    key={b.id}
                    onClick={() => onSelect(b)}
                    className="flex items-start gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    {/* Status bar */}
                    <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${cfg.dotColor}`} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-gray-900">{b.room_name || '—'}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${cfg.className}`}>{cfg.label}</span>
                        {b.source === 'api' && <Badge variant="outline" className="text-xs">API</Badge>}
                        {hasConflict && (
                          <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                            <AlertTriangle className="w-3 h-3" /> Conflict
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                        <CalendarDays className="w-3.5 h-3.5" />
                        {b.date} · {b.start_time}–{b.end_time} ({b.duration_hours}h)
                      </div>
                      <div className="text-sm font-medium text-gray-800">{b.contact_name}</div>
                      <div className="text-xs text-gray-500">{b.contact_email}{b.contact_phone ? ` · ${b.contact_phone}` : ''}</div>
                      {b.organisation && <div className="text-xs text-gray-500">{b.organisation}</div>}
                      {b.purpose && <div className="text-xs text-gray-500 italic mt-0.5 truncate">"{b.purpose}"</div>}
                    </div>

                    <div className="flex-shrink-0 text-right">
                      {b.attendees && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 justify-end">
                          <Users className="w-3 h-3" /> {b.attendees}
                        </div>
                      )}
                      {b.assigned_to && <div className="text-xs text-gray-400 mt-1">{b.assigned_to}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}