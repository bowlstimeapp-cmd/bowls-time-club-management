import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import SectionShell, { RICH_TEXT_CLASS } from './SectionShell';
import { formatSiteDate } from '@/lib/website/renderHelpers';

export function NewsListSection({ content, clubId }) {
  const mode = content.mode === 'auto' ? 'auto' : 'manual';
  const max = Number(content.max_items) || 6;

  const { data: posts = [] } = useQuery({
    queryKey: ['siteAutoNews', clubId],
    queryFn: async () => {
      const rows = await base44.entities.ClubPost.filter({ club_id: clubId, type: 'news', is_published: true });
      return [...rows].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: mode === 'auto' && !!clubId,
  });

  const items = mode === 'auto'
    ? posts.slice(0, max).map((post) => ({
        title: post.title,
        date: post.created_date,
        summary: post.content ? String(post.content).slice(0, 200) : '',
        image: post.image_url || '',
      }))
    : (content.items || []).slice(0, max);

  return (
    <SectionShell heading={content.heading}>
      {items.length === 0 ? (
        <p className="text-sm opacity-70" style={{ color: 'var(--ws-text)' }}>No news to show yet.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => (
            <article
              key={`${item.title}-${index}`}
              className="flex flex-col overflow-hidden border bg-white"
              style={{ borderRadius: 'var(--ws-radius)', borderColor: 'rgba(0,0,0,0.1)' }}
            >
              {item.image && <img src={item.image} alt={item.title} className="h-40 w-full object-cover" />}
              <div className="flex flex-1 flex-col p-5">
                {item.date && (
                  <time className="text-xs uppercase tracking-wide opacity-60" style={{ color: 'var(--ws-text)' }}>
                    {formatSiteDate(item.date)}
                  </time>
                )}
                <h3 className="mt-2 text-lg font-semibold" style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-font-heading)' }}>
                  {item.title}
                </h3>
                {item.summary && <p className="mt-2 text-sm opacity-75" style={{ color: 'var(--ws-text)' }}>{item.summary}</p>}
                {item.body_html && (
                  <div
                    className={`${RICH_TEXT_CLASS} mt-3 text-sm`}
                    style={{ color: 'var(--ws-text)' }}
                    dangerouslySetInnerHTML={{ __html: item.body_html }}
                  />
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </SectionShell>
  );
}

export function EventsListSection({ content, clubId }) {
  const mode = content.mode === 'auto' ? 'auto' : 'manual';
  const max = Number(content.max_items) || 6;

  const { data: posts = [] } = useQuery({
    queryKey: ['siteAutoEvents', clubId],
    queryFn: async () => {
      const rows = await base44.entities.ClubPost.filter({ club_id: clubId, type: 'social_event', is_published: true });
      return [...rows].sort((a, b) => new Date(a.event_date || a.created_date) - new Date(b.event_date || b.created_date));
    },
    enabled: mode === 'auto' && !!clubId,
  });

  const items = mode === 'auto'
    ? posts.slice(0, max).map((post) => ({
        title: post.title,
        date: post.event_date || post.created_date,
        description: post.content ? String(post.content).slice(0, 200) : '',
      }))
    : (content.items || []).slice(0, max);

  return (
    <SectionShell heading={content.heading}>
      {items.length === 0 ? (
        <p className="text-sm opacity-70" style={{ color: 'var(--ws-text)' }}>No events to show yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={`${item.title}-${index}`}
              className="flex flex-wrap items-start justify-between gap-4 border bg-white p-5"
              style={{ borderRadius: 'var(--ws-radius)', borderColor: 'rgba(0,0,0,0.1)' }}
            >
              <div className="min-w-0 flex-1">
                <div className="text-base font-semibold" style={{ color: 'var(--ws-text)' }}>{item.title}</div>
                <div className="mt-1 text-xs opacity-70" style={{ color: 'var(--ws-text)' }}>
                  {[formatSiteDate(item.date), item.time, item.location].filter(Boolean).join(' · ')}
                </div>
                {item.description && <p className="mt-2 text-sm opacity-75" style={{ color: 'var(--ws-text)' }}>{item.description}</p>}
              </div>
              {item.link && (
                <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold" style={{ color: 'var(--ws-primary)' }}>
                  Details
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </SectionShell>
  );
}

export function FaqSection({ content }) {
  const items = Array.isArray(content.items) ? content.items : [];
  return (
    <SectionShell heading={content.heading}>
      <div className="space-y-2">
        {items.map((item, index) => (
          <details
            key={`${item.question}-${index}`}
            className="border bg-white p-4"
            style={{ borderRadius: 'var(--ws-radius)', borderColor: 'rgba(0,0,0,0.1)' }}
          >
            <summary className="cursor-pointer text-sm font-semibold" style={{ color: 'var(--ws-text)' }}>
              {item.question}
            </summary>
            <div
              className={`${RICH_TEXT_CLASS} mt-3 text-sm`}
              style={{ color: 'var(--ws-text)' }}
              dangerouslySetInnerHTML={{ __html: item.answer_html || '' }}
            />
          </details>
        ))}
      </div>
    </SectionShell>
  );
}

export function OpeningTimesSection({ content }) {
  const rows = Array.isArray(content.rows) ? content.rows : [];
  return (
    <SectionShell heading={content.heading} tinted>
      <div className="max-w-xl overflow-hidden border bg-white" style={{ borderRadius: 'var(--ws-radius)', borderColor: 'rgba(0,0,0,0.1)' }}>
        <table className="w-full text-sm">
          <tbody className="divide-y" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
            {rows.map((row, index) => (
              <tr key={`${row.day}-${index}`}>
                <th scope="row" className="px-4 py-3 text-left font-medium" style={{ color: 'var(--ws-text)' }}>{row.day}</th>
                <td className="px-4 py-3 text-right opacity-80" style={{ color: 'var(--ws-text)' }}>{row.hours}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {content.note && <p className="mt-4 max-w-xl text-xs opacity-70" style={{ color: 'var(--ws-text)' }}>{content.note}</p>}
    </SectionShell>
  );
}