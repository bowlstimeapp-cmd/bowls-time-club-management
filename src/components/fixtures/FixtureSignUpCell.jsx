import React, { useState } from 'react';
import { Star } from 'lucide-react';
import FixtureInterestButton from '@/components/fixtures/FixtureInterestButton';
import FixtureSignUpDialog from '@/components/fixtures/FixtureSignUpDialog';
import { memberMatchesFixtureGender, fixtureGenderLabel } from '@/lib/fixtureGender';

/**
 * The "Interested" cell of one fixture row.
 * Members get the availability star while the fixture is broadcast and upcoming;
 * admins and selectors get the count, a broadcast badge and the full sign-up list.
 */
export default function FixtureSignUpCell({
  fixture,
  competitionName,
  interests = [],
  canSeeAll,
  iAmInterested,
  isPast,
  onToggle,
  memberGender,
}) {
  const [showList, setShowList] = useState(false);
  const isBroadcast = fixture.broadcast === true;

  if (!canSeeAll) {
    if (isBroadcast && !isPast) {
      // Sign-up is only offered when the fixture's gender matches the member's
      if (!memberMatchesFixtureGender(fixture.gender, memberGender)) {
        return (
          <span className="text-xs text-gray-400" title={`This fixture is open to ${fixture.gender} only`}>
            {fixtureGenderLabel(fixture.gender)}
          </span>
        );
      }
      return <FixtureInterestButton interested={iAmInterested} onToggle={onToggle} disabled={isPast} />;
    }
    return (
      <span className="text-xs text-gray-400">{isPast ? 'Closed' : 'Not open for sign-up'}</span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowList(true)}
        className="w-full min-h-[44px] rounded-lg px-2 py-1.5 -mx-2 text-left hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        title="See who wants to play"
      >
        <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
          {interests.length}
        </div>
        {interests.length > 0 && (
          <p className="text-xs text-gray-500 max-w-[14rem]">
            {interests.slice(0, 3).map(i => i.member_name).join(', ')}
            {interests.length > 3 ? ` +${interests.length - 3} more` : ''}
          </p>
        )}
        <span className={`mt-1 inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
          isBroadcast ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
        }`}>
          {isBroadcast ? 'Broadcasting' : 'Not broadcast'}
        </span>
      </button>

      <FixtureSignUpDialog
        open={showList}
        onOpenChange={setShowList}
        fixture={fixture}
        competitionName={competitionName}
        interests={interests}
      />
    </>
  );
}