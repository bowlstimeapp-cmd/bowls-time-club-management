import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Printer, AlertTriangle, Code, Upload, X, Loader2 } from 'lucide-react';
import { TABLE_TEMPLATE_OPTIONS } from '@/lib/leagueTableTemplates';
import { base44 } from '@/api/base44Client';

const COLOURS = [
  { label: 'Emerald', value: '#10b981' },
  { label: 'Blue',    value: '#3b82f6' },
  { label: 'Purple',  value: '#8b5cf6' },
  { label: 'Red',     value: '#ef4444' },
  { label: 'Amber',   value: '#f59e0b' },
  { label: 'Slate',   value: '#475569' },
  { label: 'Black',   value: '#111827' },
];

export default function LeagueTableTemplateSettings({ club, onChange }) {
  const [template,            setTemplate]            = useState(club?.league_table_template || 'classic');
  const [primaryColour,       setPrimaryColour]       = useState(club?.league_table_primary_colour || '#10b981');
  const [customColour,        setCustomColour]        = useState('');
  const [fontSize,            setFontSize]            = useState(club?.league_table_font_size || 'medium');
  const [showAccurateAsOf,    setShowAccurateAsOf]    = useState(club?.league_table_show_accurate_as_of !== false);
  const [showSessionTime,     setShowSessionTime]     = useState(club?.league_table_show_session_time !== false);
  const [showLeagueDates,     setShowLeagueDates]     = useState(club?.league_table_show_league_dates !== false);
  const [showFooter,          setShowFooter]          = useState(club?.league_table_show_footer || false);
  const [footerText,          setFooterText]          = useState(club?.league_table_footer_text || '');
  const [advancedMode,        setAdvancedMode]        = useState(club?.league_table_advanced_mode || false);
  const [customHtml,          setCustomHtml]          = useState(club?.league_table_custom_html || '');
  const [htmlError,           setHtmlError]           = useState('');
  const [headerImgUrl,        setHeaderImgUrl]        = useState(club?.league_table_header_img_url || '');
  const [uploadingHeader,     setUploadingHeader]     = useState(false);

  useEffect(() => {
    onChange({
      league_table_template:            template,
      league_table_primary_colour:      customColour || primaryColour,
      league_table_font_size:           fontSize,
      league_table_show_accurate_as_of: showAccurateAsOf,
      league_table_show_session_time:   showSessionTime,
      league_table_show_league_dates:   showLeagueDates,
      league_table_show_footer:         showFooter,
      league_table_footer_text:         footerText,
      league_table_advanced_mode:       advancedMode,
      league_table_custom_html:         customHtml,
      league_table_header_img_url:      headerImgUrl,
    });
  }, [template, primaryColour, customColour, fontSize, showAccurateAsOf,
      showSessionTime, showLeagueDates, showFooter, footerText,
      advancedMode, customHtml, headerImgUrl]);

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
          League Table Print Template
        </CardTitle>
        <CardDescription>
          Configure how the league table looks when printed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Template picker */}
        <div>
          <Label className="mb-2 block">Template Style</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {TABLE_TEMPLATE_OPTIONS.map(opt => (
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

        {/* Colour picker — hidden for minimal */}
        {template !== 'minimal' && (
          <div>
            <Label className="mb-2 block">Primary Colour</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {COLOURS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => { setPrimaryColour(c.value); setCustomColour(''); }}
                  title={c.label}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${customColour === '' && primaryColour === c.value ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                  style={{ background: c.value }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={effectiveColour}
                onChange={(e) => setCustomColour(e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border"
                title="Custom colour"
              />
              <span className="text-sm text-gray-500">Custom colour: <code>{effectiveColour}</code></span>
            </div>
          </div>
        )}

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

        {/* Optional fields */}
        <div className="space-y-3 border-t pt-4">
          <p className="text-sm font-medium text-gray-700">Optional Fields</p>

          {[
            { label: '"Accurate as of" line',  desc: 'Show the date-printed disclaimer at the top', value: showAccurateAsOf, setter: setShowAccurateAsOf },
            { label: 'Session time',           desc: 'Show the league session time on the printout', value: showSessionTime, setter: setShowSessionTime },
            { label: 'League dates',           desc: 'Show the league start and end dates', value: showLeagueDates, setter: setShowLeagueDates },
          ].map(({ label, desc, value, setter }) => (
            <div key={label} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
              <Switch checked={value} onCheckedChange={setter} />
            </div>
          ))}

          {/* Footer toggle + text input */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Footer text</p>
                <p className="text-xs text-gray-500">Show a custom line at the bottom of the printout</p>
              </div>
              <Switch checked={showFooter} onCheckedChange={setShowFooter} />
            </div>
            {showFooter && (
              <Input
                className="mt-2"
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                placeholder="e.g. Results subject to confirmation by the league secretary"
              />
            )}
          </div>
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
            <div className="space-y-3 mt-3">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 space-y-1">
                <p className="font-semibold flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Advanced Mode</p>
                <p>If your template fails to render, the Classic template will be used as a fallback.</p>
                <p className="font-semibold mt-2">Available placeholders:</p>
                <ul className="space-y-0.5 font-mono">
                  <li><code>{'{{league_name}}'}</code> — League name</li>
                  <li><code>{'{{league_format}}'}</code> — Format (Fours / Triples)</li>
                  <li><code>{'{{start_date}}'}</code> — League start date</li>
                  <li><code>{'{{end_date}}'}</code> — League end date</li>
                  <li><code>{'{{session_time}}'}</code> — Typical session time</li>
                  <li><code>{'{{date_printed}}'}</code> — Today's date</li>
                  <li><code>{'{{accurate_as_of}}'}</code> — "Accurate as of [date]"</li>
                  <li><code>{'{{club_name}}'}</code> — Club name</li>
                  <li><code>{'{{logo_url}}'}</code> — Club logo URL</li>
                  <li><code>{'{{club_header_img}}'}</code> — Uploaded header image URL</li>
                  <li><code>{'{{footer_text}}'}</code> — Footer text</li>
                  <li><code>{'{{table_rows}}'}</code> — Full rendered {'<tbody>'} with all team rows</li>
                </ul>
              </div>

              {/* Header image upload */}
              <div>
                <Label className="mb-1.5 block text-sm">Club Header Image</Label>
                <p className="text-xs text-gray-500 mb-2">
                  Upload an image to use as <code className="bg-gray-100 px-1 rounded">{'{{club_header_img}}'}</code> in your template.
                </p>
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
                placeholder="<html><head>...</head><body>{{league_name}} — {{table_rows}}</body></html>"
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