import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * Secure backend function for creating a new County (Platform Admin workflow).
 *
 * Mirrors createClub: creates the County record and seeds the founding
 * CountyMembership (role=admin, status=approved) for primary_admin_email.
 *
 * Flow:
 *   1. Verify the caller is an authenticated platform admin.
 *   2. Create the county from the supplied countyData (admin_first_name /
 *      admin_surname extracted first since they belong to the membership).
 *   3. Create the founding admin CountyMembership with role='admin', status='approved'.
 *   4. Return the created county.
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

    const { admin_first_name, admin_surname, ...countyFields } = body;

    if (!countyFields.name || !countyFields.name.trim()) {
      return Response.json({ error: 'County name is required' }, { status: 400 });
    }
    if (!countyFields.primary_admin_email) {
      return Response.json({ error: 'Primary admin email is required' }, { status: 400 });
    }

    // 2. Create the county.
    const county = await base44.asServiceRole.entities.County.create(countyFields);

    // 3. Create the founding admin membership (role=admin, status=approved).
    const adminName = admin_first_name && admin_surname
      ? `${admin_first_name} ${admin_surname}`
      : countyFields.primary_admin_email;

    await base44.asServiceRole.entities.CountyMembership.create({
      county_id: county.id,
      user_email: countyFields.primary_admin_email,
      user_name: adminName,
      role: 'admin',
      status: 'approved',
      joined_date: new Date().toISOString().split('T')[0],
    });

    // 4. Return the created county.
    return Response.json({ success: true, county });
  } catch (error) {
    console.error('createCounty error:', error);
    return Response.json({ error: error.message || 'Failed to create county' }, { status: 500 });
  }
}