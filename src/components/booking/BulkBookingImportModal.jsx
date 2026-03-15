import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileText, CheckCircle, XCircle, Loader2, Download } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { addDays, addWeeks, format, parse, isAfter, isBefore, isEqual } from 'date-fns';

const COMPETITION_TYPES = ['Club', 'County', 'National', 'Roll-up', 'Other'];
const RATE_LIMIT_BATCH = 100;
const RATE_LIMIT_PAUSE_MS = 61000;

// Parse a date string like "18/04/2026" → "2026-04-18"
const parseDDMMYYYY = (str) => {
  if (!str) return null;
  const parts = str.trim().split('/');
  if (parts.length !== 3) return null;
  return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
};

// Parse time like "9:00 AM" / "4:00 PM" → "09:00"
const parseTime12 = (str) => {
  if (!str) return null;
  const m = str.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let h = parseInt(m[1]);
  const min = m[2];
  const period = m[3].toUpperCase();
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${min}`;
};

// Parse Calendar Name like "R1 / 7|R2 / 8" → [1, 2]
const parseCalendarRinks = (calName) => {
  if (!calName) return [];
  return calName.split('|').map(part => {
    const m = part.trim().match(/^R(\d+)/i);
    return m ? parseInt(m[1]) : null;
  }).filter(Boolean);
};

// Parse day names from repeat string → JS day indices (0=Sun)
const DAY_MAP = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6
};

const parseRepeatDays = (repeatsStr) => {
  if (!repeatsStr) return null;
  const lower = repeatsStr.toLowerCase();
  if (!lower.includes('weekly')) return null;
  const days = [];
  Object.entries(DAY_MAP).forEach(([name, idx]) => {
    if (lower.includes(name)) days.push(idx);
  });
  return days.length > 0 ? days : null;
};

// Given a single CSV row, expand into all booking objects (handles repeats)
const expandRow = (row) => {
  const startDateStr = parseDDMMYYYY(row['Start Date']);
  const endDateStr = parseDDMMYYYY(row['Repeats Until'] || row['End Date']);
  const startTime = parseTime12(row['Start Time']);
  const endTime = parseTime12(row['End Time']);
  const subject = (row['Subject'] || row['\uFEFFSubject'] || '').trim();
  const calendarName = row['Calendar Name'] || '';
  const repeatsStr = row['Repeats'] || '';

  if (!startDateStr || !startTime || !endTime) return [];

  const rinks = parseCalendarRinks(calendarName);
  if (rinks.length === 0) return [];

  const repeatDays = parseRepeatDays(repeatsStr);
  const untilDate = endDateStr ? new Date(endDateStr) : null;

  const dates = [];

  if (!repeatDays || !untilDate) {
    // Single occurrence
    dates.push(startDateStr);
  } else {
    // Generate weekly occurrences on specified days
    let cursor = new Date(startDateStr);
    const limit = new Date(untilDate);
    limit.setHours(23, 59, 59);

    // Walk day by day from start to until
    while (cursor <= limit) {
      if (repeatDays.includes(cursor.getDay())) {
        dates.push(format(cursor, 'yyyy-MM-dd'));
      }
      cursor = addDays(cursor, 1);
    }
  }

  const bookings = [];
  dates.forEach(date => {
    rinks.forEach(rinkNum => {
      bookings.push({
        date,
        rink_number: rinkNum,
        start_time: startTime,
        end_time: endTime,
        notes: subject,
        booker_name: subject || 'Imported',
        booker_email: '',
        competition_type: 'Club',
      });
    });
  });

  return bookings;
};

// Parse CSV text respecting quoted fields
const parseCSV = (text) => {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  const rawHeaders = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  // Normalise BOM on first header
  const headers = rawHeaders.map((h, i) => i === 0 ? h.replace(/^\uFEFF/, '') : h);

  return lines.slice(1).map(line => {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
      else { current += ch; }
    }
    values.push(current.trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i] || ''; });
    return obj;
  });
};

// Detect if this is a TeamUp-style CSV
const isTeamUpFormat = (headers) => headers.some(h => h === 'Calendar Name' || h === 'Start Time');

export default function BulkBookingImportModal({ open, onClose, clubId, onSuccess }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(null); // { done, total, pausing }
  const [results, setResults] = useState(null);
  const fileInputRef = useRef(null);

  const parseRow = (values) => ({
    date: values[0] || '',
    rink_number: values[1] || '',
    start_time: values[2] || '',
    end_time: values[3] || '',
    competition_type: values[4] || 'Club',
    booker_name: values[5] || '',
    booker_email: values[6] || '',
    notes: values[7] || '',
  });

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setResults(null);
    setProgress(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const rows = parseCSV(text);
      const headers = Object.keys(rows[0] || {});

      if (isTeamUpFormat(headers)) {
        const expanded = rows.flatMap(r => expandRow(r));
        setPreview(expanded.slice(0, 5));
      } else {
        const parsed = rows.map(row => {
          const values = Object.values(row);
          return parseRow(values);
        }).filter(row => row.date && row.rink_number);
        setPreview(parsed.slice(0, 5));
      }
    };
    reader.readAsText(selectedFile);
  };

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setResults(null);
    setProgress(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const rows = parseCSV(text);
      const headers = Object.keys(rows[0] || {});

      let allBookings = [];

      if (isTeamUpFormat(headers)) {
        allBookings = rows.flatMap(r => expandRow(r));
      } else {
        allBookings = rows.map(row => {
          const values = Object.values(row);
          return parseRow(values);
        }).filter(row => row.date && row.rink_number && row.start_time && row.end_time);
      }

      let successCount = 0;
      let errorCount = 0;
      const errors = [];
      const total = allBookings.length;

      for (let i = 0; i < allBookings.length; i++) {
        // Rate limiting: pause after every RATE_LIMIT_BATCH bookings
        if (i > 0 && i % RATE_LIMIT_BATCH === 0) {
          setProgress({ done: i, total, pausing: true });
          await sleep(RATE_LIMIT_PAUSE_MS);
          setProgress({ done: i, total, pausing: false });
        }

        const row = allBookings[i];
        try {
          const rinkNum = parseInt(row.rink_number);
          if (isNaN(rinkNum)) throw new Error('Invalid rink number');
          if (!row.date.match(/^\d{4}-\d{2}-\d{2}$/)) throw new Error('Date must be YYYY-MM-DD');
          if (!row.start_time.match(/^\d{2}:\d{2}$/)) throw new Error('Start time must be HH:MM');
          if (!row.end_time.match(/^\d{2}:\d{2}$/)) throw new Error('End time must be HH:MM');

          const competitionType = COMPETITION_TYPES.includes(row.competition_type)
            ? row.competition_type : 'Club';

          await base44.entities.Booking.create({
            club_id: clubId,
            rink_number: rinkNum,
            date: row.date,
            start_time: row.start_time,
            end_time: row.end_time,
            status: 'approved',
            competition_type: competitionType,
            booker_name: row.booker_name || 'Imported',
            booker_email: row.booker_email || '',
            notes: row.notes || '',
          });
          successCount++;
          setProgress({ done: i + 1, total, pausing: false });
        } catch (err) {
          errors.push(`Row ${i + 1} (${row.date} Rink ${row.rink_number}): ${err.message || 'Failed'}`);
          errorCount++;
        }
      }

      setResults({ successCount, errorCount, errors });
      setIsUploading(false);
      setProgress(null);
      if (successCount > 0) onSuccess?.();
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const template = 'Date (YYYY-MM-DD),Rink Number,Start Time (HH:MM),End Time (HH:MM),Competition Type,Booker Name,Booker Email,Notes\n2024-01-15,1,10:00,12:00,Club,John Smith,john@email.com,Practice session\n2024-01-15,2,14:00,16:00,County,Jane Doe,jane@email.com,';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bookings_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    if (isUploading) return;
    setFile(null);
    setPreview([]);
    setResults(null);
    setProgress(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
        <DialogHeader>
          <DialogTitle>Import Bookings</DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk-import bookings. Supports standard format and TeamUp calendar exports (with repeat rules).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="w-4 h-4 mr-2" />
            Download CSV Template
          </Button>

          <Card className="border-dashed">
            <CardContent className="p-6">
              <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
              {!file ? (
                <div className="text-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-10 h-10 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm text-gray-600 mb-1">Click to upload CSV file</p>
                  <p className="text-xs text-gray-400">Supports standard format or TeamUp calendar CSV exports</p>
                </div>
              ) : (
                <div className="text-center">
                  <FileText className="w-10 h-10 mx-auto mb-3 text-emerald-600" />
                  <p className="text-sm font-medium">{file.name}</p>
                  <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setFile(null); setPreview([]); setResults(null); setProgress(null); }} disabled={isUploading}>
                    Remove
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {preview.length > 0 && !results && (
            <div>
              <p className="text-sm font-medium mb-2">Preview (first 5 bookings):</p>
              <div className="text-xs space-y-1 bg-gray-50 p-3 rounded-lg max-h-32 overflow-y-auto">
                {preview.map((row, idx) => (
                  <div key={idx} className="text-gray-600">
                    {row.date} · Rink {row.rink_number} · {row.start_time}–{row.end_time} · {row.notes || row.booker_name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {progress && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
                  <div className="flex-1">
                    {progress.pausing ? (
                      <p className="text-sm font-medium text-blue-800">
                        Rate limit pause — resuming shortly... ({progress.done}/{progress.total} done)
                      </p>
                    ) : (
                      <p className="text-sm font-medium text-blue-800">
                        Importing... {progress.done}/{progress.total} bookings
                      </p>
                    )}
                    <div className="w-full bg-blue-200 rounded-full h-1.5 mt-2">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {results && (
            <Card className={results.errorCount === 0 ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  {results.errorCount === 0 ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-amber-600" />}
                  <p className="font-medium">
                    {results.successCount} bookings imported successfully
                    {results.errorCount > 0 && `, ${results.errorCount} failed`}
                  </p>
                </div>
                {results.errors.length > 0 && (
                  <div className="text-xs text-gray-600 max-h-24 overflow-y-auto">
                    {results.errors.slice(0, 20).map((err, idx) => <div key={idx}>{err}</div>)}
                    {results.errors.length > 20 && <div>...and {results.errors.length - 20} more</div>}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isUploading}>{results ? 'Close' : 'Cancel'}</Button>
            {!results && (
              <Button onClick={handleUpload} disabled={!file || isUploading} className="bg-emerald-600 hover:bg-emerald-700">
                {isUploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing...</> : <><Upload className="w-4 h-4 mr-2" />Import Bookings</>}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}