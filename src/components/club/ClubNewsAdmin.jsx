import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Newspaper, Plus, Pencil, Trash2, Loader2, Upload, X, Image } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

const EMPTY_FORM = { title: '', content: '', image_url: '', is_published: true };

export default function ClubNewsAdmin({ clubId }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploadingImage, setUploadingImage] = useState(false);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['clubPosts', clubId],
    queryFn: () => base44.entities.ClubPost.filter({ club_id: clubId, type: 'news' }),
    enabled: !!clubId,
    select: (data) => [...data].sort((a, b) => b.created_date?.localeCompare(a.created_date || '') || 0),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ClubPost.create({ ...data, club_id: clubId, type: 'news' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubPosts', clubId] });
      toast.success('Post created');
      closeForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClubPost.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubPosts', clubId] });
      toast.success('Post updated');
      closeForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ClubPost.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubPosts', clubId] });
      toast.success('Post deleted');
    },
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, image_url: file_url }));
    setUploadingImage(false);
    toast.success('Image uploaded');
  };

  const openCreate = () => {
    setEditingPost(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (post) => {
    setEditingPost(post);
    setForm({ title: post.title || '', content: post.content || '', image_url: post.image_url || '', is_published: post.is_published !== false });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingPost(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (editingPost) {
      updateMutation.mutate({ id: editingPost.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Newspaper className="w-5 h-5" />Club News</CardTitle>
            <CardDescription>Publish news posts that appear on the Member Dashboard</CardDescription>
          </div>
          {!showForm && (
            <Button type="button" size="sm" className="bg-emerald-600 hover:bg-emerald-700 shrink-0" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-1" />Add Post
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Form */}
        {showForm && (
          <div className="border rounded-xl p-4 bg-gray-50 space-y-4">
            <div className="flex items-center justify-between mb-1">
              <p className="font-semibold text-gray-800 text-sm">{editingPost ? 'Edit Post' : 'New Post'}</p>
              <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={closeForm}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. End of season presentation night" />
            </div>

            <div>
              <Label>Body Text</Label>
              <Textarea
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                placeholder="Write your news post here…"
                rows={5}
              />
            </div>

            {/* Header image */}
            <div>
              <Label>Header Image (optional)</Label>
              {form.image_url ? (
                <div className="mt-2 relative">
                  <img src={form.image_url} alt="Header" className="w-full h-40 object-cover rounded-lg border" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 bg-white/80 hover:bg-white h-7 w-7 p-0"
                    onClick={() => setForm(f => ({ ...f, image_url: '' }))}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="mt-2">
                  <Label htmlFor="news-img-upload" className="cursor-pointer">
                    <div className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-white text-sm text-gray-600 w-fit">
                      {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      Upload Image
                    </div>
                  </Label>
                  <input id="news-img-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <div>
                <Label className="text-sm">Published</Label>
                <p className="text-xs text-gray-500">Visible to all members on the dashboard</p>
              </div>
              <Switch checked={form.is_published} onCheckedChange={v => setForm(f => ({ ...f, is_published: v }))} />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={closeForm}>Cancel</Button>
              <Button type="button" className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {editingPost ? 'Update' : 'Publish'}
              </Button>
            </div>
          </div>
        )}

        {/* Posts list */}
        {isLoading ? (
          <p className="text-sm text-gray-400 text-center py-4">Loading…</p>
        ) : posts.length === 0 && !showForm ? (
          <div className="py-8 text-center text-gray-400">
            <Newspaper className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No news posts yet. Click "Add Post" to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map(post => (
              <div key={post.id} className="flex items-start gap-3 p-3 rounded-lg border bg-white">
                {post.image_url && (
                  <img src={post.image_url} alt="" className="w-14 h-14 object-cover rounded-md shrink-0 border" />
                )}
                {!post.image_url && (
                  <div className="w-14 h-14 bg-gray-100 rounded-md flex items-center justify-center shrink-0">
                    <Image className="w-5 h-5 text-gray-300" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm text-gray-900 truncate">{post.title}</p>
                    {post.is_published === false && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Draft</span>
                    )}
                  </div>
                  {post.content && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{post.content}</p>}
                  {post.created_date && (
                    <p className="text-xs text-gray-400 mt-1">{format(parseISO(post.created_date), 'd MMM yyyy')}</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(post)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:bg-red-50" onClick={() => deleteMutation.mutate(post.id)} disabled={deleteMutation.isPending}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}