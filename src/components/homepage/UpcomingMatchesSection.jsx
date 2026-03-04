import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarCheck, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import HomepageSection from './HomepageSection';

export default function UpcomingMatchesSection({ selections, clubId }) {
  return (
    <HomepageSection title="Upcoming Matches & Selection">
      {selections.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <CalendarCheck className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No upcoming matches scheduled</p>
        </div>
      ) : (
        <div className="space-y-3">
          {selections.slice(0, 5).map(s => (
            <Card key={s.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{s.competition}{s.match_name ? ` — ${s.match_name}` : ''}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(s.match_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                    {s.match_start_time && ` · ${s.match_start_time}`}
                  </p>
                </div>
                <Link to={createPageUrl('Selection') + `?clubId=${clubId}`}>
                  <Button variant="ghost" size="sm" className="text-emerald-600">
                    View <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </HomepageSection>
  );
}