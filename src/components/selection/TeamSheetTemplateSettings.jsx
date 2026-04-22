import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Printer, AlertTriangle, Code, Upload, X, Loader2 } from 'lucide-react';
import { TEMPLATE_OPTIONS } from '@/lib/teamSheetTemplates';
import { base44 } from '@/api/base44Client';

const COLOURS = [
  { label: 'Emerald', value: '#10b981' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Purple', value: '#8b5cf6' },
  { label: 'Red', value: '#ef4444' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Slate', value: '#475569' },
  { label: 'Black', value: '#111827' },
];

export default function TeamSheetTemplateSettings({ club, onChange }) {
  const [template, setTemplate] = useState(club?.team_sheet_template || 'classic');
  const [primaryColour, setPrimaryColour] = useState(club?.team_sheet_primary_colour || '#10b981');
  const [customColour, setCustomColour] = useState('');
  const [fontSize, setFontSize] = useState(club?.team_sheet_font_size || 'medium');
  const [showDressCode, setShowDressCode] = useState(club?.team_sheet_show_dress_code || false);
  const [showVenue, setShowVenue] = useState(club?.team_sheet_show_venue || false);
  const [showStartTime, setShowStartTime] = useState(club?.team_sheet_show_start_time !== false);
  const [advancedMode, setAdvancedMode] = useState(club?.team_sheet_advanced_mode || false);
  const [customHtml, setCustomHtml] = useState(club?.team_sheet_custom_html || '');
  const [htmlError, setHtmlError] = useState('');
  const [headerImgUrl, setHeaderImgUrl] = useState(club?.team_sheet_header_img_url || '');
  const [uploadingHeader, setUploadingHeader] = useState(false);

  // Re-sync internal state when club data loads (it may be undefined on first render)
  useEffect(() => {
    if (!club) return;
    setTemplate(club.team_sheet_template || 'classic');
    setPrimaryColour(club.team_sheet_primary_colour || '#10b981');
    setFontSize(club.team_sheet_font_size || 'medium');
    setShowDressCode(club.team_sheet_show_dress_code || false);
    setShowVenue(club.team_sheet_show_venue || false);
    setShowStartTime(club.team_sheet_show_start_time !== false);
    setAdvancedMode(club.team_sheet_advanced_mode || false);
    setCustomHtml(club.team_sheet_custom_html || '');
    setHeaderImgUrl(club.team_sheet_header_img_url || '');
  }, [club?.id]);

  useEffect(() => {
    onChange({
      team_sheet_template: template,
      team_sheet_primary_colour: customColour || primaryColour,
      team_sheet_font_size: fontSize,
      team_sheet_show_dress_code: showDressCode,
      team_sheet_show_venue: showVenue,
      team_sheet_show_start_time: showStartTime,
      team_sheet_advanced_mode: advancedMode,
      team_sheet_custom_html: customHtml,
      team_sheet_header_img_url: headerImgUrl,
    });
  }, [template, primaryColour, customColour, fontSize, showDressCode, showVenue, showStartTime, advancedMode, customHtml, headerImgUrl]);

  const handleHeaderImgUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingHeader(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setHeaderImgUrl(file_url);
    setUploadingHeader(false);
  };

  const validateHtml = (html) => {
    if (!html.trim()) { setHtmlError(''); return; }
    if (!html.includes('<html') && !html.includes('<body')) {
      setHtmlError('Template should include <html> and <body> tags for best results.');
    } else {
      setHtmlError('');
    }
  };

  const effectiveColour = customColour || primaryColour;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Printer className="w-5 h-5" />
          Team Sheet Print Template
        </CardTitle>
        <CardDescription>
          Choose how team selections look when printed or shared
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Template picker */}
        <div>
          <Label className="mb-2 block">Template Style</Label>
          <div className="grid grid-cols-2 gap-3">
            {TEMPLATE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTemplate(opt.value)}
                className={`text-left p-3 rounded-lg border-2 transition-all ${template === opt.value ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <div className="font-semibold text-sm">{opt.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{opt.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Colour picker */}
        <div>
          <Label className="mb-2 block">Primary Colour</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {COLOURS.map(c => (
              <button
                key={c.value}
                type="button"
                onClick={() => { setPrimaryColour(c.value); setCustomColour(''); }}
                title={c.label}
                className={`w-8 h-8 rounded-full border-2 transition-all ${(customColour === '' && primaryColour === c.value) ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                style={{ background: c.value }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={customColour || primaryColour}
              onChange={(e) => setCustomColour(e.target.value)}
              className="w-10 h-10 rounded cursor-pointer border"
              title="Custom colour"
            />
            <span className="text-sm text-gray-500">Custom colour: <code>{effectiveColour}</code></span>
          </div>
        </div>

        {/* Font size */}
        <div>
          <Label className="mb-2 block">Font Size</Label>
          <div className="flex gap-2">
            {['small', 'medium', 'large'].map(size => (
              <button
                key={size}
                type="button"
                onClick={() => setFontSize(size)}
                className={`px-4 py-1.5 rounded border text-sm capitalize transition-all ${fontSize === size ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-semibold' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Toggle fields */}
        <div className="space-y-3 border-t pt-4">
          <p className="text-sm font-medium text-gray-700">Optional Fields</p>
          {[
            { label: 'Show Start Time', desc: 'Display the match start time on the sheet', value: showStartTime, setter: setShowStartTime },
            { label: 'Show Venue', desc: 'Display a venue field (editable when printing)', value: showVenue, setter: setShowVenue },
            { label: 'Show Dress Code', desc: 'Display a dress code field', value: showDressCode, setter: setShowDressCode },
          ].map(({ label, desc, value, setter }) => (
            <div key={label} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
              <Switch checked={value} onCheckedChange={setter} />
            </div>
          ))}
        </div>

        {/* Advanced mode */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-medium flex items-center gap-1.5">
                <Code className="w-4 h-4" />
                Advanced Template Editing
                <Badge variant="outline" className="text-xs">Optional</Badge>
              </p>
              <p className="text-xs text-gray-500">Write your own HTML template with placeholders</p>
            </div>
            <Switch checked={advancedMode} onCheckedChange={setAdvancedMode} />
          </div>

          {advancedMode && (
            <div className="space-y-2 mt-3">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 space-y-1">
                <p className="font-semibold flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Advanced Mode</p>
                <p>If your template fails, the Classic template will be used as a fallback.</p>
                <p className="font-mono mt-1">Available placeholders: {'{{club_name}}'} {'{{competition}}'} {'{{match_name}}'} {'{{match_date}}'} {'{{start_time}}'} {'{{venue}}'} {'{{dress_code}}'} {'{{logo_url}}'} {'{{club_header_img}}'}</p>
                <p className="font-mono">Player positions: {'{{rink1_Lead}}'} {'{{rink1_2}}'} {'{{rink2_Skip}}'} {'{{rink1_tag}}'} etc.</p>
              </div>
              {/* Club Header Image Upload */}
              <div>
                <Label className="mb-1.5 block text-sm">Club Header Image</Label>
                <p className="text-xs text-gray-500 mb-2">Upload an image to use as <code className="bg-gray-100 px-1 rounded">{'{{club_header_img}}'}</code> in your template.</p>
                {headerImgUrl ? (
                  <div className="flex items-center gap-3 p-2 border rounded-lg bg-gray-50">
                    <img src={headerImgUrl} alt="Club header" className="h-12 max-w-[200px] object-contain rounded" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-gray-400 hover:text-red-500"
                      onClick={() => setHeaderImgUrl('')}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 px-4 py-2 border border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors w-fit">
                    {uploadingHeader ? (
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                    ) : (
                      <Upload className="w-4 h-4 text-gray-500" />
                    )}
                    <span className="text-sm text-gray-600">{uploadingHeader ? 'Uploading...' : 'Upload header image'}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleHeaderImgUpload} disabled={uploadingHeader} />
                  </label>
                )}
              </div>

              <Textarea
                value={customHtml}
                onChange={(e) => { setCustomHtml(e.target.value); validateHtml(e.target.value); }}
                placeholder="<html><head>...</head><body>{{club_name}} - {{match_date}}...</body></html>"
                className="font-mono text-xs min-h-48"
              />
              {htmlError && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> {htmlError}
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}