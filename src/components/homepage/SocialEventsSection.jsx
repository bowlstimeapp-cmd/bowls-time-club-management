import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, PartyPopper } from 'lucide-react';
import { toast } from 'sonner';
import HomepageSection from './HomepageSection';

export default function SocialEventsSection({ posts, clubId, isAdmin }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', content: '', event_date: '' });

  const saveMutation = useMutation({
    mutationFn: (data) => editing
      ? base44.entities.ClubPost.update(editing.id, data)
      : base44.entities.ClubPost.create({ ...data, club_id: clubId, type: 'social_event', is_published: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubPosts', clubId] });
      setDialogOpen(false);
      toast.success('Social event saved');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ClubPost.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clubPosts', clubId] }),
  });

  const openCreate = () => { setEditing(null); setForm({ title: '', content: '', event_date: '' }); setDialogOpen(true); };
  const openEdit = (p) => { setEditing(p); setForm({ title: p.title, content: p.content || '', event_date: p.event_date || '' }); setDialogOpen(true); };

  const upcoming = posts.filter(p => !p.event_date || p.event_date >= new Date().toISOString().split('T')[0]);
  const past = posts.filter(p => p.event_date && p.event_date < new Date().toISOString().split('T')[0]);
  const displayed = [...upcoming, ...past];

  return (
    <HomepageSection
      title="Social Events"
      action={isAdmin && (
        <Button size="sm" onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-3.5 h-3.5 mr-1.5" />Add Event
        </Button>
      )}
    >
      {displayed.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <PartyPopper className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No social events posted yet</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {displayed.map(post => {
            const isPast = post.event_date && post.event_date < new Date().toISOString().split('T')[0];
            return (
              <Card key={post.id} className={`overflow-hidden hover:shadow-sm transition-shadow ${isPast ? 'opacity-60' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {post.event_date && (
                        <p className="text-xs font-semibold text-emerald-600 mb-1">
                          {new Date(post.event_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                          {isPast && <span className="ml-2 text-gray-400 font-normal">(Past)</span>}
                        </p>
                      )}
                      <h3 className="font-semibold text-gray-900 mb-1">{post.title}</h3>
                      {post.content && <p className="text-sm text-gray-600 line-clamp-3">{post.content}</p>}
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(post)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => deleteMutation.mutate(post.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Event' : 'Add Social Event'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Event Title</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="mt-1" /></div>
            <div><Label>Date</Label><Input type="date" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} className="mt-1" /></div>
            <div><Label>Details</Label><Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={4} className="mt-1" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700">
              {saveMutation.isPending && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </HomepageSection>
  );
}