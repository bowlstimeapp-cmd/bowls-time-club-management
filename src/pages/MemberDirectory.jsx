import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, User, Phone, Mail, Users } from 'lucide-react';

export default function MemberDirectory() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const [search, setSearch] = useState('');
  const [membershipFilter, setMembershipFilter] = useState('all');

  const { data: club } = useQuery({
    queryKey: ['club', clubId],
    queryFn: async () => {
      const clubs = await base44.entities.Club.filter({ id: clubId });
      return clubs[0];
    },
    enabled: !!clubId,
  });

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['members', clubId],
    queryFn: () => base44.entities.ClubMembership.filter({ club_id: clubId, status: 'approved', member_status: 'active' }),
    enabled: !!clubId,
  });

  // Collect all unique membership groups across members
  const allGroups = useMemo(() => {
    const groups = new Set();
    members.forEach(m => (m.membership_groups || []).forEach(g => groups.add(g)));
    return [...groups].sort();
  }, [members]);

  const filtered = useMemo(() => {
    return members
      .filter(m => {
        const fullName = `${m.first_name || ''} ${m.surname || ''}`.toLowerCase().trim() || (m.user_name || '').toLowerCase();
        const matchesSearch = !search || fullName.includes(search.toLowerCase()) || (m.user_email || '').toLowerCase().includes(search.toLowerCase());
        const matchesGroup = membershipFilter === 'all' || (m.membership_groups || []).includes(membershipFilter);
        return matchesSearch && matchesGroup;
      })
      .sort((a, b) => {
        const nameA = (a.surname || a.user_name || '').toLowerCase();
        const nameB = (b.surname || b.user_name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
  }, [members, search, membershipFilter]);

  const getMemberName = (m) => {
    const parts = [m.title, m.first_name, m.surname].filter(Boolean);
    return parts.length ? parts.join(' ') : (m.user_name || m.user_email);
  };

  const roleColours = {
    admin: 'bg-red-100 text-red-700',
    selector: 'bg-blue-100 text-blue-700',
    steward: 'bg-amber-100 text-amber-700',
    live_scorer: 'bg-purple-100 text-purple-700',
    member: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Member Directory</h1>
          <p className="text-gray-500">{club?.name} · {members.length} active member{members.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {allGroups.length > 0 && (
            <Select value={membershipFilter} onValueChange={setMembershipFilter}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Membership type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All membership types</SelectItem>
                {allGroups.map(g => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Results count */}
        {!isLoading && (
          <p className="text-sm text-gray-500 mb-4">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            {search || membershipFilter !== 'all' ? ' found' : ''}
          </p>
        )}

        {/* Member Grid */}
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(9)].map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No members match your search.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(member => (
              <div
                key={member.id}
                className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-1">
                      <p className="font-semibold text-gray-900 text-sm leading-tight truncate">
                        {getMemberName(member)}
                      </p>
                      {member.role && member.role !== 'member' && (
                        <span className={`shrink-0 text-xs font-medium px-1.5 py-0.5 rounded capitalize ${roleColours[member.role] || roleColours.member}`}>
                          {member.role}
                        </span>
                      )}
                    </div>

                    {/* Contact details */}
                    <div className="mt-1.5 space-y-0.5">
                      {member.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Phone className="w-3 h-3 shrink-0" />
                          <a href={`tel:${member.phone}`} className="hover:text-emerald-600 hover:underline truncate">
                            {member.phone}
                          </a>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Mail className="w-3 h-3 shrink-0" />
                        <a href={`mailto:${member.user_email}`} className="hover:text-emerald-600 hover:underline truncate">
                          {member.user_email}
                        </a>
                      </div>
                    </div>

                    {/* Membership groups */}
                    {(member.membership_groups || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {member.membership_groups.map(g => (
                          <Badge key={g} variant="secondary" className="text-xs px-1.5 py-0">
                            {g}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}