import React, { useState, useRef, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { useSearchParams, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { ArrowLeft, Save, RotateCcw, Loader2, ShieldAlert } from 'lucide-react';
import ElementPalette from '@/components/scorecard/ElementPalette';
import CanvasElement from '@/components/scorecard/CanvasElement';
import PropertiesPanel from '@/components/scorecard/PropertiesPanel';

export const CANVAS_W = 800;
export const CANVAS_H = 550;

export const DEFAULT_ELEMENTS = [
  { id: 'e1', type: 'clubName', x: 10, y: 10, width: 240, height: 38, styles: { fontSize: 16, fontWeight: 'bold', textAlign: 'left', backgroundColor: '', borderColor: '' } },
  { id: 'e2', type: 'logo', x: 640, y: 5, width: 150, height: 48, styles: { fontSize: 12, fontWeight: 'normal', textAlign: 'center', backgroundColor: '', borderColor: '' } },
  { id: 'e3', type: 'competition', x: 10, y: 56, width: 280, height: 28, styles: { fontSize: 13, fontWeight: 'bold', textAlign: 'left', backgroundColor: '', borderColor: '' } },
  { id: 'e4', type: 'matchName', x: 10, y: 88, width: 280, height: 26, styles: { fontSize: 12, fontWeight: 'normal', textAlign: 'left', backgroundColor: '', borderColor: '' } },
  { id: 'e5', type: 'date', x: 300, y: 56, width: 180, height: 28, styles: { fontSize: 12, fontWeight: 'normal', textAlign: 'left', backgroundColor: '', borderColor: '' } },
  { id: 'e6', type: 'time', x: 300, y: 88, width: 130, height: 26, styles: { fontSize: 12, fontWeight: 'normal', textAlign: 'left', backgroundColor: '', borderColor: '' } },
  { id: 'e7', type: 'rink', x: 490, y: 56, width: 140, height: 28, styles: { fontSize: 12, fontWeight: 'normal', textAlign: 'left', backgroundColor: '', borderColor: '' } },
  { id: 'e8', type: 'opponentName', x: 490, y: 88, width: 200, height: 26, styles: { fontSize: 12, fontWeight: 'normal', textAlign: 'left', backgroundColor: '', borderColor: '' } },
  { id: 'e9', type: 'players', x: 10, y: 124, width: 240, height: 290, styles: { fontSize: 11, fontWeight: 'normal', textAlign: 'left', backgroundColor: '', borderColor: '#cccccc' } },
  { id: 'e10', type: 'scoreTable', x: 260, y: 124, width: 530, height: 290, styles: { fontSize: 10, fontWeight: 'normal', textAlign: 'center', backgroundColor: '', borderColor: '#cccccc' } },
  { id: 'e11', type: 'signatures', x: 10, y: 424, width: 780, height: 116, styles: { fontSize: 11, fontWeight: 'normal', textAlign: 'left', backgroundColor: '', borderColor: '#cccccc' } },
];

const genId = () => `elem_${Math.random().toString(36).slice(2, 10)}`;

export default function ScorecardLayoutEditor() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const clubId = searchParams.get('clubId');

  const [user, setUser] = useState(null);
  const [elements, setElements] = useState(DEFAULT_ELEMENTS.map(e => ({ ...e })));
  const [selectedId, setSelectedId] = useState(null);
  const [canvasScale, setCanvasScale] = useState(1);
  const canvasAreaRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => { base44.auth.me().then(setUser); }, []);

  const { data: membership } = useQuery({
    queryKey: ['myMembership', clubId, user?.email],
    queryFn: () => base44.entities.ClubMembership.filter({ club_id: clubId, user_email: user.email }).then(r => r[0]),
    enabled: !!clubId && !!user?.email,
  });

  const { data: club } = useQuery({
    queryKey: ['club', clubId],
    queryFn: () => base44.entities.Club.filter({ id: clubId }).then(r => r[0]),
    enabled: !!clubId,
  });

  const { data: layout } = useQuery({
    queryKey: ['scorecardLayout', clubId],
    queryFn: () => base44.entities.ScorecardLayout.filter({ club_id: clubId }).then(r => r[0]),
    enabled: !!clubId,
  });

  // Load layout from DB when available
  useEffect(() => {
    if (layout?.layout_config?.elements?.length > 0) {
      setElements(layout.layout_config.elements);
    }
  }, [layout]);

  // Scale canvas to fit container width
  useEffect(() => {
    const update = () => {
      if (canvasAreaRef.current) {
        const availW = canvasAreaRef.current.offsetWidth - 48;
        setCanvasScale(Math.min(1, Math.max(0.4, availW / CANVAS_W)));
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const saveMutation = useMutation({
    mutationFn: async (elems) => {
      const layoutConfig = { elements: elems };
      const isActive = club?.use_custom_scorecard_layout === true;
      if (layout?.id) {
        return base44.entities.ScorecardLayout.update(layout.id, { layout_config: layoutConfig, is_active: isActive });
      } else {
        return base44.entities.ScorecardLayout.create({ club_id: clubId, is_active: isActive, layout_config: layoutConfig });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scorecardLayout', clubId] });
      toast.success('Layout saved');
    },
  });

  const updateElement = useCallback((id, updates) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el));
  }, []);

  const deleteElement = useCallback((id) => {
    setElements(prev => prev.filter(el => el.id !== id));
    setSelectedId(prev => prev === id ? null : prev);
  }, []);

  const handleCanvasDrop = (e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('elementType');
    if (!type || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / canvasScale;
    const y = (e.clientY - rect.top) / canvasScale;
    const defaults = { width: 200, height: 30 };
    if (type === 'players') { defaults.width = 200; defaults.height = 200; }
    if (type === 'scoreTable') { defaults.width = 400; defaults.height = 200; }
    if (type === 'logo') { defaults.width = 150; defaults.height = 60; }
    if (type === 'signatures') { defaults.width = 600; defaults.height = 100; }
    const id = genId();
    setElements(prev => [...prev, {
      id, type,
      x: Math.max(0, Math.min(CANVAS_W - defaults.width, x - defaults.width / 2)),
      y: Math.max(0, Math.min(CANVAS_H - defaults.height, y - defaults.height / 2)),
      ...defaults,
      styles: { fontSize: 12, fontWeight: 'normal', textAlign: 'left', backgroundColor: '', borderColor: '' },
    }]);
    setSelectedId(id);
  };

  const selectedElement = elements.find(el => el.id === selectedId);
  const isClubAdmin = membership?.role === 'admin' && membership?.status === 'approved';

  if (user && !isClubAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-gray-600 mb-3">Club admin access required.</p>
          <Link to={createPageUrl('ClubSettings') + `?clubId=${clubId}`} className="text-blue-600 underline text-sm">
            Back to Settings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b px-4 h-14 flex items-center justify-between flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <Link
            to={createPageUrl('ClubSettings') + `?clubId=${clubId}`}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Settings
          </Link>
          <div className="h-5 w-px bg-gray-200" />
          <h1 className="text-base font-semibold text-gray-900">Scorecard Layout Editor</h1>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md border">277mm × 190mm</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm"
            onClick={() => {
              setElements(DEFAULT_ELEMENTS.map(e => ({ ...e })));
              setSelectedId(null);
              toast.info('Reset to default layout');
            }}
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Reset to Default
          </Button>
          <Button
            size="sm" className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => saveMutation.mutate(elements)}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending
              ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              : <Save className="w-3.5 h-3.5 mr-1.5" />}
            Save Layout
          </Button>
        </div>
      </div>

      {/* Editor body */}
      <div className="flex flex-1 overflow-hidden">
        <ElementPalette />

        {/* Canvas area */}
        <div
          ref={canvasAreaRef}
          className="flex-1 overflow-auto p-6 flex items-start justify-center bg-gray-200"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedId(null); }}
        >
          {/* Wrapper sized to scaled canvas so scroll works correctly */}
          <div style={{ width: CANVAS_W * canvasScale, height: CANVAS_H * canvasScale, flexShrink: 0 }}>
            <div
              ref={canvasRef}
              className="bg-white shadow-2xl relative"
              style={{
                width: CANVAS_W,
                height: CANVAS_H,
                transform: `scale(${canvasScale})`,
                transformOrigin: 'top left',
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleCanvasDrop}
              onClick={(e) => { if (e.target === canvasRef.current) setSelectedId(null); }}
            >
              {elements.map(el => (
                <CanvasElement
                  key={el.id}
                  element={el}
                  scale={canvasScale}
                  isSelected={el.id === selectedId}
                  onSelect={setSelectedId}
                  onUpdate={updateElement}
                  onDelete={deleteElement}
                />
              ))}
              {elements.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-sm text-gray-300">Drag elements from the left palette onto this canvas</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Properties panel */}
        {selectedElement ? (
          <PropertiesPanel
            element={selectedElement}
            onUpdate={(updates) => updateElement(selectedId, { styles: { ...selectedElement.styles, ...updates } })}
            onDelete={() => deleteElement(selectedId)}
          />
        ) : (
          <div className="w-60 bg-white border-l flex items-center justify-center flex-shrink-0">
            <p className="text-xs text-gray-400 text-center px-4 leading-relaxed">
              Click an element on the canvas to edit its properties
            </p>
          </div>
        )}
      </div>
    </div>
  );
}