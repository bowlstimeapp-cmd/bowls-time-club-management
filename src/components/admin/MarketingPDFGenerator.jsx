import React from 'react';
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from 'lucide-react';
import { toast } from "sonner";
import jsPDF from 'jspdf';

export default function MarketingPDFGenerator() {
  const [generating, setGenerating] = React.useState(false);

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);

      // Helper functions
      const addPage = () => {
        doc.addPage();
        return margin;
      };

      const addHeader = (y, text, size = 24) => {
        doc.setFontSize(size);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(16, 185, 129); // emerald-600
        doc.text(text, margin, y);
        return y + 10;
      };

      const addSubheader = (y, text, size = 16) => {
        doc.setFontSize(size);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(31, 41, 55); // gray-800
        doc.text(text, margin, y);
        return y + 8;
      };

      const addText = (y, text, size = 11, maxWidth = contentWidth) => {
        doc.setFontSize(size);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(55, 65, 81); // gray-700
        const lines = doc.splitTextToSize(text, maxWidth);
        doc.text(lines, margin, y);
        return y + (lines.length * 5);
      };

      const addBullet = (y, text, maxWidth = contentWidth - 10) => {
        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(55, 65, 81);
        
        // Add bullet point
        doc.setFillColor(16, 185, 129);
        doc.circle(margin + 2, y - 1.5, 1, 'F');
        
        const lines = doc.splitTextToSize(text, maxWidth);
        doc.text(lines, margin + 6, y);
        return y + (lines.length * 5) + 2;
      };

      const addImagePlaceholder = (y, text, height = 50) => {
        doc.setDrawColor(209, 213, 219); // gray-300
        doc.setFillColor(249, 250, 251); // gray-50
        doc.rect(margin, y, contentWidth, height, 'FD');
        
        doc.setFontSize(10);
        doc.setTextColor(156, 163, 175);
        doc.text(text, pageWidth / 2, y + height / 2, { align: 'center' });
        
        return y + height + 5;
      };

      // PAGE 1: COVER PAGE
      let y = 60;
      
      // Title
      doc.setFontSize(32);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(16, 185, 129);
      doc.text('BowlsTime', pageWidth / 2, y, { align: 'center' });
      
      y += 15;
      doc.setFontSize(20);
      doc.setTextColor(31, 41, 55);
      doc.text('Modern Club Management', pageWidth / 2, y, { align: 'center' });
      
      y += 8;
      doc.setFontSize(16);
      doc.setTextColor(75, 85, 99);
      doc.text('for Bowls Clubs', pageWidth / 2, y, { align: 'center' });
      
      y += 30;
      doc.setFontSize(14);
      doc.setTextColor(55, 65, 81);
      const tagline = 'Save hours every week. Engage your members. Run your club efficiently.';
      doc.text(tagline, pageWidth / 2, y, { align: 'center' });
      
      y += 50;
      doc.setDrawColor(16, 185, 129);
      doc.setLineWidth(0.5);
      doc.rect(margin, y, contentWidth, 60);
      
      doc.setFontSize(11);
      doc.setTextColor(55, 65, 81);
      const features = [
        '✓ Online Rink Booking',
        '✓ Match Team Selection',
        '✓ League Management',
        '✓ Live Match Scoring',
        '✓ Member Portal',
        '✓ Automated Notifications'
      ];
      
      let featureY = y + 10;
      const col1X = margin + 10;
      const col2X = pageWidth / 2 + 5;
      
      features.forEach((feature, i) => {
        const x = i < 3 ? col1X : col2X;
        const offsetY = i < 3 ? i : i - 3;
        doc.text(feature, x, featureY + (offsetY * 8));
      });

      // PAGE 2: THE CHALLENGE
      y = addPage();
      y = addHeader(y, 'The Challenge Facing Bowls Clubs', 20);
      y += 5;
      
      y = addText(y, 'Running a bowls club involves countless hours of volunteer admin work. From coordinating rink bookings to chasing members for match availability, club secretaries, treasurers, and selectors are overwhelmed with manual tasks that take time away from what matters most - the sport itself.');
      y += 8;
      
      y = addSubheader(y, 'Common Pain Points:', 14);
      y += 5;
      
      const painPoints = [
        {
          title: 'Booking Chaos',
          desc: 'Phone calls, paper diaries, double bookings, and constant back-and-forth just to reserve a rink. Members struggle to know what\'s available, and admins spend hours managing requests.'
        },
        {
          title: 'Availability Nightmare',
          desc: 'Chasing members via calls, texts, and emails to find out who\'s available for matches. Team sheets created manually in spreadsheets or on paper, often with last-minute changes.'
        },
        {
          title: 'League Admin Burden',
          desc: 'Manually creating fixtures, tracking scores, calculating league tables, and managing player rotas across multiple teams. One mistake means hours of corrections.'
        },
        {
          title: 'Communication Breakdown',
          desc: 'Members miss important updates because information is scattered across noticeboards, emails, and word-of-mouth. Critical match details get lost in the shuffle.'
        },
        {
          title: 'Scattered Systems',
          desc: 'Club data spread across spreadsheets, notebooks, emails, and phone contacts. No single source of truth, making handovers between volunteers incredibly difficult.'
        }
      ];
      
      painPoints.forEach(point => {
        if (y > pageHeight - 40) {
          y = addPage();
        }
        y = addSubheader(y, point.title, 12);
        y = addText(y, point.desc, 10);
        y += 5;
      });

      // PAGE 3: THE SOLUTION
      y = addPage();
      y = addHeader(y, 'Introducing BowlsTime', 20);
      y += 5;
      
      y = addText(y, 'BowlsTime is a complete club management platform designed specifically for bowls clubs. Everything you need in one place - accessible from any device, requiring no technical knowledge.');
      y += 8;
      
      y = addSubheader(y, 'How BowlsTime Transforms Club Operations:', 14);
      y += 5;
      
      const solutions = [
        {
          title: 'Smart Rink Booking',
          benefit: 'Members book rinks online 24/7 with real-time availability',
          details: 'No more phone tag or diary conflicts. Members see exactly what\'s free and book instantly. Admins approve bookings with one click or set auto-approval. Bulk booking tools save hours for league coordinators.'
        },
        {
          title: 'Effortless Team Selection',
          benefit: 'Create team sheets in minutes, not hours',
          details: 'Selectors see who\'s available at a glance. Drag-and-drop team building makes selection quick and easy. Members get automatic notifications when selected. No more chasing people down.'
        },
        {
          title: 'Automated League Management',
          benefit: 'Fixtures, tables, and rotas handled automatically',
          details: 'Generate round-robin or knockout fixtures instantly. Enter scores and watch league tables update in real-time. Balanced player rotas ensure fair game distribution. Rink bookings created automatically.'
        },
        {
          title: 'Live Match Updates',
          benefit: 'Track scores in real-time during competitions',
          details: 'Update match scores as they happen. Members and supporters can follow along live. Professional match reports generated automatically. Perfect for county and national competitions.'
        },
        {
          title: 'Centralized Member Hub',
          benefit: 'All club information in one secure place',
          details: 'Complete member database with roles and permissions. Members update their own details and availability. Audit logs track all changes. Email notifications keep everyone informed.'
        }
      ];
      
      solutions.forEach(solution => {
        if (y > pageHeight - 50) {
          y = addPage();
        }
        y = addSubheader(y, solution.title, 12);
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(16, 185, 129);
        const benefitLines = doc.splitTextToSize(solution.benefit, contentWidth);
        doc.text(benefitLines, margin, y);
        y += benefitLines.length * 5 + 3;
        
        y = addText(y, solution.details, 10);
        y += 6;
      });

      // PAGE 4: WHO BENEFITS
      y = addPage();
      y = addHeader(y, 'Who Benefits from BowlsTime?', 20);
      y += 10;
      
      const personas = [
        {
          role: 'Club Secretary',
          responsibilities: 'Overall club administration, member management, coordinating committees, handling communications',
          frustrations: [
            'Spending 10+ hours a week on admin tasks',
            'Fielding constant phone calls about bookings and availability',
            'Struggling to keep member records up to date',
            'Difficult handover when stepping down from the role'
          ],
          benefits: [
            'Reduce admin time by 70% with automated systems',
            'Members self-serve for bookings and availability',
            'Complete member database with automatic updates',
            'Everything documented for seamless handovers'
          ]
        },
        {
          role: 'Match Selector',
          responsibilities: 'Picking teams for matches, managing player availability, coordinating with captains, ensuring fair selection',
          frustrations: [
            'Chasing members via multiple channels to check availability',
            'Last-minute dropouts requiring emergency replacements',
            'Manually creating and distributing team sheets',
            'Complaints about selection transparency'
          ],
          benefits: [
            'See availability instantly in one dashboard',
            'Automatic notifications to selected players',
            'Professional team sheets generated in seconds',
            'Clear selection history for transparency'
          ]
        },
        {
          role: 'League Coordinator',
          responsibilities: 'Creating fixtures, managing league tables, tracking results, coordinating match days, ensuring fair play',
          frustrations: [
            'Hours spent creating balanced fixtures manually',
            'Calculating league tables and goal differences in spreadsheets',
            'Booking rinks for every league match individually',
            'Ensuring players get equal game time'
          ],
          benefits: [
            'Generate fixtures automatically with smart algorithms',
            'League tables update instantly when scores are entered',
            'Rink bookings created automatically for all matches',
            'Balanced player rotas ensure fair distribution'
          ]
        }
      ];
      
      personas.forEach(persona => {
        if (y > pageHeight - 40) {
          y = addPage();
        }
        
        y = addSubheader(y, persona.role, 14);
        y += 3;
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'italic');
        doc.setTextColor(107, 114, 128);
        const respLines = doc.splitTextToSize(persona.responsibilities, contentWidth);
        doc.text(respLines, margin, y);
        y += respLines.length * 4 + 5;
        
        y = addSubheader(y, 'Current Frustrations:', 11);
        y += 3;
        persona.frustrations.forEach(frustration => {
          y = addBullet(y, frustration);
        });
        
        y += 3;
        y = addSubheader(y, 'How BowlsTime Helps:', 11);
        y += 3;
        persona.benefits.forEach(benefit => {
          doc.setFillColor(16, 185, 129);
          doc.circle(margin + 2, y - 1.5, 1, 'F');
          
          doc.setFontSize(11);
          doc.setFont(undefined, 'normal');
          doc.setTextColor(16, 185, 129);
          const lines = doc.splitTextToSize(benefit, contentWidth - 10);
          doc.text(lines, margin + 6, y);
          y += lines.length * 5 + 2;
        });
        
        y += 8;
      });

      // PAGE 5: KEY FEATURES IN DETAIL
      y = addPage();
      y = addHeader(y, 'Key Features', 20);
      y += 8;
      
      y = addSubheader(y, 'Rink Booking System', 13);
      y += 3;
      y = addBullet(y, 'Visual availability grid showing all rinks and time slots');
      y = addBullet(y, 'Members book online 24/7 from any device');
      y = addBullet(y, 'Admin approval workflow or auto-approval options');
      y = addBullet(y, 'Bulk booking tools for league coordinators');
      y = addBullet(y, 'Booking history and audit trail');
      y += 5;
      y = addImagePlaceholder(y, '[Screenshot: Rink booking grid with availability]', 45);
      y += 5;
      
      if (y > pageHeight - 80) y = addPage();
      
      y = addSubheader(y, 'Match Selection Module', 13);
      y += 3;
      y = addBullet(y, 'Create selections for Bramley, Wessex League, Denny, Top Club');
      y = addBullet(y, 'Members mark availability with one click');
      y = addBullet(y, 'Drag-and-drop team builder for quick selection');
      y = addBullet(y, 'Automatic email notifications to selected players');
      y = addBullet(y, 'Print-ready team sheets');
      y += 5;
      y = addImagePlaceholder(y, '[Screenshot: Team selection interface]', 45);
      y += 5;
      
      y = addPage();
      
      y = addSubheader(y, 'League Management', 13);
      y += 3;
      y = addBullet(y, 'Auto-generate round-robin or knockout fixtures');
      y = addBullet(y, 'Real-time league tables with automatic calculations');
      y = addBullet(y, 'Player rota system for fair game distribution');
      y = addBullet(y, 'Score entry and match tracking');
      y = addBullet(y, 'Integrated rink booking for league matches');
      y += 5;
      y = addImagePlaceholder(y, '[Screenshot: League table and fixtures]', 45);
      y += 5;
      
      if (y > pageHeight - 80) y = addPage();
      
      y = addSubheader(y, 'Live Match Scoring', 13);
      y += 3;
      y = addBullet(y, 'Update scores in real-time during matches');
      y = addBullet(y, 'Track individual rink scores and total ends');
      y = addBullet(y, 'Live banners show ongoing matches to all members');
      y = addBullet(y, 'Automatic match reports and statistics');
      y += 5;
      y = addImagePlaceholder(y, '[Screenshot: Live scoring interface]', 45);
      
      // PAGE 6: MEMBER EXPERIENCE
      y = addPage();
      y = addHeader(y, 'Easy for Everyone', 20);
      y += 5;
      
      y = addText(y, 'BowlsTime is designed for bowls club members and volunteers - not IT experts. Everything is straightforward and intuitive.');
      y += 8;
      
      y = addSubheader(y, 'For Members:', 13);
      y += 3;
      y = addBullet(y, 'Works on any device - phone, tablet, or computer');
      y = addBullet(y, 'Simple login and user-friendly interface');
      y = addBullet(y, 'Automatic notifications for selections and updates');
      y = addBullet(y, 'Mark availability and view team sheets instantly');
      y = addBullet(y, 'Access club information anytime, anywhere');
      y += 8;
      
      y = addSubheader(y, 'For Administrators:', 13);
      y += 3;
      y = addBullet(y, 'No technical knowledge required - just point and click');
      y = addBullet(y, 'Comprehensive admin dashboard for club oversight');
      y = addBullet(y, 'Role-based permissions (Admin, Selector, Live Scorer, Member)');
      y = addBullet(y, 'Audit logs track all changes for accountability');
      y = addBullet(y, 'Flexible configuration for your club\'s needs');
      y += 8;
      
      y = addSubheader(y, 'Setup & Support:', 13);
      y += 3;
      y = addBullet(y, 'Quick setup process - we handle the configuration');
      y = addBullet(y, 'Training provided for your admin team');
      y = addBullet(y, 'Ongoing support whenever you need it');
      y = addBullet(y, 'Regular updates and new features at no extra cost');

      // PAGE 7: REAL BENEFITS
      y = addPage();
      y = addHeader(y, 'The Real Impact', 20);
      y += 5;
      
      y = addSubheader(y, 'Time Savings', 14);
      y += 3;
      const timeSavings = [
        'Reduce booking admin from hours per week to minutes',
        'Cut team selection time by 80%',
        'Eliminate manual league table calculations',
        'Stop chasing members for availability',
        'Automate member communications'
      ];
      timeSavings.forEach(saving => {
        y = addBullet(y, saving);
      });
      y += 8;
      
      y = addSubheader(y, 'Improved Member Experience', 14);
      y += 3;
      const memberExp = [
        'Members love the convenience of online booking',
        'Instant visibility of selections and matches',
        'Never miss important club updates',
        'Easy access to club information',
        'Professional appearance enhances club reputation'
      ];
      memberExp.forEach(exp => {
        y = addBullet(y, exp);
      });
      y += 8;
      
      y = addSubheader(y, 'Better Club Management', 14);
      y += 3;
      const management = [
        'Single source of truth for all club data',
        'Complete visibility and transparency',
        'Easier volunteer recruitment and handovers',
        'Data-driven insights into club operations',
        'Reduced conflicts and confusion'
      ];
      management.forEach(item => {
        y = addBullet(y, item);
      });

      // PAGE 8: CALL TO ACTION
      y = addPage();
      y = addHeader(y, 'Ready to Transform Your Club?', 20);
      y += 10;
      
      y = addText(y, 'Join the growing community of bowls clubs using BowlsTime to save time, reduce admin burden, and improve member experience.');
      y += 10;
      
      // Pricing box
      doc.setDrawColor(16, 185, 129);
      doc.setLineWidth(1);
      doc.rect(margin, y, contentWidth, 45);
      
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(16, 185, 129);
      doc.text('Get Started Today', pageWidth / 2, y + 10, { align: 'center' });
      
      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(55, 65, 81);
      doc.text('Contact us for a personalized demo and pricing', pageWidth / 2, y + 18, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(16, 185, 129);
      doc.text('Email: contact@bowlstime.com', pageWidth / 2, y + 28, { align: 'center' });
      
      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(55, 65, 81);
      doc.text('Visit: www.bowlstime.com', pageWidth / 2, y + 36, { align: 'center' });
      
      y += 55;
      
      y = addSubheader(y, 'What Happens Next?', 13);
      y += 3;
      const nextSteps = [
        '1. Schedule a free consultation and live demo',
        '2. We configure BowlsTime for your club\'s specific needs',
        '3. Train your admin team and key volunteers',
        '4. Launch to your members with our support',
        '5. Start saving time and improving member experience'
      ];
      nextSteps.forEach(step => {
        y = addBullet(y, step);
      });
      
      y += 15;
      
      // Footer box
      doc.setFillColor(249, 250, 251);
      doc.rect(margin, y, contentWidth, 25, 'F');
      
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      const footerText = [
        'BowlsTime - Modern Club Management for Bowls Clubs',
        'Everything you need in one place. No technical knowledge required.',
        '© 2026 BowlsTime. All rights reserved.'
      ];
      
      let footerY = y + 7;
      footerText.forEach(text => {
        doc.text(text, pageWidth / 2, footerY, { align: 'center' });
        footerY += 5;
      });

      // Save the PDF
      doc.save('BowlsTime-Marketing-Pack.pdf');
      toast.success('Marketing PDF downloaded successfully');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button
      onClick={generatePDF}
      disabled={generating}
      className="bg-emerald-600 hover:bg-emerald-700"
    >
      {generating ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <FileDown className="w-4 h-4 mr-2" />
      )}
      Download Marketing PDF
    </Button>
  );
}