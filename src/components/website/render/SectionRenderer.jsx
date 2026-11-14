import React from 'react';
import HeroSection from './sections/HeroSection';
import { RichTextSection, ImageTextSection, CtaBannerSection, SpacerSection, DividerSection } from './sections/TextSections';
import { FeatureCardsSection, SponsorsSection, DocumentsSection } from './sections/CardSections';
import { NewsListSection, EventsListSection, FaqSection, OpeningTimesSection } from './sections/ListSections';
import { GallerySection, EmbedSection } from './sections/MediaSections';
import { CommitteeSection, MembershipCtaSection, ContactSection } from './sections/PeopleSections';

const SECTION_COMPONENTS = {
  hero: HeroSection,
  rich_text: RichTextSection,
  image_text: ImageTextSection,
  feature_cards: FeatureCardsSection,
  gallery: GallerySection,
  news_list: NewsListSection,
  events_list: EventsListSection,
  opening_times: OpeningTimesSection,
  membership_cta: MembershipCtaSection,
  committee: CommitteeSection,
  sponsors: SponsorsSection,
  documents: DocumentsSection,
  faq: FaqSection,
  contact: ContactSection,
  embed: EmbedSection,
  cta_banner: CtaBannerSection,
  spacer: SpacerSection,
  divider: DividerSection,
};

export default function SectionRenderer({ section, siteSlug, clubId }) {
  if (!section || section.visible === false) return null;
  const Component = SECTION_COMPONENTS[section.type];
  if (!Component) return null;
  return <Component content={section.content || {}} siteSlug={siteSlug} clubId={clubId} />;
}