import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * Secure backend function for creating a new club (Platform Admin workflow).
 *
 * Replaces the frontend flow in PlatformAdmin.jsx that created the Club and the
 * founding admin ClubMembership directly via the entity SDK. Both records are now
 * created here so the frontend no longer writes the membership directly.
 *
 * Flow:
 *   1. Verify the caller is authenticated (and is a platform admin — Club create
 *      RLS requires role=admin, and this is the platform-admin club-creation
 *      flow).
 *   2. Create the club from the supplied clubData (admin_first_name / admin_surname
 *      are extracted first since they belong to the membership, not the club).
 *   3. Create the founding admin ClubMembership with role='admin', status='approved'.
 *   4. Return the created club.
 */
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: platform admin required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));

    // admin_first_name / admin_surname are membership fields, not club fields.
    const { admin_first_name, admin_surname, ...clubFields } = body;

    if (!clubFields.name || !clubFields.name.trim()) {
      return Response.json({ error: 'Club name is required' }, { status: 400 });
    }
    if (!clubFields.primary_admin_email) {
      return Response.json({ error: 'Primary admin email is required' }, { status: 400 });
    }

    // 2. Create the club.
    const club = await base44.asServiceRole.entities.Club.create(clubFields);

    // 3. Create the founding admin membership (role=admin, status=approved).
    const adminName = admin_first_name && admin_surname
      ? `${admin_first_name} ${admin_surname}`
      : clubFields.primary_admin_email;

    await base44.asServiceRole.entities.ClubMembership.create({
      club_id: club.id,
      user_email: clubFields.primary_admin_email,
      user_name: adminName,
      first_name: admin_first_name || '',
      surname: admin_surname || '',
      role: 'admin',
      status: 'approved',
    });

    // 4. Return the created club.
    return Response.json({ success: true, club });
  } catch (error) {
    console.error('createClub error:', error);
    return Response.json({ error: error.message || 'Failed to create club' }, { status: 500 });
  }
}