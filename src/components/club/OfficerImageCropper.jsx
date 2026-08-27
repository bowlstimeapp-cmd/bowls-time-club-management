import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Loader2, RotateCcw } from 'lucide-react';

const VIEW_W = 240;
const VIEW_H = 300; // 4:5 portrait
const OUT_W = 480;
const OUT_H = 600;

export default function OfficerImageCropper({ imageFile, onCropComplete, onCancel }) {
  const [img, setImg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [natW, setNatW] = useState(0);
  const [natH, setNatH] = useState(0);
  const dragRef = useRef(null);

  // Cover scale: minimum scale so the image fills the viewport
  const s0 = img ? Math.max(VIEW_W / natW, VIEW_H / natH) : 1;
  const scale = s0 * zoom;
  const dw = natW * scale;
  const dh = natH * scale;

  useEffect(() => {
    setLoading(true);
    setImg(null);
    const url = URL.createObjectURL(imageFile);
    const image = new Image();
    image.onload = () => {
      setNatW(image.naturalWidth);
      setNatH(image.naturalHeight);
      setImg(image);
      const baseScale = Math.max(VIEW_W / image.naturalWidth, VIEW_H / image.naturalHeight);
      const dw0 = image.naturalWidth * baseScale;
      const dh0 = image.naturalHeight * baseScale;
      setOffset({ x: (VIEW_W - dw0) / 2, y: (VIEW_H - dh0) / 2 });
      setZoom(1);
      setLoading(false);
    };
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const clampOffset = (x, y, w, h) => {
    const minX = Math.min(0, VIEW_W - w);
    const minY = Math.min(0, VIEW_H - h);
    return {
      x: Math.max(minX, Math.min(0, x)),
      y: Math.max(minY, Math.min(0, y)),
    };
  };

  // Focal-point zoom: keep the viewport centre fixed in source coordinates
  const handleZoom = (newZoom) => {
    const oldScale = s0 * zoom;
    const newScale = s0 * newZoom;
    const cx = (VIEW_W / 2 - offset.x) / oldScale;
    const cy = (VIEW_H / 2 - offset.y) / oldScale;
    const nx = VIEW_W / 2 - cx * newScale;
    const ny = VIEW_H / 2 - cy * newScale;
    setOffset(clampOffset(nx, ny, natW * newScale, natH * newScale));
    setZoom(newZoom);
  };

  const onPointerDown = (e) => {
    if (!img) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, offsetX: offset.x, offsetY: offset.y };
  };
  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffset(clampOffset(dragRef.current.offsetX + dx, dragRef.current.offsetY + dy, dw, dh));
  };
  const onPointerUp = (e) => {
    if (dragRef.current) {
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* noop */ }
    }
    dragRef.current = null;
  };

  const handleReset = () => {
    const dw0 = natW * s0;
    const dh0 = natH * s0;
    setOffset({ x: (VIEW_W - dw0) / 2, y: (VIEW_H - dh0) / 2 });
    setZoom(1);
  };

  const handleSave = () => {
    if (!img) return;
    const s = s0 * zoom;
    const sx = (-offset.x) / s;
    const sy = (-offset.y) / s;
    const sw = VIEW_W / s;
    const sh = VIEW_H / s;
    const canvas = document.createElement('canvas');
    canvas.width = OUT_W;
    canvas.height = OUT_H;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, OUT_W, OUT_H);
    const csx = Math.max(0, Math.min(natW - sw, sx));
    const csy = Math.max(0, Math.min(natH - sh, sy));
    const csw = Math.min(sw, natW - csx);
    const csh = Math.min(sh, natH - csy);
    ctx.drawImage(img, csx, csy, csw, csh, 0, 0, OUT_W, OUT_H);
    canvas.toBlob((blob) => {
      onCropComplete(blob);
    }, 'image/jpeg', 0.9);
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent
        className="max-w-sm p-5 block"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogTitle className="text-lg font-semibold leading-none mb-4">Crop Photo</DialogTitle>
        <DialogDescription className="sr-only">Drag the image to pan, use the slider to zoom, then save.</DialogDescription>

        {loading || !img ? (
          <div className="h-[300px] flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div
            className="relative overflow-hidden rounded-lg bg-gray-900 mx-auto select-none touch-none cursor-grab active:cursor-grabbing"
            style={{ width: VIEW_W, height: VIEW_H }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <img
              src={img.src}
              alt="crop"
              draggable={false}
              className="absolute top-0 left-0 max-w-none pointer-events-none"
              style={{ width: dw, height: dh, transform: `translate(${offset.x}px, ${offset.y}px)` }}
            />
          </div>
        )}

        <div className="mt-4 px-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">Zoom</span>
            <span className="text-xs text-gray-400">{zoom.toFixed(1)}x</span>
          </div>
          <Slider
            value={[zoom]}
            min={1}
            max={3}
            step={0.05}
            onValueChange={(v) => handleZoom(v[0])}
            disabled={loading || !img}
          />
        </div>

        <div className="flex items-center gap-2 mt-5">
          <Button variant="outline" size="sm" onClick={handleReset} disabled={loading || !img} className="flex-1">
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
          </Button>
          <Button variant="outline" size="sm" onClick={onCancel} className="flex-1">Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={loading || !img} className="flex-1 bg-emerald-600 hover:bg-emerald-700">Save Crop</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}