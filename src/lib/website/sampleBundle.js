/**
 * Example bundle generator + schema export for the website importer.
 * Both files are produced in the same format the importer accepts.
 */
import JSZip from 'jszip';
import { SECTION_TYPES } from './sectionTypes';

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function makeHeroImage() {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 1200, 600);
  gradient.addColorStop(0, '#064e3b');
  gradient.addColorStop(1, '#10b981');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1200, 600);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = 'bold 72px Arial';
  ctx.fillText('Sample Bowls Club', 80, 300);
  ctx.font = '36px Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText('Replace this image with your own', 80, 370);
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png'));
}

export function buildSampleSiteJson() {
  return {
    schema_version: '1.0',
    site: {
      name: 'Sample Bowls Club',
      slug: 'sample-bowls-club',
      settings: {
        site_title: 'Sample Bowls Club',
        seo_title: 'Sample Bowls Club — bowling for everyone',
        seo_description: 'A friendly bowls club with a full fixture list, social events and a warm welcome.',
        contact_email: 'info@example.com',
        contact_phone: '01234 567890',
        contact_address: '1 Green Lane, Sampleton',
        social_links: { facebook: 'https://www.facebook.com/', instagram: 'https://www.instagram.com/' },
      },
      theme: {
        colors: { primary: '#059669', secondary: '#0f172a', accent: '#f59e0b', background: '#ffffff', text: '#0f172a' },
        fonts: { heading: 'Arial', body: 'Arial' },
        radius: '8px',
        button_style: 'solid',
      },
      navigation: [
        { label: 'Home', page_slug: 'home' },
        { label: 'About', page_slug: 'about' },
        { label: 'Membership', page_slug: 'membership' },
        { label: 'Contact', page_slug: 'contact' },
      ],
      footer: {
        text: 'Sample Bowls Club is affiliated to the county association.',
        copyright: '© Sample Bowls Club',
      },
    },
    pages: [
      {
        title: 'Home',
        slug: 'home',
        is_home: true,
        seo: {
          title: 'Sample Bowls Club',
          description: 'A friendly bowls club with a full fixture list and a warm welcome.',
          og_image: 'assets/hero.png',
        },
        sections: [
          {
            type: 'hero',
            visible: true,
            content: {
              heading: 'Welcome to Sample Bowls Club',
              subheading: 'Roll-ups, league matches and a clubhouse full of friends.',
              background_image: 'assets/hero.png',
              overlay_opacity: 0.45,
              alignment: 'left',
              buttons: [{ label: 'Join the club', link: '/membership' }],
            },
          },
          {
            type: 'feature_cards',
            visible: true,
            content: {
              heading: 'Why join us?',
              intro: 'Everything you need for a great game of bowls.',
              cards: [
                { icon: '🎳', title: 'Six rinks', text: 'Indoor and outdoor greens all year round.', link: '/about' },
                { icon: '🤝', title: 'Coaching', text: 'Free coaching for new members every Sunday.', link: '/membership' },
                { icon: '🏆', title: 'Competitions', text: 'Club, county and national competitions.', link: '/about' },
              ],
            },
          },
          {
            type: 'opening_times',
            visible: true,
            content: {
              heading: 'Opening times',
              rows: [
                { day: 'Monday to Friday', hours: '10:00 – 21:00' },
                { day: 'Saturday', hours: '09:00 – 18:00' },
                { day: 'Sunday', hours: '10:00 – 16:00' },
              ],
              note: 'The green is closed on Christmas Day.',
            },
          },
        ],
      },
      {
        title: 'About',
        slug: 'about',
        is_home: false,
        seo: { title: 'About Sample Bowls Club', description: 'Our history, our green and our committee.' },
        sections: [
          {
            type: 'image_text',
            visible: true,
            content: {
              heading: 'Our club',
              body_html: '<p>Founded in 1921, Sample Bowls Club has been at the heart of the village ever since.</p><p>We welcome players of every age and ability.</p>',
              image: 'assets/hero.png',
              image_alt: 'The club green at sunset',
              image_position: 'right',
              button: { label: 'Get in touch', link: '/contact' },
            },
          },
          {
            type: 'committee',
            visible: true,
            content: {
              heading: 'Our committee',
              people: [
                { name: 'Alex Smith', role: 'President', email: 'president@example.com', bio: 'Bowling since 1985.' },
                { name: 'Sam Jones', role: 'Secretary', email: 'secretary@example.com', bio: 'Looks after fixtures and membership.' },
              ],
            },
          },
        ],
      },
      {
        title: 'Membership',
        slug: 'membership',
        is_home: false,
        seo: { title: 'Membership', description: 'Join Sample Bowls Club.' },
        sections: [
          {
            type: 'membership_cta',
            visible: true,
            content: {
              heading: 'Join the club',
              text: 'Membership includes unlimited roll-ups and eligibility for club competitions.',
              fees: [
                { label: 'Full member', price: '£90 per year', description: 'Includes all league and club competitions.' },
                { label: 'Social member', price: '£25 per year', description: 'Clubhouse and social events.' },
              ],
              button: { label: 'Contact us to join', link: '/contact' },
            },
          },
          {
            type: 'faq',
            visible: true,
            content: {
              heading: 'Frequently asked questions',
              items: [
                { question: 'Do I need my own bowls?', answer_html: '<p>No — the club has a set of bowls you can borrow while you learn.</p>' },
                { question: 'What should I wear?', answer_html: '<p>Flat shoes and comfortable clothing. Club shirts are available.</p>' },
              ],
            },
          },
        ],
      },
      {
        title: 'Contact',
        slug: 'contact',
        is_home: false,
        seo: { title: 'Contact us', description: 'Find us and get in touch.' },
        sections: [
          {
            type: 'contact',
            visible: true,
            content: {
              heading: 'Contact us',
              address: '1 Green Lane, Sampleton',
              phone: '01234 567890',
              email: 'info@example.com',
              show_form: false,
              form_recipient_email: 'info@example.com',
            },
          },
        ],
      },
    ],
  };
}

export async function downloadSampleBundle() {
  const zip = new JSZip();
  zip.file('site.json', JSON.stringify(buildSampleSiteJson(), null, 2));
  const image = await makeHeroImage();
  zip.folder('assets').file('hero.png', image);
  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(blob, 'sample-website-bundle.zip');
}

export function downloadBundleSchema() {
  const schema = {
    description: 'Bowls Time website bundle format. site.json must sit at the ZIP root, assets in /assets.',
    schema_version: '1.0',
    site: {
      name: 'string (required)',
      slug: 'lowercase-with-hyphens (required)',
      settings: {
        site_title: 'string',
        logo_url: 'absolute https URL or assets/…',
        favicon_url: 'absolute https URL or assets/…',
        seo_title: 'string',
        seo_description: 'string',
        social_links: { facebook: 'url', instagram: 'url', x: 'url' },
        contact_email: 'string',
        contact_phone: 'string',
        contact_address: 'string',
      },
      theme: {
        colors: { primary: '#hex', secondary: '#hex', accent: '#hex', background: '#hex', text: '#hex' },
        fonts: { heading: 'font name', body: 'font name' },
        radius: 'e.g. 8px',
        button_style: 'solid | outline',
      },
      navigation: [{ label: 'string', page_slug: 'string', external_url: 'https://…', children: ['same shape as parent'] }],
      footer: { text: 'string', copyright: 'string', columns: [{ title: 'string', links: [{ label: 'string', page_slug: 'string', external_url: 'string' }] }] },
    },
    pages: [{
      title: 'string (required)',
      slug: 'lowercase-with-hyphens (required, unique)',
      is_home: 'boolean',
      order: 'number',
      visible: 'boolean',
      seo: { title: 'string', description: 'string', og_image: 'assets/… or https URL' },
      sections: [{
        type: 'one of the section types below',
        visible: 'boolean',
        content: 'object — shape described by the section type',
      }],
    }],
    limits: { max_image_bytes: 5242880, max_total_bytes: 52428800, supported_files: 'png, jpg, jpeg, webp, gif, avif, pdf' },
    section_types: SECTION_TYPES.map((def) => ({
      type: def.type,
      label: def.label,
      description: def.description,
      supports_auto: !!def.supportsAuto,
      fields: def.fields.map((f) => ({
        key: f.key,
        label: f.label,
        field_type: f.type,
        required: !!f.required,
        options: f.options || undefined,
        items: f.items || undefined,
      })),
      defaults: def.defaults,
    })),
  };
  downloadBlob(new Blob([JSON.stringify(schema, null, 2)], { type: 'application/json' }), 'website-bundle-schema.json');
}