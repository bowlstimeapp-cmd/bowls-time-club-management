import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileText, CheckCircle, XCircle, Loader2, Download } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function BulkUploadModal({ open, onClose, clubId, onSuccess }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState(null);
  const fileInputRef = useRef(null);

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
        return {
          member_number: values[0] || '',
          first_name: values[1] || '',
          surname: values[2] || '',
          email: values[3] || '',
          phone: values[4] || ''
        };
      }).filter(row => row.email);
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
      const members = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        return {
          member_number: values[0] || '',
          first_name: values[1] || '',
          surname: values[2] || '',
          email: values[3] || '',
          phone: values[4] || ''
        };
      }).filter(row => row.email);

      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (const member of members) {
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

          await base44.entities.ClubMembership.create({
            club_id: clubId,
            user_email: member.email.toLowerCase(),
            user_name: `${member.first_name} ${member.surname}`.trim(),
            first_name: member.first_name,
            surname: member.surname,
            phone: member.phone,
            role: 'member',
            status: 'approved'
          });
          successCount++;
        } catch (err) {
          errors.push(`${member.email}: ${err.message || 'Failed to create'}`);
          errorCount++;
        }
      }

      setResults({ successCount, errorCount, errors });
      setIsUploading(false);
      
      if (successCount > 0) {
        onSuccess?.();
      }
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const template = 'Member Number,First Name,Last Name,Email,Phone Number\n001,John,Smith,john.smith@email.com,07123456789\n002,Jane,Doe,jane.doe@email.com,07987654321';
    const blob = new Blob([template], { type: 'text/csv' });
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk Upload Members</DialogTitle>
          <DialogDescription>
            Upload a CSV file to add multiple members at once
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="w-4 h-4 mr-2" />
            Download CSV Template
          </Button>

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
                  <p className="text-xs text-gray-400">Member Number, First Name, Last Name, Email, Phone Number</p>
                </div>
              ) : (
                <div className="text-center">
                  <FileText className="w-10 h-10 mx-auto mb-3 text-emerald-600" />
                  <p className="text-sm font-medium">{file.name}</p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => {
                      setFile(null);
                      setPreview([]);
                      setResults(null);
                    }}
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
              <div className="text-xs space-y-1 bg-gray-50 p-3 rounded-lg max-h-32 overflow-y-auto">
                {preview.map((row, idx) => (
                  <div key={idx} className="text-gray-600">
                    {row.first_name} {row.surname} - {row.email}
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
                    Uploading...
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