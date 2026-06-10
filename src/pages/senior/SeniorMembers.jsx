/**
 * Senior Member Directory – large cards, prominent contact buttons
 */
import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import SeniorLayout from '@/components/senior/SeniorLayout';
import { Search, Phone, Mail, User, Loader2 } from 'lucide-react';

export default function SeniorMembers() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const [query, setQuery] = useState('');

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['seniorMembers', clubId],
    queryFn: () => base44.entities.ClubMembership.filter({ club_id: clubId, status: 'approved', member_status: 'active' }, 'surname'),
    enabled: !!clubId,
  });

  const filtered = members.filter(m => {
    const q = query.toLowerCase();
    const fullName = [m.first_name, m.surname].filter(Boolean).join(' ').toLowerCase();
    return !q || fullName.includes(q) || (m.user_name || '').toLowerCase().includes(q);
  });

  const resolveName = (m) => {
    if (m.first_name && m.surname) return `${m.first_name} ${m.surname}`;
    return m.user_name || m.user_email;
  };

  return (
    <SeniorLayout>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Member Directory</h1>
      <p className="text-lg text-gray-600 mb-5">Find and contact club members</p>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-300 rounded-2xl focus:outline-none focus:border-emerald-500 bg-white"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
          <span className="text-lg text-gray-600">Loading members…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border-2 border-gray-200">
          <User className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-xl text-gray-600">{query ? 'No members found.' : 'No members in directory.'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(member => (
            <div key={member.id} className="bg-white border-2 border-gray-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <span className="text-2xl font-bold text-emerald-700">
                    {(member.first_name?.[0] || member.user_name?.[0] || '?').toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{resolveName(member)}</p>
                  {member.title && <p className="text-base text-gray-500">{member.title}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {member.phone && (
                  <a
                    href={`tel:${member.phone}`}
                    className="flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base py-3 px-4 rounded-xl min-h-[52px] transition-colors"
                  >
                    <Phone className="w-5 h-5" />
                    Call
                  </a>
                )}
                {member.user_email && (
                  <a
                    href={`mailto:${member.user_email}`}
                    className="flex items-center justify-center gap-3 bg-[#1F3C5A] hover:bg-[#16304a] text-white font-bold text-base py-3 px-4 rounded-xl min-h-[52px] transition-colors"
                  >
                    <Mail className="w-5 h-5" />
                    Email
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </SeniorLayout>
  );
}