// Re-export shared county auth helpers for backwards compatibility.
// The canonical implementations live in base44/shared/countyAuth.ts.
export {
  isPlatformAdmin,
  getCountyMembership,
  hasCountyRole,
  isPlatformAdminOrHasRole,
  isApprovedCountyMember,
  requireCountyRole,
} from '../../shared/countyAuth.ts';