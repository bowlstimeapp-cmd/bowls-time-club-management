/**
 * Membership type utilities.
 *
 * membership_types on the Club entity is stored as an array of objects:
 *   { name: string, parent: 'Winter Indoor' | 'Summer Indoor' | 'Outdoor Member' | 'Social Member' }
 *
 * Legacy clubs may have a flat string array — this module handles both.
 */

export const PARENT_TYPES = [
  'Winter Indoor',
  'Summer Indoor',
  'Outdoor Member',
  'Social Member',
];

/** Return true if the given membership type (string label) resolves to a Social Member */
export function isSocialType(typeName, membershipTypesDefs) {
  if (!typeName || !Array.isArray(membershipTypesDefs)) return false;
  const def = membershipTypesDefs.find(t =>
    typeof t === 'object' ? t.name === typeName : t === typeName
  );
  if (!def) return false;
  // Legacy string entry — treat as-is (not social)
  if (typeof def === 'string') return false;
  return def.parent === 'Social Member';
}

/**
 * Given a ClubMembership record and the club's membership_types array,
 * return true if ALL of the member's membership_groups map to Social Member.
 * Members with no groups are NOT considered social.
 */
export function isMemberSocialOnly(membership, membershipTypesDefs) {
  const groups = membership?.membership_groups;
  if (!Array.isArray(groups) || groups.length === 0) return false;
  return groups.every(g => isSocialType(g, membershipTypesDefs));
}

/**
 * Filter out social-only members from a members array.
 * Used in Selection and League dropdowns.
 */
export function filterOutSocialMembers(members, membershipTypesDefs) {
  if (!Array.isArray(membershipTypesDefs) || membershipTypesDefs.length === 0) return members;
  return members.filter(m => !isMemberSocialOnly(m, membershipTypesDefs));
}

/**
 * Normalise membership_types from either legacy string[] or object[] format
 * into a consistent object[] format.
 */
export function normaliseMembershipTypes(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map(item => {
    if (typeof item === 'string') {
      // Attempt to guess parent from legacy label
      let parent = 'Winter Indoor';
      const lower = item.toLowerCase();
      if (lower.includes('summer')) parent = 'Summer Indoor';
      else if (lower.includes('outdoor')) parent = 'Outdoor Member';
      else if (lower.includes('social')) parent = 'Social Member';
      return { name: item, parent };
    }
    return item;
  });
}