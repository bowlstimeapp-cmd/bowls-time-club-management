import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import { ONBOARDING_ITEMS } from '@/lib/onboardingChecklist';
import { toast } from 'sonner';
import { PlayCircle, Settings, Users, Shield, LifeBuoy, CheckCircle2, ArrowRight, Sparkles, Loader2 } from 'lucide-react';

const ICON_MAP = {
  PlayCircle,
  Settings,
  Users,
  Shield,
  LifeBuoy,
};

export default function OnboardingChecklist() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const queryClient = useQueryClient();
  const [marking, setMarking] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: club } = useQuery({
    queryKey: ['club', clubId],
    queryFn: async () => {
      const clubs = await base44.entities.Club.filter({ id: clubId });
      return clubs[0];
    },
    enabled: !!clubId,
  });

  const { data: membership } = useQuery({
    queryKey: ['myMembership', clubId, user?.email],
    queryFn: async () => {
      const memberships = await base44.entities.ClubMembership.filter({ club_id: clubId, user_email: user.email });
      return memberships[0];
    },
    enabled: !!clubId && !!user?.email,
  });

  const isClubAdmin = membership?.role === 'admin' && membership?.status === 'approved';
  const completedItems = club?.onboarding_completed_items || [];
  const completedSet = new Set(completedItems);
  const completedCount = ONBOARDING_ITEMS.filter(item => completedSet.has(item.key)).length;
  const allComplete = completedCount === ONBOARDING_ITEMS.length;

  const handleMarkDone = async (itemKey) => {
    setMarking(itemKey);
    try {
      await base44.functions.invoke('updateOnboardingProgress', { club_id: clubId, item_key: itemKey, completed: true });
      await queryClient.invalidateQueries({ queryKey: ['club', clubId] });
      toast.success('Marked as done!');
    } catch (err) {
      toast.error('Failed to update: ' + (err?.message || 'Unknown error'));
    } finally {
      setMarking(null);
    }
  };

  const getItemLink = (item) => {
    if (!item.page) return null;
    if (item.page === 'HelpCentre') return createPageUrl('HelpCentre');
    return createPageUrl(item.page) + `?clubId=${clubId}`;
  };

  if (!club || !membership) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!isClubAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">Only club admins can access this page.</p>
          <Link to={createPageUrl('BookRink') + `?clubId=${clubId}`}>
            <Button className="bg-emerald-600 hover:bg-emerald-700">Go to Rink Booking</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Getting Started</h1>
          <p className="text-gray-600 mb-4">{club.name}</p>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${(completedCount / ONBOARDING_ITEMS.length) * 100}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
              {completedCount} of {ONBOARDING_ITEMS.length} complete
            </span>
          </div>
        </div>

        {/* All complete state */}
        {allComplete ? (
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">You're all set up! 🎉</h2>
              <p className="text-gray-600">Your club is fully configured and ready to go.</p>
            </CardContent>
          </Card>
        ) : (
          /* Checklist items */
          <div className="space-y-4">
            {ONBOARDING_ITEMS.map((item) => {
              const Icon = ICON_MAP[item.icon];
              const isComplete = completedSet.has(item.key);
              const link = getItemLink(item);

              return (
                <Card key={item.key} className={isComplete ? 'border-emerald-200' : ''}>
                  <CardContent className="py-5">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isComplete ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                        {isComplete ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <Icon className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{item.label}</h3>
                          {isComplete ? (
                            <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">Done</span>
                          ) : (
                            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Not done</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Action button */}
                          {item.key === 'tour' ? (
                            <Link to={createPageUrl('BookRink') + `?clubId=${clubId}`}>
                              <Button size="sm" variant={isComplete ? 'outline' : 'default'} className={isComplete ? '' : 'bg-emerald-600 hover:bg-emerald-700'}>
                                <PlayCircle className="w-4 h-4 mr-1.5" />
                                {isComplete ? 'Retake Tour' : 'Take the Tour'}
                              </Button>
                            </Link>
                          ) : link ? (
                            <Link to={link}>
                              <Button size="sm" variant={isComplete ? 'outline' : 'default'} className={isComplete ? '' : 'bg-emerald-600 hover:bg-emerald-700'}>
                                <ArrowRight className="w-4 h-4 mr-1.5" />
                                {isComplete ? 'Go to page' : `Go to ${item.label}`}
                              </Button>
                            </Link>
                          ) : null}

                          {/* Manual "Mark as done" for non-auto items */}
                          {!item.auto && !isComplete && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkDone(item.key)}
                              disabled={marking === item.key}
                            >
                              {marking === item.key ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
                              Mark as done
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}