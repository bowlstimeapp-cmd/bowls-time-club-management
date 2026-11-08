import { base44 } from '@/api/base44Client';

// Elevated club roles (ClubMembership.role). 'member' means no elevated role.
export const ROLE_LABELS = {
  admin: 'Admin',
  secretary: 'Secretary',
  selector: 'Selector',
  live_scorer: 'Live Scorer',
  steward: 'Steward',
  member: 'Member',
};

export const roleLabel = (role) => ROLE_LABELS[role] || ROLE_LABELS.member;

export const memberDisplayName = (member) =>
  (member?.first_name && member?.surname
    ? `${member.first_name} ${member.surname}`
    : member?.user_name || member?.user_email || '') || '';

const errorMessage = (e, fallback) =>
  e?.response?.data?.error || e?.data?.error || e?.message || fallback;

/**
 * Changes a member's club role through the backend function, then writes an
 * AuditLog entry — the same pattern ClubAdmin uses in handleUpdateMember.
 * Only the backend may change ClubMembership.role; never write it directly.
 */
export async function changeClubRole({ membership, newRole, clubId, performedBy }) {
  const oldValue = membership?.role || 'member';

  try {
    await base44.functions.invoke('changeMemberRole', { membershipId: membership.id, newRole });
  } catch (e) {
    throw new Error(errorMessage(e, 'Failed to change role'));
  }

  await base44.functions.invoke('updateClubData', {
    entity: 'AuditLog',
    action: 'create',
    clubId,
    data: {
      club_id: clubId,
      action: 'role_change',
      target_email: membership.user_email,
      target_name: memberDisplayName(membership),
      performed_by_email: performedBy?.email || '',
      performed_by_name:
        performedBy?.first_name && performedBy?.surname
          ? `${performedBy.first_name} ${performedBy.surname}`
          : performedBy?.full_name || performedBy?.email || '',
      old_value: oldValue,
      new_value: newRole,
      details: `Role changed from ${oldValue} to ${newRole}`,
    },
  });
}