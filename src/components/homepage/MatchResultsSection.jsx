import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import HomepageSection from './HomepageSection';

export default function MatchResultsSection({ posts, clubId, isAdmin }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', content: '', opponent: '', club_score: '', opponent_score: '', event_date: '' });

  const saveMutation = useMutation({
    mutationFn: (data) => editing
      ? base44.entities.ClubPost.update(editing.id, data)
      : base44.entities.ClubPost.create({ ...data, club_id: clubId, type: 'match_result', is_published: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubPosts', clubId] });
      setDialogOpen(false);
      toast.success('Match result saved');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ClubPost.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clubPosts', clubId] }),
  });

  const openCreate = () => { setEditing(null); setForm({ title: '', content: '', opponent: '', club_score: '', opponent_score: '', event_date: '' }); setDialogOpen(true); };
  const openEdit = (p) => {
    setEditing(p);
    setForm({ title: p.title, content: p.content || '', opponent: p.opponent || '', club_score: p.club_score ?? '', opponent_score: p.opponent_score ?? '', event_date: p.event_date || '' });
    setDialogOpen(true);
  };

  const getResult = (p) => {
    if (p.club_score == null || p.opponent_score == null) return null;
    if (p.club_score > p.opponent_score) return 'win';
    if (p.club_score < p.opponent_score) return 'loss';
    return 'draw';
  };

  const resultStyle = { win: 'bg-emerald-100 text-emerald-800', loss: 'bg-red-100 text-red-700', draw: 'bg-gray-100 text-gray-600' };

  return (
    <HomepageSection
      title="Recent Match Results"
      action={isAdmin && (
        <Button size="sm" onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-3.5 h-3.5 mr-1.5" />Add Result
        </Button>
      )}
    >
      {posts.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <Trophy className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No match results posted yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.slice(0, 8).map(post => {
            const result = getResult(post);
            return (
              <Card key={post.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-gray-900 text-sm truncate">{post.title}</p>
                      {result && <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${resultStyle[result]}`}>{result}</span>}
                    </div>
                    {post.opponent && (
                      <p className="text-sm text-gray-500">vs {post.opponent}
                        {post.club_score != null && post.opponent_score != null && (
                          <span className="font-medium text-gray-700"> — {post.club_score} : {post.opponent_score}</span>
                        )}
                      </p>
                    )}
                    {post.event_date && <p className="text-xs text-gray-400 mt-0.5">{new Date(post.event_date).toLocaleDateString('en-GB')}</p>}
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(post)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => deleteMutation.mutate(post.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Result' : 'Add Match Result'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title / Match Name</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g., Bramley Cup Home Match" className="mt-1" /></div>
            <div><Label>Date</Label><Input type="date" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} className="mt-1" /></div>
            <div><Label>Opponent</Label><Input value={form.opponent} onChange={e => setForm(f => ({ ...f, opponent: e.target.value }))} placeholder="Opposition club" className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Our Score</Label><Input type="number" value={form.club_score} onChange={e => setForm(f => ({ ...f, club_score: e.target.value }))} className="mt-1" /></div>
              <div><Label>Their Score</Label><Input type="number" value={form.opponent_score} onChange={e => setForm(f => ({ ...f, opponent_score: e.target.value }))} className="mt-1" /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={3} className="mt-1" /></div>
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