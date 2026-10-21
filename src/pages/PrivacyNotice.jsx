import React from 'react';
import LegalDoc from '@/components/legal/LegalDoc';

const SECTIONS = [
  {
    heading: '1. Who we are and what this notice covers',
    items: [
      { t: 'p', text: 'Bowls Time is a club management platform. You can contact us at contact@bowls-time.com.' },
      { t: 'p', text: 'We handle personal data in two different roles:' },
      { t: 'ul', items: [
        'Information held for your club. Bowls Time is used by bowls clubs. Your club decides what information it collects about its members and visitors and how that information is used. For that information your club is the \u201ccontroller\u201d and we are its \u201cprocessor\u201d: we only handle it on the club\u2019s instructions. Your club\u2019s own privacy information explains what it does with your data.',
        'Our own information. For account, security, usage, billing and support information about the people who use the platform, we are the \u201ccontroller\u201d. Sections 2, 4 and 7 mainly cover this.',
      ] },
      { t: 'p', text: 'This notice forms part of our Terms of Service.' },
    ],
  },
  {
    heading: '2. Information we collect as controller',
    items: [
      { t: 'ul', items: [
        'Account information: your name, email address, phone number (if you give one), your role in your club and your login details.',
        'Usage and device information: when you log in, your IP address, the type of device and browser you use, which features you use, error reports and records of key administrative actions.',
        'Support and feedback: messages you send us by email or through the in-app Feedback function.',
        'Billing information: for club contacts who deal with us about the subscription, their name, email address and our invoicing and payment records.',
      ] },
    ],
  },
  {
    heading: '3. Information we hold for your club',
    items: [
      { t: 'p', text: 'Your club may record the following in the platform: name, email address, phone number, date of birth, gender, title, emergency contact name and number, membership type, status and start date, locker numbers, availability and unavailability dates, bookings, team selections, match results and scores, competition entries, messages, notification preferences and payment status.' },
      { t: 'p', text: 'We do not intend the platform to hold health or other sensitive information, and clubs are told not to enter it in free-text fields.' },
      { t: 'p', text: 'What other people can see depends on your club\u2019s settings and your role. Section 5 of our Terms of Service gives examples.' },
      { t: 'p', text: 'Where your club collects payments through the platform, they are processed by Stripe and paid to the club. We do not see or store your full card details.' },
      { t: 'p', text: 'Ratings, rankings and score predictions in the platform are calculated automatically from results. They are an aid only, and decisions about selections and fixtures are made by people at your club, not automatically by us.' },
    ],
  },
  {
    heading: '4. Why we use your information and our legal basis',
    items: [
      { t: 'ul', items: [
        'Providing the platform (creating and running accounts and showing the right information to the right people): our legitimate interests in running the platform that you and your club use.',
        'Keeping the platform secure and fixing problems (preventing misuse, investigating errors, keeping audit records): our legitimate interests.',
        'Support: answering your questions and dealing with feedback: our legitimate interests.',
        'Service messages such as account security alerts and booking confirmations: our legitimate interests. Messages about club news are sent on your club\u2019s behalf and on your club\u2019s legal basis.',
        'Improving the platform using anonymised and aggregated information: our legitimate interests.',
        'Billing and accounting: our legal obligations to keep accounting records and our legitimate interests in being paid.',
        'Legal compliance and legal claims: our legal obligations and our legitimate interests in protecting our rights.',
      ] },
      { t: 'p', text: 'We do not sell your personal data or use it for advertising.' },
    ],
  },
  {
    heading: '5. Who we share it with',
    items: [
      { t: 'ul', items: [
        'Your club, which controls the information it enters and can see information about how its members use the platform.',
        'Our service providers, who process data for us and for clubs: Base44 (application hosting, database, push notifications and file storage, together with its own sub-processors), Stripe (payments, where your club uses them) and SendGrid (service emails). We require our providers to protect your information.',
        'Professional advisers, regulators and law enforcement where we are required to share information or need to protect our legal rights.',
        'A successor to our business, if we transfer Bowls Time to someone else. We will tell you if that happens.',
      ] },
    ],
  },
  {
    heading: '6. Where your information is stored',
    items: [
      { t: 'p', text: 'Our main providers store and process information in the United States and may use other locations. When information leaves the UK, we make sure a lawful transfer mechanism applies, such as the UK extension to the EU\u2013US Data Privacy Framework or the UK Addendum to standard contractual clauses, as set out in each provider\u2019s data processing terms.' },
    ],
  },
  {
    heading: '7. How long we keep it',
    items: [
      { t: 'ul', items: [
        'Information held for a club: for as long as the club uses the platform. When a club stops using it, the club can export its data for 30 days, after which we delete or anonymise it within 90 days unless the law requires us to keep it. Clubs decide how long they keep records such as past bookings and match results while they use the platform.',
        'Account information we hold as controller: while your account is open. After it is closed we delete or anonymise it within 90 days, except for anything we must keep.',
        'Billing and accounting records: 6 years.',
        'Support messages: up to 2 years after our last contact with you.',
        'Security and usage logs: up to 12 months.',
      ] },
    ],
  },
  {
    heading: '8. Keeping your information secure',
    items: [
      { t: 'p', text: 'We use access controls, role-based permissions, encryption in transit, secure handling of login credentials, audit logging of key administrative actions and regular reviews of access. If there is a security incident that affects your personal data, we will tell the people and organisations the law requires us to.' },
    ],
  },
  {
    heading: '9. Cookies and similar technologies',
    items: [
      { t: 'p', text: 'The platform uses only essential cookies and similar technologies, for example to keep you logged in and to remember your settings. We do not use advertising or tracking cookies.' },
    ],
  },
  {
    heading: '10. Children',
    items: [
      { t: 'p', text: 'You must be 16 or over to create your own account. A younger person can be added to the platform by their club with a parent or guardian\u2019s permission, and the club is responsible for obtaining it and for how that information is used. If you think we hold information about a child without the right permission, please tell the club or contact us.' },
    ],
  },
  {
    heading: '11. Your rights',
    items: [
      { t: 'p', text: 'You have the right to ask for a copy of your personal data, to have it corrected, to have it deleted, to ask us to restrict how it is used, to object to its use, and to receive it in a portable format. These rights depend on the circumstances.' },
      { t: 'p', text: 'For information your club holds: please contact your club, as it decides how that information is used. If you contact us instead, we will pass your request to the club promptly and help the club respond.' },
      { t: 'p', text: 'For information we hold as controller: please contact us at contact@bowls-time.com. We will normally reply within one month and do not usually charge a fee.' },
    ],
  },
  {
    heading: '12. Complaints',
    items: [
      { t: 'p', text: 'If you are unhappy with how we have handled your personal data, you can make a data protection complaint to us at contact@bowls-time.com. Please say that it is a data protection complaint. We will acknowledge it within 30 days and respond without undue delay. For complaints about information your club holds, you can also complain to the club.' },
    ],
  },
  {
    heading: '13. Changes to this notice',
    items: [
      { t: 'p', text: 'We may update this notice from time to time. The date at the top shows when it was last changed. We will give reasonable notice of important changes, for example within the platform or by email.' },
    ],
  },
];

export default function PrivacyNotice() {
  return (
    <LegalDoc
      title={'Bowls Time \u2013 Privacy Notice'}
      lastUpdated="21 October 2026"
      sections={SECTIONS}
      crossLinkLabel="Terms of Service"
      crossLinkTo="/TermsOfService"
    />
  );
}