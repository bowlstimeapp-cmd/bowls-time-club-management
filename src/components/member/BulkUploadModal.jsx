import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileText, CheckCircle, XCircle, Loader2, Download } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// Parse a CSV line respecting quoted fields
function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export default function BulkUploadModal({ open, onClose, clubId, membershipTypes = [], onSuccess }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [results, setResults] = useState(null);
  const fileInputRef = useRef(null);

  // Fixed columns before membership type columns
  const FIXED_HEADERS = ['ID', 'Title', 'Name', 'Surname', 'Email', 'Telephone', 'Gender', 'JoinDate', 'Locker1', 'Locker2', 'EmergencyContactName', 'EmergencyContactPhone', 'DateOfBirth'];

  const parseRow = (headers, values) => {
    const get = (header) => values[headers.indexOf(header)] || '';
    // Determine which membership types are marked Yes
    const activeMembershipTypes = membershipTypes.filter(t => {
      const idx = headers.indexOf(t);
      return idx !== -1 && values[idx]?.toLowerCase() === 'yes';
    });
    return {
      member_number: get('ID'),
      title: get('Title'),
      first_name: get('Name'),
      surname: get('Surname'),
      email: get('Email'),
      phone: get('Telephone'),
      gender: get('Gender'),
      join_date: get('JoinDate'),
      locker1: get('Locker1'),
      locker2: get('Locker2'),
      emergency_contact_name: get('EmergencyContactName'),
      emergency_contact_phone: get('EmergencyContactPhone'),
      date_of_birth: get('DateOfBirth'),
      membership_types: activeMembershipTypes,
    };
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setResults(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n').filter(line => line.trim());
      if (lines.length < 2) return;
      const headers = parseCsvLine(lines[0]);
      const parsed = lines.slice(1)
        .map(line => parseRow(headers, parseCsvLine(line)))
        .filter(row => row.email);
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
      if (lines.length < 2) { setIsUploading(false); return; }
      const headers = parseCsvLine(lines[0]);
      const members = lines.slice(1)
        .map(line => parseRow(headers, parseCsvLine(line)))
        .filter(row => row.email);

      let successCount = 0;
      let errorCount = 0;
      const errors = [];
      const BATCH_SIZE = 100;
      const BATCH_DELAY_MS = 61000;

      for (let i = 0; i < members.length; i++) {
        if (i > 0 && i % BATCH_SIZE === 0) {
          setUploadProgress(`Processed ${i} of ${members.length}. Pausing to avoid rate limit...`);
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
        }
        setUploadProgress(`Processing ${i + 1} of ${members.length}...`);
        const member = members[i];

        try {
          const existing = await base44.entities.ClubMembership.filter({
            club_id: clubId,
            user_email: member.email.toLowerCase()
          });
          if (existing.length > 0) {
            errors.push(`${member.email}: Already a member`);
            errorCount++;
            continue;
          }

          const memberData = {
            club_id: clubId,
            user_email: member.email.toLowerCase(),
            user_name: `${member.first_name} ${member.surname}`.trim(),
            first_name: member.first_name,
            surname: member.surname,
            phone: member.phone,
            role: 'member',
            status: 'approved',
          };
          if (member.title) memberData.title = member.title;
          if (member.gender) memberData.gender = member.gender;
          if (member.join_date) memberData.membership_start_date = member.join_date;
          if (member.locker1) memberData.locker_number = member.locker1;
          if (member.locker2) memberData.locker_number_2 = member.locker2;
          if (member.membership_types?.length > 0) memberData.membership_groups = member.membership_types;
          if (member.emergency_contact_name) memberData.emergency_contact_name = member.emergency_contact_name;
          if (member.emergency_contact_phone) memberData.emergency_contact_phone = member.emergency_contact_phone;
          if (member.date_of_birth) memberData.date_of_birth = member.date_of_birth;

          await base44.entities.ClubMembership.create(memberData);
          successCount++;
        } catch (err) {
          errors.push(`${member.email}: ${err.message || 'Failed to create'}`);
          errorCount++;
        }
      }

      setUploadProgress('');
      setResults({ successCount, errorCount, errors });
      setIsUploading(false);
      if (successCount > 0) onSuccess?.();
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    // Build header row: fixed columns + one column per membership type
    const headers = [...FIXED_HEADERS, ...membershipTypes];
    // Example rows
    const example1Values = ['001', 'Mr', 'John', 'Smith', 'john.smith@email.com', '07123456789', 'Male', '2024-01-15', '42', '', 'Jane Smith', '07111222333', '1960-05-15'];
    const example2Values = ['002', 'Mrs', 'Jane', 'Doe', 'jane.doe@email.com', '07987654321', 'Female', '2024-03-01', '', '12', '', '', '1975-08-22'];

    // Pad fixed columns and add Yes/No for each membership type (example: first type Yes for row1, second type Yes for row2)
    const membershipCols1 = membershipTypes.map((_, i) => i === 0 ? 'Yes' : '');
    const membershipCols2 = membershipTypes.map((_, i) => i === 1 ? 'Yes' : '');

    const rows = [
      headers.join(','),
      [...example1Values, ...membershipCols1].join(','),
      [...example2Values, ...membershipCols2].join(','),
    ];

    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'members_template.csv';
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
          <DialogTitle>Bulk Upload Members</DialogTitle>
          <DialogDescription>
            Upload a CSV file to add multiple members at once. Use one column per membership type — enter <strong>Yes</strong> to assign it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="w-4 h-4 mr-2" />
            Download CSV Template
          </Button>

          {membershipTypes.length > 0 && (
            <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
              <p className="font-medium mb-1">Membership type columns in template:</p>
              <div className="flex flex-wrap gap-1">
                {membershipTypes.map(t => (
                  <span key={t} className="bg-white border border-slate-200 rounded px-1.5 py-0.5">{t}</span>
                ))}
              </div>
              <p className="mt-1.5">Enter <strong>Yes</strong> in a column to assign that type to the member.</p>
            </div>
          )}

          <Card className="border-dashed">
            <CardContent className="p-6">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              {!file ? (
                <div
                  className="text-center cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-10 h-10 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm text-gray-600 mb-1">Click to upload CSV file</p>
                  <p className="text-xs text-gray-400">Fixed columns + one column per membership type</p>
                </div>
              ) : (
                <div className="text-center">
                  <FileText className="w-10 h-10 mx-auto mb-3 text-emerald-600" />
                  <p className="text-sm font-medium">{file.name}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => { setFile(null); setPreview([]); setResults(null); }}
                  >
                    Remove
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {preview.length > 0 && !results && (
            <div>
              <p className="text-sm font-medium mb-2">Preview (first 5 rows):</p>
              <div className="text-xs space-y-1 bg-gray-50 p-3 rounded-lg max-h-40 overflow-y-auto">
                {preview.map((row, idx) => (
                  <div key={idx} className="text-gray-600">
                    {row.first_name} {row.surname} — {row.email}
                    {row.membership_types?.length > 0 && (
                      <span className="ml-1 text-emerald-600">({row.membership_types.join(', ')})</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {results && (
            <Card className={results.errorCount === 0 ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  {results.errorCount === 0 ? (
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-amber-600" />
                  )}
                  <p className="font-medium">
                    {results.successCount} members added successfully
                    {results.errorCount > 0 && `, ${results.errorCount} failed`}
                  </p>
                </div>
                {results.errors.length > 0 && (
                  <div className="text-xs text-gray-600 max-h-24 overflow-y-auto">
                    {results.errors.map((err, idx) => (
                      <div key={idx}>{err}</div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              {results ? 'Close' : 'Cancel'}
            </Button>
            {!results && (
              <Button
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {uploadProgress || 'Uploading...'}
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Members
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}