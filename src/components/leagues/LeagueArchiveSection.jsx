import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Calendar, BarChart3, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function LeagueArchiveSection({ leagues, onViewTable, onRestore, onDelete }) {
  if (leagues.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Trophy className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No archived leagues</h3>
          <p className="text-gray-500">Leagues move here automatically once every fixture has been played</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {leagues.map((league) => (
        <Card key={league.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2 flex-wrap">
                    {league.name}
                    <Badge className="bg-blue-100 text-blue-700">Archived</Badge>
                    {league.format && (
                      <Badge variant="outline">
                        {league.format === 'triples' ? 'Triples' : 'Fours'}
                      </Badge>
                    )}
                  </CardTitle>
                  {league.start_date && league.end_date && (
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(parseISO(league.start_date), 'd MMM')} - {format(parseISO(league.end_date), 'd MMM yyyy')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => onViewTable(league)}>
                  <BarChart3 className="w-4 h-4 mr-1" />
                  Table
                </Button>
                <Button variant="outline" size="sm" onClick={() => onRestore(league)}>
                  Restore
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:bg-red-50"
                  onClick={() => onDelete(league.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}