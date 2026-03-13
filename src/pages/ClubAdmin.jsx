import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, 
  UserPlus, 
  Clock, 
  CheckCircle,
  XCircle,
  ShieldAlert,
  Shield,
  User,
  History,
  Upload,
  Search,
  Trophy,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Mail,
  Hash,
  CreditCard,
  UserX
} from 'lucide-react';
import { toast } from "sonner";
import { Link, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import MemberDetailModal from '@/components/member/MemberDetailModal';
import AddMemberModal from '@/components/member/AddMemberModal';
import BulkUploadModal from '@/components/member/BulkUploadModal';

// Role pill config
const roleMeta = {
  admin:    { label: 'Admin',    className: 'bg-violet-100 text-violet-700 border border-violet-200' },
  selector: { label: 'Selector', className: 'bg-amber-100 text-amber-700 border border-amber-200' },
  member:   { label: 'Member',   className: 'bg-slate-100 text-slate-600 border border-slate-200' },
};

// Membership type dot colours (strip " Member" suffix for display)
const membershipDotColor = {
  'Winter Indoor Member': 'bg-blue-400',
  'Summer Indoor Member': 'bg-orange-400',
  'Outdoor Member':       'bg-emerald-500',
  'Social Member':        'bg-purple-400',
};

function MemberCard({ member, onSelect, onRemove, isSelf, payment }) {
  const role = member.role || 'member';
  const roleBadge = roleMeta[role] || roleMeta.member;
  const initials = (member.user_name || member.user_email || '?')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.18 }}
      className="group relative bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer"
      onClick={() => onSelect(member)}
    >
      {/* Coloured top stripe */}
      <div className="h-1.5 w-full" style={{ background: '#049468' }} />

      <div className="p-5">
        {/* Avatar + role */}
        <div className="flex items-start justify-between mb-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-semibold text-sm select-none"
            style={{ background: '#049468' }}
          >
            {initials}
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleBadge.className}`}>
            {roleBadge.label}
          </span>
        </div>

        {/* Name */}
        <p className="font-semibold text-slate-900 text-sm leading-tight truncate mb-0.5">
          {member.user_name || '—'}
        </p>

        {/* Email */}
        <p className="text-xs text-slate-400 truncate mb-3 flex items-center gap-1">
          <Mail className="w-3 h-3 flex-shrink-0" />
          {member.user_email}
        </p>

        {/* Membership type dots */}
        {member.membership_groups?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {member.membership_groups.map(group => (
              <span
                key={group}
                className="inline-flex items-center gap-1 text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-full px-2 py-0.5"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${membershipDotColor[group] || 'bg-slate-400'}`} />
                {group.replace(' Member', '')}
              </span>
            ))}
          </div>
        )}

        {/* Locker */}
        {member.locker_number && (
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <Hash className="w-3 h-3" />
            Locker {member.locker_number}
          </p>
        )}

        {/* Payment status */}
        {payment && (
          <div className="mt-2 flex items-center gap-1">
            <CreditCard className="w-3 h-3 text-slate-400" />
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              payment.status === 'paid'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              {payment.status === 'paid' ? 'Paid' : 'Not Paid'}
            </span>
          </div>
        )}
      </div>

      {/* Remove button — appears on hover */}
      {!isSelf && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(member.id); }}
          className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"
          title="Remove member"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </motion.div>
  );
}

export default function ClubAdmin() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const [user, setUser] = useState(null);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [membershipTypeFilter, setMembershipTypeFilter] = useState('all');
  const [competitionModalOpen, setCompetitionModalOpen] = useState(false);
  const [editingCompetition, setEditingCompetition] = useState(null);
  const [competitionForm, setCompetitionForm] = useState({
    name: '',
    players_per_rink: 4,
    home_rinks: 2,
    away_rinks: 0
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  const { data: club } = useQuery({
    queryKey: ['club', clubId],
    queryFn: async () => {
      const clubs = await base44.entities.Club.filter({ id: clubId });
      return clubs[0];
    },
    enabled: !!clubId,
  });

  const { data: memberships = [], isLoading } = useQuery({
    queryKey: ['clubMemberships', clubId],
    queryFn: () => base44.entities.ClubMembership.filter({ club_id: clubId }),
    enabled: !!clubId,
  });

  const { data: myMembership } = useQuery({
    queryKey: ['myClubMembership', clubId, user?.email],
    queryFn: async () => {
      const memberships = await base44.entities.ClubMembership.filter({ 
        club_id: clubId, 
        user_email: user.email 
      });
      return memberships[0];
    },
    enabled: !!clubId && !!user?.email,
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['auditLogs', clubId],
    queryFn: () => base44.entities.AuditLog.filter({ club_id: clubId }, '-created_date', 50),
    enabled: !!clubId,
  });

  const { data: competitions = [] } = useQuery({
    queryKey: ['competitions', clubId],
    queryFn: () => base44.entities.Competition.filter({ club_id: clubId }),
    enabled: !!clubId,
  });

  const updateMembershipMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClubMembership.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clubMemberships'] }),
  });

  const addMemberMutation = useMutation({
    mutationFn: (data) => base44.entities.ClubMembership.create({ ...data, club_id: clubId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubMemberships'] });
      toast.success('Member added successfully');
      setAddMemberOpen(false);
    },
  });

  const createAuditLogMutation = useMutation({
    mutationFn: (data) => base44.entities.AuditLog.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['auditLogs'] }),
  });

  const deleteMembershipMutation = useMutation({
    mutationFn: (id) => base44.entities.ClubMembership.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubMemberships'] });
      toast.success('Member removed');
    },
  });

  const setMemberStatusMutation = useMutation({
    mutationFn: ({ id, member_status }) => base44.entities.ClubMembership.update(id, { member_status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubMemberships'] });
    },
  });

  const createCompetitionMutation = useMutation({
    mutationFn: (data) => base44.entities.Competition.create({ ...data, club_id: clubId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitions'] });
      toast.success('Competition created');
      setCompetitionModalOpen(false);
      resetCompetitionForm();
    },
  });

  const updateCompetitionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Competition.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitions'] });
      toast.success('Competition updated');
      setCompetitionModalOpen(false);
      setEditingCompetition(null);
      resetCompetitionForm();
    },
  });

  const deleteCompetitionMutation = useMutation({
    mutationFn: (id) => base44.entities.Competition.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitions'] });
      toast.success('Competition deleted');
    },
  });

  const isClubAdmin = myMembership?.role === 'admin' && myMembership?.status === 'approved';

  const { data: latestPayments = [] } = useQuery({
    queryKey: ['latestPayments', clubId],
    queryFn: () => base44.entities.MembershipPayment.filter({ club_id: clubId }, '-created_date', 500),
    enabled: !!clubId && isClubAdmin,
  });

  // Build a map of email -> latest paid payment for member cards
  const paymentByEmail = {};
  latestPayments.forEach(p => {
    const email = p.user_email;
    if (!paymentByEmail[email] || (p.status === 'paid' && paymentByEmail[email].status !== 'paid')) {
      paymentByEmail[email] = p;
    }
  });

  if (!clubId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>No club selected</p>
      </div>
    );
  }

  if (user && !isClubAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-8"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
            <ShieldAlert className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">You need club admin privileges to access this page.</p>
          <Link to={createPageUrl('BookRink') + `?clubId=${clubId}`}>
            <Button className="bg-emerald-600 hover:bg-emerald-700">Go to Bookings</Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  const handleApprove = async (membership) => {
    await updateMembershipMutation.mutateAsync({ id: membership.id, data: { status: 'approved' } });
    toast.success(`${membership.user_name || membership.user_email} approved`);
  };

  const handleReject = async (membership) => {
    await updateMembershipMutation.mutateAsync({ id: membership.id, data: { status: 'rejected' } });
    toast.success(`${membership.user_name || membership.user_email} rejected`);
  };

  const handleUpdateMember = async (memberId, updates, oldRole) => {
    const member = memberships.find(m => m.id === memberId);
    await updateMembershipMutation.mutateAsync({ id: memberId, data: updates });
    if (oldRole && updates.role !== oldRole) {
      await createAuditLogMutation.mutateAsync({
        club_id: clubId,
        action: 'role_change',
        target_email: member.user_email,
        target_name: updates.user_name || member.user_name,
        performed_by_email: user.email,
        performed_by_name: user.first_name && user.surname ? `${user.first_name} ${user.surname}` : user.email,
        old_value: oldRole,
        new_value: updates.role,
        details: `Role changed from ${oldRole} to ${updates.role}`
      });
    }
    toast.success('Member updated successfully');
    setSelectedMember(null);
  };

  const resetCompetitionForm = () => {
    setCompetitionForm({ name: '', players_per_rink: 4, home_rinks: 2, away_rinks: 0 });
  };

  const handleEditCompetition = (competition) => {
    setEditingCompetition(competition);
    setCompetitionForm({
      name: competition.name,
      players_per_rink: competition.players_per_rink,
      home_rinks: competition.home_rinks,
      away_rinks: competition.away_rinks || 0
    });
    setCompetitionModalOpen(true);
  };

  const handleSaveCompetition = () => {
    if (!competitionForm.name.trim()) { toast.error('Please enter a competition name'); return; }
    if (editingCompetition) {
      updateCompetitionMutation.mutate({ id: editingCompetition.id, data: competitionForm });
    } else {
      createCompetitionMutation.mutate(competitionForm);
    }
  };

  const pendingMembers = memberships.filter(m => m.status === 'pending');
  const approvedMembers = memberships.filter(m => m.status === 'approved' && m.member_status !== 'left');
  const previousMembers = memberships.filter(m => m.status === 'approved' && m.member_status === 'left');

  const applyFilters = (list) => list
    .filter(member => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = (
        member.user_name?.toLowerCase().includes(query) ||
        member.user_email?.toLowerCase().includes(query) ||
        member.locker_number?.toLowerCase().includes(query)
      );
      const matchesType = membershipTypeFilter === 'all' || (member.membership_groups || []).includes(membershipTypeFilter);
      return matchesSearch && matchesType;
    })
    .sort((a, b) => (a.user_name || a.user_email).localeCompare(b.user_name || b.user_email));

  const filteredApprovedMembers = applyFilters(approvedMembers);
  const filteredPreviousMembers = applyFilters(previousMembers);

  const membershipTypes = club?.membership_types || ['Winter Indoor Member', 'Summer Indoor Member', 'Outdoor Member', 'Social Member'];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 mb-1">Club Administration</p>
            <h1 className="text-3xl font-bold text-slate-900">{club?.name || 'Club'}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={createPageUrl('MembershipPayments') + `?clubId=${clubId}`}>
              <Button variant="outline" className="border-slate-200 text-slate-600">
                <CreditCard className="w-4 h-4 mr-2" />
                Payments
              </Button>
            </Link>
            <Button variant="outline" onClick={() => setBulkUploadOpen(true)} className="border-slate-200 text-slate-600">
              <Upload className="w-4 h-4 mr-2" />
              Bulk Upload
            </Button>
            <Button onClick={() => setAddMemberOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
              <UserPlus className="w-4 h-4 mr-2" />
              Add Member
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="grid grid-cols-3 gap-2 sm:gap-4 mb-8"
        >
          {[
            { icon: Clock, color: 'text-amber-500 bg-amber-50', label: 'Pending', value: pendingMembers.length },
            { icon: Users, color: 'text-emerald-600 bg-emerald-50', label: 'Members', value: approvedMembers.length },
            { icon: Shield, color: 'text-violet-500 bg-violet-50', label: 'Admins', value: approvedMembers.filter(m => m.role === 'admin').length },
          ].map(({ icon: Icon, color, label, value }) => (
            <div key={label} className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm p-3 sm:p-5 flex flex-col sm:flex-row items-center sm:items-center gap-1 sm:gap-4 text-center sm:text-left">
              <div className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl ${color} hidden sm:block`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-slate-900 leading-none mb-0.5">{value}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Tabs */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {/* Mobile: compact select dropdown */}
            <div className="sm:hidden mb-4">
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="pending">Pending ({pendingMembers.length})</option>
                <option value="members">Members ({approvedMembers.length})</option>
                <option value="previous">Previous Members ({previousMembers.length})</option>
                <option value="competitions">Competitions</option>
                <option value="audit">Audit Log</option>
              </select>
            </div>
            {/* Desktop: tab bar */}
            <TabsList className="hidden sm:flex bg-white border border-slate-100 shadow-sm rounded-xl p-1 mb-6 h-auto gap-1 w-full">
              <TabsTrigger value="pending" className="flex-1 rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white text-slate-500 text-sm px-3 py-2">
                <Clock className="w-3.5 h-3.5 mr-1.5" />
                Pending {pendingMembers.length > 0 && <span className="ml-1.5 bg-amber-400 text-white text-xs rounded-full w-4 h-4 inline-flex items-center justify-center">{pendingMembers.length}</span>}
              </TabsTrigger>
              <TabsTrigger value="members" className="flex-1 rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white text-slate-500 text-sm px-3 py-2">
                <Users className="w-3.5 h-3.5 mr-1.5" />
                Members ({approvedMembers.length})
              </TabsTrigger>
              <TabsTrigger value="previous" className="flex-1 rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white text-slate-500 text-sm px-3 py-2">
                <UserX className="w-3.5 h-3.5 mr-1.5" />
                Previous ({previousMembers.length})
              </TabsTrigger>
              <TabsTrigger value="competitions" className="flex-1 rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white text-slate-500 text-sm px-3 py-2">
                <Trophy className="w-3.5 h-3.5 mr-1.5" />
                Competitions
              </TabsTrigger>
              <TabsTrigger value="audit" className="flex-1 rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white text-slate-500 text-sm px-3 py-2">
                <History className="w-3.5 h-3.5 mr-1.5" />
                Audit Log
              </TabsTrigger>
            </TabsList>

            {/* ── PENDING ── */}
            <TabsContent value="pending">
              {isLoading ? (
                <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
              ) : pendingMembers.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center">
                  <CheckCircle className="w-10 h-10 mx-auto mb-3 text-emerald-300" />
                  <p className="text-slate-400 font-medium">No pending requests</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingMembers.map(member => (
                    <div key={member.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-slate-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{member.user_name || member.user_email}</p>
                          <p className="text-xs text-slate-400">{member.user_email}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button size="sm" onClick={() => handleApprove(member)} className="bg-emerald-600 hover:bg-emerald-700 h-8 text-xs">
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleReject(member)} className="border-red-100 text-red-500 hover:bg-red-50 h-8 text-xs">
                          <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── MEMBERS GRID ── */}
            <TabsContent value="members">
              {isLoading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
                </div>
              ) : (
                <>
                  <div className="mb-5 flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[160px] max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Search members..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-white border-slate-200 rounded-xl h-9 text-sm"
                      />
                    </div>
                    <Select value={membershipTypeFilter} onValueChange={setMembershipTypeFilter}>
                      <SelectTrigger className="w-48 h-9 bg-white border-slate-200 rounded-xl text-sm">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {membershipTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-slate-400 flex-shrink-0">
                      {filteredApprovedMembers.length} member{filteredApprovedMembers.length !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {filteredApprovedMembers.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center">
                      <Users className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                      <p className="text-slate-400 font-medium">{searchQuery ? 'No members found' : 'No members yet'}</p>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {filteredApprovedMembers.map((member, i) => (
                        <motion.div key={member.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                          <MemberCard
                            member={member}
                            onSelect={setSelectedMember}
                            onRemove={(id) => deleteMembershipMutation.mutate(id)}
                            isSelf={member.user_email === user?.email}
                            payment={paymentByEmail[member.user_email]}
                          />
                        </motion.div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* ── PREVIOUS MEMBERS ── */}
            <TabsContent value="previous">
              <>
                <div className="mb-5 flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[160px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search previous members..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 bg-white border-slate-200 rounded-xl h-9 text-sm"
                    />
                  </div>
                  <Select value={membershipTypeFilter} onValueChange={setMembershipTypeFilter}>
                    <SelectTrigger className="w-48 h-9 bg-white border-slate-200 rounded-xl text-sm">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {membershipTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-slate-400 flex-shrink-0">
                    {filteredPreviousMembers.length} member{filteredPreviousMembers.length !== 1 ? 's' : ''}
                  </p>
                </div>
                {filteredPreviousMembers.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center">
                    <UserX className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                    <p className="text-slate-400 font-medium">No previous members</p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredPreviousMembers.map((member, i) => (
                      <motion.div key={member.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                        <MemberCard
                          member={member}
                          onSelect={setSelectedMember}
                          onRemove={(id) => deleteMembershipMutation.mutate(id)}
                          isSelf={false}
                          payment={paymentByEmail[member.user_email]}
                        />
                      </motion.div>
                    ))}
                  </div>
                )}
              </>
            </TabsContent>

            {/* ── COMPETITIONS ── */}
            <TabsContent value="competitions">
              <div className="mb-4 flex justify-end">
                <Button onClick={() => { resetCompetitionForm(); setEditingCompetition(null); setCompetitionModalOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="w-4 h-4 mr-2" /> Add Competition
                </Button>
              </div>
              {competitions.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center">
                  <Trophy className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                  <p className="text-slate-400 font-medium">No competitions defined yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {competitions.map(comp => (
                    <div key={comp.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-800">{comp.name}</p>
                        <div className="flex gap-3 mt-1">
                          {[
                            `${comp.players_per_rink} per rink`,
                            `${comp.home_rinks} home`,
                            `${comp.away_rinks || 0} away`,
                          ].map(t => (
                            <span key={t} className="text-xs text-slate-400 bg-slate-50 border border-slate-100 rounded-full px-2 py-0.5">{t}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEditCompetition(comp)} className="text-slate-400 hover:text-slate-700 h-8 w-8 p-0">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteCompetitionMutation.mutate(comp.id)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 h-8 w-8 p-0">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── AUDIT LOG ── */}
            <TabsContent value="audit">
              {auditLogs.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center">
                  <History className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                  <p className="text-slate-400 font-medium">No audit logs yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map(log => (
                    <div key={log.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                      <p className="font-semibold text-slate-800 text-sm">
                        {log.action === 'role_change' && 'Role Change'}
                      </p>
                      <p className="text-sm text-slate-500 mt-0.5">{log.target_name || log.target_email}: {log.details}</p>
                      <p className="text-xs text-slate-400 mt-1.5">
                        By {log.performed_by_name || log.performed_by_email} · {new Date(log.created_date).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Modals */}
        <AddMemberModal
          open={addMemberOpen}
          onClose={() => setAddMemberOpen(false)}
          onSubmit={(data) => addMemberMutation.mutate(data)}
          isLoading={addMemberMutation.isPending}
          membershipTypes={membershipTypes}
        />
        <MemberDetailModal
          open={!!selectedMember}
          onClose={() => setSelectedMember(null)}
          member={selectedMember}
          onUpdateMember={handleUpdateMember}
          isUpdating={updateMembershipMutation.isPending}
          isAdmin={true}
          membershipTypes={membershipTypes}
          onSetMemberStatus={(id, status) => {
            setMemberStatusMutation.mutate({ id, member_status: status });
            toast.success(status === 'left' ? 'Member moved to Previous Members' : 'Member reinstated');
            setSelectedMember(null);
          }}
        />
        <BulkUploadModal
          open={bulkUploadOpen}
          onClose={() => setBulkUploadOpen(false)}
          clubId={clubId}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['clubMemberships'] })}
        />

        {/* Competition Modal */}
        {competitionModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="max-w-md w-full rounded-2xl shadow-xl border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{editingCompetition ? 'Edit Competition' : 'Add Competition'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm text-slate-600 mb-1.5 block">Competition Name *</Label>
                  <Input value={competitionForm.name} onChange={(e) => setCompetitionForm({ ...competitionForm, name: e.target.value })} placeholder="e.g., Bramley, Wessex League" className="rounded-xl" />
                </div>
                {[
                  { key: 'players_per_rink', label: 'Players per Rink', min: 2, max: 6 },
                  { key: 'home_rinks', label: 'Home Rinks', min: 0, max: 6 },
                  { key: 'away_rinks', label: 'Away Rinks', min: 0, max: 6 },
                ].map(({ key, label, min, max }) => (
                  <div key={key}>
                    <Label className="text-sm text-slate-600 mb-1.5 block">{label}</Label>
                    <Input type="number" min={min} max={max} value={competitionForm[key]} onChange={(e) => setCompetitionForm({ ...competitionForm, [key]: parseInt(e.target.value) })} className="rounded-xl" />
                  </div>
                ))}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1 rounded-xl" onClick={() => { setCompetitionModalOpen(false); setEditingCompetition(null); resetCompetitionForm(); }}>
                    Cancel
                  </Button>
                  <Button className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveCompetition} disabled={createCompetitionMutation.isPending || updateCompetitionMutation.isPending}>
                    {(createCompetitionMutation.isPending || updateCompetitionMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {editingCompetition ? 'Update' : 'Create'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}