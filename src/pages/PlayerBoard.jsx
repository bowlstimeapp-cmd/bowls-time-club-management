import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Users, UserPlus, Plus, Loader2, MessageSquare, Archive, CheckCircle,
  XCircle, Mail, Trophy, ChevronRight, Pencil, Trash2, Send
} from 'lucide-react';
import { toast } from "sonner";
import { useSearchParams, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { formatDistanceToNow, parseISO } from 'date-fns';

const POSITIONS = ['Lead', 'Two', 'Three', 'Skip', 'Any'];

const POST_TYPE_CONFIG = {
  looking_for_team: { label: 'Looking for Team', color: 'bg-blue-100 text-blue-800', icon: UserPlus },
  looking_for_players: { label: 'Looking for Players', color: 'bg-emerald-100 text-emerald-800', icon: Users },
};

export default function PlayerBoard() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('active');

  // Filters
  const [filterLeague, setFilterLeague] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterPosition, setFilterPosition] = useState('all');

  // Post form
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [postType, setPostType] = useState('looking_for_team');
  const [postLeagueId, setPostLeagueId] = useState('');
  const [postTeamId, setPostTeamId] = useState('');
  const [postPosition, setPostPosition] = useState('Any');
  const [postTitle, setPostTitle] = useState('');
  const [postDescription, setPostDescription] = useState('');
  const [postContact, setPostContact] = useState('');

  // Detail dialog
  const [viewingPost, setViewingPost] = useState(null);

  // Invite/request dialog
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionPost, setActionPost] = useState(null);
  const [actionType, setActionType] = useState(null); // 'invite' | 'request'
  const [selectedTeamForAction, setSelectedTeamForAction] = useState('');

  // Respond to request/invite
  const [respondDialogOpen, setRespondDialogOpen] = useState(false);
  const [respondingRequest, setRespondingRequest] = useState(null);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  useEffect(() => {
    if (!clubId) navigate(createPageUrl('ClubSelector'));
  }, [clubId, navigate]);

  const { data: club } = useQuery({
    queryKey: ['club', clubId],
    queryFn: async () => { const c = await base44.entities.Club.filter({ id: clubId }); return c[0]; },
    enabled: !!clubId,
  });

  const { data: leagues = [] } = useQuery({
    queryKey: ['leagues', clubId],
    queryFn: () => base44.entities.League.filter({ club_id: clubId }),
    enabled: !!clubId,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['leagueTeams', clubId],
    queryFn: () => base44.entities.LeagueTeam.filter({ club_id: clubId }),
    enabled: !!clubId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['clubMembers', clubId],
    queryFn: () => base44.entities.ClubMembership.filter({ club_id: clubId, status: 'approved' }),
    enabled: !!clubId,
  });

  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['boardPosts', clubId],
    queryFn: () => base44.entities.TeamBoardPost.filter({ club_id: clubId }),
    enabled: !!clubId,
  });

  const { data: myRequests = [] } = useQuery({
    queryKey: ['myRequests', clubId, user?.email],
    queryFn: () => base44.entities.TeamMatchRequest.filter({ club_id: clubId }),
    enabled: !!clubId && !!user?.email,
  });

  // My captain teams
  const captainTeams = teams.filter(t => t.captain_email === user?.email);

  const getMemberName = (email) => {
    const m = members.find(m => m.user_email === email);
    if (m?.first_name && m?.surname) return `${m.first_name} ${m.surname}`;
    return m?.user_name || email;
  };

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createPostMutation = useMutation({
    mutationFn: (data) => base44.entities.TeamBoardPost.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boardPosts', clubId] });
      toast.success('Post created');
      closePostDialog();
    },
  });

  const updatePostMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TeamBoardPost.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boardPosts', clubId] });
      toast.success('Post updated');
      closePostDialog();
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: (id) => base44.entities.TeamBoardPost.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boardPosts', clubId] });
      toast.success('Post deleted');
      setViewingPost(null);
    },
  });

  const archivePostMutation = useMutation({
    mutationFn: (id) => base44.entities.TeamBoardPost.update(id, { status: 'archived' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boardPosts', clubId] });
      toast.success('Post archived');
      setViewingPost(null);
    },
  });

  const createRequestMutation = useMutation({
    mutationFn: (data) => base44.entities.TeamMatchRequest.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myRequests', clubId, user?.email] });
      toast.success(actionType === 'invite' ? 'Invite sent!' : 'Request sent!');
      setActionDialogOpen(false);
    },
  });

  const respondMutation = useMutation({
    mutationFn: async ({ request, accept }) => {
      await base44.entities.TeamMatchRequest.update(request.id, {
        status: accept ? 'accepted' : 'rejected',
        feedback: feedback || null,
      });

      if (accept) {
        // Add player to team
        const team = teams.find(t => t.id === request.team_id);
        if (team) {
          const playerEmail = request.request_type === 'invite' ? request.to_email : request.from_email;
          const existing = team.players || [];
          if (!existing.includes(playerEmail)) {
            await base44.entities.LeagueTeam.update(team.id, { players: [...existing, playerEmail] });
          }
        }
      }

      // Notify the other party
      const notifTarget = request.request_type === 'invite' ? request.from_email : request.to_email;
      const playerName = request.request_type === 'invite'
        ? getMemberName(request.to_email)
        : getMemberName(request.from_email);

      await base44.entities.Notification.create({
        user_email: notifTarget,
        type: accept
          ? (request.request_type === 'invite' ? 'team_invite_accepted' : 'team_request_accepted')
          : (request.request_type === 'invite' ? 'team_invite_rejected' : 'team_request_rejected'),
        title: accept ? '✅ Request Accepted' : '❌ Request Declined',
        message: accept
          ? `${playerName} has joined ${request.team_name} (${request.league_name}).`
          : `${playerName} declined the ${request.request_type} for ${request.team_name}${feedback ? ': ' + feedback : '.'}`,
        related_id: request.id,
        link_page: 'MyLeagueTeam',
        link_params: `clubId=${clubId}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myRequests', clubId, user?.email] });
      queryClient.invalidateQueries({ queryKey: ['leagueTeams', clubId] });
      toast.success('Response sent');
      setRespondDialogOpen(false);
      setRespondingRequest(null);
      setFeedback('');
    },
  });

  // ── Post form helpers ──────────────────────────────────────────────────────

  const openNewPost = (defaultType = 'looking_for_team') => {
    setEditingPost(null);
    setPostType(defaultType);
    setPostLeagueId('');
    setPostTeamId('');
    setPostPosition('Any');
    setPostTitle('');
    setPostDescription('');
    setPostContact('');
    setPostDialogOpen(true);
  };

  const openEditPost = (post) => {
    setEditingPost(post);
    setPostType(post.post_type);
    setPostLeagueId(post.league_id);
    setPostTeamId(post.team_id || '');
    setPostPosition(post.preferred_position || 'Any');
    setPostTitle(post.title);
    setPostDescription(post.description || '');
    setPostContact(post.contact_details || '');
    setViewingPost(null);
    setPostDialogOpen(true);
  };

  const closePostDialog = () => {
    setPostDialogOpen(false);
    setEditingPost(null);
  };

  const handleSavePost = () => {
    if (!postLeagueId || !postTitle.trim()) {
      toast.error('Please fill in league and title');
      return;
    }
    const league = leagues.find(l => l.id === postLeagueId);
    const team = teams.find(t => t.id === postTeamId);
    const data = {
      club_id: clubId,
      post_type: postType,
      league_id: postLeagueId,
      league_name: league?.name || '',
      team_id: postTeamId || null,
      team_name: team?.name || null,
      preferred_position: postPosition,
      title: postTitle.trim(),
      description: postDescription.trim(),
      contact_details: postContact.trim(),
      poster_name: user?.first_name && user?.surname ? `${user.first_name} ${user.surname}` : (user?.full_name || user?.email),
      poster_email: user?.email,
      status: 'active',
    };
    if (editingPost) {
      updatePostMutation.mutate({ id: editingPost.id, data });
    } else {
      createPostMutation.mutate(data);
    }
  };

  // ── Action (invite / request) ──────────────────────────────────────────────

  const openAction = (post, type) => {
    setActionPost(post);
    setActionType(type);
    setSelectedTeamForAction('');
    setActionDialogOpen(true);
  };

  const handleSendAction = async () => {
    const post = actionPost;
    const league = leagues.find(l => l.id === post.league_id);

    if (actionType === 'invite') {
      // Captain invites a "looking for team" poster to their team
      if (!selectedTeamForAction) { toast.error('Select a team'); return; }
      const team = teams.find(t => t.id === selectedTeamForAction);

      // Check for existing pending invite
      const existing = myRequests.find(r =>
        r.request_type === 'invite' && r.to_email === post.poster_email &&
        r.team_id === selectedTeamForAction && r.status === 'pending'
      );
      if (existing) { toast.error('You already sent an invite to this player for this team'); return; }

      await createRequestMutation.mutateAsync({
        club_id: clubId,
        request_type: 'invite',
        post_id: post.id,
        league_id: post.league_id,
        league_name: post.league_name,
        team_id: selectedTeamForAction,
        team_name: team?.name || '',
        from_email: user.email,
        from_name: getMemberName(user.email),
        to_email: post.poster_email,
        to_name: post.poster_name,
        status: 'pending',
      });

      // Notify the player
      await base44.entities.Notification.create({
        user_email: post.poster_email,
        type: 'team_invite',
        title: '🏆 Team Invite',
        message: `${getMemberName(user.email)} has invited you to join ${team?.name} in ${post.league_name}.`,
        related_id: post.id,
        link_page: 'PlayerBoard',
        link_params: `clubId=${clubId}`,
      });

    } else {
      // Player requests to join a "looking for players" team
      const existing = myRequests.find(r =>
        r.request_type === 'request' && r.from_email === user.email &&
        r.team_id === post.team_id && r.status === 'pending'
      );
      if (existing) { toast.error('You already sent a request to this team'); return; }

      const team = teams.find(t => t.id === post.team_id);
      await createRequestMutation.mutateAsync({
        club_id: clubId,
        request_type: 'request',
        post_id: post.id,
        league_id: post.league_id,
        league_name: post.league_name,
        team_id: post.team_id,
        team_name: post.team_name,
        from_email: user.email,
        from_name: getMemberName(user.email),
        to_email: post.poster_email,
        to_name: post.poster_name,
        status: 'pending',
      });

      // Notify the captain
      await base44.entities.Notification.create({
        user_email: post.poster_email,
        type: 'team_request',
        title: '👋 Join Request',
        message: `${getMemberName(user.email)} wants to join ${post.team_name} in ${post.league_name}.`,
        related_id: post.id,
        link_page: 'PlayerBoard',
        link_params: `clubId=${clubId}`,
      });
    }
  };

  // ── Derived data ───────────────────────────────────────────────────────────

  const activePosts = posts.filter(p => p.status === 'active');
  const archivedPosts = posts.filter(p => p.status === 'archived');

  const applyFilters = (list) => list.filter(p => {
    if (filterLeague !== 'all' && p.league_id !== filterLeague) return false;
    if (filterType !== 'all' && p.post_type !== filterType) return false;
    if (filterPosition !== 'all' && p.preferred_position !== filterPosition && filterPosition !== 'Any') return false;
    return true;
  }).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const filteredActive = applyFilters(activePosts);
  const filteredArchived = applyFilters(archivedPosts);

  // Pending requests addressed to me (as captain)
  const pendingRequestsToMe = myRequests.filter(r =>
    r.to_email === user?.email && r.status === 'pending'
  );
  // Pending invites sent to me (as player)
  const pendingInvitesToMe = myRequests.filter(r =>
    r.to_email === user?.email && r.request_type === 'invite' && r.status === 'pending'
  );

  const isMySentRequest = (post) => myRequests.some(r =>
    r.post_id === post.id && r.from_email === user?.email && r.status === 'pending'
  );

  const renderPostCard = (post) => {
    const config = POST_TYPE_CONFIG[post.post_type];
    const Icon = config.icon;
    const isOwner = post.poster_email === user?.email;
    const isLookingForTeam = post.post_type === 'looking_for_team';
    const iAmCaptain = captainTeams.some(t => t.league_id === post.league_id);
    const alreadySent = isMySentRequest(post);

    return (
      <motion.div key={post.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setViewingPost(post)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge className={config.color}>
                    <Icon className="w-3 h-3 mr-1" />
                    {config.label}
                  </Badge>
                  {post.preferred_position && post.preferred_position !== 'Any' && (
                    <Badge variant="outline" className="text-xs">{post.preferred_position}</Badge>
                  )}
                  {post.status === 'archived' && (
                    <Badge variant="secondary" className="text-xs">Archived</Badge>
                  )}
                </div>
                <h3 className="font-semibold text-gray-900 truncate">{post.title}</h3>
                <p className="text-sm text-gray-500 mt-0.5">{post.league_name}</p>
                {post.team_name && (
                  <p className="text-xs text-gray-400">{post.team_name}</p>
                )}
                {post.description && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{post.description}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <p className="text-xs text-gray-400 whitespace-nowrap">
                  {formatDistanceToNow(new Date(post.created_date), { addSuffix: true })}
                </p>
                {!isOwner && post.status === 'active' && (
                  <>
                    {isLookingForTeam && iAmCaptain && (
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-xs"
                        onClick={(e) => { e.stopPropagation(); openAction(post, 'invite'); }}
                        disabled={alreadySent}
                      >
                        {alreadySent ? 'Invited' : 'Invite to Team'}
                      </Button>
                    )}
                    {!isLookingForTeam && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={(e) => { e.stopPropagation(); openAction(post, 'request'); }}
                        disabled={alreadySent}
                      >
                        {alreadySent ? 'Requested' : 'Request to Join'}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-emerald-600" />
                Player Board
              </h1>
              <p className="text-gray-500 text-sm mt-1">{club?.name} • Find teams & players</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {captainTeams.length > 0 && (
                <Button size="sm" variant="outline" onClick={() => openNewPost('looking_for_players')}>
                  <Users className="w-4 h-4 mr-1" />
                  Find Players
                </Button>
              )}
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => openNewPost('looking_for_team')}>
                <Plus className="w-4 h-4 mr-1" />
                Find Team
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Pending requests banner */}
        {(pendingRequestsToMe.length > 0 || pendingInvitesToMe.length > 0) && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm font-medium text-amber-800 flex items-center gap-2">
              <Send className="w-4 h-4" />
              You have {pendingRequestsToMe.length + pendingInvitesToMe.length} pending{' '}
              {pendingRequestsToMe.length > 0 ? 'request(s)' : ''}{pendingRequestsToMe.length > 0 && pendingInvitesToMe.length > 0 ? ' and ' : ''}{pendingInvitesToMe.length > 0 ? 'invite(s)' : ''} to respond to.
            </p>
            <div className="mt-2 space-y-1">
              {[...pendingRequestsToMe, ...pendingInvitesToMe].map(req => (
                <div key={req.id} className="flex items-center justify-between bg-white rounded p-2 text-sm">
                  <span className="text-gray-700">
                    <strong>{req.from_name}</strong> {req.request_type === 'invite' ? 'invited you to' : 'wants to join'} <strong>{req.team_name}</strong>
                  </span>
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { setRespondingRequest(req); setFeedback(''); setRespondDialogOpen(true); }}>
                    Respond
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 flex-wrap mb-4">
          <Select value={filterLeague} onValueChange={setFilterLeague}>
            <SelectTrigger className="w-40 h-8 text-sm">
              <SelectValue placeholder="All leagues" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Leagues</SelectItem>
              {leagues.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-44 h-8 text-sm">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="looking_for_team">Looking for Team</SelectItem>
              <SelectItem value="looking_for_players">Looking for Players</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPosition} onValueChange={setFilterPosition}>
            <SelectTrigger className="w-36 h-8 text-sm">
              <SelectValue placeholder="Any position" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Position</SelectItem>
              {POSITIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="active">Active ({filteredActive.length})</TabsTrigger>
            <TabsTrigger value="archived">Archived ({filteredArchived.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-3">
            {postsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
            ) : filteredActive.length === 0 ? (
              <Card><CardContent className="py-10 text-center">
                <MessageSquare className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No active posts. Be the first to post!</p>
              </CardContent></Card>
            ) : filteredActive.map(renderPostCard)}
          </TabsContent>

          <TabsContent value="archived" className="space-y-3">
            {filteredArchived.length === 0 ? (
              <Card><CardContent className="py-10 text-center">
                <Archive className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No archived posts</p>
              </CardContent></Card>
            ) : filteredArchived.map(renderPostCard)}
          </TabsContent>
        </Tabs>

        {/* ── Post Detail Dialog ─────────────────────────────────────────── */}
        <Dialog open={!!viewingPost} onOpenChange={() => setViewingPost(null)}>
          {viewingPost && (() => {
            const config = POST_TYPE_CONFIG[viewingPost.post_type];
            const Icon = config.icon;
            const isOwner = viewingPost.poster_email === user?.email;
            const isLookingForTeam = viewingPost.post_type === 'looking_for_team';
            const iAmCaptain = captainTeams.some(t => t.league_id === viewingPost.league_id);
            const alreadySent = isMySentRequest(viewingPost);

            return (
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
                <DialogHeader>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={config.color}><Icon className="w-3 h-3 mr-1" />{config.label}</Badge>
                    {viewingPost.preferred_position && viewingPost.preferred_position !== 'Any' && (
                      <Badge variant="outline">{viewingPost.preferred_position}</Badge>
                    )}
                    {viewingPost.status === 'archived' && <Badge variant="secondary">Archived</Badge>}
                  </div>
                  <DialogTitle className="mt-2">{viewingPost.title}</DialogTitle>
                </DialogHeader>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-1 text-gray-500">
                    <Trophy className="w-4 h-4" />
                    {viewingPost.league_name}{viewingPost.team_name ? ` · ${viewingPost.team_name}` : ''}
                  </div>
                  {viewingPost.description && (
                    <p className="text-gray-700 whitespace-pre-wrap">{viewingPost.description}</p>
                  )}
                  <div className="border-t pt-3">
                    <p className="text-xs text-gray-500 mb-1">Contact</p>
                    <p className="text-gray-800 flex items-center gap-1">
                      <Mail className="w-4 h-4 text-gray-400" />
                      {viewingPost.contact_details || viewingPost.poster_email}
                    </p>
                  </div>
                  <p className="text-xs text-gray-400">
                    Posted by {viewingPost.poster_name} · {formatDistanceToNow(new Date(viewingPost.created_date), { addSuffix: true })}
                  </p>
                </div>

                <DialogFooter className="flex flex-wrap gap-2 sm:justify-between">
                  <div className="flex gap-2">
                    {isOwner && viewingPost.status === 'active' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => openEditPost(viewingPost)}>
                          <Pencil className="w-3 h-3 mr-1" />Edit
                        </Button>
                        <Button size="sm" variant="outline" className="text-amber-600 border-amber-300" onClick={() => archivePostMutation.mutate(viewingPost.id)}>
                          <CheckCircle className="w-3 h-3 mr-1" />Found!
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600 border-red-300" onClick={() => deletePostMutation.mutate(viewingPost.id)}>
                          <Trash2 className="w-3 h-3 mr-1" />Delete
                        </Button>
                      </>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!isOwner && viewingPost.status === 'active' && isLookingForTeam && iAmCaptain && (
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={alreadySent} onClick={() => { setViewingPost(null); openAction(viewingPost, 'invite'); }}>
                        {alreadySent ? 'Invited' : 'Invite to Team'}
                      </Button>
                    )}
                    {!isOwner && viewingPost.status === 'active' && !isLookingForTeam && (
                      <Button size="sm" variant="outline" disabled={alreadySent} onClick={() => { setViewingPost(null); openAction(viewingPost, 'request'); }}>
                        {alreadySent ? 'Requested' : 'Request to Join'}
                      </Button>
                    )}
                  </div>
                </DialogFooter>
              </DialogContent>
            );
          })()}
        </Dialog>

        {/* ── Create / Edit Post Dialog ──────────────────────────────────── */}
        <Dialog open={postDialogOpen} onOpenChange={closePostDialog}>
          <DialogContent className="max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
            <DialogHeader>
              <DialogTitle>{editingPost ? 'Edit Post' : 'New Post'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Post Type</Label>
                <Select value={postType} onValueChange={setPostType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="looking_for_team">Looking for Team (player)</SelectItem>
                    <SelectItem value="looking_for_players" disabled={captainTeams.length === 0}>
                      Looking for Players (captain only)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>League *</Label>
                <Select value={postLeagueId} onValueChange={(v) => { setPostLeagueId(v); setPostTeamId(''); }}>
                  <SelectTrigger><SelectValue placeholder="Select league" /></SelectTrigger>
                  <SelectContent>
                    {leagues.filter(l => l.status === 'active' || l.status === 'draft').map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {postType === 'looking_for_players' && (
                <div>
                  <Label>Your Team *</Label>
                  <Select value={postTeamId} onValueChange={setPostTeamId}>
                    <SelectTrigger><SelectValue placeholder="Select your team" /></SelectTrigger>
                    <SelectContent>
                      {captainTeams.filter(t => !postLeagueId || t.league_id === postLeagueId).map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {postType === 'looking_for_team' && (
                <div>
                  <Label>Preferred Position</Label>
                  <Select value={postPosition} onValueChange={setPostPosition}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {POSITIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>Title *</Label>
                <Input value={postTitle} onChange={e => setPostTitle(e.target.value)} placeholder="e.g. Experienced skip available" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={postDescription} onChange={e => setPostDescription(e.target.value)} placeholder="Tell people about yourself or what you're looking for..." rows={3} />
              </div>
              <div>
                <Label>Contact Details</Label>
                <Input value={postContact} onChange={e => setPostContact(e.target.value)} placeholder="Phone, email, or other contact..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closePostDialog}>Cancel</Button>
              <Button
                onClick={handleSavePost}
                disabled={createPostMutation.isPending || updatePostMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {(createPostMutation.isPending || updatePostMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingPost ? 'Update' : 'Post'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Invite / Request Action Dialog ────────────────────────────── */}
        <Dialog open={actionDialogOpen} onOpenChange={() => setActionDialogOpen(false)}>
          {actionPost && (
            <DialogContent className="mx-4 sm:mx-auto">
              <DialogHeader>
                <DialogTitle>{actionType === 'invite' ? 'Invite to Team' : 'Request to Join'}</DialogTitle>
                <DialogDescription>
                  {actionType === 'invite'
                    ? `Invite ${actionPost.poster_name} to one of your teams in ${actionPost.league_name}`
                    : `Send a request to join ${actionPost.team_name} in ${actionPost.league_name}`}
                </DialogDescription>
              </DialogHeader>
              {actionType === 'invite' && (
                <div>
                  <Label>Select Your Team</Label>
                  <Select value={selectedTeamForAction} onValueChange={setSelectedTeamForAction}>
                    <SelectTrigger><SelectValue placeholder="Choose team" /></SelectTrigger>
                    <SelectContent>
                      {captainTeams.filter(t => t.league_id === actionPost.league_id).map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setActionDialogOpen(false)}>Cancel</Button>
                <Button
                  onClick={handleSendAction}
                  disabled={createRequestMutation.isPending || (actionType === 'invite' && !selectedTeamForAction)}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {createRequestMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <Send className="w-4 h-4 mr-1" />Send
                </Button>
              </DialogFooter>
            </DialogContent>
          )}
        </Dialog>

        {/* ── Respond to Request/Invite Dialog ──────────────────────────── */}
        <Dialog open={respondDialogOpen} onOpenChange={() => { setRespondDialogOpen(false); setFeedback(''); }}>
          {respondingRequest && (
            <DialogContent className="mx-4 sm:mx-auto">
              <DialogHeader>
                <DialogTitle>
                  {respondingRequest.request_type === 'invite' ? 'Team Invite' : 'Join Request'}
                </DialogTitle>
                <DialogDescription>
                  {respondingRequest.request_type === 'invite'
                    ? `${respondingRequest.from_name} invited you to join ${respondingRequest.team_name} (${respondingRequest.league_name})`
                    : `${respondingRequest.from_name} wants to join ${respondingRequest.team_name} (${respondingRequest.league_name})`}
                </DialogDescription>
              </DialogHeader>
              <div>
                <Label>Feedback (optional, shown if declining)</Label>
                <Textarea value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="Optional message..." rows={2} />
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setRespondDialogOpen(false)}>Cancel</Button>
                <Button
                  variant="outline"
                  className="text-red-600 border-red-300"
                  disabled={respondMutation.isPending}
                  onClick={() => respondMutation.mutate({ request: respondingRequest, accept: false })}
                >
                  <XCircle className="w-4 h-4 mr-1" />Decline
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={respondMutation.isPending}
                  onClick={() => respondMutation.mutate({ request: respondingRequest, accept: true })}
                >
                  {respondMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <CheckCircle className="w-4 h-4 mr-1" />Accept
                </Button>
              </DialogFooter>
            </DialogContent>
          )}
        </Dialog>

      </div>
    </div>
  );
}