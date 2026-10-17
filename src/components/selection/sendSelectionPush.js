import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default async function sendSelectionPush({ emails, competition, matchName, matchDate, clubId, selectionId }) {
  const recipients = [...new Set(emails.filter(Boolean))];
  if (!recipients.length) return;
  try {
    const { data } = await base44.functions.invoke('sendPushNotification', {
      userEmails: recipients,
      title: `Match Selection — ${competition}`,
      message: `You've been selected for ${competition}${matchName ? ' vs ' + matchName : ''} on ${format(new Date(matchDate), 'd MMMM yyyy')}`,
      url: `/SelectionView?clubId=${encodeURIComponent(clubId)}&selectionId=${encodeURIComponent(selectionId)}`,
    });
    if (data?.error) throw new Error(data.error);
    if (data?.results?.some(result => result.status === 'error')) {
      toast.warning('Selection published, but the push service rejected some notification requests.');
    }
  } catch (error) {
    toast.warning('Selection published, but push notifications could not be sent: ' + (error.response?.data?.error || error.message));
  }
}