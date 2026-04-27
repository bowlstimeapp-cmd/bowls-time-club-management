import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format, parseISO } from 'date-fns';
import { Trophy, Calendar, MapPin, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * LeagueResultModal
 *
 * Shown when a member logs in and has a past fixture without a confirmed result.
 * First team to submit stores a "pending" result.
 * When the opposing team submits:
 *   - Same scores → confirmed and saved
 *   - Different scores → admin notified of conflict, entries cleared
 *
 * Props:
 *   submitterEmail  – email to record as submitter (defaults to userEmail; use kiosk member's email)
 *   submitterName   – display name of submitter (for notifications)
 */
export default function LeagueResultModal({
  fixture,
  league,
  homeTeam,
  awayTeam,
  userTeamId,
  userEmail,
  clubId,
  onClose,
  submitterEmail,   // optional override (kiosk)
  submitterName,    // optional override (kiosk)
}) {
  const queryClient = useQueryClient();

  const effectiveEmail = submitterEmail || userEmail;

  const hasPending = fixture.pending_submitted_by_email != null;
  const pendingFromOtherTeam = hasPending && fixture.pending_submitted_by_team_id !== userTeamId;

  // Pre-fill with the other team's submitted scores so the second team can accept easily
  const [homeScore, setHomeScore] = useState(hasPending ? String(fixture.pending_home_score ?? '') : '');
  const [awayScore, setAwayScore] = useState(hasPending ? String(fixture.pending_away_score ?? '') : '');
  const [homeSets, setHomeSets] = useState(hasPending ? String(fixture.pending_home_sets ?? '') : '');
  const [awaySets, setAwaySets] = useState(hasPending ? String(fixture.pending_away_sets ?? '') : '');
  const [saving, setSaving] = useState(false);

  const isSetsLeague = league?.is_sets;

  const notifyAdminConflict = async (theirHome, theirAway, ourHome, ourAway) => {
    // Find all admin memberships for this club
    try {
      const admins = await base44.entities.ClubMembership.filter({
        club_id: clubId,
        role: 'admin',
        status: 'approved',
      });

      const fixtureDesc = `${homeTeam?.name} vs ${awayTeam?.name} on ${format(parseISO(fixture.match_date), 'd MMM yyyy')}${fixture.rink_number ? ` (Rink ${fixture.rink_number})` : ''}`;
      const leagueName = league?.name || 'Unknown league';
      const conflictDetail = `First submission: ${homeTeam?.name} ${theirHome} – ${theirAway} ${awayTeam?.name}. Second submission: ${homeTeam?.name} ${ourHome} – ${ourAway} ${awayTeam?.name}.`;

      const message = `Score conflict in ${leagueName} — ${fixtureDesc}. ${conflictDetail} Both entries have been cleared. Please contact the teams to resolve.`;

      await Promise.all(admins.map(admin =>
        base44.entities.Notification.create({
          user_email: admin.user_email,
          type: 'team_request',
          title: '⚠ League score conflict',
          message,
          link_page: 'LeagueAdmin',
          link_params: `clubId=${clubId}`,
        })
      ));
    } catch (e) {
      // Non-critical — don't block the flow
    }
  };

  const handleSubmit = async () => {
    if (homeScore === '' || awayScore === '') {
      toast.error('Please enter both scores');
      return;
    }
    if (isSetsLeague && (homeSets === '' || awaySets === '')) {
      toast.error('Please enter both set counts');
      return;
    }

    const hs = parseInt(homeScore);
    const as_ = parseInt(awayScore);
    const hsS = isSetsLeague ? parseInt(homeSets) : null;
    const asS = isSetsLeague ? parseInt(awaySets) : null;

    setSaving(true);

    if (!hasPending) {
      // First submission — store as pending
      await base44.entities.LeagueFixture.update(fixture.id, {
        pending_home_score: hs,
        pending_away_score: as_,
        ...(isSetsLeague ? { pending_home_sets: hsS, pending_away_sets: asS } : {}),
        pending_submitted_by_email: effectiveEmail,
        pending_submitted_by_team_id: userTeamId,
      });
      toast.success('Result submitted — waiting for the opposing team to confirm.');
    } else {
      // Second submission — check if scores match
      const scoresMatch =
        fixture.pending_home_score === hs &&
        fixture.pending_away_score === as_ &&
        (!isSetsLeague || (fixture.pending_home_sets === hsS && fixture.pending_away_sets === asS));

      if (scoresMatch) {
        // Confirmed!
        await base44.entities.LeagueFixture.update(fixture.id, {
          home_score: hs,
          away_score: as_,
          ...(isSetsLeague ? { home_sets: hsS, away_sets: asS } : {}),
          status: 'completed',
          pending_home_score: null,
          pending_away_score: null,
          pending_home_sets: null,
          pending_away_sets: null,
          pending_submitted_by_email: null,
          pending_submitted_by_team_id: null,
        });
        toast.success('Result confirmed! The match result has been recorded.');
      } else {
        // Mismatch — clear pending and notify admins
        await base44.entities.LeagueFixture.update(fixture.id, {
          pending_home_score: null,
          pending_away_score: null,
          pending_home_sets: null,
          pending_away_sets: null,
          pending_submitted_by_email: null,
          pending_submitted_by_team_id: null,
        });

        // Notify admins of the conflict
        await notifyAdminConflict(
          fixture.pending_home_score,
          fixture.pending_away_score,
          hs,
          as_
        );

        toast.error("The scores don't match the other team's entry. Both entries have been cleared — the club admin has been notified.");
      }
    }

    queryClient.invalidateQueries({ queryKey: ['leagueFixtures', clubId] });
    queryClient.invalidateQueries({ queryKey: ['allLeagueFixtures', clubId] });
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-4 sm:mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-emerald-600" />
            Enter Match Result
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Fixture details */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="w-4 h-4" />
              <span>{format(parseISO(fixture.match_date), 'EEEE d MMMM yyyy')}</span>
            </div>
            {fixture.rink_number && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <MapPin className="w-4 h-4" />
                <span>Rink {fixture.rink_number}</span>
              </div>
            )}
            {league && (
              <Badge className="bg-emerald-100 text-emerald-700 border-0">{league.name}</Badge>
            )}
            <div className="flex items-center justify-between pt-2">
              <div className="text-center flex-1">
                <p className="font-semibold text-gray-900 text-sm">{homeTeam?.name || 'Home'}</p>
                <p className="text-xs text-gray-400">Home</p>
              </div>
              <span className="text-gray-400 font-bold px-3">vs</span>
              <div className="text-center flex-1">
                <p className="font-semibold text-gray-900 text-sm">{awayTeam?.name || 'Away'}</p>
                <p className="text-xs text-gray-400">Away</p>
              </div>
            </div>
          </div>

          {/* Pending notice — other team already submitted */}
          {hasPending && pendingFromOtherTeam && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold mb-1">The other team has already submitted a score:</p>
                <p className="font-mono text-base font-bold">
                  {homeTeam?.name} {fixture.pending_home_score} – {fixture.pending_away_score} {awayTeam?.name}
                  {fixture.pending_home_sets != null && ` (Sets: ${fixture.pending_home_sets}–${fixture.pending_away_sets})`}
                </p>
                <p className="text-xs mt-1 text-amber-700">The scores above are pre-filled for you. Accept them or enter the correct scores to flag a conflict to the admin.</p>
              </div>
            </div>
          )}

          {/* Already submitted by this user */}
          {hasPending && !pendingFromOtherTeam && (
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <span>You've already submitted this result. Waiting for the opposing team to confirm.</span>
            </div>
          )}

          {/* Score inputs — hide if pending from same team (already submitted) */}
          {!(hasPending && !pendingFromOtherTeam) && (
            <>
              {isSetsLeague && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">Sets Won</p>
                  <div className="grid grid-cols-3 gap-3 items-center">
                    <div>
                      <Label className="text-xs block mb-1">{homeTeam?.name || 'Home'}</Label>
                      <Input
                        type="number" min="0"
                        value={homeSets}
                        onChange={(e) => setHomeSets(e.target.value)}
                        className="text-center"
                        placeholder="0"
                      />
                    </div>
                    <div className="text-center text-gray-400 text-sm pt-5">sets</div>
                    <div>
                      <Label className="text-xs block mb-1">{awayTeam?.name || 'Away'}</Label>
                      <Input
                        type="number" min="0"
                        value={awaySets}
                        onChange={(e) => setAwaySets(e.target.value)}
                        className="text-center"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">
                  {isSetsLeague ? 'Total Shots' : 'Final Score'}
                </p>
                <div className="grid grid-cols-3 gap-3 items-center">
                  <div>
                    {!isSetsLeague && <Label className="text-xs block mb-1">{homeTeam?.name || 'Home'}</Label>}
                    <Input
                      type="number" min="0"
                      value={homeScore}
                      onChange={(e) => setHomeScore(e.target.value)}
                      className="text-center text-lg font-bold"
                      placeholder="0"
                    />
                  </div>
                  <div className="text-center text-gray-400 font-bold pt-4">–</div>
                  <div>
                    {!isSetsLeague && <Label className="text-xs block mb-1">{awayTeam?.name || 'Away'}</Label>}
                    <Input
                      type="number" min="0"
                      value={awayScore}
                      onChange={(e) => setAwayScore(e.target.value)}
                      className="text-center text-lg font-bold"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Skip for now
          </Button>
          {!(hasPending && !pendingFromOtherTeam) && (
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {hasPending ? 'Confirm Result' : 'Submit Result'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}