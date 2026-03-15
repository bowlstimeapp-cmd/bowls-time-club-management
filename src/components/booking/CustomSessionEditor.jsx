import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, AlertCircle, ChevronUp, ChevronDown } from 'lucide-react';

const timeToMinutes = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

const minutesToTime = (m) => {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
};

// Generate time options in 15-minute increments
const generateTimeOptions = () => {
  const opts = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      opts.push(minutesToTime(h * 60 + m));
    }
  }
  return opts;
};

const TIME_OPTIONS = generateTimeOptions();

export default function CustomSessionEditor({ sessions, onChange, openingTime = '08:00', closingTime = '23:00' }) {
  const openMins = timeToMinutes(openingTime);
  const closeMins = timeToMinutes(closingTime);

  const addSession = () => {
    if (sessions.length === 0) {
      onChange([{ start: openingTime, end: minutesToTime(openMins + 120) }]);
      return;
    }
    const last = sessions[sessions.length - 1];
    const newStart = last.end;
    const newEndMins = Math.min(timeToMinutes(newStart) + 120, closeMins);
    onChange([...sessions, { start: newStart, end: minutesToTime(newEndMins) }]);
  };

  const removeSession = (i) => {
    onChange(sessions.filter((_, idx) => idx !== i));
  };

  const moveSession = (i, direction) => {
    const newSessions = [...sessions];
    const target = i + direction;
    if (target < 0 || target >= newSessions.length) return;
    [newSessions[i], newSessions[target]] = [newSessions[target], newSessions[i]];
    onChange(newSessions);
  };

  const updateSession = (i, field, value) => {
    const updated = sessions.map((s, idx) => idx === i ? { ...s, [field]: value } : s);
    onChange(updated);
  };

  const getErrors = () => {
    const errors = [];
    sessions.forEach((s, i) => {
      const startMins = timeToMinutes(s.start);
      const endMins = timeToMinutes(s.end);
      if (endMins <= startMins) errors.push(`Session ${i + 1}: end must be after start`);
      if (startMins < openMins) errors.push(`Session ${i + 1}: starts before opening time`);
      if (endMins > closeMins) errors.push(`Session ${i + 1}: ends after closing time`);
      // Check overlap with other sessions
      sessions.forEach((other, j) => {
        if (j <= i) return;
        const oStart = timeToMinutes(other.start);
        const oEnd = timeToMinutes(other.end);
        if (startMins < oEnd && endMins > oStart) {
          errors.push(`Sessions ${i + 1} and ${j + 1} overlap`);
        }
      });
    });
    return errors;
  };

  const errors = getErrors();
  const filteredOptions = TIME_OPTIONS.filter(t => {
    const m = timeToMinutes(t);
    return m >= openMins && m <= closeMins;
  });

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {sessions.map((session, i) => (
          <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
            <span className="text-xs text-gray-500 w-6 text-center">{i + 1}</span>
            <select
              value={session.start}
              onChange={(e) => updateSession(i, 'start', e.target.value)}
              className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-sm"
            >
              {filteredOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <span className="text-gray-400 text-sm">→</span>
            <select
              value={session.end}
              onChange={(e) => updateSession(i, 'end', e.target.value)}
              className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-sm"
            >
              {filteredOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button
              type="button"
              onClick={() => removeSession(i)}
              className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {errors.length > 0 && (
        <div className="space-y-1">
          {errors.map((err, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-red-600">
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
              {err}
            </div>
          ))}
        </div>
      )}

      <Button type="button" variant="outline" size="sm" onClick={addSession} className="w-full border-dashed">
        <Plus className="w-4 h-4 mr-2" />
        Add Session
      </Button>
    </div>
  );
}