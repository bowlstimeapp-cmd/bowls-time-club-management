import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Trash2 } from 'lucide-react';

const ELEMENT_LABELS = {
  competition: 'Competition', matchName: 'Match Name', date: 'Date',
  time: 'Time', rink: 'Rink', clubName: 'Club Name', opponentName: 'Opponent',
  players: 'Players List', scoreTable: 'Score Table', logo: 'Logo', signatures: 'Signatures',
};

export default function PropertiesPanel({ element, onUpdate, onDelete }) {
  const styles = element.styles || {};

  const update = (key, value) => onUpdate({ [key]: value });

  return (
    <div className="w-60 bg-white border-l flex flex-col overflow-y-auto flex-shrink-0">
      <div className="p-3 border-b bg-gray-50">
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Properties</h3>
        <p className="text-xs text-gray-500 mt-0.5 font-medium">{ELEMENT_LABELS[element.type] || element.type}</p>
      </div>

      <div className="p-3 space-y-4 overflow-y-auto flex-1">
        <div>
          <Label className="text-xs text-gray-500 uppercase tracking-wide mb-1.5 block">Font Size (px)</Label>
          <Input
            type="number" min="6" max="72"
            value={styles.fontSize || 12}
            onChange={(e) => update('fontSize', parseInt(e.target.value) || 12)}
            className="h-8 text-sm"
          />
        </div>

        <div>
          <Label className="text-xs text-gray-500 uppercase tracking-wide mb-1.5 block">Font Weight</Label>
          <Select value={styles.fontWeight || 'normal'} onValueChange={(v) => update('fontWeight', v)}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="600">Semi-bold</SelectItem>
              <SelectItem value="bold">Bold</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs text-gray-500 uppercase tracking-wide mb-1.5 block">Text Align</Label>
          <Select value={styles.textAlign || 'left'} onValueChange={(v) => update('textAlign', v)}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="right">Right</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs text-gray-500 uppercase tracking-wide mb-1.5 block">Background Colour</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={styles.backgroundColor || '#ffffff'}
              onChange={(e) => update('backgroundColor', e.target.value === '#ffffff' ? '' : e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border border-gray-200"
            />
            <span className="text-xs text-gray-500">{styles.backgroundColor || 'None'}</span>
            {styles.backgroundColor && (
              <Button type="button" variant="ghost" size="sm" className="text-xs text-gray-400 h-6 px-2"
                onClick={() => update('backgroundColor', '')}>Clear</Button>
            )}
          </div>
        </div>

        <div>
          <Label className="text-xs text-gray-500 uppercase tracking-wide mb-1.5 block">Border Colour</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={styles.borderColor || '#cccccc'}
              onChange={(e) => update('borderColor', e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border border-gray-200"
            />
            <span className="text-xs text-gray-500">{styles.borderColor || 'None'}</span>
            {styles.borderColor && (
              <Button type="button" variant="ghost" size="sm" className="text-xs text-gray-400 h-6 px-2"
                onClick={() => update('borderColor', '')}>Clear</Button>
            )}
          </div>
        </div>

        <div className="pt-2 border-t">
          <Label className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">Position & Size</Label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'X', value: Math.round(element.x) },
              { label: 'Y', value: Math.round(element.y) },
              { label: 'W', value: Math.round(element.width) },
              { label: 'H', value: Math.round(element.height) },
            ].map(({ label, value }) => (
              <div key={label}>
                <Label className="text-xs text-gray-400">{label}</Label>
                <Input value={value} readOnly className="h-7 text-xs bg-gray-50" />
              </div>
            ))}
          </div>
        </div>

        <Button
          type="button" variant="destructive" size="sm" className="w-full"
          onClick={onDelete}
        >
          <Trash2 className="w-3.5 h-3.5 mr-1.5" />
          Delete Element
        </Button>
      </div>
    </div>
  );
}