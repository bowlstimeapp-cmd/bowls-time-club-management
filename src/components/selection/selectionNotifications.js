import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';

// Notification helpers for publishing a selection — extracted from SelectionEditor.
// Reserves are passed in separately (reserveEntries) and are NEVER treated as
// players: they only receive notifications here.

export const buildFormattedTeamList = (selectionsObj, membersArr, namesObj = {}) => {
  const positionOrder = ['Lead', '2', '3', 'Skip'];
  const rinkMap = {};
  for (const [pos, email] of Object.entries(selectionsObj)) {
    if (!email) continue;
    const match = pos.match(/^rink(\d+)_(.+)$/);
    if (!match) continue;
    const rinkNum = parseInt(match[1]);
    const position = match[2];
    if (!rinkMap[rinkNum]) rinkMap[rinkNum] = {};
    const storedName = namesObj[pos];
    const member = membersArr.find((m) => m.user_email === email);
    rinkMap[rinkNum][position] = storedName || (member?.first_name && member?.surname ?
    `${member.first_name} ${member.surname}` :
    member?.user_name || email);
  }
  return Object.keys(rinkMap).
  sort((a, b) => parseInt(a) - parseInt(b)).
  map((rinkNum) => {
    const positions = rinkMap[rinkNum];
    const lines = [`Rink ${rinkNum}`];
    for (const pos of positionOrder) {
      if (positions[pos] !== undefined) lines.push(`${pos}: ${positions[pos]}`);
    }
    return lines.join('\n');
  }).
  join('\n\n');
};

/**
 * ctx: { club, clubId, user, competition, matchDate, matchName, matchStartTime,
 *        matchEndTime, selections, members, selectionNames, sendSmsEnabled }
 * reserveEntries: array of { slot, email, type: 'home'|'away' } — named reserves only.
 */
export async function sendSelectionEmails(ctx, savedSelectionId, reserveEntries = []) {
  const { club, clubId, user, competition, matchDate, matchName, matchStartTime, matchEndTime,
    selections, members, selectionNames, sendSmsEnabled } = ctx;

  const selectedPlayerEmails = [...new Set(Object.values(selections).filter(Boolean))];
  const reserveTypeMap = Object.fromEntries(reserveEntries.map((r) => [r.email, r.type]));
  const notifyEmails = [...selectedPlayerEmails, ...reserveEntries.map((r) => r.email)];

  const teamList = buildFormattedTeamList(selections, members, selectionNames);

  const matchUrl = `https://app.bowls-time.com${createPageUrl('SelectionView')}?clubId=${clubId}&selectionId=${savedSelectionId}`;

  if (club?.email_member_notifications) {
    const emailMembers = members.filter((m) =>
    notifyEmails.includes(m.user_email) &&
    m.email_notifications !== false
    );

    for (const member of emailMembers) {
      const reserveType = reserveTypeMap[member.user_email];
      const openingLine = reserveType === 'away'
        ? 'You have been selected as an away reserve for an upcoming match!'
        : reserveType === 'home'
          ? 'You have been selected as a home reserve for an upcoming match!'
          : 'You have been selected to play in an upcoming match!';

      const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#f4f4f4; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4; padding: 30px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background-color:#1a5276; padding: 24px 32px; text-align:center;">
              <h1 style="margin:0; color:#ffffff; font-size:22px; font-weight:600;">
                ${club?.name || 'Your Bowls Club'}
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; font-size:16px; color:#333;">
                Dear ${member.first_name || 'Member'},
              </p>
              <p style="margin: 0 0 24px; font-size:16px; color:#333;">
                ${openingLine}
              </p>

              <!-- Match Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f9fa; border-radius:6px; padding:20px; margin-bottom:24px;">
                <tr>
                  <td>
                    <h2 style="margin: 0 0 16px; font-size:16px; color:#1a5276; text-transform:uppercase; letter-spacing:0.5px;">Match Details</h2>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 4px 16px 4px 0; color:#666; font-size:14px; white-space:nowrap;">Competition</td>
                        <td style="padding: 4px 0; color:#333; font-size:14px; font-weight:600;">${competition}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 16px 4px 0; color:#666; font-size:14px; white-space:nowrap;">Date</td>
                        <td style="padding: 4px 0; color:#333; font-size:14px; font-weight:600;">${format(new Date(matchDate), 'd MMMM yyyy')}</td>
                      </tr>
                      ${matchName ? `
                      <tr>
                        <td style="padding: 4px 16px 4px 0; color:#666; font-size:14px; white-space:nowrap;">Match</td>
                        <td style="padding: 4px 0; color:#333; font-size:14px; font-weight:600;">${matchName}</td>
                      </tr>` : ''}
                      ${matchStartTime ? `
                      <tr>
                        <td style="padding: 4px 16px 4px 0; color:#666; font-size:14px; white-space:nowrap;">Time</td>
                        <td style="padding: 4px 0; color:#333; font-size:14px; font-weight:600;">${matchStartTime} – ${matchEndTime}</td>
                      </tr>` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Team Selection -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f9fa; border-radius:6px; padding:20px; margin-bottom:24px;">
                <tr>
                  <td>
                    <h2 style="margin: 0 0 12px; font-size:16px; color:#1a5276; text-transform:uppercase; letter-spacing:0.5px;">Team Selection</h2>
                    <p style="margin:0; font-size:14px; color:#333; white-space:pre-line; line-height:1.7;">${teamList}</p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${matchUrl}" style="display:inline-block; background-color:#1a5276; color:#ffffff; text-decoration:none; padding:12px 32px; border-radius:6px; font-size:15px; font-weight:600;">
                      Confirm Availability
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f4f4f4; padding:16px 32px; text-align:center; border-top:1px solid #e0e0e0;">
              <p style="margin:0; font-size:12px; color:#999;">
                ${club?.name || 'Your Bowls Club'}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

      const subject = reserveType
        ? `You have been selected as ${reserveType === 'away' ? 'an away' : 'a home'} reserve - ${competition}`
        : `Match Selection - ${competition} on ${format(new Date(matchDate), 'd MMMM yyyy')}`;
      try {
        await base44.integrations.Core.SendEmail({
          to: member.user_email,
          subject,
          body: emailBody
        });
      } catch (emailErr) {
        console.warn(`Skipped email to ${member.user_email}:`, emailErr.message);
        continue;
      }
      await base44.entities.EmailLog.create({
        club_id: clubId,
        club_name: club?.name || '',
        to_email: member.user_email,
        to_name: member.user_name || member.first_name || '',
        subject,
        type: 'selection',
        related_id: savedSelectionId,
        related_label: `${competition}${matchName ? ' vs ' + matchName : ''} on ${format(new Date(matchDate), 'd MMMM yyyy')}`,
        sent_by: user?.email || ''
      });
    }

    if (emailMembers.length > 0) {
      toast.success(`Emails sent to ${emailMembers.length} players`);
    }
  }

  // SMS notifications
  if (sendSmsEnabled) {
    return sendSmsToMembers(ctx, notifyEmails, reserveTypeMap);
  }
  return null;
}

/**
 * Post-publish summary list. Reserves carry a "Reserve (Home)"/"Reserve (Away)" label.
 */
export function buildFullPlayerList(ctx, emailList, smsResults, reserveTypeMap = {}) {
  const { members, sendSmsEnabled } = ctx;
  return emailList.map((email) => {
    const member = members.find((m) => m.user_email === email);
    const name = member?.first_name && member?.surname ?
    `${member.first_name} ${member.surname}` :
    member?.user_name || email;
    const reserveLabel = reserveTypeMap[email]
      ? (reserveTypeMap[email] === 'away' ? 'Reserve (Away)' : 'Reserve (Home)')
      : null;
    // If SMS was attempted, find the result
    const smsResult = smsResults?.find((r) => r.email === email);
    if (smsResult) return { ...smsResult, reserveLabel };
    // SMS not attempted — figure out why
    let smsSentStatus = null;
    if (!sendSmsEnabled) {
      smsSentStatus = { name, email, sent: false, reason: 'SMS notifications not enabled', reserveLabel };
    } else {
      smsSentStatus = { name, email, sent: false, reason: 'Not included in SMS batch', reserveLabel };
    }
    return smsSentStatus;
  });
}

export async function sendSmsToMembers(ctx, emailList, reserveTypeMap = {}) {
  const { clubId, competition, matchDate, matchName, matchStartTime } = ctx;
  const members = ctx.members;
  const results = [];

  // Categorise all selected members
  for (const email of emailList) {
    const member = members.find((m) => m.user_email === email);
    if (!member) continue;
    const name = member.first_name && member.surname ? `${member.first_name} ${member.surname}` : member.user_name || email;

    if (!member.sms_notifications) {
      results.push({ name, email, sent: false, reason: 'Not opted into SMS notifications' });
      continue;
    }
    if (!member.phone) {
      results.push({ name, email, sent: false, reason: 'No phone number registered' });
      continue;
    }
    if (!member.phone.replace(/\s/g, '').startsWith('07')) {
      results.push({ name, email, sent: false, reason: 'Invalid mobile number (must start with 07)' });
      continue;
    }

    const isReserveSms = reserveTypeMap[email];
    const smsMessage = isReserveSms
      ? `You've been selected as ${isReserveSms === 'away' ? 'an away' : 'a home'} reserve for ${competition}${matchName ? ' vs ' + matchName : ''} on ${format(new Date(matchDate), 'd MMMM yyyy')}${matchStartTime ? ` at ${matchStartTime}` : ''}. View details at app.bowls-time.com`
      : `You've been selected for ${competition}${matchName ? ' vs ' + matchName : ''} on ${format(new Date(matchDate), 'd MMMM yyyy')}${matchStartTime ? ` at ${matchStartTime}` : ''}. View details at app.bowls-time.com`;

    try {
      const result = await base44.functions.invoke('sendSMS', {
        to: member.phone,
        message: smsMessage,
        clubId
      });
      if (result?.data?.blocked) {
        results.push({ name, email, sent: false, reason: 'Monthly SMS allowance exceeded' });
      } else if (result?.data?.success) {
        results.push({ name, email, sent: true });
      } else {
        results.push({ name, email, sent: false, reason: 'Send failed' });
      }
    } catch (error) {
      results.push({ name, email, sent: false, reason: 'Send failed' });
    }
  }

  return results;
}