import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, X, Image as ImageIcon } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import MemberSearchSelect from '@/components/member/MemberSearchSelect';

const EMPTY_FORM = {
  role_title: '',
  member_email: null,
  image_url: '',
};

export default function OfficerEditorDialog({
  open,
  onClose,
  onSave,
  isLoading,
  members = [],
  editing = null,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        role_title: editing?.role_title || '',
        member_email: editing?.member_email || null,
        image_url: editing?.image_url || '',
      });
    }
  }, [open, editing]);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(f => ({ ...f, image_url: file_url }));
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => setForm(f => ({ ...f, image_url: '' }));

  const handleSubmit = () => {
    if (!form.role_title.trim()) return;
    onSave({
      role_title: form.role_title.trim(),
      member_email: form.member_email || null,
      image_url: form.image_url || null,
    });
  };

  const handleClose = () => {
    setForm(EMPTY_FORM);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Officer' : 'Add Officer'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Role Title */}
          <div>
            <Label>Role Title *</Label>
            <Input
              value={form.role_title}
              onChange={set('role_title')}
              placeholder="e.g. President, Treasurer, Secretary"
              autoFocus
            />
          </div>

          {/* Member select */}
          <div>
            <Label className="mb-1.5 block">Assigned Member</Label>
            <MemberSearchSelect
              members={members}
              value={form.member_email}
              onValueChange={(email) => setForm(f => ({ ...f, member_email: email }))}
              placeholder="Select a member (or leave vacant)"
              clearLabel="— Vacant position —"
            />
          </div>

          {/* Image upload */}
          <div>
            <Label className="mb-1.5 block">Officer Photo</Label>
            {form.image_url ? (
              <div className="relative inline-block">
                <img
                  src={form.image_url}
                  alt="Officer preview"
                  className="w-32 h-32 object-cover rounded-lg border"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow hover:bg-red-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-emerald-400 hover:bg-gray-50 transition-colors">
                {uploading ? (
                  <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                ) : (
                  <>
                    <ImageIcon className="w-6 h-6 text-gray-400 mb-1" />
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Upload className="w-3 h-3" /> Click to upload photo
                    </span>
                  </>
                )}
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
              </label>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
          <Button
            type="button"
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={isLoading || uploading || !form.role_title.trim()}
            onClick={handleSubmit}
          >
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {editing ? 'Save Changes' : 'Add Officer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}