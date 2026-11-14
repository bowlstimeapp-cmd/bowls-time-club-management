import React, { useState } from 'react';
import SectionShell from './SectionShell';
import SiteButton from '../SiteButton';

export function CommitteeSection({ content }) {
  const people = Array.isArray(content.people) ? content.people : [];
  return (
    <SectionShell heading={content.heading}>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {people.map((person, index) => (
          <div
            key={`${person.name}-${index}`}
            className="flex gap-4 border bg-white p-5"
            style={{ borderRadius: 'var(--ws-radius)', borderColor: 'rgba(0,0,0,0.1)' }}
          >
            {person.photo && (
              <img
                src={person.photo}
                alt={person.name}
                className="h-16 w-16 shrink-0 rounded-full object-cover"
              />
            )}
            <div className="min-w-0">
              <div className="text-sm font-semibold" style={{ color: 'var(--ws-text)' }}>{person.name}</div>
              {person.role && <div className="text-xs font-medium" style={{ color: 'var(--ws-primary)' }}>{person.role}</div>}
              {person.bio && <p className="mt-2 text-xs opacity-75" style={{ color: 'var(--ws-text)' }}>{person.bio}</p>}
              {person.email && (
                <a href={`mailto:${person.email}`} className="mt-2 block truncate text-xs underline" style={{ color: 'var(--ws-primary)' }}>
                  {person.email}
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

export function MembershipCtaSection({ content, siteSlug }) {
  const fees = Array.isArray(content.fees) ? content.fees : [];
  return (
    <SectionShell heading={content.heading} intro={content.text} tinted>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fees.map((fee, index) => (
          <div
            key={`${fee.label}-${index}`}
            className="border bg-white p-6"
            style={{ borderRadius: 'var(--ws-radius)', borderColor: 'rgba(0,0,0,0.1)' }}
          >
            <div className="text-sm font-semibold uppercase tracking-wide opacity-70" style={{ color: 'var(--ws-text)' }}>
              {fee.label}
            </div>
            {fee.price && (
              <div className="mt-2 text-2xl font-bold" style={{ color: 'var(--ws-primary)', fontFamily: 'var(--ws-font-heading)' }}>
                {fee.price}
              </div>
            )}
            {fee.description && <p className="mt-3 text-sm opacity-75" style={{ color: 'var(--ws-text)' }}>{fee.description}</p>}
          </div>
        ))}
      </div>
      {content.button?.label && (
        <div className="mt-6">
          <SiteButton label={content.button.label} link={content.button.link} siteSlug={siteSlug} />
        </div>
      )}
    </SectionShell>
  );
}

export function ContactSection({ content }) {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const recipient = content.form_recipient_email || content.email || '';

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!recipient) return;
    const subject = encodeURIComponent(`Website enquiry from ${form.name || 'a visitor'}`);
    const body = encodeURIComponent(`${form.message}\n\n${form.name}${form.email ? ` (${form.email})` : ''}`);
    window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
  };

  return (
    <SectionShell heading={content.heading}>
      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-3 text-sm" style={{ color: 'var(--ws-text)' }}>
          {content.address && <p className="whitespace-pre-line opacity-80">{content.address}</p>}
          {content.phone && (
            <p>
              <a href={`tel:${String(content.phone).replace(/\s+/g, '')}`} className="font-medium" style={{ color: 'var(--ws-primary)' }}>
                {content.phone}
              </a>
            </p>
          )}
          {content.email && (
            <p>
              <a href={`mailto:${content.email}`} className="font-medium" style={{ color: 'var(--ws-primary)' }}>
                {content.email}
              </a>
            </p>
          )}
          {content.map_embed_url && (
            <div className="aspect-video w-full overflow-hidden" style={{ borderRadius: 'var(--ws-radius)' }}>
              <iframe
                src={content.map_embed_url}
                title="Map"
                className="h-full w-full"
                frameBorder="0"
                loading="lazy"
                allowFullScreen
              />
            </div>
          )}
        </div>

        {content.show_form && recipient ? (
          <form
            onSubmit={handleSubmit}
            className="space-y-3 border bg-white p-5"
            style={{ borderRadius: 'var(--ws-radius)', borderColor: 'rgba(0,0,0,0.1)' }}
          >
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide opacity-70" style={{ color: 'var(--ws-text)' }} htmlFor="ws-name">
                Your name
              </label>
              <input
                id="ws-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="mt-1 w-full border px-3 py-2 text-sm"
                style={{ borderRadius: 'var(--ws-radius)', borderColor: 'rgba(0,0,0,0.15)' }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide opacity-70" style={{ color: 'var(--ws-text)' }} htmlFor="ws-email">
                Your email
              </label>
              <input
                id="ws-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="mt-1 w-full border px-3 py-2 text-sm"
                style={{ borderRadius: 'var(--ws-radius)', borderColor: 'rgba(0,0,0,0.15)' }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide opacity-70" style={{ color: 'var(--ws-text)' }} htmlFor="ws-message">
                Message
              </label>
              <textarea
                id="ws-message"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                required
                rows={5}
                className="mt-1 w-full border px-3 py-2 text-sm"
                style={{ borderRadius: 'var(--ws-radius)', borderColor: 'rgba(0,0,0,0.15)' }}
              />
            </div>
            <button
              type="submit"
              className="w-full px-6 py-3 text-sm font-semibold text-white"
              style={{ backgroundColor: 'var(--ws-primary)', borderRadius: 'var(--ws-radius)' }}
            >
              Send message
            </button>
            <p className="text-xs opacity-60" style={{ color: 'var(--ws-text)' }}>
              This opens your own email app so your message comes straight from you.
            </p>
          </form>
        ) : null}
      </div>
    </SectionShell>
  );
}