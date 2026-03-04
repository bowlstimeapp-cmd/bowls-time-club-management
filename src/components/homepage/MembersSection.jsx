import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Search, Mail, Phone } from 'lucide-react';
import HomepageSection from './HomepageSection';

export default function MembersSection({ members }) {
  const [search, setSearch] = useState('');

  const filtered = members
    .filter(m => {
      const q = search.toLowerCase();
      return !q ||
        m.user_name?.toLowerCase().includes(q) ||
        m.first_name?.toLowerCase().includes(q) ||
        m.surname?.toLowerCase().includes(q);
    })
    .sort((a, b) => (a.user_name || '').localeCompare(b.user_name || ''));

  return (
    <HomepageSection title="Club Members">
      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search members..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">{search ? 'No members found' : 'No members yet'}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(m => {
            const initials = (m.user_name || m.user_email || '?')
              .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
            return (
              <Card key={m.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold text-sm shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{m.user_name || m.user_email}</p>
                    {m.phone && (
                      <a href={`tel:${m.phone}`} className="text-xs text-gray-500 flex items-center gap-1 hover:text-emerald-600 mt-0.5">
                        <Phone className="w-3 h-3" />{m.phone}
                      </a>
                    )}
                    <a href={`mailto:${m.user_email}`} className="text-xs text-gray-400 flex items-center gap-1 hover:text-emerald-600 mt-0.5 truncate">
                      <Mail className="w-3 h-3 shrink-0" />{m.user_email}
                    </a>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </HomepageSection>
  );
}