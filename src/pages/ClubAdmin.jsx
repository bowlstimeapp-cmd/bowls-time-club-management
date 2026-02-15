import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  UserPlus, 
  Clock, 
  CheckCircle,
  XCircle,
  ShieldAlert,
  Shield,
  User,
  History
} from 'lucide-react';
import { toast } from "sonner";
import { Link, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import MemberDetailModal from '@/components/member/MemberDetailModal';
import AddMemberModal from '@/components/member/AddMemberModal';

const membershipColors = {
  'Winter Indoor Member': 'bg-blue-100 text-blue-800 border-blue-200',
  'Summer Indoor Member': 'bg-orange-100 text-orange-800 border-orange-200',
  'Outdoor Member': 'bg-green-100 text-green-800 border-green-200',
  'Social Member': 'bg-purple-100 text-purple-800 border-purple-200',
};

export default function ClubAdmin() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const [user, setUser] = useState(null);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');

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

  const updateMembershipMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClubMembership.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubMemberships'] });
    },
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
    },
  });

  const deleteMembershipMutation = useMutation({
    mutationFn: (id) => base44.entities.ClubMembership.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubMemberships'] });
      toast.success('Member removed');
    },
  });

  const isClubAdmin = myMembership?.role === 'admin' && myMembership?.status === 'approved';

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
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              Go to Bookings
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  const handleApprove = async (membership) => {
    await updateMembershipMutation.mutateAsync({ 
      id: membership.id, 
      data: { status: 'approved' } 
    });
    toast.success(`${membership.user_name || membership.user_email} approved`);
  };

  const handleReject = async (membership) => {
    await updateMembershipMutation.mutateAsync({ 
      id: membership.id, 
      data: { status: 'rejected' } 
    });
    toast.success(`${membership.user_name || membership.user_email} rejected`);
  };

  const handleUpdateMember = async (memberId, updates, oldRole) => {
    const member = memberships.find(m => m.id === memberId);
    await updateMembershipMutation.mutateAsync({ 
      id: memberId, 
      data: updates 
    });
    
    // Log role change if role was changed
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

  const pendingMembers = memberships.filter(m => m.status === 'pending');
  const approvedMembers = memberships.filter(m => m.status === 'approved');

  const membershipTypes = club?.membership_types || ['Winter Indoor Member', 'Summer Indoor Member', 'Outdoor Member', 'Social Member'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">
              {club?.name || 'Club'} - Members
            </h1>
            <p className="text-gray-600">Manage club membership and requests</p>
          </div>
          <Button onClick={() => setAddMemberOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
            <UserPlus className="w-4 h-4 mr-2" />
            Add Member
          </Button>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
        >
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingMembers.length}</p>
                <p className="text-sm text-gray-500">Pending Requests</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{approvedMembers.length}</p>
                <p className="text-sm text-gray-500">Active Members</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-100">
                <Shield className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {approvedMembers.filter(m => m.role === 'admin').length}
                </p>
                <p className="text-sm text-gray-500">Admins</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Pending ({pendingMembers.length})
              </TabsTrigger>
              <TabsTrigger value="members" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Members ({approvedMembers.length})
              </TabsTrigger>
              <TabsTrigger value="audit" className="flex items-center gap-2">
                <History className="w-4 h-4" />
                Audit Log
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : pendingMembers.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500">No pending membership requests</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {pendingMembers.map(member => (
                    <Card key={member.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                              <User className="w-5 h-5 text-gray-500" />
                            </div>
                            <div>
                              <p className="font-medium">{member.user_name || member.user_email}</p>
                              <p className="text-sm text-gray-500">{member.user_email}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(member)}
                              className="bg-emerald-600 hover:bg-emerald-700"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReject(member)}
                              className="border-red-200 text-red-600 hover:bg-red-50"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="members">
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : approvedMembers.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500">No members yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {approvedMembers.map(member => (
                    <Card 
                      key={member.id} 
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setSelectedMember(member)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                              <User className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium">{member.user_name || member.user_email}</p>
                                {member.role === 'admin' && (
                                  <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200">
                                    Admin
                                  </Badge>
                                )}
                                {member.role === 'selector' && (
                                  <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                                    Selector
                                  </Badge>
                                )}
                                {member.membership_groups?.map(group => (
                                  <Badge key={group} className={membershipColors[group] || 'bg-gray-100'}>
                                    {group.replace(' Member', '')}
                                  </Badge>
                                ))}
                              </div>
                              <p className="text-sm text-gray-500">{member.user_email}</p>
                            </div>
                          </div>
                          {member.user_email !== user?.email && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteMembershipMutation.mutate(member.id);
                              }}
                              className="text-red-600 hover:bg-red-50"
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="audit">
              {auditLogs.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500">No audit logs yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map(log => (
                    <Card key={log.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">
                              {log.action === 'role_change' && 'Role Change'}
                            </p>
                            <p className="text-sm text-gray-600">
                              {log.target_name || log.target_email}: {log.details}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              By {log.performed_by_name || log.performed_by_email} • {new Date(log.created_date).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>

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
        />
      </div>
    </div>
  );
}