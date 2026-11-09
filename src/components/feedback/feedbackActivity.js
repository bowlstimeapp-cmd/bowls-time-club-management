import { format } from 'date-fns';

/** Date used for ordering and activity labels. */
export const lastActivityDate = (feedback) => {
  const raw = feedback?.last_message_at || feedback?.updated_date || feedback?.created_date;
  return raw ? new Date(raw) : null;
};

/** "9 Nov, 14:32" — UK friendly, used on each message. */
export const formatMessageTime = (value) => {
  if (!value) return '';
  try {
    return format(new Date(value), 'd MMM, HH:mm');
  } catch {
    return '';
  }
};

const relative = (date) => {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return format(date, 'd MMM yyyy');
};

/** "Martin replied 2h ago" / "You replied 3d ago" for the admin table. */
export const activityLabel = (feedback) => {
  const date = lastActivityDate(feedback);
  if (!date) return '';
  if (!feedback?.last_message_by) return format(date, 'd MMM yyyy');
  if (feedback.last_message_by === 'user') {
    return `${feedback.user_name || 'User'} replied ${relative(date)}`;
  }
  return `You replied ${relative(date)}`;
};

export const sortByActivity = (list = []) =>
  [...list].sort((a, b) => (lastActivityDate(b)?.getTime() || 0) - (lastActivityDate(a)?.getTime() || 0));

export const adminHasReplied = (feedback) =>
  feedback?.last_message_by === 'admin' || !!feedback?.admin_response;

/** True when the last word was the user's, or no admin has ever replied. */
export const needsReply = (feedback) =>
  feedback?.last_message_by === 'user' || !adminHasReplied(feedback);