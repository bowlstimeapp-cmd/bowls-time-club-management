import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { club_id, item_key, completed } = body;

    if (!club_id || !item_key) {
      return Response.json({ error: 'club_id and item_key are required' }, { status: 400 });
    }
    if (typeof completed !== 'boolean') {
      return Response.json({ error: 'completed must be a boolean' }, { status: 400 });
    }

    // Authorize: platform admin or an approved club admin for this club
    const isPlatformAdmin = user.role === 'admin';
    if (!isPlatformAdmin) {
      const memberships = await base44.entities.ClubMembership.filter({
        club_id: club_id,
        user_email: user.email
      });
      const membership = memberships[0];
      if (!membership || membership.role !== 'admin' || membership.status !== 'approved') {
        return Response.json({ error: 'Forbidden — you must be a club admin for this club' }, { status: 403 });
      }
    }

    // Use service role to bypass Club RLS (which only allows primary_admin_email or platform admin)
    const clubs = await base44.asServiceRole.entities.Club.filter({ id: club_id });
    const club = clubs[0];
    if (!club) {
      return Response.json({ error: 'Club not found' }, { status: 404 });
    }

    const currentItems = club.onboarding_completed_items || [];
    let updatedItems;

    if (completed) {
      if (currentItems.includes(item_key)) {
        return Response.json({ success: true, onboarding_completed_items: currentItems });
      }
      updatedItems = [...currentItems, item_key];
    } else {
      if (!currentItems.includes(item_key)) {
        return Response.json({ success: true, onboarding_completed_items: currentItems });
      }
      updatedItems = currentItems.filter(item => item !== item_key);
    }

    await base44.asServiceRole.entities.Club.update(club_id, { onboarding_completed_items: updatedItems });

    return Response.json({ success: true, onboarding_completed_items: updatedItems });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}