import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileText, CheckCircle, XCircle, Loader2, Download } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const COMPETITION_TYPES = ['Club', 'County', 'National', 'Roll-up', 'Other'];

export default function BulkBookingImportModal({ open, onClose, clubId, onSuccess }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
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
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n').filter(line => line.trim());
      const parsed = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        return parseRow(values);
      }).filter(row => row.date && row.rink_number);
      setPreview(parsed.slice(0, 5));
    };
    reader.readAsText(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setResults(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const lines = text.split('\n').filter(line => line.trim());
      const rows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        return parseRow(values);
      }).filter(row => row.date && row.rink_number && row.start_time && row.end_time);

      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (const row of rows) {
        try {
          const rinkNum = parseInt(row.rink_number);
          if (isNaN(rinkNum)) throw new Error('Invalid rink number');
          if (!row.date.match(/^\d{4}-\d{2}-\d{2}$/)) throw new Error('Date must be YYYY-MM-DD');
          if (!row.start_time.match(/^\d{2}:\d{2}$/)) throw new Error('Start time must be HH:MM');
          if (!row.end_time.match(/^\d{2}:\d{2}$/)) throw new Error('End time must be HH:MM');

          const competitionType = COMPETITION_TYPES.includes(row.competition_type)
            ? row.competition_type
            : 'Club';

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
        } catch (err) {
          errors.push(`Row (${row.date} Rink ${row.rink_number}): ${err.message || 'Failed'}`);
          errorCount++;
        }
      }

      setResults({ successCount, errorCount, errors });
      setIsUploading(false);
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
    setFile(null);
    setPreview([]);
    setResults(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
        <DialogHeader>
          <DialogTitle>Import Bookings</DialogTitle>
          <DialogDescription>Upload a CSV file to bulk-import bookings. All imported bookings are set to Approved status.</DialogDescription>
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
                  <p className="text-xs text-gray-400">Date, Rink, StartTime, EndTime, CompetitionType, BookerName, BookerEmail, Notes</p>
                </div>
              ) : (
                <div className="text-center">
                  <FileText className="w-10 h-10 mx-auto mb-3 text-emerald-600" />
                  <p className="text-sm font-medium">{file.name}</p>
                  <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setFile(null); setPreview([]); setResults(null); }}>
                    Remove
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {preview.length > 0 && !results && (
            <div>
              <p className="text-sm font-medium mb-2">Preview (first 5 rows):</p>
              <div className="text-xs space-y-1 bg-gray-50 p-3 rounded-lg max-h-32 overflow-y-auto">
                {preview.map((row, idx) => (
                  <div key={idx} className="text-gray-600">
                    {row.date} · Rink {row.rink_number} · {row.start_time}–{row.end_time} · {row.booker_name}
                  </div>
                ))}
              </div>
            </div>
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
                    {results.errors.map((err, idx) => <div key={idx}>{err}</div>)}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>{results ? 'Close' : 'Cancel'}</Button>
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