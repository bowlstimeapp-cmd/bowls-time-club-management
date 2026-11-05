import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Copy } from 'lucide-react';

export default function CopyBlock({ asset }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(asset.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      setCopied(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      <div className="flex items-start justify-between gap-3 p-4 border-b border-gray-100 bg-gray-50">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge variant="secondary" className="text-xs">{asset.category}</Badge>
            <h4 className="font-semibold text-gray-900 text-sm">{asset.title}</h4>
          </div>
          <p className="text-xs text-gray-500">{asset.purpose}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="shrink-0"
        >
          {copied ? <><Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />Copied</> : <><Copy className="w-3.5 h-3.5 mr-1" />Copy</>}
        </Button>
      </div>
      <pre className="p-4 text-xs sm:text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
        {asset.body}
      </pre>
    </div>
  );
}