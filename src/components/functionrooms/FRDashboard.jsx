import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, CalendarCheck, Clock, Inbox, CheckCircle2 } from 'lucide-react';
import { STATUS_CONFIG, CLOSED_STATUSES, getConflicts } from './frUtils';

export default function FRDashboard({ bookings, onViewEnquiry }) {
  const today = new Date().toISOString().split('T')[0];

  const newEnquiries = bookings.filter(b => ['new_enquiry', 'pending'].includes(b.status));
  const awaiting = bookings.filter(b => b.status === 'awaiting_response');
  const provisional = bookings.filter(b => b.status === 'provisional_hold');
  const upcomingConfirmed = bookings.filter(b => ['confirmed', 'approved'].includes(b.status) && b.date >= today);

  const conflicts = bookings.filter(b => !CLOSED_STATUSES.includes(b.status) && getConflicts(b, bookings).length > 0);
  const uniqueConflictIds = new Set();
  const conflictPairs = [];
  for (const b of conflicts) {
    if (!uniqueConflictIds.has(b.id)) {
      const others = getConflicts(b, bookings);
      others.forEach(o => { uniqueConflictIds.add(b.id); uniqueConflictIds.add(o.id); });
      if (others.length > 0) conflictPairs.push({ a: b, b: others[0] });
    }
  }

  const stats = [
    { label: 'New Enquiries', count: newEnquiries.length, color: 'border-blue-200 bg-blue-50', icon: Inbox, iconColor: 'text-blue-500' },
    { label: 'Awaiting Response', count: awaiting.length, color: 'border-orange-200 bg-orange-50', icon: Clock, iconColor: 'text-orange-500' },
    { label: 'Provisional Holds', count: provisional.length, color: 'border-purple-200 bg-purple-50', icon: CalendarCheck, iconColor: 'text-purple-500' },
    { label: 'Upcoming Confirmed', count: upcomingConfirmed.length, color: 'border-emerald-200 bg-emerald-50', icon: CheckCircle2, iconColor: 'text-emerald-500' },
  ];

  const recent = [...bookings].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <Card key={s.label} className={`border ${s.color}`}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`w-9 h-9 ${s.iconColor} flex-shrink-0`} />
              <div>
                <div className="text-3xl font-bold text-gray-900">{s.count}</div>
                <div className="text-xs text-gray-600 leading-tight">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Conflict Warnings */}
      {conflictPairs.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <h3 className="font-semibold text-red-800">{conflictPairs.length} Scheduling Conflict{conflictPairs.length > 1 ? 's' : ''} Detected</h3>
            </div>
            <div className="space-y-2">
              {conflictPairs.slice(0, 4).map(({ a, b }) => (
                <div key={a.id} className="flex items-center justify-between bg-white rounded-lg p-2 border border-red-100 text-sm">
                  <span className="font-medium text-gray-700">{a.room_name} · {a.date} {a.start_time}–{a.end_time}</span>
                  <div className="flex gap-2">
                    <button onClick={() => onViewEnquiry(a)} className="text-red-600 hover:underline">{a.contact_name}</button>
                    <span className="text-gray-400">vs</span>
                    <button onClick={() => onViewEnquiry(b)} className="text-red-600 hover:underline">{b.contact_name}</button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Recent Activity</h3>
          {recent.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No enquiries yet</p>
          ) : (
            <div className="divide-y">
              {recent.map(b => {
                const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG['new_enquiry'];
                return (
                  <div key={b.id} className="flex items-center justify-between py-3 cursor-pointer hover:bg-gray-50 -mx-4 px-4 rounded" onClick={() => onViewEnquiry(b)}>
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dotColor}`} />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{b.contact_name}</div>
                        <div className="text-xs text-gray-500">{b.room_name} · {b.date} {b.start_time}–{b.end_time}</div>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${cfg.className}`}>{cfg.label}</span>
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