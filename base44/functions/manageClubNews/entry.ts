import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, club_id, post_id, data } = await req.json();

    // Verify the caller is a club admin
    const memberships = await base44.asServiceRole.entities.ClubMembership.filter({
      club_id,
      user_email: user.email,
      status: 'approved',
    });
    const membership = memberships[0];
    if (!membership || membership.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (action === 'list') {
      const posts = await base44.asServiceRole.entities.ClubPost.filter({ club_id, type: 'news' });
      posts.sort((a, b) => (b.created_date || '').localeCompare(a.created_date || ''));
      return Response.json({ posts });
    }

    if (action === 'create') {
      const post = await base44.asServiceRole.entities.ClubPost.create({ ...data, club_id, type: 'news' });
      return Response.json({ post });
    }

    if (action === 'update') {
      const post = await base44.asServiceRole.entities.ClubPost.update(post_id, data);
      return Response.json({ post });
    }

    if (action === 'delete') {
      await base44.asServiceRole.entities.ClubPost.delete(post_id);
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});