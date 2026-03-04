import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Loader2, Image, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import HomepageSection from './HomepageSection';

export default function GallerySection({ images, clubId, isAdmin }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const [lightbox, setLightbox] = useState(null);

  const uploadMutation = useMutation({
    mutationFn: (data) => base44.entities.ClubGalleryImage.create({ ...data, club_id: clubId, sort_order: images.length }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubGallery', clubId] });
      setDialogOpen(false);
      setCaption('');
      toast.success('Image added to gallery');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ClubGalleryImage.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clubGallery', clubId] }),
  });

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    uploadMutation.mutate({ image_url: file_url, caption });
    setUploading(false);
  };

  return (
    <HomepageSection
      title="Gallery"
      action={isAdmin && (
        <Button size="sm" onClick={() => setDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-3.5 h-3.5 mr-1.5" />Add Image
        </Button>
      )}
    >
      {images.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <Image className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No gallery images yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {images.map(img => (
            <div key={img.id} className="relative group rounded-lg overflow-hidden aspect-square cursor-pointer" onClick={() => setLightbox(img)}>
              <img src={img.image_url} alt={img.caption || ''} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
              {img.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">{img.caption}</div>
              )}
              {isAdmin && (
                <button
                  onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(img.id); }}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white"><X className="w-6 h-6" /></button>
          <img src={lightbox.image_url} alt={lightbox.caption} className="max-w-full max-h-full rounded-lg" onClick={e => e.stopPropagation()} />
          {lightbox.caption && <p className="absolute bottom-6 text-white text-sm">{lightbox.caption}</p>}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Gallery Image</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Caption (optional)</Label><Input value={caption} onChange={e => setCaption(e.target.value)} className="mt-1" /></div>
            <div>
              <Label>Image</Label>
              <label className="mt-1 flex items-center gap-2 cursor-pointer">
                <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
                <Button variant="outline" asChild>
                  <span>{uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}Choose & Upload</span>
                </Button>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </HomepageSection>
  );
}