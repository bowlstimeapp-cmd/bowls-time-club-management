import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ---------------------------------------------------------------------------
// Auth helpers (inlined — no local imports in Deno Deploy)
// ---------------------------------------------------------------------------

function isPlatformAdmin(user) { return user?.role === 'admin'; }

async function getClubMembership(base44, userEmail, clubId) {
  const results = await base44.asServiceRole.entities.ClubMembership.filter({
    club_id: clubId, user_email: userEmail, status: 'approved',
  });
  return results[0] || null;
}

// ---------------------------------------------------------------------------

/**
 * Secure backend function for updating Club settings.
 * 
 * Authorization: caller must be an approved club admin (ClubMembership.role === 'admin')
 *               OR a platform admin (Users.role === 'admin').
 * 
 * Platform-only fields (module_* toggles, sms_monthly_allowance) are excluded
 * from the club-admin whitelist and can only be changed by platform admins.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { clubId, updates } = await req.json();

    if (!clubId || !updates) {
      return Response.json({ error: 'Missing required fields: clubId, updates' }, { status: 400 });
    }

    const platform = isPlatformAdmin(user);
    if (!platform) {
      const membership = await getClubMembership(base44, user.email, clubId);
      if (!membership || membership.role !== 'admin') {
        return Response.json({ error: 'Forbidden: must be a club admin' }, { status: 403 });
      }
    }

    // Fields a club admin can update
    const clubAdminFields = [
      'name', 'description', 'logo_url', 'rink_count',
      'opening_time', 'closing_time', 'session_duration',
      'use_custom_sessions', 'custom_sessions',
      'auto_approve_bookings', 'open_rollups', 'private_rollups',
      'email_member_notifications', 'sms_member_notifications',
      'membership_types', 'default_landing_page',
      'membership_fee_enabled', 'membership_fee_amount_pence', 'membership_fee_description',
      'stripe_publishable_key', 'stripe_secret_key',
      'tv_display_cycle_seconds', 'alt_view_selection', 'alt_view_leagues',
      'scorecard_format', 'use_custom_scorecard_layout',
      'kiosk_mode_enabled', 'kiosk_account_email',
      'competition_registration_enabled', 'competition_page_header',
      'club_theme', 'function_room_api_key',
      'team_sheet_template', 'team_sheet_primary_colour', 'team_sheet_font_size',
      'team_sheet_show_dress_code', 'team_sheet_show_venue', 'team_sheet_show_start_time',
      'team_sheet_advanced_mode', 'team_sheet_custom_html', 'team_sheet_header_img_url',
      'league_table_template', 'league_table_primary_colour', 'league_table_font_size',
      'league_table_show_accurate_as_of', 'league_table_show_session_time',
      'league_table_show_league_dates', 'league_table_show_footer',
      'league_table_footer_text', 'league_table_advanced_mode',
      'league_table_custom_html', 'league_table_header_img_url',
      'selection_competition_colours',
    ];

    // Platform admins can also update module toggles and allowances
    const platformOnlyFields = [
      'module_rink_booking', 'module_selection', 'module_competitions',
      'module_leagues', 'module_sms_notifications', 'module_homepage',
      'module_function_rooms', 'module_custom_branding', 'module_accolades',
      'module_messaging', 'sms_monthly_allowance', 'is_active',
    ];

    const allowedFields = platform ? [...clubAdminFields, ...platformOnlyFields] : clubAdminFields;

    const safeUpdates = {};
    for (const field of allowedFields) {
      if (field in updates) safeUpdates[field] = updates[field];
    }

    if (Object.keys(safeUpdates).length === 0) {
      return Response.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    await base44.asServiceRole.entities.Club.update(clubId, safeUpdates);
    return Response.json({ success: true });

  } catch (error) {
    console.error('updateClubSettings error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});