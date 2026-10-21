import React from 'react';
import LegalDoc from '@/components/legal/LegalDoc';

const SECTIONS = [
  {
    heading: '1. About these terms',
    items: [
      { t: 'p', text: '1.1 Bowls Time (the Service) is a club management platform operated by Joshua Davis, a sole trader trading as Bowls Time, of 27 Oakley Road, Southampton (we, us or our). It is made available to bowls clubs, which use it to manage rink bookings, team selection, competitions, leagues, scoring, communications and membership.' },
      { t: 'p', text: '1.2 These terms apply to everyone who uses the Service, including club administrators, officers, selectors, members and visitors (you). By creating an account or using the Service you agree to them. If you do not agree, please do not use the Service.' },
      { t: 'p', text: '1.3 Your club is our customer. Each club decides who may join, what roles people have, what information it collects and how it runs its own activities. These terms sit alongside any rules your club sets, and your club is responsible for those rules.' },
      { t: 'p', text: '1.4 How we handle personal data is explained in our Privacy Notice at [LINK], which forms part of these terms.' },
    ],
  },
  {
    heading: '2. Your account',
    items: [
      { t: 'p', text: '2.1 You must give accurate information and keep it up to date. You are responsible for keeping your login details safe and for activity on your account. Tell us promptly if you think someone else has used it.' },
      { t: 'p', text: '2.2 You must be 16 or over to create your own account. A younger person may be added to the Service by their club with a parent or guardian\u2019s permission, and the club is responsible for obtaining it.' },
      { t: 'p', text: '2.3 Requests to join a club are approved or declined by that club. Your club\u2019s administrators decide your membership status, role and access, and may change or remove them.' },
      { t: 'p', text: '2.4 You can leave a club or ask for your account to be closed at any time through the Service or by contacting contact@bowls-time.com. Some records, such as past bookings, match results and financial records, may be kept where the club or the law needs them.' },
    ],
  },
  {
    heading: '3. Using the Service',
    items: [
      { t: 'p', text: '3.1 Depending on what your club has switched on, you may be able to book rinks, record availability or unavailability, view and respond to team selections, enter competitions and leagues, view and submit scores, use the member directory and message other members.' },
      { t: 'p', text: '3.2 Bookings, cancellations, selections, fixtures, results and rankings are decided by your club, not by us. Rink availability and booking rules are set by the club, and a booking may be changed or cancelled by the club.' },
      { t: 'p', text: '3.3 Scorecards, league tables, Elo ratings, analytics and score predictions are provided as an aid. They may contain errors and your club may correct them. Unless your club tells you otherwise, score predictions and similar features are for entertainment only and do not involve wagering.' },
    ],
  },
  {
    heading: '4. Acceptable use',
    items: [
      { t: 'p', text: '4.1 You must not:' },
      { t: 'ul', items: [
        'use the Service unlawfully or to harass, abuse, threaten or discriminate against anyone;',
        'post or send material that is offensive, defamatory, misleading or that infringes someone else\u2019s rights;',
        'use someone else\u2019s account, or try to gain access to data or areas you are not authorised to see;',
        'disrupt or attempt to damage the Service, introduce malicious code, scrape data or overload it with automated requests;',
        'copy, reverse-engineer or resell the Service, or use it to build a competing product; or',
        'use member contact details for anything other than club-related purposes, including marketing or passing them to others.',
      ] },
      { t: 'p', text: '4.2 We or your club may remove content or restrict access if we reasonably believe these rules have been broken.' },
    ],
  },
  {
    heading: '5. Your information and what others can see',
    items: [
      { t: 'p', text: '5.1 Your club holds the information on your profile, such as your name, contact details, membership details and availability, and is responsible for how it is used. We process it on the club\u2019s behalf to run the Service. For the account, security and usage information we collect about you, we are an independent controller and handle it in line with our Privacy Notice.' },
      { t: 'p', text: '5.2 Depending on your club\u2019s settings and your role, the following may be visible to others:' },
      { t: 'ul', items: [
        'your name in team selections, fixtures, scorecards, league tables, competition draws and results;',
        'your name and playing record on leaderboards and Elo rankings;',
        'your name on rink bookings, including on displays and kiosk screens in the clubhouse;',
        'your contact details to club officers, selectors and, where the club enables a member directory, to other members.',
      ] },
      { t: 'p', text: '5.3 Club administrators and selectors can see more than ordinary members, including emergency contact details and unavailability needed for selection. You can ask your club to limit or correct what it holds about you.' },
      { t: 'p', text: '5.4 If you upload content such as photographs, you confirm you have the right to do so and you allow us and your club to display it within the Service.' },
    ],
  },
  {
    heading: '6. Messages and notifications',
    items: [
      { t: 'p', text: '6.1 The Service can send you emails and push notifications about bookings, selections, fixtures and club news. These are sent on behalf of your club.' },
      { t: 'p', text: '6.2 You can manage your preferences in your profile settings. Some essential service messages, such as account security and booking confirmations, may still be sent.' },
    ],
  },
  {
    heading: '7. Payments',
    items: [
      { t: 'p', text: '7.1 Where your club offers online payment of membership fees or other charges, payment is made to the club and processed by Stripe. We do not see or store your full card details.' },
      { t: 'p', text: '7.2 The price, what it covers and any refund are decided by your club. Please contact the club about refunds or payment problems. Your payment is also subject to Stripe\u2019s own terms.' },
    ],
  },
  {
    heading: '8. Ownership',
    items: [
      { t: 'p', text: '8.1 We and our licensors own the Service, including its software, design and branding. You may use it only as these terms allow.' },
      { t: 'p', text: '8.2 Your club owns the club\u2019s content, logo and branding. You keep ownership of anything you add, but you give us and your club a licence to host, copy and display it as needed to provide the Service.' },
    ],
  },
  {
    heading: '9. Availability and changes',
    items: [
      { t: 'p', text: '9.1 We aim to keep the Service running smoothly, but we do not promise that it will always be available or error-free. We may carry out maintenance or change features. Where practical we will give notice of significant changes.' },
      { t: 'p', text: '9.2 Please keep your own record of anything important, such as fixtures and results, in case the Service is temporarily unavailable.' },
    ],
  },
  {
    heading: '10. Liability',
    items: [
      { t: 'p', text: '10.1 Nothing in these terms limits our liability for death or personal injury caused by our negligence, for fraud, or for anything else the law does not allow us to limit. If you are a consumer, your statutory rights are not affected.' },
      { t: 'p', text: '10.2 Subject to 10.1, the Service is provided \u201cas is\u201d. We are not responsible for decisions made by clubs or users, for the content of messages or information entered by others, or for loss caused by events outside our reasonable control, including failures of third-party hosting, payment, messaging or telecoms services.' },
      { t: 'p', text: '10.3 Subject to 10.1, we are not liable for loss of profit, loss of opportunity, loss of data or any indirect or consequential loss. Our total liability to you in connection with the Service is limited to \u00a3100.' },
      { t: 'p', text: '10.4 Your club has its own responsibilities to you. Nothing here affects any claim you may have against your club.' },
    ],
  },
  {
    heading: '11. Suspension and ending',
    items: [
      { t: 'p', text: '11.1 We or your club may suspend or end your access if you break these terms or put the Service or other people at risk. We will give notice where we reasonably can.' },
      { t: 'p', text: '11.2 If a club stops using the Service, its data is handled in line with our agreement with that club and your account may be closed.' },
    ],
  },
  {
    heading: '12. Changes to these terms',
    items: [
      { t: 'p', text: '12.1 We may update these terms from time to time, for example to reflect new features or legal changes. We will give reasonable notice of important changes, for example within the Service or by email. If you keep using the Service after the changes take effect you accept them. If you do not agree, you can close your account.' },
    ],
  },
  {
    heading: '13. Complaints and contact',
    items: [
      { t: 'p', text: '13.1 If you have a question or complaint about the Service, contact us at contact@bowls-time.com. For matters about club rules, bookings or selections, please contact your club first.' },
      { t: 'p', text: '13.2 For privacy questions, contact contact@bowls-time.com. You also have the right to complain to the Information Commissioner\u2019s Office (ico.org.uk).' },
    ],
  },
  {
    heading: '14. General',
    items: [
      { t: 'p', text: '14.1 We may transfer our rights and obligations under these terms to another organisation that takes over the Service, and will tell you if we do.' },
      { t: 'p', text: '14.2 If part of these terms is found to be unenforceable, the rest remains in force. A delay in enforcing a right is not a waiver.' },
      { t: 'p', text: '14.3 These terms are governed by the law of England and Wales. If you are a consumer living elsewhere in the UK you may also bring a claim in your local courts. The courts of England and Wales have jurisdiction over any dispute.' },
    ],
  },
];

export default function TermsOfService() {
  return (
    <LegalDoc
      title={'Bowls Time \u2013 Terms of Service'}
      lastUpdated="21/10/2026"
      sections={SECTIONS}
      crossLinkLabel="Privacy Notice"
      crossLinkTo="/PrivacyNotice"
    />
  );
}