export const STATUS_CONFIG = {
  new_enquiry:       { label: 'New Enquiry',       className: 'bg-blue-100 text-blue-700 border-blue-200',   dotColor: 'bg-blue-500' },
  pending:           { label: 'New Enquiry',        className: 'bg-blue-100 text-blue-700 border-blue-200',   dotColor: 'bg-blue-500' },
  contacted:         { label: 'Contacted',          className: 'bg-amber-100 text-amber-700 border-amber-200', dotColor: 'bg-amber-500' },
  awaiting_response: { label: 'Awaiting Response',  className: 'bg-orange-100 text-orange-700 border-orange-200', dotColor: 'bg-orange-500' },
  provisional_hold:  { label: 'Provisional Hold',   className: 'bg-purple-100 text-purple-700 border-purple-200', dotColor: 'bg-purple-500' },
  confirmed:         { label: 'Confirmed',          className: 'bg-emerald-100 text-emerald-700 border-emerald-200', dotColor: 'bg-emerald-500' },
  approved:          { label: 'Confirmed',          className: 'bg-emerald-100 text-emerald-700 border-emerald-200', dotColor: 'bg-emerald-500' },
  rejected:          { label: 'Rejected',           className: 'bg-red-100 text-red-700 border-red-200',       dotColor: 'bg-red-400' },
  cancelled:         { label: 'Cancelled',          className: 'bg-gray-100 text-gray-600 border-gray-200',   dotColor: 'bg-gray-400' },
  completed:         { label: 'Completed',          className: 'bg-slate-100 text-slate-700 border-slate-200', dotColor: 'bg-slate-500' },
};

export const PIPELINE_STATUSES = [
  'new_enquiry', 'contacted', 'awaiting_response', 'provisional_hold',
  'confirmed', 'rejected', 'cancelled', 'completed',
];

export const CLOSED_STATUSES = ['rejected', 'cancelled', 'completed'];

export function toMinutes(time) {
  if (!time) return 0;
  const [h, m] = (time + ':00').split(':').map(Number);
  return h * 60 + m;
}

export function bookingsConflict(a, b) {
  if (a.id === b.id) return false;
  if (a.room_id !== b.room_id || a.date !== b.date) return false;
  if (CLOSED_STATUSES.includes(a.status) || CLOSED_STATUSES.includes(b.status)) return false;
  return toMinutes(a.start_time) < toMinutes(b.end_time) && toMinutes(b.start_time) < toMinutes(a.end_time);
}

export function getConflicts(booking, allBookings) {
  return allBookings.filter(b => bookingsConflict(booking, b));
}

export function addTimestampedNote(existing, newNote, staffName) {
  const timestamp = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const entry = `[${timestamp}${staffName ? ' – ' + staffName : ''}]: ${newNote}`;
  return existing ? `${entry}\n\n${existing}` : entry;
}