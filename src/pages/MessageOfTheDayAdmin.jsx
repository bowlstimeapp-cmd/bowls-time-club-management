import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Megaphone, ShieldAlert, Save, Eraser } from 'lucide-react';
import { MessageOfTheDayBar, resolveMessageLink } from '@/components/MessageOfTheDayBanner';

const LINK_OPTIONS = [
  { value: 'none', label: 'No link' },
  { value: 'fixtures', label: 'Club Fixtures' },
  { value: 'selection', label: 'Match Selection (all)' },
  { value: 'selection_specific', label: 'A specific match selection' },
  { value: 'competition_entries', label: 'Competition Entries (all)' },
  { value: 'competition_entry_specific', label: 'A specific competition entry list' },
  { value: 'draw', label: 'Club Competition Draw (all)' },
  { value: 'draw_specific', label: 'A specific competition draw' },
];

const EMPTY_FORM = {
  message: '',
  start_date: '',
  end_date: '',
  is_enabled: true,
  link_type: 'none',
  link_target_id: '',
};

const MAX_LENGTH = 200;

export default function MessageOfTheDayAdmin() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const queryClient = useQueryClient();

  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: myMembership } = useQuery({
    queryKey: ['myClubMembership', clubId, user?.email],
    queryFn: async () => {
      const memberships = await base44.entities.ClubMembership.filter({
        club_id: clubId,
        user_email: user.email,
      });
      return memberships[0];
    },
    enabled: !!clubId && !!user?.email,
  });

  const isClubAdmin = myMembership?.role === 'admin' && myMembership?.status === 'approved';

  const { data: record, isLoading } = useQuery({
    queryKey: ['messageOfTheDay', clubId],
    queryFn: async () => {
      const records = await base44.entities.ClubMessageOfTheDay.filter({ club_id: clubId });
      return records[0] || null;
    },
    enabled: !!clubId,
  });

  useEffect(() => {
    if (isLoading) return;
    setForm({
      message: record?.message || '',
      start_date: record?.start_date || '',
      end_date: record?.end_date || '',
      is_enabled: record?.is_enabled !== false,
      link_type: record?.link_type || 'none',
      link_target_id: record?.link_target_id || '',
    });
  }, [isLoading, record?.id]);

  const needsTarget = ['selection_specific', 'competition_entry_specific', 'draw_specific'].includes(form.link_type);

  const { data: selections = [] } = useQuery({
    queryKey: ['motdSelections', clubId],
    queryFn: () => base44.entities.TeamSelection.filter({ club_id: clubId, status: 'published' }, { sort: '-match_date', limit: 100 }),
    select: (page) => (page?.items || []).filter(s => !s.is_archived),
    enabled: isClubAdmin && form.link_type === 'selection_specific',
  });

  const { data: competitions = [] } = useQuery({
    queryKey: ['motdCompetitions', clubId],
    queryFn: () => base44.entities.CompetitionRegistration.filter({ club_id: clubId }),
    select: (items) => (items || []).filter(c => !c.is_archived),
    enabled: isClubAdmin && form.link_type === 'competition_entry_specific',
  });

  const { data: tournaments = [] } = useQuery({
    queryKey: ['motdTournaments', clubId],
    queryFn: () => base44.entities.ClubTournament.filter({ club_id: clubId }),
    select: (items) => (items || []).filter(t => !t.is_archived),
    enabled: isClubAdmin && form.link_type === 'draw_specific',
  });

  const save = async (data) => {
    if ((data.message || '').length > MAX_LENGTH) {
      toast.error(`Message must be ${MAX_LENGTH} characters or fewer`);
      return;
    }
    if (data.start_date && data.end_date && data.end_date < data.start_date) {
      toast.error('"Show until" must be on or after "Show from"');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        club_id: clubId,
        message: (data.message || '').trim(),
        start_date: data.start_date || '',
        end_date: data.end_date || '',
        is_enabled: !!data.is_enabled,
        link_type: data.link_type || 'none',
        link_target_id: data.link_target_id || '',
      };
      if (record?.id) {
        await base44.entities.ClubMessageOfTheDay.update(record.id, payload);
      } else {
        await base44.entities.ClubMessageOfTheDay.create(payload);
      }
      queryClient.invalidateQueries({ queryKey: ['messageOfTheDay', clubId] });
      toast.success('Message of the Day saved');
    } catch (err) {
      toast.error(err.message || 'Could not save the message');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    const cleared = { ...form, message: '', is_enabled: false, link_type: 'none', link_target_id: '' };
    setForm(cleared);
    save(cleared);
  };

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

  const previewLink = resolveMessageLink(clubId, form.link_type, form.link_target_id);
  const previewTargets = form.link_type === 'selection_specific'
    ? selections
    : form.link_type === 'competition_entry_specific'
      ? competitions
      : form.link_type === 'draw_specific'
        ? tournaments
        : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Megaphone className="w-7 h-7 text-emerald-600" />
            Message of the Day
          </h1>
          <p className="text-gray-600 mt-1">A banner shown at the top of every page for your members.</p>
        </motion.div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your message</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              </div>
            ) : (
              <>
                <div>
                  <Label htmlFor="motd-message" className="text-base font-semibold">Message</Label>
                  <Textarea
                    id="motd-message"
                    value={form.message}
                    onChange={e => setForm(prev => ({ ...prev, message: e.target.value.slice(0, MAX_LENGTH) }))}
                    maxLength={MAX_LENGTH}
                    rows={3}
                    placeholder="e.g. Club night cancelled this Friday due to the county final."
                    className="mt-2 text-base"
                  />
                  <p className="text-sm text-gray-500 mt-1 text-right">
                    {form.message.length} / {MAX_LENGTH}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="motd-start" className="text-base font-semibold">Show from</Label>
                    <Input
                      id="motd-start"
                      type="date"
                      value={form.start_date}
                      onChange={e => setForm(prev => ({ ...prev, start_date: e.target.value }))}
                      className="mt-2 text-base"
                    />
                  </div>
                  <div>
                    <Label htmlFor="motd-end" className="text-base font-semibold">Show until (last day shown)</Label>
                    <Input
                      id="motd-end"
                      type="date"
                      value={form.end_date}
                      onChange={e => setForm(prev => ({ ...prev, end_date: e.target.value }))}
                      className="mt-2 text-base"
                    />
                  </div>
                </div>
                {form.start_date && form.end_date && form.end_date < form.start_date && (
                  <p className="text-sm text-red-600 -mt-2">"Show until" must be on or after "Show from".</p>
                )}

                <div>
                  <Label className="text-base font-semibold">Link to</Label>
                  <Select
                    value={form.link_type}
                    onValueChange={value => setForm(prev => ({ ...prev, link_type: value, link_target_id: '' }))}
                  >
                    <SelectTrigger className="mt-2 text-base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LINK_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value} className="text-base">
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {needsTarget && (
                  <div>
                    <Label className="text-base font-semibold">
                      {form.link_type === 'selection_specific'
                        ? 'Match selection'
                        : form.link_type === 'competition_entry_specific'
                          ? 'Competition'
                          : 'Competition draw'}
                    </Label>
                    <Select
                      value={form.link_target_id || undefined}
                      onValueChange={value => setForm(prev => ({ ...prev, link_target_id: value }))}
                    >
                      <SelectTrigger className="mt-2 text-base">
                        <SelectValue placeholder={previewTargets.length ? 'Choose one' : 'Nothing available yet'} />
                      </SelectTrigger>
                      <SelectContent>
                        {previewTargets.map(item => (
                          <SelectItem key={item.id} value={item.id} className="text-base">
                            {form.link_type === 'selection_specific'
                              ? `${item.competition}${item.match_name ? ` - ${item.match_name}` : ''} (${item.match_date ? format(parseISO(item.match_date), 'dd MMM yyyy') : ''})`
                              : item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                  <div>
                    <p className="text-base font-semibold text-gray-900">Show this message</p>
                    <p className="text-sm text-gray-500">Turn off to hide it without deleting it.</p>
                  </div>
                  <Switch
                    checked={form.is_enabled}
                    onCheckedChange={checked => setForm(prev => ({ ...prev, is_enabled: checked }))}
                  />
                </div>

                <div>
                  <Label className="text-base font-semibold">Preview</Label>
                  <div className="mt-2 rounded-lg overflow-hidden border">
                    {form.message.trim() ? (
                      <MessageOfTheDayBar message={form.message} to={previewLink} />
                    ) : (
                      <p className="p-4 text-sm text-gray-500">Your message will appear here.</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Button
                    onClick={() => save(form)}
                    disabled={saving}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save
                  </Button>
                  <Button variant="outline" onClick={handleClear} disabled={saving} className="gap-2">
                    <Eraser className="w-4 h-4" />
                    Clear message
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}