import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, Hash, MessageSquare, Users } from 'lucide-react';
import { toast } from 'sonner';
import { format, isToday, isYesterday } from 'date-fns';

const CHANNELS = [
  { id: 'general', label: 'General', description: 'Club-wide announcements & chat' },
  { id: 'social', label: 'Social', description: 'Social events & get-togethers' },
  { id: 'selection', label: 'Selection', description: 'Match selection discussion' },
];

function formatMessageDate(dateStr) {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return `Yesterday ${format(d, 'HH:mm')}`;
  return format(d, 'd MMM, HH:mm');
}

export default function ClubMessaging() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const [user, setUser] = useState(null);
  const [membership, setMembership] = useState(null);
  const [activeChannel, setActiveChannel] = useState('general');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  useEffect(() => {
    if (!user?.email || !clubId) return;
    base44.entities.ClubMembership.filter({ club_id: clubId, user_email: user.email })
      .then(res => setMembership(res[0]));
  }, [user?.email, clubId]);

  const { data: messages = [] } = useQuery({
    queryKey: ['clubMessages', clubId, activeChannel],
    queryFn: () => base44.entities.ClubMessage.filter({ club_id: clubId, channel: activeChannel }, 'created_date', 100),
    enabled: !!clubId,
    refetchInterval: 5000,
  });

  // Real-time subscription
  useEffect(() => {
    if (!clubId) return;
    const unsub = base44.entities.ClubMessage.subscribe((event) => {
      if (event.data?.club_id === clubId) {
        queryClient.invalidateQueries({ queryKey: ['clubMessages', clubId, activeChannel] });
      }
    });
    return unsub;
  }, [clubId, activeChannel, queryClient]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!draft.trim() || !user || !clubId) return;
    setSending(true);
    const senderName = membership?.first_name && membership?.surname
      ? `${membership.first_name} ${membership.surname}`
      : user.full_name || user.email.split('@')[0];
    await base44.entities.ClubMessage.create({
      club_id: clubId,
      sender_email: user.email,
      sender_name: senderName,
      content: draft.trim(),
      channel: activeChannel,
    });
    setDraft('');
    setSending(false);
    queryClient.invalidateQueries({ queryKey: ['clubMessages', clubId, activeChannel] });
  };

  // Group messages by sender for visual bubbling
  const groupedMessages = messages.reduce((acc, msg, i) => {
    const prev = messages[i - 1];
    const isSameSender = prev?.sender_email === msg.sender_email &&
      new Date(msg.created_date) - new Date(prev.created_date) < 5 * 60 * 1000;
    acc.push({ ...msg, isContinuation: isSameSender });
    return acc;
  }, []);

  const isAdmin = membership?.role === 'admin';

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
      {/* Sidebar */}
      <div className="w-56 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-600" />
            <span className="font-semibold text-gray-900">Club Chat</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 py-2">Channels</p>
          {CHANNELS.map(ch => (
            <button
              key={ch.id}
              onClick={() => setActiveChannel(ch.id)}
              className={`w-full text-left flex items-center gap-2 px-2 py-2 rounded-lg transition-colors text-sm ${
                activeChannel === ch.id
                  ? 'bg-emerald-50 text-emerald-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Hash className="w-4 h-4 flex-shrink-0" />
              {ch.label}
            </button>
          ))}
        </div>
        {user && (
          <div className="p-3 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-medium text-emerald-700">
                {(membership?.first_name?.[0] || user.full_name?.[0] || user.email[0]).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-700 truncate">
                  {membership?.first_name && membership?.surname
                    ? `${membership.first_name} ${membership.surname}`
                    : user.full_name || user.email.split('@')[0]}
                </p>
                {isAdmin && <Badge className="text-xs py-0 px-1.5 bg-emerald-100 text-emerald-700">Admin</Badge>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-2">
          <Hash className="w-5 h-5 text-gray-400" />
          <h2 className="font-semibold text-gray-900">
            {CHANNELS.find(c => c.id === activeChannel)?.label}
          </h2>
          <span className="text-sm text-gray-500">—</span>
          <span className="text-sm text-gray-500">
            {CHANNELS.find(c => c.id === activeChannel)?.description}
          </span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
              <Hash className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-lg font-medium">No messages yet</p>
              <p className="text-sm">Be the first to say something in #{CHANNELS.find(c => c.id === activeChannel)?.label.toLowerCase()}!</p>
            </div>
          )}
          {groupedMessages.map((msg) => {
            const isOwn = msg.sender_email === user?.email;
            return (
              <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${msg.isContinuation ? 'mt-0.5' : 'mt-3'}`}>
                {!isOwn && !msg.isContinuation && (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600 mr-2 mt-1 flex-shrink-0">
                    {(msg.sender_name?.[0] || '?').toUpperCase()}
                  </div>
                )}
                {!isOwn && msg.isContinuation && <div className="w-8 mr-2 flex-shrink-0" />}
                <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                  {!msg.isContinuation && (
                    <div className={`flex items-baseline gap-2 mb-0.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
                      <span className="text-xs font-semibold text-gray-700">{isOwn ? 'You' : msg.sender_name}</span>
                      <span className="text-xs text-gray-400">{formatMessageDate(msg.created_date)}</span>
                    </div>
                  )}
                  <div className={`px-3 py-2 rounded-2xl text-sm break-words ${
                    isOwn
                      ? 'bg-emerald-600 text-white rounded-br-sm'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-white border-t border-gray-200 p-4">
          <form onSubmit={sendMessage} className="flex gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`Message #${CHANNELS.find(c => c.id === activeChannel)?.label.toLowerCase()}...`}
              className="flex-1"
              disabled={sending}
              maxLength={1000}
            />
            <Button
              type="submit"
              disabled={!draft.trim() || sending}
              className="bg-emerald-600 hover:bg-emerald-700 px-3"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
          <p className="text-xs text-gray-400 mt-1">Messages are visible to all approved club members.</p>
        </div>
      </div>
    </div>
  );
}