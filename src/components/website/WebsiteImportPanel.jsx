import React, { useRef, useState } from 'react';
import JSZip from 'jszip';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Upload, Download, Loader2, FileArchive, CheckCircle2, Info,
} from 'lucide-react';
import ImportValidationReport from './ImportValidationReport';
import { validateBundle, mimeForPath } from '@/lib/website/validateBundle';
import { downloadSampleBundle, downloadBundleSchema } from '@/lib/website/sampleBundle';

const MODES = [
  { key: 'new', label: 'Create new website', help: 'Starts a fresh draft website for this club.' },
  { key: 'replace', label: 'Replace existing website', help: 'Backs up the current site first, then replaces all of its pages.' },
  { key: 'merge', label: 'Merge', help: 'Adds or updates pages by slug and leaves other pages alone.' },
];

function fileNameOf(path) {
  return String(path).split('/').pop();
}

export default function WebsiteImportPanel({ clubId, websites = [], onImported }) {
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState('new');
  const [targetId, setTargetId] = useState('');
  const [confirmSlug, setConfirmSlug] = useState('');
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);

  const reset = () => {
    setParsed(null);
    setResult(null);
    setConfirmSlug('');
    setMode('new');
    setTargetId('');
    setProgress(null);
  };

  const handleFile = async (file) => {
    if (!file) return;
    reset();
    setFileName(file.name);
    setBusy(true);
    try {
      let zip;
      try {
        zip = await JSZip.loadAsync(file);
      } catch {
        throw new Error('That file could not be opened as a ZIP bundle.');
      }

      const siteEntry = zip.file('site.json');
      if (!siteEntry) throw new Error('site.json was not found at the root of the bundle.');

      let siteJson;
      try {
        siteJson = JSON.parse(await siteEntry.async('string'));
      } catch {
        throw new Error('site.json is not valid JSON.');
      }

      const files = Object.values(zip.files).filter((entry) => !entry.dir && entry.name !== 'site.json');
      const assets = [];
      for (const entry of files) {
        const blob = await entry.async('blob');
        assets.push({ path: entry.name, blob, size: blob.size, mime: mimeForPath(entry.name) });
      }

      const validation = validateBundle({ siteJson, assetFiles: assets });
      setParsed({ validation, assets });

      const match = websites.find((w) => w.slug === validation.summary?.siteSlug);
      if (match) {
        setMode('merge');
        setTargetId(match.id);
      }
    } catch (error) {
      setParsed({
        validation: { ok: false, errors: [{ message: error.message }], warnings: [], summary: null },
        assets: [],
      });
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const runImport = async () => {
    const validation = parsed?.validation;
    if (!validation?.ok || !parsed) return;
    if (mode !== 'new' && !targetId) {
      toast.error('Choose which website to import into');
      return;
    }
    if (mode === 'replace' && confirmSlug.trim() !== validation.summary?.siteSlug) {
      toast.error('Type the site slug exactly to confirm the replace');
      return;
    }

    setBusy(true);
    setResult(null);
    setProgress({ done: 0, total: parsed.assets.length });

    try {
      const uploaded = {};
      for (let index = 0; index < parsed.assets.length; index += 1) {
        const asset = parsed.assets[index];
        const fileObj = new File([asset.blob], fileNameOf(asset.path), { type: asset.mime || 'application/octet-stream' });
        const res = await base44.integrations.Core.UploadPublicFile({ file: fileObj });
        uploaded[asset.path] = res.file_url;
        setProgress({ done: index + 1, total: parsed.assets.length });
      }

      const res = await base44.functions.invoke('websiteImport', {
        clubId,
        mode,
        targetWebsiteId: mode === 'new' ? '' : targetId,
        filename: fileName,
        website: validation.website,
        pages: validation.pages,
        assets: parsed.assets.map((asset) => ({
          source_path: asset.path,
          file_url: uploaded[asset.path],
          original_filename: fileNameOf(asset.path),
          mime_type: asset.mime,
          size: asset.size,
        })),
      });

      if (res.data?.ok === false) {
        setParsed((prev) => ({
          ...prev,
          validation: { ...prev.validation, ok: false, errors: res.data.errors || [] },
        }));
        toast.error('Import blocked — nothing was changed');
      } else {
        setResult(res.data);
        toast.success('Website imported as a draft');
        onImported?.();
      }
    } catch (error) {
      const data = error.response?.data;
      if (data?.errors) {
        setParsed((prev) => ({
          ...prev,
          validation: { ...prev.validation, ok: false, errors: data.errors },
        }));
      }
      toast.error(data?.error || 'Import failed');
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const validation = parsed?.validation;
  const summary = validation?.summary;
  const targetWebsite = websites.find((w) => w.id === targetId);

  return (
    <div className="rounded-lg border bg-white p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-gray-900">Import a site bundle</h2>
          <p className="text-sm text-gray-500 mt-1">
            Upload a ZIP containing site.json and an assets folder. Everything is imported as a draft — nothing goes live.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={downloadSampleBundle} disabled={busy}>
            <Download className="w-4 h-4 mr-1.5" /> Sample bundle
          </Button>
          <Button variant="outline" size="sm" onClick={downloadBundleSchema} disabled={busy}>
            <Download className="w-4 h-4 mr-1.5" /> Schema
          </Button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".zip,application/zip"
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
      <Button onClick={() => fileInputRef.current?.click()} disabled={busy} variant="outline">
        {busy && !progress ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
        {fileName ? 'Choose a different bundle' : 'Choose ZIP bundle'}
      </Button>
      {fileName && (
        <p className="text-sm text-gray-600 flex items-center gap-2">
          <FileArchive className="w-4 h-4 text-gray-400" /> {fileName}
        </p>
      )}

      {validation && (
        <div className="space-y-4 pt-2">
          {summary && (
            <div className="rounded-lg border bg-gray-50 p-4">
              <div className="text-sm font-semibold text-gray-900">{summary.siteName}</div>
              <div className="text-xs text-gray-500 mt-0.5">Site slug: {summary.siteSlug}</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-sm">
                <div>
                  <div className="text-xs text-gray-500">Pages</div>
                  <div className="font-semibold text-gray-900">{summary.pages}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Sections</div>
                  <div className="font-semibold text-gray-900">{summary.sections}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Assets</div>
                  <div className="font-semibold text-gray-900">{summary.assets}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Total size</div>
                  <div className="font-semibold text-gray-900">{(summary.totalBytes / 1024 / 1024).toFixed(1)} MB</div>
                </div>
              </div>
              {Object.keys(summary.counts).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {Object.entries(summary.counts).map(([type, count]) => (
                    <span key={type} className="inline-flex px-2 py-0.5 rounded-full bg-white border text-xs text-gray-600">
                      {type.replace(/_/g, ' ')} × {count}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <ImportValidationReport errors={validation.errors} warnings={validation.warnings} />

          {validation.ok && (
            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-900">How should this bundle be imported?</div>
              <div className="grid gap-2 sm:grid-cols-3">
                {MODES.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => { setMode(option.key); setConfirmSlug(''); if (option.key === 'new') setTargetId(''); }}
                    className={`text-left rounded-lg border p-3 transition-colors ${
                      mode === option.key ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-sm font-medium text-gray-900">{option.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{option.help}</div>
                  </button>
                ))}
              </div>

              {mode !== 'new' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-900 block">Import into</label>
                  <select
                    value={targetId}
                    onChange={(event) => setTargetId(event.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Select a website…</option>
                    {websites.map((website) => (
                      <option key={website.id} value={website.id}>
                        {website.name} ({website.slug}) — {website.status}
                      </option>
                    ))}
                  </select>
                  {targetWebsite && (
                    <p className="text-xs text-amber-700 flex items-start gap-1.5">
                      <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      {mode === 'replace'
                        ? `All pages of “${targetWebsite.name}” will be replaced. A backup version is created automatically first.`
                        : `Pages in “${targetWebsite.name}” with matching slugs will be updated; other pages stay as they are.`}
                    </p>
                  )}
                </div>
              )}

              {mode === 'replace' && (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-900 block">
                    Type <span className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">{summary?.siteSlug}</span> to confirm
                  </label>
                  <input
                    value={confirmSlug}
                    onChange={(event) => setConfirmSlug(event.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    placeholder={summary?.siteSlug}
                  />
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={runImport} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700">
                  {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  {progress ? `Uploading assets ${progress.done}/${progress.total}` : 'Import bundle'}
                </Button>
                {busy && !progress && <span className="text-sm text-gray-500">Preparing import…</span>}
              </div>
            </div>
          )}
        </div>
      )}

      {result?.ok && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4" /> Imported “{result.websiteSlug}” as a draft
          </div>
          <ul className="mt-2 space-y-0.5 text-emerald-800">
            <li>{result.summary.pages_created} pages added, {result.summary.pages_updated} updated</li>
            <li>{result.summary.sections_created} sections created</li>
            <li>{result.summary.assets_created} assets added, {result.summary.assets_updated} updated</li>
          </ul>
          <p className="mt-2 text-xs text-emerald-700">
            The website stays in draft until a club admin publishes it.
          </p>
        </div>
      )}
    </div>
  );
}