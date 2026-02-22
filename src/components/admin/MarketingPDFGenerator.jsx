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
      const brandColor = [16, 185, 129]; // emerald-600
      const brandDark = [5, 150, 105]; // emerald-700

      // Helper to add full-page gradient background
      const addGradientBg = () => {
        doc.setFillColor(...brandDark);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
      };

      const addWhiteBg = () => {
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
      };

      // PAGE 1: COVER PAGE
      addGradientBg();
      
      let y = 90;
      
      // Logo circle background
      doc.setFillColor(255, 255, 255, 0.1);
      doc.circle(pageWidth / 2, y, 30, 'F');
      
      // Logo text (placeholder for actual logo)
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(pageWidth / 2 - 20, y - 20, 40, 40, 5, 5, 'F');
      doc.setFontSize(24);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(16, 185, 129);
      doc.text('🎳', pageWidth / 2, y + 5, { align: 'center' });
      
      y += 50;
      
      // Badge
      doc.setFillColor(255, 255, 255, 0.2);
      doc.roundedRect(pageWidth / 2 - 45, y, 90, 12, 6, 6, 'F');
      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(255, 255, 255);
      doc.text('⭐ Built for bowls clubs', pageWidth / 2, y + 8, { align: 'center' });
      
      y += 30;
      
      // Title
      doc.setFontSize(48);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('BowlsTime', pageWidth / 2, y, { align: 'center' });
      
      y += 20;
      
      // Subtitle
      doc.setFontSize(18);
      doc.setFont(undefined, 'normal');
      doc.text('Run your bowls club without the hassle', pageWidth / 2, y, { align: 'center' });
      
      y += 25;
      
      // Description
      doc.setFontSize(12);
      doc.setTextColor(240, 240, 240);
      const desc = 'BowlsTime gives your club everything it needs — rink bookings, team selections, leagues, competitions, and member management — all in one easy-to-use platform.';
      const descLines = doc.splitTextToSize(desc, 150);
      doc.text(descLines, pageWidth / 2, y, { align: 'center' });
      
      y += 35;
      
      // Website
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.text('bowls-time.com', pageWidth / 2, y, { align: 'center' });

      // PAGE 2: FEATURES OVERVIEW
      doc.addPage();
      addWhiteBg();
      
      y = 30;
      
      // Section badge
      doc.setFillColor(220, 252, 231);
      doc.roundedRect(margin, y, 35, 8, 4, 4, 'F');
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(5, 150, 105);
      doc.text('FEATURES', margin + 17.5, y + 5.5, { align: 'center' });
      
      y += 18;
      
      // Page title
      doc.setFontSize(28);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(5, 150, 105);
      doc.text('Everything your club needs', margin, y);
      
      y += 10;
      
      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(107, 114, 128);
      doc.text('Six powerful modules, working together. Enable only what your club needs.', margin, y);
      
      y += 20;
      
      // Feature grid
      const features = [
        { emoji: '📅', title: 'Rink Booking', desc: 'Members book rinks online in seconds. Admins get full visibility and approval controls. No more phone calls or paper sign-ups.', bg: [239, 246, 255] },
        { emoji: '📋', title: 'Match Selection', desc: 'Selectors pick teams, publish selections, and players are notified automatically by email. Members can mark their availability.', bg: [254, 242, 242] },
        { emoji: '📊', title: 'League Management', desc: 'Run internal leagues with automated fixture generation, rink booking, score tracking, and live league tables.', bg: [240, 253, 244] },
        { emoji: '🏆', title: 'Competitions', desc: 'Organise knockout tournaments with visual brackets that update automatically as scores are entered.', bg: [254, 249, 195] },
        { emoji: '👥', title: 'Member Management', desc: 'Approve members, manage roles, track locker numbers and membership types — all in one place.', bg: [243, 232, 255] },
        { emoji: '🖨', title: 'Reports & Printing', desc: 'Print team sheets, league tables, and rotas with your club logo — ready for the noticeboard.', bg: [254, 243, 199] }
      ];
      
      let featureX = margin;
      let featureY = y;
      const boxWidth = (contentWidth - 10) / 2;
      const boxHeight = 50;
      
      features.forEach((feature, i) => {
        if (i % 2 === 0 && i > 0) {
          featureY += boxHeight + 10;
          featureX = margin;
        } else if (i % 2 === 1) {
          featureX = margin + boxWidth + 10;
        }
        
        // Box
        doc.setFillColor(...feature.bg);
        doc.roundedRect(featureX, featureY, boxWidth, boxHeight, 3, 3, 'F');
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.2);
        doc.roundedRect(featureX, featureY, boxWidth, boxHeight, 3, 3);
        
        // Emoji icon circle
        doc.setFillColor(255, 255, 255);
        doc.circle(featureX + 10, featureY + 12, 6, 'F');
        doc.setFontSize(14);
        doc.text(feature.emoji, featureX + 10, featureY + 15, { align: 'center' });
        
        // Title
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(31, 41, 55);
        doc.text(feature.title, featureX + 8, featureY + 27);
        
        // Description
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(75, 85, 99);
        const lines = doc.splitTextToSize(feature.desc, boxWidth - 16);
        doc.text(lines, featureX + 8, featureY + 33);
      });

      // PAGE 3: RINK BOOKING DETAIL
      doc.addPage();
      addWhiteBg();
      
      y = 25;
      
      doc.setFillColor(220, 252, 231);
      doc.roundedRect(margin, y, 45, 8, 4, 4, 'F');
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(5, 150, 105);
      doc.text('RINK BOOKING', margin + 22.5, y + 5.5, { align: 'center' });
      
      y += 18;
      
      doc.setFontSize(26);
      doc.setTextColor(5, 150, 105);
      doc.text('Smart Rink Booking System', margin, y);
      
      y += 10;
      
      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(75, 85, 99);
      doc.text('Members can book rinks online 24/7 with instant confirmation. No more phone calls,', margin, y);
      y += 5;
      doc.text('paper diaries, or double bookings.', margin, y);
      
      y += 15;
      
      // Screenshot placeholder
      doc.setDrawColor(229, 231, 235);
      doc.setFillColor(249, 250, 251);
      doc.roundedRect(margin, y, contentWidth, 80, 2, 2, 'FD');
      doc.setFontSize(10);
      doc.setTextColor(156, 163, 175);
      doc.text('Visual availability grid showing all rinks and time slots', pageWidth / 2, y + 40, { align: 'center' });
      
      y += 90;
      
      // Key features
      doc.setFontSize(13);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(31, 41, 55);
      doc.text('Key Features:', margin, y);
      
      y += 8;
      
      const rinkFeatures = [
        'Real-time availability grid showing all rinks and time slots',
        'Members select consecutive slots on the same rink automatically',
        'Admin approval workflow or auto-approve settings',
        'Bulk booking tools for league coordinators',
        'Email notifications when bookings are approved or rejected',
        'Complete booking history and audit trail',
        'Mobile-friendly interface works on any device'
      ];
      
      rinkFeatures.forEach(feature => {
        doc.setFillColor(...brandColor);
        doc.circle(margin + 2, y - 1.5, 1.5, 'F');
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(55, 65, 81);
        const lines = doc.splitTextToSize(feature, contentWidth - 10);
        doc.text(lines, margin + 6, y);
        y += lines.length * 5 + 2;
      });

      // PAGE 4: MATCH SELECTION DETAIL
      doc.addPage();
      addWhiteBg();
      
      y = 25;
      
      doc.setFillColor(254, 242, 242);
      doc.roundedRect(margin, y, 50, 8, 4, 4, 'F');
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(185, 28, 28);
      doc.text('MATCH SELECTION', margin + 25, y + 5.5, { align: 'center' });
      
      y += 18;
      
      doc.setFontSize(26);
      doc.setTextColor(5, 150, 105);
      doc.text('Team Selection Made Easy', margin, y);
      
      y += 10;
      
      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(75, 85, 99);
      doc.text('Selectors can create team sheets in minutes. Members get notified automatically and', margin, y);
      y += 5;
      doc.text('can mark their availability with one click.', margin, y);
      
      y += 15;
      
      // Screenshot placeholder
      doc.setDrawColor(229, 231, 235);
      doc.setFillColor(249, 250, 251);
      doc.roundedRect(margin, y, contentWidth, 80, 2, 2, 'FD');
      doc.setFontSize(10);
      doc.setTextColor(156, 163, 175);
      doc.text('Drag-and-drop team selection interface', pageWidth / 2, y + 40, { align: 'center' });
      
      y += 90;
      
      // Key features
      doc.setFontSize(13);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(31, 41, 55);
      doc.text('Key Features:', margin, y);
      
      y += 8;
      
      const selectionFeatures = [
        'Support for Bramley, Wessex League, Denny, and Top Club formats',
        'Members mark availability directly in the system',
        'Drag-and-drop team building with position assignments',
        'Automatic email notifications to selected players',
        'Rink selection grid to assign home/away rinks',
        'Professional printable team sheets with club logo',
        'Draft mode before publishing to members',
        'Live scoring integration for match tracking'
      ];
      
      selectionFeatures.forEach(feature => {
        doc.setFillColor(...brandColor);
        doc.circle(margin + 2, y - 1.5, 1.5, 'F');
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(55, 65, 81);
        const lines = doc.splitTextToSize(feature, contentWidth - 10);
        doc.text(lines, margin + 6, y);
        y += lines.length * 5 + 2;
      });

      // PAGE 5: LEAGUE MANAGEMENT DETAIL
      doc.addPage();
      addWhiteBg();
      
      y = 25;
      
      doc.setFillColor(240, 253, 244);
      doc.roundedRect(margin, y, 60, 8, 4, 4, 'F');
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(5, 150, 105);
      doc.text('LEAGUE MANAGEMENT', margin + 30, y + 5.5, { align: 'center' });
      
      y += 18;
      
      doc.setFontSize(26);
      doc.setTextColor(5, 150, 105);
      doc.text('Automated League Management', margin, y);
      
      y += 10;
      
      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(75, 85, 99);
      doc.text('Run internal leagues with automatic fixture generation, live league tables, player rotas,', margin, y);
      y += 5;
      doc.text('and integrated rink booking. Everything updates in real-time.', margin, y);
      
      y += 15;
      
      // Screenshot placeholder
      doc.setDrawColor(229, 231, 235);
      doc.setFillColor(249, 250, 251);
      doc.roundedRect(margin, y, contentWidth, 80, 2, 2, 'FD');
      doc.setFontSize(10);
      doc.setTextColor(156, 163, 175);
      doc.text('Live league table with automatic calculations', pageWidth / 2, y + 40, { align: 'center' });
      
      y += 90;
      
      // Key features
      doc.setFontSize(13);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(31, 41, 55);
      doc.text('Key Features:', margin, y);
      
      y += 8;
      
      const leagueFeatures = [
        'Auto-generate round-robin fixtures with smart algorithms',
        'Avoid rink repetition and ensure fair fixture distribution',
        'Blacklist dates to exclude holidays or special events',
        'Automatic rink booking for all league matches',
        'Player rotation system ensures fair game distribution',
        'Live league tables update as scores are entered',
        'Player unavailability tracking for fixture planning',
        'Printable rotas and fixture lists for the noticeboard'
      ];
      
      leagueFeatures.forEach(feature => {
        doc.setFillColor(...brandColor);
        doc.circle(margin + 2, y - 1.5, 1.5, 'F');
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(55, 65, 81);
        const lines = doc.splitTextToSize(feature, contentWidth - 10);
        doc.text(lines, margin + 6, y);
        y += lines.length * 5 + 2;
      });

      // PAGE 6: LIVE SCORING DETAIL
      doc.addPage();
      addWhiteBg();
      
      y = 25;
      
      doc.setFillColor(254, 249, 195);
      doc.roundedRect(margin, y, 40, 8, 4, 4, 'F');
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(161, 98, 7);
      doc.text('LIVE SCORING', margin + 20, y + 5.5, { align: 'center' });
      
      y += 18;
      
      doc.setFontSize(26);
      doc.setTextColor(5, 150, 105);
      doc.text('Real-Time Match Tracking', margin, y);
      
      y += 10;
      
      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(75, 85, 99);
      doc.text('Track match scores live during competitions. Members can follow along in real-time', margin, y);
      y += 5;
      doc.text('with automatic updates and professional match reports.', margin, y);
      
      y += 15;
      
      // Screenshot placeholder
      doc.setDrawColor(229, 231, 235);
      doc.setFillColor(249, 250, 251);
      doc.roundedRect(margin, y, contentWidth, 80, 2, 2, 'FD');
      doc.setFontSize(10);
      doc.setTextColor(156, 163, 175);
      doc.text('Live scoring interface with rink-by-rink breakdown', pageWidth / 2, y + 40, { align: 'center' });
      
      y += 90;
      
      // Key features
      doc.setFontSize(13);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(31, 41, 55);
      doc.text('Key Features:', margin, y);
      
      y += 8;
      
      const scoringFeatures = [
        'Update individual rink scores during the match',
        'Track total ends played per rink',
        'Automatic calculation of total match score',
        'Live banner displays ongoing matches to all members',
        'Enter opposition player names for complete records',
        'Save and update scores progressively throughout the match',
        'Professional match reports generated automatically',
        'Perfect for county and national competitions'
      ];
      
      scoringFeatures.forEach(feature => {
        doc.setFillColor(...brandColor);
        doc.circle(margin + 2, y - 1.5, 1.5, 'F');
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(55, 65, 81);
        const lines = doc.splitTextToSize(feature, contentWidth - 10);
        doc.text(lines, margin + 6, y);
        y += lines.length * 5 + 2;
      });

      // PAGE 7: MEMBER MANAGEMENT DETAIL
      doc.addPage();
      addWhiteBg();
      
      y = 25;
      
      doc.setFillColor(243, 232, 255);
      doc.roundedRect(margin, y, 65, 8, 4, 4, 'F');
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(109, 40, 217);
      doc.text('MEMBER MANAGEMENT', margin + 32.5, y + 5.5, { align: 'center' });
      
      y += 18;
      
      doc.setFontSize(26);
      doc.setTextColor(5, 150, 105);
      doc.text('Complete Member Portal', margin, y);
      
      y += 10;
      
      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(75, 85, 99);
      doc.text('Manage your entire membership database with role-based permissions, membership', margin, y);
      y += 5;
      doc.text('types, and complete audit trails. Members can update their own details.', margin, y);
      
      y += 15;
      
      // Screenshot placeholder
      doc.setDrawColor(229, 231, 235);
      doc.setFillColor(249, 250, 251);
      doc.roundedRect(margin, y, contentWidth, 80, 2, 2, 'FD');
      doc.setFontSize(10);
      doc.setTextColor(156, 163, 175);
      doc.text('Member management dashboard with approval workflow', pageWidth / 2, y + 40, { align: 'center' });
      
      y += 90;
      
      // Key features
      doc.setFontSize(13);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(31, 41, 55);
      doc.text('Key Features:', margin, y);
      
      y += 8;
      
      const memberFeatures = [
        'Approve or reject membership requests',
        'Role-based access (Admin, Selector, Live Scorer, Member)',
        'Track locker numbers and membership types',
        'Bulk upload members via CSV files',
        'Members update their own contact details',
        'Complete audit log of all member changes',
        'Email notification preferences per member',
        'Export member lists for external use'
      ];
      
      memberFeatures.forEach(feature => {
        doc.setFillColor(...brandColor);
        doc.circle(margin + 2, y - 1.5, 1.5, 'F');
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(55, 65, 81);
        const lines = doc.splitTextToSize(feature, contentWidth - 10);
        doc.text(lines, margin + 6, y);
        y += lines.length * 5 + 2;
      });

      // PAGE 8: WHY BOWLSTIME
      doc.addPage();
      addWhiteBg();
      
      y = 30;
      
      doc.setFillColor(220, 252, 231);
      doc.roundedRect(margin, y, 55, 8, 4, 4, 'F');
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(5, 150, 105);
      doc.text('WHY BOWLSTIME', margin + 27.5, y + 5.5, { align: 'center' });
      
      y += 18;
      
      doc.setFontSize(28);
      doc.setTextColor(5, 150, 105);
      doc.text('Designed for clubs,', margin, y);
      y += 11;
      doc.text('not IT departments', margin, y);
      
      y += 10;
      
      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(107, 114, 128);
      doc.text('Simple enough for any member. Powerful enough for administrators.', margin, y);
      
      y += 20;
      
      // Stat boxes
      const stats = [
        { num: '6', label: 'Modules in one\nplatform', bg: [220, 252, 231] },
        { num: '24/7', label: 'Available for your\nmembers', bg: [219, 234, 254] },
        { num: '100%', label: 'Online — no software\nto install', bg: [254, 249, 195] }
      ];
      
      const statWidth = (contentWidth - 20) / 3;
      let statX = margin;
      
      stats.forEach(stat => {
        doc.setFillColor(...stat.bg);
        doc.roundedRect(statX, y, statWidth, 40, 3, 3, 'F');
        
        doc.setFontSize(36);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(5, 150, 105);
        doc.text(stat.num, statX + statWidth / 2, y + 20, { align: 'center' });
        
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(75, 85, 99);
        const labelLines = stat.label.split('\n');
        doc.text(labelLines[0], statX + statWidth / 2, y + 28, { align: 'center' });
        doc.text(labelLines[1], statX + statWidth / 2, y + 33, { align: 'center' });
        
        statX += statWidth + 10;
      });
      
      y += 55;
      
      // Benefits list
      const benefits = [
        'No spreadsheets, no paper forms — everything is managed online, with full audit trails',
        'Works on any device — phone, tablet, or desktop, with a clean responsive design',
        'Email notifications keep players informed when selected or when bookings are approved',
        'Role-based access — different permissions for admins, selectors, live scorers and members',
        'Multiple clubs on one platform — members can belong to more than one club with a single account',
        'Club branding — upload your club logo to appear on all printed team sheets and documents',
        'Enable only what you need — each module can be switched on or off per club'
      ];
      
      benefits.forEach(benefit => {
        doc.setFillColor(...brandColor);
        doc.circle(margin + 2, y - 1.5, 1.5, 'F');
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(55, 65, 81);
        const lines = doc.splitTextToSize(benefit, contentWidth - 10);
        doc.text(lines, margin + 6, y);
        y += lines.length * 5 + 3;
      });

      // PAGE 9: CTA PAGE
      doc.addPage();
      addGradientBg();
      
      y = 110;
      
      doc.setFontSize(38);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('Ready to get started?', pageWidth / 2, y, { align: 'center' });
      
      y += 20;
      
      doc.setFontSize(13);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(240, 240, 240);
      doc.text('Join other bowls clubs already using BowlsTime to save', pageWidth / 2, y, { align: 'center' });
      y += 6;
      doc.text('time, reduce admin, and keep members happy.', pageWidth / 2, y, { align: 'center' });
      
      y += 25;
      
      // CTA Button
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(pageWidth / 2 - 65, y, 130, 18, 9, 9, 'F');
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(5, 150, 105);
      doc.text('Visit bowls-time.com', pageWidth / 2, y + 12, { align: 'center' });
      
      y += 30;
      
      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(220, 220, 220);
      doc.text('Contact your club administrator or platform admin to get set up.', pageWidth / 2, y, { align: 'center' });

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