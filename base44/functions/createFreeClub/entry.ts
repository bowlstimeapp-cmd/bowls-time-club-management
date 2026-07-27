import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { name, rink_count, opening_time, closing_time } = body;

    if (!name || !name.trim()) {
      return Response.json({ error: 'Club name is required' }, { status: 400 });
    }

    // Verify the user has NO existing club memberships (self-serve free trial only for new users)
    const existingMemberships = await base44.asServiceRole.entities.ClubMembership.filter({
      user_email: user.email,
    });
    if (existingMemberships.length > 0) {
      return Response.json({ error: 'You are already a member of a club. Free club creation is only available for users with no existing memberships.' }, { status: 403 });
    }

    // Generate slug from name with collision retry
    const baseSlug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    let slug = baseSlug;
    let suffix = 1;
    let slugOk = false;
    while (!slugOk) {
      const existing = await base44.asServiceRole.entities.Club.filter({ slug });
      if (existing.length === 0) {
        slugOk = true;
      } else {
        slug = `${baseSlug}-${suffix}`;
        suffix++;
      }
    }

    // Create the Club with all modules locked (free tier)
    const club = await base44.asServiceRole.entities.Club.create({
      name: name.trim(),
      slug,
      rink_count: rink_count || 6,
      opening_time: opening_time || '10:00',
      closing_time: closing_time || '21:00',
      primary_admin_email: user.email,
      is_active: true,
      club_tier: 'free',
      module_rink_booking: true,
      module_selection: false,
      module_competitions: false,
      module_leagues: false,
      module_sms_notifications: false,
      module_homepage: false,
      module_function_rooms: false,
      module_custom_branding: false,
      module_accolades: false,
      module_messaging: false,
    });

    const adminName = user.first_name && user.surname
      ? `${user.first_name} ${user.surname}`
      : user.full_name || user.email;

    // Create the founding admin membership
    await base44.asServiceRole.entities.ClubMembership.create({
      club_id: club.id,
      user_email: user.email,
      user_name: adminName,
      first_name: user.first_name || '',
      surname: user.surname || '',
      title: user.title || null,
      phone: user.phone || null,
      gender: user.gender || null,
      emergency_contact_name: user.emergency_contact_name || null,
      emergency_contact_phone: user.emergency_contact_phone || null,
      role: 'admin',
      status: 'approved',
      member_status: 'active',
    });

    // Create the Bowls Time Support admin membership
    await base44.asServiceRole.entities.ClubMembership.create({
      club_id: club.id,
      user_email: 'bowlstimeapp@gmail.com',
      user_name: 'Bowls Time Support',
      role: 'admin',
      status: 'approved',
      member_status: 'active',
    });

    return Response.json({ success: true, club });
  } catch (error) {
    console.error('createFreeClub error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}