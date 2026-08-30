import { base44 } from '@/api/base44Client';

export const ONBOARDING_ITEMS = [
  { key: "tour", label: "Take the Bowls Time Tour", description: "Follow the guided tour to learn how to book rinks and navigate the app.", icon: "PlayCircle", auto: true, page: null },
  { key: "settings", label: "Customise Club Settings", description: "Configure your club's rinks, sessions, modules, and preferences.", icon: "Settings", auto: true, page: "ClubSettings" },
  { key: "members", label: "Add Club Members", description: "Invite or approve members so they can start booking rinks and using the app.", icon: "Users", auto: true, page: "ClubAdmin" },
  { key: "officers", label: "Add Club Officers", description: "Add officer cards (President, Treasurer, Secretary, etc.) to your club's officer page.", icon: "Shield", auto: true, page: "ClubOfficers" },
  { key: "help", label: "Explore the Help Centre", description: "Browse user guides and admin guides for step-by-step instructions.", icon: "LifeBuoy", auto: false, page: "HelpCentre" },
];

/**
 * Fire-and-forget helper that marks an onboarding checklist item as complete
 * for the given club. Never throws — safe to call from any UI hook.
 */
export function markOnboardingComplete(clubId, itemKey) {
  if (!clubId || !itemKey) return;
  base44.functions.invoke('updateOnboardingProgress', { club_id: clubId, item_key: itemKey, completed: true })
    .catch(() => {});
}