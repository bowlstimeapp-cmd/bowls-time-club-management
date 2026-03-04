import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, Newspaper, Upload } from 'lucide-react';
import { toast } from 'sonner';
import HomepageSection from './HomepageSection';

export default function NewsSection({ posts, clubId, isAdmin }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', content: '', image_url: '' });
  const [uploading, setUploading] = useState(false);

  const saveMutation = useMutation({
    mutationFn: (data) => editing
      ? base44.entities.ClubPost.update(editing.id, data)
      : base44.entities.ClubPost.create({ ...data, club_id: clubId, type: 'news', is_published: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubPosts', clubId] });
      setDialogOpen(false);
      toast.success(editing ? 'Post updated' : 'Post created');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ClubPost.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clubPosts', clubId] }),
  });

  const openCreate = () => { setEditing(null); setForm({ title: '', content: '', image_url: '' }); setDialogOpen(true); };
  const openEdit = (p) => { setEditing(p); setForm({ title: p.title, content: p.content || '', image_url: p.image_url || '' }); setDialogOpen(true); };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, image_url: file_url }));
    setUploading(false);
  };

  return (
    <HomepageSection
      title="News"
      action={isAdmin && (
        <Button size="sm" onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-3.5 h-3.5 mr-1.5" />New Post
        </Button>
      )}
    >
      {posts.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <Newspaper className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No news posts yet</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map(post => (
            <Card key={post.id} className="overflow-hidden hover:shadow-md transition-shadow">
              {post.image_url && <img src={post.image_url} alt={post.title} className="w-full h-40 object-cover" />}
              <CardContent className="p-4">
                <p className="text-xs text-gray-400 mb-1">{new Date(post.created_date).toLocaleDateString('en-GB')}</p>
                <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{post.title}</h3>
                <p className="text-sm text-gray-600 line-clamp-3">{post.content}</p>
                {isAdmin && (
                  <div className="flex gap-1 mt-3">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(post)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => deleteMutation.mutate(post.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Post' : 'New News Post'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="mt-1" /></div>
            <div><Label>Content</Label><Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={5} className="mt-1" /></div>
            <div>
              <Label>Image</Label>
              <div className="flex items-center gap-2 mt-1">
                {form.image_url && <img src={form.image_url} alt="" className="w-16 h-12 object-cover rounded" />}
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  <Button variant="outline" size="sm" asChild>
                    <span>{uploading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1" />}Upload</span>
                  </Button>
                </label>
              </div>
            </div>
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