import React, { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Lock, Send } from 'lucide-react';
import { toast } from 'sonner';
import { formatMessageTime } from '@/components/feedback/feedbackActivity';

const MAX_LEN = 2000;

const categoryLabel = (category) => {
  if (category === 'paid_enquiry') return 'Paid Enquiry';
  if (!category) return 'Feedback';
  return category.charAt(0).toUpperCase() + category.slice(1);
};

export default function FeedbackThread({ feedback, viewerRole = 'user', onSent }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');
  const scrollRef = useRef(null);

  const feedbackId = feedback?.id;

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['feedbackMessages', feedbackId],
    queryFn: async () => {
      const page = await base44.entities.FeedbackMessage.filter(
        { feedback_id: feedbackId },
        { sort: 'created_date', limit: 200 }
      );
      return Array.isArray(page) ? page : (page?.items || []);
    },
    enabled: !!feedbackId,
    refetchInterval: 15000,
  });

  // Old feedback with a single admin_response and no messages yet — show it as
  // the first admin message so the thread continues naturally.
  const thread = React.useMemo(() => {
    if (messages.length > 0) return messages;
    if (feedback?.admin_response) {
      return [{
        id: 'legacy-admin-response',
        sender_role: 'admin',
        sender_name: 'BowlsTime',
        message: feedback.admin_response,
        created_date: feedback.updated_date || feedback.created_date,
      }];
    }
    return [];
  }, [messages, feedback?.admin_response, feedback?.updated_date, feedback?.created_date]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [thread.length, feedbackId]);

  const sendMutation = useMutation({
    mutationFn: (message) => base44.functions.invoke('postFeedbackMessage', { feedback_id: feedbackId, message }),
    onSuccess: () => {
      setDraft('');
      queryClient.invalidateQueries({ queryKey: ['feedbackMessages', feedbackId] });
      queryClient.invalidateQueries({ queryKey: ['myFeedback'] });
      queryClient.invalidateQueries({ queryKey: ['allFeedback'] });
      onSent?.();
    },
    onError: (error) => {
      toast.error(error?.response?.data?.error || 'Could not send your reply. Please try again.');
    },
  });

  const closedForViewer = feedback?.conversation_closed === true && viewerRole === 'user';
  const isSending = sendMutation.isPending;
  const canSend = draft.trim().length > 0 && draft.length <= MAX_LEN && !isSending && !closedForViewer;

  const handleSend = () => {
    if (!canSend) return;
    sendMutation.mutate(draft.trim());
  };

  const bubbleFor = (message) => {
    const role = message.sender_role;
    const isOwn = (viewerRole === 'user' && role === 'user') || (viewerRole === 'admin' && role === 'admin');
    const label = role === 'admin'
      ? 'BowlsTime'
      : (feedback?.user_name || 'Member');

    return (
      <div key={message.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
        <div
          className={`max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap break-words ${
            isOwn
              ? 'bg-emerald-600 text-white rounded-br-sm'
              : 'bg-gray-100 text-gray-900 rounded-bl-sm'
          }`}
        >
          {message.message}
        </div>
        <span className="mt-1 px-1 text-xs text-gray-500">
          {label} · {formatMessageTime(message.created_date)}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div
        ref={scrollRef}
        className="max-h-[55vh] min-h-[180px] overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 space-y-3"
      >
        {/* The original submission is always the first message in the thread */}
        <div className={`flex flex-col ${viewerRole === 'user' ? 'items-end' : 'items-start'}`}>
          <div
            className={`max-w-[85%] rounded-2xl px-4 py-3 ${
              viewerRole === 'user'
                ? 'bg-emerald-600 text-white rounded-br-sm'
                : 'bg-gray-100 text-gray-900 rounded-bl-sm'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                viewerRole === 'user' ? 'bg-white/20 text-white' : 'bg-white text-gray-700 border border-gray-200'
              }`}>
                {categoryLabel(feedback?.category)}
              </span>
            </div>
            <p className="text-[15px] font-bold">{feedback?.title}</p>
            <p className="mt-1 text-[15px] leading-relaxed whitespace-pre-wrap break-words">{feedback?.description}</p>
          </div>
          <span className="mt-1 px-1 text-xs text-gray-500">
            {viewerRole === 'user' ? 'You' : (feedback?.user_name || 'Member')} · {formatMessageTime(feedback?.created_date)}
          </span>
        </div>

        {isLoading && (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
          </div>
        )}

        {thread.map((message) => {
          if (message.sender_role === 'system') {
            return (
              <div key={message.id} className="flex justify-center py-1">
                <span className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-full px-3 py-1 text-center">
                  {message.message}
                </span>
              </div>
            );
          }
          return bubbleFor(message);
        })}
      </div>

      {closedForViewer ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-5 text-center text-gray-600">
          <Lock className="w-4 h-4 shrink-0" />
          <span className="text-sm">This conversation has been closed</span>
        </div>
      ) : (
        <div className="space-y-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_LEN))}
            placeholder="Write a reply…"
            rows={4}
            className="text-[15px]"
          />
          <div className="flex items-center justify-between gap-3">
            <span className={`text-xs ${draft.length >= MAX_LEN ? 'text-amber-600 font-medium' : 'text-gray-500'}`}>
              {draft.length} / {MAX_LEN}
            </span>
            <Button
              onClick={handleSend}
              disabled={!canSend}
              className="bg-emerald-600 hover:bg-emerald-700 h-12 px-6 text-base font-semibold"
            >
              {isSending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Send className="w-5 h-5 mr-2" />}
              Send reply
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}