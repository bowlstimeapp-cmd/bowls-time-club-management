import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Palette } from 'lucide-react';
import { toast } from "sonner";

const PRESET_COLOURS = [
  '#10b981', // emerald
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#64748b', // slate
  '#1d4ed8', // dark blue
  '#7c3aed', // violet
  '#059669', // green
  '#dc2626', // dark red
  '#0891b2', // dark cyan
  '#92400e', // brown
];

export default function SelectionColourSettings({ open, onClose, clubId }) {
  const queryClient = useQueryClient();

  const { data: club } = useQuery({
    queryKey: ['club', clubId],
    queryFn: async () => {
      const clubs = await base44.entities.Club.filter({ id: clubId });
      return clubs[0];
    },
    enabled: !!clubId && open,
  });

  const { data: clubCompetitions = [] } = useQuery({
    queryKey: ['competitions', clubId],
    queryFn: () => base44.entities.Competition.filter({ club_id: clubId }),
    enabled: !!clubId && open,
  });

  const { data: platformCompetitions = [] } = useQuery({
    queryKey: ['platformCompetitions'],
    queryFn: async () => {
      const allComps = await base44.entities.Competition.list();
      return allComps.filter(c => !c.club_id);
    },
    enabled: open,
  });

  const allCompetitions = [...platformCompetitions, ...clubCompetitions];
  const competitions = allCompetitions.filter(comp => comp.season === club?.season);

  // All competition names including fixed ones
  const competitionNames = [
    ...competitions.map(c => c.name),
    'Fantastic 5s',
    'Friendly',
  ].filter((v, i, a) => a.indexOf(v) === i);

  const [colours, setColours] = useState({});

  useEffect(() => {
    if (club?.selection_competition_colours) {
      setColours(club.selection_competition_colours);
    }
  }, [club]);

  const saveMutation = useMutation({
    mutationFn: () => base44.entities.Club.update(clubId, {
      selection_competition_colours: colours,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['club', clubId] });
      toast.success('Colour settings saved');
      onClose();
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-emerald-600" />
            Selection Card Colours
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-gray-500 -mt-2 mb-2">
          Choose a header colour for each competition type on the selection cards.
        </p>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {competitionNames.map(name => {
            const current = colours[name] || '#10b981';
            return (
              <div key={name}>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">{name}</Label>
                <div className="flex items-center gap-3">
                  {/* Colour preview */}
                  <div
                    className="w-10 h-10 rounded-lg border border-gray-200 shadow-sm flex-shrink-0"
                    style={{ backgroundColor: current }}
                  />
                  {/* Preset swatches */}
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_COLOURS.map(colour => (
                      <button
                        key={colour}
                        onClick={() => setColours(prev => ({ ...prev, [name]: colour }))}
                        className="w-6 h-6 rounded-md border-2 transition-transform hover:scale-110"
                        style={{
                          backgroundColor: colour,
                          borderColor: current === colour ? '#1f2937' : 'transparent',
                        }}
                        title={colour}
                      />
                    ))}
                    {/* Custom colour input */}
                    <label className="w-6 h-6 rounded-md border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-gray-500 transition-colors overflow-hidden" title="Custom colour">
                      <input
                        type="color"
                        value={current}
                        onChange={e => setColours(prev => ({ ...prev, [name]: e.target.value }))}
                        className="w-8 h-8 opacity-0 absolute cursor-pointer"
                      />
                      <span className="text-gray-400 text-xs font-bold">+</span>
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}