import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to, message, clubId } = await req.json();

    if (!to || !message) {
      return Response.json({ error: 'Missing required fields: to, message' }, { status: 400 });
    }

    // If clubId provided, check & enforce monthly allowance
    if (clubId) {
      const clubs = await base44.asServiceRole.entities.Club.filter({ id: clubId });
      const club = clubs[0];

      if (club?.sms_monthly_allowance != null) {
        const now = new Date();
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        const usageRecords = await base44.asServiceRole.entities.SmsUsage.filter({
          club_id: clubId,
          month_key: monthKey
        });
        const usageRecord = usageRecords[0];
        const currentCount = usageRecord?.sent_count || 0;

        if (currentCount >= club.sms_monthly_allowance) {
          console.log(`SMS blocked for club ${clubId}: allowance ${club.sms_monthly_allowance} reached (${currentCount} sent)`);
          return Response.json({
            success: false,
            blocked: true,
            message: 'Monthly SMS allowance exceeded'
          });
        }
      }
    }

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!accountSid || !authToken || !fromNumber) {
      return Response.json({ error: 'Twilio credentials not configured' }, { status: 500 });
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const body = new URLSearchParams({
      To: to,
      From: fromNumber,
      Body: message
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Twilio error:', data);
      return Response.json({
        error: 'Failed to send SMS',
        details: data.message || 'Unknown error'
      }, { status: 500 });
    }

    // Increment usage counter
    if (clubId) {
      const now = new Date();
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const clubs = await base44.asServiceRole.entities.Club.filter({ id: clubId });
      const club = clubs[0];

      const usageRecords = await base44.asServiceRole.entities.SmsUsage.filter({
        club_id: clubId,
        month_key: monthKey
      });
      const usageRecord = usageRecords[0];

      if (usageRecord) {
        await base44.asServiceRole.entities.SmsUsage.update(usageRecord.id, {
          sent_count: (usageRecord.sent_count || 0) + 1,
          allowance: club?.sms_monthly_allowance ?? usageRecord.allowance
        });
      } else {
        await base44.asServiceRole.entities.SmsUsage.create({
          club_id: clubId,
          club_name: club?.name || '',
          month_key: monthKey,
          sent_count: 1,
          allowance: club?.sms_monthly_allowance ?? null
        });
      }
    }

    return Response.json({
      success: true,
      messageSid: data.sid,
      status: data.status
    });

  } catch (error) {
    console.error('Error sending SMS:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});