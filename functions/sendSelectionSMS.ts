import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { format } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { event, data } = await req.json();
    
    // Only process when status is 'published'
    if (!data || data.status !== 'published') {
      return Response.json({ message: 'Selection not published, skipping SMS' });
    }

    const selectionId = event.entity_id;
    const clubId = data.club_id;
    
    // Get club details
    const clubs = await base44.asServiceRole.entities.Club.filter({ id: clubId });
    const club = clubs[0];
    
    // Check if SMS module is enabled
    if (!club?.module_sms_notifications || !club?.sms_member_notifications) {
      return Response.json({ message: 'SMS notifications not enabled for club' });
    }
    
    // Get all club members
    const members = await base44.asServiceRole.entities.ClubMembership.filter({ 
      club_id: clubId,
      status: 'approved'
    });
    
    // Get selected player emails from selections object
    const selectedEmails = Object.values(data.selections || {}).filter(Boolean);
    
    if (selectedEmails.length === 0) {
      return Response.json({ message: 'No players selected' });
    }
    
    // Filter members who are selected and have SMS enabled with phone number
    const smsMembers = members.filter(m => 
      selectedEmails.includes(m.user_email) &&
      m.sms_notifications === true &&
      m.phone
    );
    
    if (smsMembers.length === 0) {
      return Response.json({ message: 'No members with SMS notifications enabled' });
    }
    
    // Twilio credentials
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');
    
    if (!accountSid || !authToken || !fromNumber) {
      return Response.json({ error: 'Twilio credentials not configured' }, { status: 500 });
    }
    
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    // Format the match date
    const matchDate = format(new Date(data.match_date), 'd MMMM yyyy');
    
    let sentCount = 0;
    let failedCount = 0;
    
    // Send SMS to each member
    for (const member of smsMembers) {
      const message = `Hi ${member.first_name || 'there'}, you've been selected for ${data.competition} on ${matchDate}. Please visit app.bowls-time.com to confirm your availability`;
      
      const body = new URLSearchParams({
        To: member.phone,
        From: fromNumber,
        Body: message
      });
      
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: body.toString()
        });
        
const result = await response.json();

if (response.ok) {
  sentCount++;
} else {
  failedCount++;
  console.error(`Twilio error for ${member.phone}:`, result);
}
      } catch (error) {
        failedCount++;
        console.error(`Error sending SMS to ${member.phone}:`, error);
      }
    }
    
    return Response.json({ 
      success: true,
      sent: sentCount,
      failed: failedCount,
      message: `SMS sent to ${sentCount} members${failedCount > 0 ? `, ${failedCount} failed` : ''}`
    });

  } catch (error) {
    console.error('Error in sendSelectionSMS:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});