import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { prospectId } = await req.json();
    if (!prospectId) {
      return Response.json({ error: 'Missing prospectId' }, { status: 400 });
    }

    const prospects = await base44.asServiceRole.entities.ProspectClub.filter({ id: prospectId });
    const prospect = prospects[0];
    if (!prospect) {
      return Response.json({ error: 'Prospect not found' }, { status: 404 });
    }

    if (!prospect.resend_email_id) {
      return Response.json({ error: 'No email sent yet for this prospect' }, { status: 400 });
    }

    const resendRes = await fetch(`https://api.resend.com/emails/${prospect.resend_email_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secrets.get('Resend_API')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error('Resend GET error:', errText);
      return Response.json({ error: `Resend error: ${errText}` }, { status: 502 });
    }

    const resendData = await resendRes.json();
    const lastEvent = resendData?.last_event || 'unknown';

    await base44.asServiceRole.entities.ProspectClub.update(prospectId, {
      email_status: lastEvent,
      email_status_checked_at: new Date().toISOString(),
    });

    return Response.json({ success: true, email_status: lastEvent });
  } catch (error) {
    console.error('refreshProspectEmailStatus error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}