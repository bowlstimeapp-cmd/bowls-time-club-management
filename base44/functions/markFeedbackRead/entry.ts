import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Clears the unread flag for whoever is viewing the feedback thread.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const feedback_id = String(body?.feedback_id || '').trim();
    if (!feedback_id) return Response.json({ error: 'feedback_id is required' }, { status: 400 });

    const svc = base44.asServiceRole;
    const feedback = await svc.entities.Feedback.get(feedback_id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!feedback) return Response.json({ error: 'Feedback not found' }, { status: 404 });

    const isAdmin = user.role === 'admin';
    const isOwner = String(feedback.user_email || '').toLowerCase() === String(user.email || '').toLowerCase();
    if (!isAdmin && !isOwner) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const updates: Record<string, boolean> = {};
    if (isAdmin) updates.unread_by_admin = false;
    if (isOwner) updates.unread_by_user = false;

    if (Object.keys(updates).length > 0) {
      await svc.entities.Feedback.update(feedback_id, updates);
    }

    return Response.json({ success: true });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Something went wrong' }, { status: 500 });
  }
}