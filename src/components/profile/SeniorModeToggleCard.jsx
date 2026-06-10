import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useSeniorMode } from '@/lib/SeniorModeContext';
import { createPageUrl } from '@/utils';

export default function SeniorModeToggleCard() {
  const { seniorMode, setSeniorMode } = useSeniorMode();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const clubId = searchParams.get('clubId');

  const handleEnable = () => {
    setSeniorMode(true);
    if (clubId) {
      navigate(`/SeniorHome?clubId=${clubId}`);
    }
  };

  const handleDisable = () => {
    setSeniorMode(false);
    if (clubId) {
      navigate(createPageUrl('BookRink') + `?clubId=${clubId}`);
    }
  };

  return (
    <Card className="shadow-lg border-2 border-emerald-100">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          👓 Senior Experience Mode
        </CardTitle>
        <CardDescription>
          A completely different layout designed for ease of use — larger text, simpler navigation, step-by-step booking, and card-based views throughout.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={`rounded-xl border-2 p-4 ${seniorMode ? 'bg-emerald-50 border-emerald-400' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-4 h-4 rounded-full ${seniorMode ? 'bg-emerald-500' : 'bg-gray-300'}`} />
            <p className="font-bold text-gray-900">{seniorMode ? 'Senior Experience Mode is ON' : 'Senior Experience Mode is OFF'}</p>
          </div>
          <p className="text-sm text-gray-600">
            {seniorMode
              ? 'You are currently using the Senior Experience. Tap the button below to return to the standard view.'
              : 'Turn this on for a simpler, larger, step-by-step experience designed for easy use.'}
          </p>
        </div>

        {seniorMode ? (
          <div className="space-y-2">
            <button
              onClick={() => navigate(`/SeniorHome?clubId=${clubId}`)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg py-3 px-4 rounded-xl min-h-[52px] transition-colors"
            >
              Go to Senior Home Page
            </button>
            <button
              onClick={handleDisable}
              className="w-full bg-white border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-bold text-base py-3 px-4 rounded-xl min-h-[52px] transition-colors"
            >
              Switch Back to Standard View
            </button>
          </div>
        ) : (
          <button
            onClick={handleEnable}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg py-3 px-4 rounded-xl min-h-[52px] transition-colors"
          >
            Enable Senior Experience Mode
          </button>
        )}

        <p className="text-xs text-gray-500">
          Your choice is saved automatically. You can switch back at any time from Settings.
        </p>
      </CardContent>
    </Card>
  );
}