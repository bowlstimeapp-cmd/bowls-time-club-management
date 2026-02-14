import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Trophy, Pencil, Eye } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const competitionColors = {
  'Bramley': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Wessex League': 'bg-blue-100 text-blue-800 border-blue-200',
  'Denny': 'bg-purple-100 text-purple-800 border-purple-200',
  'Top Club': 'bg-amber-100 text-amber-800 border-amber-200',
};

export default function SelectionCard({ selection, isSelector, clubId }) {
  const countSelected = () => {
    return Object.values(selection.selections || {}).filter(Boolean).length;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={`border ${competitionColors[selection.competition]}`}>
                  <Trophy className="w-3 h-3 mr-1" />
                  {selection.competition}
                </Badge>
                <Badge variant={selection.status === 'published' ? 'default' : 'secondary'}>
                  {selection.status === 'published' ? 'Published' : 'Draft'}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {format(parseISO(selection.match_date), 'd MMMM yyyy')}
                </span>
                {selection.match_name && (
                  <span className="font-medium">{selection.match_name}</span>
                )}
              </div>
              <p className="text-sm text-gray-500">
                {countSelected()} players selected
              </p>
            </div>

            <div className="flex gap-2">
              <Link to={createPageUrl('SelectionView') + `?clubId=${clubId}&selectionId=${selection.id}`}>
                <Button variant="outline" size="sm">
                  <Eye className="w-4 h-4 mr-1" />
                  View
                </Button>
              </Link>
              {isSelector && (
                <Link to={createPageUrl('SelectionEditor') + `?clubId=${clubId}&selectionId=${selection.id}`}>
                  <Button variant="outline" size="sm">
                    <Pencil className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}