import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, ArrowRight, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import HomepageSection from './HomepageSection';

export default function UpcomingMatchesSection({ selections, clubId }) {
  const today = new Date().toISOString().split('T')[0];

  return (
    <HomepageSection title="Upcoming Matches & Selection">
      {selections.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <CalendarCheck className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No upcoming matches scheduled</p>
        </div>
      ) : (
        <div className="space-y-3">
          {selections.slice(0, 5).map(s => {
            const isToday = s.match_date === today;
            return (
              <Card key={s.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {isToday && (
                      <span className="flex-shrink-0 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    )}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 text-sm">{s.competition}{s.match_name ? ` — ${s.match_name}` : ''}</p>
                        {isToday && <Badge className="bg-emerald-100 text-emerald-700 text-xs">Today</Badge>}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                        <CalendarCheck className="w-3 h-3" />
                        {new Date(s.match_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                        {s.match_start_time && (
                          <span className="flex items-center gap-0.5 ml-1"><Clock className="w-3 h-3" />{s.match_start_time}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Link to={createPageUrl('SelectionView') + `?clubId=${clubId}&selectionId=${s.id}`}>
                    <Button variant="ghost" size="sm" className="text-emerald-600 flex-shrink-0">
                      View Team <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </HomepageSection>
  );
}