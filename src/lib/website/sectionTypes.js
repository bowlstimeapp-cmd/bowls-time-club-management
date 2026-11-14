/**
 * Single source of truth for every website section type.
 *
 * Used by the bundle importer (validation), the CMS editor (auto-generated forms)
 * and the public renderer (one component per type). Adding a new section type only
 * means adding an entry here plus a renderer component.
 *
 * Field types: text | textarea | richtext | image | number | boolean | select | link | repeater
 */

export const SECTION_TYPES = [
  {
    type: 'hero',
    label: 'Hero banner',
    description: 'Large headline banner with optional image and call-to-action buttons.',
    fields: [
      { key: 'heading', label: 'Heading', type: 'text', required: true },
      { key: 'subheading', label: 'Subheading', type: 'textarea' },
      { key: 'background_image', label: 'Background image', type: 'image' },
      { key: 'overlay_opacity', label: 'Overlay opacity (0-1)', type: 'number', min: 0, max: 1, step: 0.05 },
      { key: 'buttons', label: 'Buttons', type: 'repeater', itemLabel: 'Button', items: [
        { key: 'label', label: 'Label', type: 'text' },
        { key: 'link', label: 'Link', type: 'link' },
      ] },
      { key: 'alignment', label: 'Alignment', type: 'select', options: ['left', 'center', 'right'] },
    ],
    defaults: { heading: '', subheading: '', background_image: '', overlay_opacity: 0.45, buttons: [], alignment: 'left' },
  },
  {
    type: 'rich_text',
    label: 'Rich text',
    description: 'A block of formatted text with an optional heading.',
    fields: [
      { key: 'heading', label: 'Heading', type: 'text' },
      { key: 'body_html', label: 'Body', type: 'richtext', required: true },
      { key: 'alignment', label: 'Alignment', type: 'select', options: ['left', 'center'] },
    ],
    defaults: { heading: '', body_html: '', alignment: 'left' },
  },
  {
    type: 'image_text',
    label: 'Image and text',
    description: 'An image beside a block of text, with an optional button.',
    fields: [
      { key: 'heading', label: 'Heading', type: 'text' },
      { key: 'body_html', label: 'Body', type: 'richtext' },
      { key: 'image', label: 'Image', type: 'image', required: true },
      { key: 'image_alt', label: 'Image alt text', type: 'text' },
      { key: 'image_position', label: 'Image position', type: 'select', options: ['left', 'right'] },
      { key: 'button', label: 'Button', type: 'link_pair' },
    ],
    defaults: { heading: '', body_html: '', image: '', image_alt: '', image_position: 'left', button: { label: '', link: '' } },
  },
  {
    type: 'feature_cards',
    label: 'Feature cards',
    description: 'A grid of cards, each with an icon or image, title and short text.',
    fields: [
      { key: 'heading', label: 'Heading', type: 'text' },
      { key: 'intro', label: 'Intro', type: 'textarea' },
      { key: 'cards', label: 'Cards', type: 'repeater', itemLabel: 'Card', items: [
        { key: 'icon', label: 'Icon', type: 'text' },
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'text', label: 'Text', type: 'textarea' },
        { key: 'image', label: 'Image', type: 'image' },
        { key: 'link', label: 'Link', type: 'link' },
      ] },
    ],
    defaults: { heading: '', intro: '', cards: [] },
  },
  {
    type: 'gallery',
    label: 'Gallery',
    description: 'A grid, masonry or carousel gallery of images.',
    fields: [
      { key: 'heading', label: 'Heading', type: 'text' },
      { key: 'images', label: 'Images', type: 'repeater', itemLabel: 'Image', required: true, items: [
        { key: 'image', label: 'Image', type: 'image', required: true },
        { key: 'alt', label: 'Alt text', type: 'text' },
        { key: 'caption', label: 'Caption', type: 'text' },
      ] },
      { key: 'layout', label: 'Layout', type: 'select', options: ['grid', 'masonry', 'carousel'] },
    ],
    defaults: { heading: '', images: [], layout: 'grid' },
  },
  {
    type: 'news_list',
    label: 'News list',
    description: 'Club news. Manual items, or auto mode pulling the club\'s existing news posts.',
    supportsAuto: true,
    fields: [
      { key: 'heading', label: 'Heading', type: 'text' },
      { key: 'mode', label: 'Mode', type: 'select', options: ['manual', 'auto'] },
      { key: 'items', label: 'News items', type: 'repeater', itemLabel: 'News item', requiredWhenManual: true, items: [
        { key: 'title', label: 'Title', type: 'text', required: true },
        { key: 'date', label: 'Date', type: 'date' },
        { key: 'summary', label: 'Summary', type: 'textarea' },
        { key: 'body_html', label: 'Body', type: 'richtext' },
        { key: 'image', label: 'Image', type: 'image' },
      ] },
      { key: 'max_items', label: 'Maximum items', type: 'number', min: 1, max: 24 },
    ],
    defaults: { heading: '', mode: 'manual', items: [], max_items: 6 },
  },
  {
    type: 'events_list',
    label: 'Events list',
    description: 'Upcoming events. Manual items, or auto mode pulling the club\'s existing events.',
    supportsAuto: true,
    fields: [
      { key: 'heading', label: 'Heading', type: 'text' },
      { key: 'mode', label: 'Mode', type: 'select', options: ['manual', 'auto'] },
      { key: 'items', label: 'Events', type: 'repeater', itemLabel: 'Event', requiredWhenManual: true, items: [
        { key: 'title', label: 'Title', type: 'text', required: true },
        { key: 'date', label: 'Date', type: 'date' },
        { key: 'time', label: 'Time', type: 'text' },
        { key: 'location', label: 'Location', type: 'text' },
        { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'link', label: 'Link', type: 'link' },
      ] },
      { key: 'max_items', label: 'Maximum items', type: 'number', min: 1, max: 24 },
    ],
    defaults: { heading: '', mode: 'manual', items: [], max_items: 6 },
  },
  {
    type: 'opening_times',
    label: 'Opening times',
    description: 'A simple table of days and opening hours.',
    fields: [
      { key: 'heading', label: 'Heading', type: 'text' },
      { key: 'rows', label: 'Rows', type: 'repeater', itemLabel: 'Row', required: true, items: [
        { key: 'day', label: 'Day', type: 'text', required: true },
        { key: 'hours', label: 'Hours', type: 'text', required: true },
      ] },
      { key: 'note', label: 'Note', type: 'textarea' },
    ],
    defaults: { heading: 'Opening times', rows: [], note: '' },
  },
  {
    type: 'membership_cta',
    label: 'Membership',
    description: 'Membership fees and a join call to action.',
    fields: [
      { key: 'heading', label: 'Heading', type: 'text', required: true },
      { key: 'text', label: 'Text', type: 'textarea' },
      { key: 'fees', label: 'Fees', type: 'repeater', itemLabel: 'Fee', items: [
        { key: 'label', label: 'Label', type: 'text' },
        { key: 'price', label: 'Price', type: 'text' },
        { key: 'description', label: 'Description', type: 'textarea' },
      ] },
      { key: 'button', label: 'Button', type: 'link_pair' },
    ],
    defaults: { heading: '', text: '', fees: [], button: { label: 'Join now', link: '' } },
  },
  {
    type: 'committee',
    label: 'Committee',
    description: 'Committee members with roles, photos and contact details.',
    fields: [
      { key: 'heading', label: 'Heading', type: 'text' },
      { key: 'people', label: 'People', type: 'repeater', itemLabel: 'Person', required: true, items: [
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'role', label: 'Role', type: 'text' },
        { key: 'photo', label: 'Photo', type: 'image' },
        { key: 'email', label: 'Email', type: 'text' },
        { key: 'bio', label: 'Bio', type: 'textarea' },
      ] },
    ],
    defaults: { heading: 'Our committee', people: [] },
  },
  {
    type: 'sponsors',
    label: 'Sponsors',
    description: 'Sponsor logos with optional links.',
    fields: [
      { key: 'heading', label: 'Heading', type: 'text' },
      { key: 'items', label: 'Sponsors', type: 'repeater', itemLabel: 'Sponsor', required: true, items: [
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'logo', label: 'Logo', type: 'image' },
        { key: 'link', label: 'Link', type: 'link' },
      ] },
    ],
    defaults: { heading: 'Our sponsors', items: [] },
  },
  {
    type: 'documents',
    label: 'Documents',
    description: 'Downloadable files such as policies, minutes or entry forms.',
    fields: [
      { key: 'heading', label: 'Heading', type: 'text' },
      { key: 'items', label: 'Documents', type: 'repeater', itemLabel: 'Document', required: true, items: [
        { key: 'title', label: 'Title', type: 'text', required: true },
        { key: 'file', label: 'File', type: 'file', required: true },
        { key: 'description', label: 'Description', type: 'textarea' },
      ] },
    ],
    defaults: { heading: 'Documents', items: [] },
  },
  {
    type: 'faq',
    label: 'FAQ',
    description: 'Questions and answers in collapsible rows.',
    fields: [
      { key: 'heading', label: 'Heading', type: 'text' },
      { key: 'items', label: 'Questions', type: 'repeater', itemLabel: 'Question', required: true, items: [
        { key: 'question', label: 'Question', type: 'text', required: true },
        { key: 'answer_html', label: 'Answer', type: 'richtext', required: true },
      ] },
    ],
    defaults: { heading: 'Frequently asked questions', items: [] },
  },
  {
    type: 'contact',
    label: 'Contact',
    description: 'Address, phone, email, map and an optional contact form.',
    fields: [
      { key: 'heading', label: 'Heading', type: 'text', required: true },
      { key: 'address', label: 'Address', type: 'textarea' },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'map_embed_url', label: 'Map embed URL', type: 'embed' },
      { key: 'show_form', label: 'Show contact form', type: 'boolean' },
      { key: 'form_recipient_email', label: 'Form recipient email', type: 'text' },
    ],
    defaults: { heading: 'Contact us', address: '', phone: '', email: '', map_embed_url: '', show_form: false, form_recipient_email: '' },
  },
  {
    type: 'embed',
    label: 'Embed',
    description: 'Embedded video or map from an approved provider.',
    fields: [
      { key: 'heading', label: 'Heading', type: 'text' },
      { key: 'embed_url', label: 'Embed URL', type: 'embed', required: true },
    ],
    defaults: { heading: '', embed_url: '' },
  },
  {
    type: 'cta_banner',
    label: 'Call to action banner',
    description: 'A short banner with a single button.',
    fields: [
      { key: 'heading', label: 'Heading', type: 'text', required: true },
      { key: 'text', label: 'Text', type: 'textarea' },
      { key: 'button', label: 'Button', type: 'link_pair' },
    ],
    defaults: { heading: '', text: '', button: { label: '', link: '' } },
  },
  {
    type: 'spacer',
    label: 'Spacer',
    description: 'Blank vertical space.',
    fields: [
      { key: 'height', label: 'Height', type: 'select', options: ['small', 'medium', 'large'] },
    ],
    defaults: { height: 'medium' },
  },
  {
    type: 'divider',
    label: 'Divider',
    description: 'A horizontal line.',
    fields: [],
    defaults: {},
  },
];

export const SECTION_TYPE_MAP = SECTION_TYPES.reduce((map, def) => {
  map[def.type] = def;
  return map;
}, {});

export const SECTION_TYPE_KEYS = SECTION_TYPES.map((def) => def.type);

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function isValidSlug(value) {
  return typeof value === 'string' && SLUG_PATTERN.test(value);
}