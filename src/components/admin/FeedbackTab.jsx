import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import FeedbackThread from '@/components/feedback/FeedbackThread';
import { activityLabel, needsReply, sortByActivity } from '@/components/feedback/feedbackActivity';

const STATUS_OPTIONS = [
  { value: 'new_feedback', label: 'New Feedback' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'implemented', label: 'Implemented' },
  { value: 'abandoned', label: 'Abandoned' },
];

const errorText = (error, fallback) =>
  error?.response?.data?.error || error?.message || fallback;

export default function FeedbackTab({ feedbacks = [], isLoading, clubs = [], initialFeedbackId }) {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [openId, setOpenId] = useState(initialFeedbackId || null);

  const sorted = useMemo(() => sortByActivity(feedbacks), [feedbacks]);
  const unreadCount = feedbacks.filter(f => f.unread_by_admin === true).length;

  const filtered = sorted.filter(f => {
    if (statusFilter === 'needs_reply') return needsReply(f);
    if (statusFilter === 'all') return true;
    if (statusFilter === 'new_feedback') return !f.status || f.status === 'new_feedback';
    return f.status === statusFilter;
  });

  const selected = useMemo(
    () => sorted.find(f => f.id === openId) || null,
    [sorted, openId]
  );

  // Opening a thread clears its unread flag for the admin
  useEffect(() => {
    if (!openId) return;
    base44.functions
      .invoke('markFeedbackRead', { feedback_id: openId })
      .then(() => queryClient.invalidateQueries({ queryKey: ['allFeedback'] }))
      .catch(() => {});
  }, [openId, queryClient]);

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) =>
      base44.functions.invoke('postFeedbackMessage', { feedback_id: id, action: 'status', status }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['allFeedback'] });
      queryClient.invalidateQueries({ queryKey: ['feedbackMessages', vars.id] });
      toast.success('Status updated');
    },
    onError: (error) => toast.error(errorText(error, 'Could not update the status')),
  });

  const closedMutation = useMutation({
    mutationFn: ({ id, closed }) => base44.entities.Feedback.update(id, { conversation_closed: closed }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allFeedback'] });
      toast.success('Conversation updated');
    },
    onError: (error) => toast.error(errorText(error, 'Could not update the conversation')),
  });

  const changeStatus = (id, status) => statusMutation.mutate({ id, status });

  const categoryBadge = (feedback) => (
    feedback.category === 'paid_enquiry' ? (
      <Badge className="bg-purple-100 text-purple-800 border-purple-200">Paid Enquiry</Badge>
    ) : (
      <Badge variant={feedback.category === 'bug' ? 'destructive' : feedback.category === 'feature' ? 'default' : 'secondary'}>
        {feedback.category}
      </Badge>
    )
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2">
            User Feedback
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full min-w-5 h-5 px-1.5 inline-flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </CardTitle>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="needs_reply">Needs reply</SelectItem>
              {STATUS_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">
              {statusFilter === 'needs_reply' ? 'Nothing needs a reply right now' : 'No feedback submitted yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Category</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Title</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">User</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Status</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Last activity</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(feedback => (
                  <tr
                    key={feedback.id}
                    className="border-b last:border-0 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setOpenId(feedback.id)}
                  >
                    <td className="py-3 px-2">{categoryBadge(feedback)}</td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        {feedback.unread_by_admin === true && (
                          <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" title="Unread reply" />
                        )}
                        <span className={feedback.unread_by_admin === true ? 'font-semibold' : 'font-medium'}>
                          {feedback.title}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-sm">
                      <div>{feedback.user_name}</div>
                      <div className="text-xs text-gray-500">{feedback.user_email}</div>
                    </td>
                    <td className="py-3 px-2" onClick={e => e.stopPropagation()}>
                      <Select
                        value={feedback.status || 'new_feedback'}
                        onValueChange={(value) => changeStatus(feedback.id, value)}
                      >
                        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map(option => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-3 px-2 text-sm text-gray-600 whitespace-nowrap">{activityLabel(feedback)}</td>
                    <td className="py-3 px-2 text-sm text-gray-500 whitespace-nowrap">
                      {new Date(feedback.created_date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setOpenId(null); }}>
        <DialogContent className="max-w-2xl mx-4 sm:mx-auto max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-600" />
              Feedback Conversation
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-5">
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {categoryBadge(selected)}
                  <span className="text-xs text-gray-400">
                    {new Date(selected.created_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <p className="text-lg font-semibold text-gray-900">{selected.title}</p>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Submitted By</p>
                  <p className="text-gray-900">{selected.user_name}</p>
                  <p className="text-sm text-gray-500">{selected.user_email}</p>
                </div>
                {selected.related_club_id && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Related Club</p>
                    <p className="text-gray-900">
                      {clubs.find(c => c.id === selected.related_club_id)?.name || selected.related_club_id}
                    </p>
                  </div>
                )}
                {selected.related_module && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Related Module</p>
                    <p className="text-gray-900">{selected.related_module}</p>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-6 pt-1">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Status</p>
                    <Select
                      value={selected.status || 'new_feedback'}
                      onValueChange={(value) => changeStatus(selected.id, value)}
                    >
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="close-conversation"
                        checked={selected.conversation_closed === true}
                        onCheckedChange={(checked) => closedMutation.mutate({ id: selected.id, closed: checked })}
                      />
                      <label htmlFor="close-conversation" className="text-sm font-medium text-gray-700 cursor-pointer">
                        Close conversation
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Users can't reply to closed conversations</p>
                  </div>
                </div>
              </div>

              <FeedbackThread feedback={selected} viewerRole="admin" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}