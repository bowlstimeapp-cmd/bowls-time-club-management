import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, Hash, MessageSquare, Menu, X, ChevronLeft } from 'lucide-react';
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
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

  const handleChannelSelect = (channelId) => {
    setActiveChannel(channelId);
    setSidebarOpen(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

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
    inputRef.current?.focus();
  };

  const groupedMessages = messages.reduce((acc, msg, i) => {
    const prev = messages[i - 1];
    const isSameSender = prev?.sender_email === msg.sender_email &&
      new Date(msg.created_date) - new Date(prev.created_date) < 5 * 60 * 1000;
    acc.push({ ...msg, isContinuation: isSameSender });
    return acc;
  }, []);

  const isAdmin = membership?.role === 'admin';
  const activeChannelObj = CHANNELS.find(c => c.id === activeChannel);
  const displayName = membership?.first_name && membership?.surname
    ? `${membership.first_name} ${membership.surname}`
    : user?.full_name || user?.email?.split('@')[0] || '';
  const initials = (displayName[0] || '?').toUpperCase();

  return (
    // Use dvh units with a px fallback for full-height on mobile (accounts for browser chrome)
    <div className="flex bg-gray-50 overflow-hidden" style={{ height: 'calc(100dvh - 4rem)' }}>

      {/* ── Mobile overlay backdrop ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 flex flex-col
        transform transition-transform duration-200 ease-in-out
        md:static md:inset-auto md:z-auto md:w-56 md:translate-x-0 md:flex-shrink-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 min-h-[57px]">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-600" />
            <span className="font-semibold text-gray-900">Club Chat</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Channels list */}
        <div className="flex-1 overflow-y-auto p-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 py-2">Channels</p>
          {CHANNELS.map(ch => (
            <button
              key={ch.id}
              onClick={() => handleChannelSelect(ch.id)}
              className={`w-full text-left flex items-center gap-2 px-2 py-2.5 rounded-lg transition-colors text-sm ${
                activeChannel === ch.id
                  ? 'bg-emerald-50 text-emerald-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Hash className="w-4 h-4 flex-shrink-0" />
              <div className="min-w-0">
                <p className="truncate">{ch.label}</p>
                <p className="text-xs text-gray-400 truncate hidden md:block">{ch.description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* User identity footer */}
        {user && (
          <div className="p-3 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-semibold text-emerald-700 flex-shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-700 truncate">{displayName}</p>
                {isAdmin && (
                  <Badge className="text-xs py-0 px-1.5 bg-emerald-100 text-emerald-700 border-0 mt-0.5">Admin</Badge>
                )}
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* ── Main chat area ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <div className="bg-white border-b border-gray-200 px-3 py-3 flex items-center gap-2 flex-shrink-0">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 flex-shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Hash className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <h2 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
            {activeChannelObj?.label}
          </h2>
          <span className="hidden sm:inline text-sm text-gray-400">—</span>
          <span className="hidden sm:inline text-sm text-gray-500 truncate">
            {activeChannelObj?.description}
          </span>
        </div>

        {/* Messages feed */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-1">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 px-4">
              <Hash className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-base font-medium">No messages yet</p>
              <p className="text-sm">Be the first to say something in #{activeChannelObj?.label.toLowerCase()}!</p>
            </div>
          )}
          {groupedMessages.map((msg) => {
            const isOwn = msg.sender_email === user?.email;
            return (
              <div
                key={msg.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${msg.isContinuation ? 'mt-0.5' : 'mt-3'}`}
              >
                {/* Avatar column for others */}
                {!isOwn && (
                  <div className="w-8 mr-2 flex-shrink-0 mt-1">
                    {!msg.isContinuation && (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
                        {(msg.sender_name?.[0] || '?').toUpperCase()}
                      </div>
                    )}
                  </div>
                )}

                <div className={`max-w-[78%] sm:max-w-[70%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                  {!msg.isContinuation && (
                    <div className={`flex items-baseline gap-2 mb-0.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
                      <span className="text-xs font-semibold text-gray-700">
                        {isOwn ? 'You' : msg.sender_name}
                      </span>
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

        {/* Input bar */}
        <div className="bg-white border-t border-gray-200 p-3 sm:p-4 flex-shrink-0">
          <form onSubmit={sendMessage} className="flex gap-2">
            <Input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`Message #${activeChannelObj?.label.toLowerCase()}…`}
              className="flex-1 text-sm"
              disabled={sending}
              maxLength={1000}
              autoComplete="off"
            />
            <Button
              type="submit"
              disabled={!draft.trim() || sending}
              className="bg-emerald-600 hover:bg-emerald-700 px-3 flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
          <p className="text-xs text-gray-400 mt-1.5">
            Visible to all approved club members.
          </p>
        </div>
      </div>
    </div>
  );
}