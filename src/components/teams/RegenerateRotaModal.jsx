import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RefreshCw, Calendar, History } from 'lucide-react';

/**
 * Modal that asks whether to regenerate all fixtures or only future ones.
 * Props:
 *   open: boolean
 *   onClose: () => void
 *   onRegenAll: () => void
 *   onRegenForwards: () => void
 *   isGenerating: boolean
 */
export default function RegenerateRotaModal({ open, onClose, onRegenAll, onRegenForwards, isGenerating }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-4 sm:mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-emerald-600" />
            Regenerate Fixtures
          </DialogTitle>
          <DialogDescription className="pt-1">
            Choose how you'd like to regenerate the player rota. The new rota will respect player availability and maintain fair distribution.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <button
            disabled={isGenerating}
            onClick={onRegenAll}
            className="w-full flex items-start gap-4 p-4 rounded-lg border-2 border-gray-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="mt-0.5 w-8 h-8 flex items-center justify-center rounded-full bg-emerald-100 shrink-0">
              <History className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">All Fixtures</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Rebuild the entire rota from scratch. All fixture allocations (including past ones) will be recalculated with new variety.
              </p>
            </div>
          </button>

          <button
            disabled={isGenerating}
            onClick={onRegenForwards}
            className="w-full flex items-start gap-4 p-4 rounded-lg border-2 border-gray-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="mt-0.5 w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 shrink-0">
              <Calendar className="w-4 h-4 text-blue-700" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Going Forwards</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Keep today's and past fixture allocations unchanged. Only regenerate fixtures with a date after today.
              </p>
            </div>
          </button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isGenerating}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}