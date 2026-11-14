import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Eye, ExternalLink, Loader2, UploadCloud } from 'lucide-react';

export default function WebsiteListItem({ website, onPublished }) {
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');

  const isPublished = website.status === 'published';

  const publish = async () => {
    setPublishing(true);
    setError('');
    try {
      await base44.functions.invoke('websitePublish', { websiteId: website.id });
      onPublished?.();
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Publishing failed');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-gray-900">{website.name}</div>
          <div className="text-xs text-gray-500">
            /site/{website.slug}
            {website.last_imported_at ? ` · imported ${new Date(website.last_imported_at).toLocaleDateString('en-GB')}` : ''}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
            isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {isPublished ? 'Published' : 'Draft'}
          </span>

          <Link to={`/site/${website.slug}?preview=1`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Eye className="h-3.5 w-3.5" /> Preview
            </Button>
          </Link>

          {isPublished && (
            <Link to={`/site/${website.slug}`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" /> View site
              </Button>
            </Link>
          )}

          <Button
            size="sm"
            onClick={publish}
            disabled={publishing}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
          >
            {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
            {isPublished ? 'Publish changes' : 'Publish'}
          </Button>
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </li>
  );
}