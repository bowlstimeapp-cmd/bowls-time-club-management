import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Printer, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Generates and prints scorecards for a saved TeamSelection.
 * Works from the saved record, so it can sit on any card as well as in the editor.
 */
export default function ScorecardButton({
  selection,
  selectionId,
  clubId,
  club: clubProp,
  showRinks,
  size = 'default',
  className = '',
}) {
  const [isGenerating, setIsGenerating] = useState(false);

  // Reuses the club already cached by the page that renders the selection
  const { data: cachedClub } = useQuery({
    queryKey: ['club', clubId],
    queryFn: async () => {
      const clubs = await base44.entities.Club.filter({ id: clubId });
      return clubs[0];
    },
    enabled: !!clubId && !clubProp,
  });
  const club = clubProp || cachedClub;

  const id = selectionId || selection?.id;
  const rinks = showRinks !== undefined ? showRinks : selection?.show_rinks_on_scorecards !== false;

  const handleClick = async () => {
    setIsGenerating(true);
    try {
      toast.info('Generating scorecards...');
      const functionName = club?.module_custom_branding && club?.use_custom_scorecard_layout
        ? 'generateCustomScorecards'
        : 'generateSelectionScorecards';
      const result = await base44.functions.invoke(functionName, {
        selectionId: id,
        clubId: clubId,
        showRinks: rinks,
      });
      const html = typeof result === 'string' ? result : result?.html || result?.data;
      if (!html) {
        toast.error('No scorecard data returned');
        return;
      }
      const printWindow = window.open('', '_blank');
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };
      toast.success('Scorecards ready — use Print > Save as PDF');
    } catch (error) {
      const errMsg = error?.response?.data?.error || error?.message || 'Unknown error';
      toast.error('Failed to generate scorecards: ' + errMsg);
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      className={className}
      disabled={!id || isGenerating}
      onClick={handleClick}
    >
      {isGenerating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Printer className="w-4 h-4 mr-1" />}
      Scorecards
    </Button>
  );
}