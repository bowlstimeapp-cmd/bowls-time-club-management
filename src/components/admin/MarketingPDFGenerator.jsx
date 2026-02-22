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

      // Helper functions
      const addPage = () => {
        doc.addPage();
        return margin;
      };

      const addHeader = (y, text, size = 24) => {
        doc.setFontSize(size);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...brandColor);
        doc.text(text, margin, y);
        return y + 10;
      };

      const addBox = (y, height, fillColor = [249, 250, 251]) => {
        doc.setDrawColor(229, 231, 235);
        doc.setFillColor(...fillColor);
        doc.rect(margin, y, contentWidth, height, 'FD');
      };

      const addBrandBar = (y, height = 3) => {
        doc.setFillColor(...brandColor);
        doc.rect(0, y, pageWidth, height, 'F');
        return y + height;
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

      const addBullet = (y, text, maxWidth = contentWidth - 10, green = false) => {
        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(55, 65, 81);
        
        // Add bullet point
        if (green) {
          doc.setFillColor(...brandColor);
          doc.setTextColor(...brandColor);
        } else {
          doc.setFillColor(107, 114, 128);
        }
        doc.circle(margin + 2, y - 1.5, 1, 'F');
        
        const lines = doc.splitTextToSize(text, maxWidth);
        doc.text(lines, margin + 6, y);
        
        if (green) doc.setTextColor(55, 65, 81);
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
      // Brand bar at top
      let y = 0;
      y = addBrandBar(y, 4);
      
      y = 70;
      
      // Logo area
      doc.setFillColor(240, 253, 244); // emerald-50
      doc.roundedRect(pageWidth / 2 - 25, y - 15, 50, 50, 3, 3, 'F');
      
      doc.setFontSize(28);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...brandColor);
      doc.text('BowlsTime', pageWidth / 2, y + 10, { align: 'center' });
      
      y += 30;
      doc.setFontSize(22);
      doc.setTextColor(31, 41, 55);
      doc.text('Modern Club Management', pageWidth / 2, y, { align: 'center' });
      
      y += 10;
      doc.setFontSize(18);
      doc.setTextColor(75, 85, 99);
      doc.text('for Bowls Clubs', pageWidth / 2, y, { align: 'center' });
      
      y += 25;
      doc.setFontSize(13);
      doc.setTextColor(107, 114, 128);
      doc.text('Save hours every week • Engage members • Run efficiently', pageWidth / 2, y, { align: 'center' });
      
      y += 35;
      
      // Feature highlights box
      addBox(y, 75, [240, 253, 244]);
      doc.setDrawColor(...brandColor);
      doc.setLineWidth(0.8);
      doc.roundedRect(margin, y, contentWidth, 75, 2, 2);
      
      y += 10;
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...brandColor);
      doc.text('Everything Your Club Needs', pageWidth / 2, y, { align: 'center' });
      
      y += 10;
      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(55, 65, 81);
      const features = [
        'Online Rink Booking',
        'Match Team Selection', 
        'League Management',
        'Live Match Scoring',
        'Member Portal',
        'Automated Notifications'
      ];
      
      const col1X = margin + 15;
      const col2X = pageWidth / 2 + 10;
      
      features.forEach((feature, i) => {
        const x = i < 3 ? col1X : col2X;
        const offsetY = i < 3 ? i : i - 3;
        
        doc.setFillColor(...brandColor);
        doc.circle(x, y + 10 + (offsetY * 10) - 1.5, 1.5, 'F');
        doc.text(feature, x + 5, y + 10 + (offsetY * 10));
      });

      y += 100;
      
      // Footer on cover
      doc.setFillColor(249, 250, 251);
      doc.rect(0, pageHeight - 25, pageWidth, 25, 'F');
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      doc.text('Professional • User-Friendly • Time-Saving', pageWidth / 2, pageHeight - 12, { align: 'center' });

      // PAGE 2: THE CHALLENGE
      y = addPage();
      y = addBrandBar(y, 3);
      y += 20;
      y = addHeader(y, 'The Challenge Facing Bowls Clubs', 22);
      y += 3;
      
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
      
      painPoints.forEach((point, idx) => {
        if (y > pageHeight - 50) {
          y = addPage();
          y = addBrandBar(y, 3);
          y += 20;
        }
        
        // Box for each pain point
        addBox(y, 32, idx % 2 === 0 ? [254, 242, 242] : [255, 247, 237]);
        
        y += 8;
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(220, 38, 38);
        doc.text(`${idx + 1}. ${point.title}`, margin + 5, y);
        
        y += 6;
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(55, 65, 81);
        const lines = doc.splitTextToSize(point.desc, contentWidth - 10);
        doc.text(lines, margin + 5, y);
        
        y += 32 - 14 + 6;
      });

      // PAGE 3: THE SOLUTION
      y = addPage();
      y = addBrandBar(y, 3);
      y += 20;
      y = addHeader(y, 'Introducing BowlsTime', 22);
      y += 3;
      
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
      
      solutions.forEach((solution, idx) => {
        if (y > pageHeight - 55) {
          y = addPage();
          y = addBrandBar(y, 3);
          y += 20;
        }
        
        // Box for each solution
        addBox(y, 38, [240, 253, 244]);
        doc.setDrawColor(...brandColor);
        doc.setLineWidth(0.3);
        doc.roundedRect(margin, y, contentWidth, 38, 1, 1);
        
        y += 7;
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...brandColor);
        doc.text(`✓ ${solution.title}`, margin + 5, y);
        
        y += 5;
        doc.setFontSize(10);
        doc.setFont(undefined, 'italic');
        doc.setTextColor(22, 101, 52);
        const benefitLines = doc.splitTextToSize(solution.benefit, contentWidth - 10);
        doc.text(benefitLines, margin + 5, y);
        y += benefitLines.length * 4 + 2;
        
        doc.setFont(undefined, 'normal');
        doc.setTextColor(55, 65, 81);
        const detailLines = doc.splitTextToSize(solution.details, contentWidth - 10);
        doc.text(detailLines, margin + 5, y);
        
        y += 38 - (7 + 5 + benefitLines.length * 4 + 2) + 6;
      });

      // PAGE 4: WHO BENEFITS
      y = addPage();
      y = addBrandBar(y, 3);
      y += 20;
      y = addHeader(y, 'Who Benefits from BowlsTime?', 22);
      y += 8;
      
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
      
      personas.forEach((persona, idx) => {
        if (y > pageHeight - 45) {
          y = addPage();
          y = addBrandBar(y, 3);
          y += 20;
        }
        
        // Persona header box
        addBox(y, 12, [240, 253, 244]);
        y += 8;
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...brandColor);
        doc.text(`${idx + 1}. ${persona.role}`, margin + 3, y);
        y += 8;
        
        doc.setFontSize(9);
        doc.setFont(undefined, 'italic');
        doc.setTextColor(107, 114, 128);
        const respLines = doc.splitTextToSize(persona.responsibilities, contentWidth - 6);
        doc.text(respLines, margin + 3, y);
        y += respLines.length * 4 + 6;
        
        // Frustrations
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(75, 85, 99);
        doc.text('Pain Points:', margin + 3, y);
        y += 5;
        
        persona.frustrations.slice(0, 3).forEach(frustration => {
          y = addBullet(y, frustration, contentWidth - 12);
        });
        
        y += 3;
        
        // Benefits
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...brandColor);
        doc.text('How BowlsTime Helps:', margin + 3, y);
        y += 5;
        
        persona.benefits.slice(0, 3).forEach(benefit => {
          y = addBullet(y, benefit, contentWidth - 12, true);
        });
        
        y += 10;
      });

      // PAGE 5: KEY FEATURES IN DETAIL
      y = addPage();
      y = addBrandBar(y, 3);
      y += 20;
      y = addHeader(y, 'Key Features in Detail', 22);
      y += 8;
      
      // Feature 1: Rink Booking
      addBox(y, 8, [...brandColor]);
      doc.setFontSize(13);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('1. Smart Rink Booking System', margin + 3, y + 5.5);
      y += 11;
      
      y = addBullet(y, 'Visual grid shows real-time rink availability');
      y = addBullet(y, 'Members book 24/7 from any device');
      y = addBullet(y, 'Admin approval or auto-approve options');
      y = addBullet(y, 'Bulk booking for league coordinators');
      y += 5;
      y = addImagePlaceholder(y, 'Rink Booking Interface - See real-time availability', 40);
      y += 5;
      
      // Feature 2: Match Selection
      if (y > pageHeight - 85) {
        y = addPage();
        y = addBrandBar(y, 3);
        y += 20;
      }
      
      addBox(y, 8, [...brandColor]);
      doc.setFontSize(13);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('2. Match Team Selection', margin + 3, y + 5.5);
      y += 11;
      
      y = addBullet(y, 'Create selections for all competition types');
      y = addBullet(y, 'Members mark availability instantly');
      y = addBullet(y, 'Drag-and-drop team building');
      y = addBullet(y, 'Auto-notifications to selected players');
      y += 5;
      y = addImagePlaceholder(y, 'Team Selection & Team Sheets', 40);
      y += 5;
      
      // Feature 3: League Management
      if (y > pageHeight - 40) {
        y = addPage();
        y = addBrandBar(y, 3);
        y += 20;
      }
      
      addBox(y, 8, [...brandColor]);
      doc.setFontSize(13);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('3. League Management', margin + 3, y + 5.5);
      y += 11;
      
      y = addBullet(y, 'Auto-generate fixtures with smart algorithms');
      y = addBullet(y, 'Live league tables update automatically');
      y = addBullet(y, 'Player rotation for fair distribution');
      y = addBullet(y, 'Integrated rink booking for matches');
      y += 5;
      y = addImagePlaceholder(y, 'League Setup & Live Tables', 40);
      y += 5;
      
      // PAGE 6: MEMBER EXPERIENCE
      y = addPage();
      y = addBrandBar(y, 3);
      y += 20;
      y = addHeader(y, 'Easy for Everyone', 22);
      y += 5;
      
      y = addText(y, 'BowlsTime is designed for bowls club members and volunteers - not IT experts. Everything is straightforward and intuitive.');
      y += 8;
      
      // Members section
      addBox(y, 35, [240, 253, 244]);
      y += 7;
      y = addSubheader(y, 'For Members:', 13);
      y += 4;
      y = addBullet(y, 'Works on any device - mobile, tablet, desktop', contentWidth - 10);
      y = addBullet(y, 'Simple login with instant notifications', contentWidth - 10);
      y = addBullet(y, 'Mark availability and view teams in seconds', contentWidth - 10);
      y = addBullet(y, 'Access club info 24/7 from anywhere', contentWidth - 10);
      y += 6;
      
      // Admins section
      if (y > pageHeight - 50) {
        y = addPage();
        y = addBrandBar(y, 3);
        y += 20;
      }
      
      addBox(y, 40, [254, 249, 195]);
      y += 7;
      y = addSubheader(y, 'For Administrators:', 13);
      y += 4;
      y = addBullet(y, 'No technical knowledge required', contentWidth - 10);
      y = addBullet(y, 'Comprehensive dashboard for oversight', contentWidth - 10);
      y = addBullet(y, 'Role-based permissions (Admin, Selector, Scorer)', contentWidth - 10);
      y = addBullet(y, 'Complete audit trail for accountability', contentWidth - 10);
      y = addBullet(y, 'Flexible configuration options', contentWidth - 10);
      y += 6;
      
      // Support section
      addBox(y, 28, [243, 244, 246]);
      y += 7;
      y = addSubheader(y, 'Setup & Support:', 13);
      y += 4;
      y = addBullet(y, 'Quick setup - we configure everything', contentWidth - 10);
      y = addBullet(y, 'Training for your admin team included', contentWidth - 10);
      y = addBullet(y, 'Ongoing support and regular updates', contentWidth - 10);
      y += 6;

      // PAGE 7: REAL BENEFITS
      y = addPage();
      y = addBrandBar(y, 3);
      y += 20;
      y = addHeader(y, 'The Real Impact', 22);
      y += 5;
      
      // Impact boxes
      addBox(y, 40, [240, 253, 244]);
      doc.setDrawColor(...brandColor);
      doc.setLineWidth(0.5);
      doc.roundedRect(margin, y, contentWidth, 40, 2, 2);
      y += 8;
      y = addSubheader(y, '⏰ Save Hours Every Week', 13);
      y += 4;
      y = addBullet(y, 'Booking admin: hours → minutes', contentWidth - 10);
      y = addBullet(y, 'Team selection: 80% faster', contentWidth - 10);
      y = addBullet(y, 'No manual table calculations', contentWidth - 10);
      y = addBullet(y, 'Auto member communications', contentWidth - 10);
      y += 7;
      
      addBox(y, 38, [254, 249, 195]);
      doc.setDrawColor(...brandColor);
      doc.roundedRect(margin, y, contentWidth, 38, 2, 2);
      y += 8;
      y = addSubheader(y, '😊 Better Member Experience', 13);
      y += 4;
      y = addBullet(y, 'Convenient online booking loved by members', contentWidth - 10);
      y = addBullet(y, 'Instant visibility of teams and matches', contentWidth - 10);
      y = addBullet(y, 'Never miss club updates', contentWidth - 10);
      y = addBullet(y, 'Professional, modern appearance', contentWidth - 10);
      y += 7;
      
      addBox(y, 35, [243, 232, 255]);
      doc.setDrawColor(...brandColor);
      doc.roundedRect(margin, y, contentWidth, 35, 2, 2);
      y += 8;
      y = addSubheader(y, '📊 Smarter Club Management', 13);
      y += 4;
      y = addBullet(y, 'Single source of truth for all data', contentWidth - 10);
      y = addBullet(y, 'Complete transparency and audit trail', contentWidth - 10);
      y = addBullet(y, 'Easier volunteer handovers', contentWidth - 10);
      y = addBullet(y, 'Data-driven decision making', contentWidth - 10);
      y += 7;

      // PAGE 8: CALL TO ACTION
      y = addPage();
      y = addBrandBar(y, 3);
      y += 30;
      
      // Large header
      doc.setFontSize(26);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...brandColor);
      doc.text('Ready to Transform', pageWidth / 2, y, { align: 'center' });
      y += 10;
      doc.text('Your Club?', pageWidth / 2, y, { align: 'center' });
      y += 15;
      
      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(75, 85, 99);
      doc.text('Join clubs already saving hours every week', pageWidth / 2, y, { align: 'center' });
      y += 15;
      
      // Contact box
      addBox(y, 55, [240, 253, 244]);
      doc.setDrawColor(...brandColor);
      doc.setLineWidth(1.2);
      doc.roundedRect(margin, y, contentWidth, 55, 3, 3);
      
      y += 12;
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...brandColor);
      doc.text('Get Started Today', pageWidth / 2, y, { align: 'center' });
      
      y += 10;
      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(55, 65, 81);
      doc.text('Contact us for a personalized demo and pricing', pageWidth / 2, y, { align: 'center' });
      
      y += 12;
      doc.setFontSize(13);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(31, 41, 55);
      doc.text('📧 contact@bowlstime.com', pageWidth / 2, y, { align: 'center' });
      
      y += 8;
      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
      doc.text('🌐 www.bowlstime.com', pageWidth / 2, y, { align: 'center' });
      
      y += 15;
      
      y = addSubheader(y, 'Your Journey to Success:', 13);
      y += 5;
      
      const steps = [
        '1️⃣  Free consultation and live demo',
        '2️⃣  Custom configuration for your club',
        '3️⃣  Admin team training included',
        '4️⃣  Launch with full support',
        '5️⃣  Start saving time immediately'
      ];
      
      steps.forEach((step, idx) => {
        addBox(y, 8, idx % 2 === 0 ? [243, 244, 246] : [255, 255, 255]);
        y += 5.5;
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(55, 65, 81);
        doc.text(step, margin + 5, y);
        y += 5.5;
      });
      
      y += 10;
      
      // Footer brand bar
      doc.setFillColor(...brandColor);
      doc.rect(0, pageHeight - 30, pageWidth, 30, 'F');
      
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('BowlsTime', pageWidth / 2, pageHeight - 18, { align: 'center' });
      
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.text('Modern Club Management • Time-Saving • Member-Focused', pageWidth / 2, pageHeight - 11, { align: 'center' });
      
      doc.setFontSize(8);
      doc.text('© 2026 BowlsTime. All rights reserved.', pageWidth / 2, pageHeight - 5, { align: 'center' });

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