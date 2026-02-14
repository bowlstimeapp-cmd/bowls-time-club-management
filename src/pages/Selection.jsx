import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Eye, 
  Users,
  ShieldAlert,
  Calendar
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import SelectionCard from '@/components/selection/SelectionCard';

export default function Selection() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('published');

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (!clubId) {
      navigate(createPageUrl('ClubSelector'));
    }
  }, [clubId, navigate]);

  const { data: membership } = useQuery({
    queryKey: ['myMembership', clubId, user?.email],
    queryFn: async () => {
      const memberships = await base44.entities.ClubMembership.filter({ 
        club_id: clubId, 
        user_email: user.email 
      });
      return memberships[0];
    },
    enabled: !!clubId && !!user?.email,
  });

  const { data: selections = [], isLoading } = useQuery({
    queryKey: ['selections', clubId],
    queryFn: () => base44.entities.TeamSelection.filter({ club_id: clubId }, '-match_date'),
    enabled: !!clubId,
  });

  const { data: club } = useQuery({
    queryKey: ['club', clubId],
    queryFn: async () => {
      const clubs = await base44.entities.Club.filter({ id: clubId });
      return clubs[0];
    },
    enabled: !!clubId,
  });

  const isSelector = membership?.role === 'selector' || membership?.role === 'admin';

  const publishedSelections = selections.filter(s => s.status === 'published');
  const draftSelections = selections.filter(s => s.status === 'draft');

  const EmptyState = ({ title, description }) => (
    <div className="text-center py-12">
      <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
      <h3 className="text-lg font-medium text-gray-900 mb-1">{title}</h3>
      <p className="text-gray-500">{description}</p>
    </div>
  );

  if (!clubId) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">
              Team Selection
            </h1>
            <p className="text-gray-600">
              {club?.name} • View team selections for competitions
            </p>
          </div>
          {isSelector && (
            <Link to={createPageUrl('SelectionEditor') + `?clubId=${clubId}`}>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-2" />
                New Selection
              </Button>
            </Link>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="published" className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Published ({publishedSelections.length})
              </TabsTrigger>
              {isSelector && (
                <TabsTrigger value="drafts" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Drafts ({draftSelections.length})
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="published">
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))}
                </div>
              ) : publishedSelections.length > 0 ? (
                <div className="space-y-4">
                  {publishedSelections.map(selection => (
                    <SelectionCard 
                      key={selection.id} 
                      selection={selection} 
                      isSelector={isSelector}
                      clubId={clubId}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState 
                  title="No published selections" 
                  description="Team selections will appear here once published"
                />
              )}
            </TabsContent>

            {isSelector && (
              <TabsContent value="drafts">
                {isLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-32 w-full" />
                    ))}
                  </div>
                ) : draftSelections.length > 0 ? (
                  <div className="space-y-4">
                    {draftSelections.map(selection => (
                      <SelectionCard 
                        key={selection.id} 
                        selection={selection} 
                        isSelector={isSelector}
                        clubId={clubId}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState 
                    title="No draft selections" 
                    description="Create a new selection to get started"
                  />
                )}
              </TabsContent>
            )}
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}