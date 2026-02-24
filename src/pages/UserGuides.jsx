import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, BookOpen, Users, Settings, ClipboardCheck, Trophy, Calendar, Shield, User } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function UserGuides() {
  const [downloading, setDownloading] = React.useState(false);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const response = await base44.functions.invoke('generateUserGuidePDF', {});
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'BowlsTime-User-Guide.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('User guide downloaded');
    } catch (error) {
      toast.error('Failed to download PDF');
    }
    setDownloading(false);
  };

  const sections = [
    {
      icon: BookOpen,
      title: '1. Introduction',
      content: [
        {
          subtitle: 'Overview',
          text: 'Welcome to the Bowls Club Management System. This modern web-based platform helps bowling clubs manage their facilities, members, competitions, and match selections efficiently. The system is designed to be accessible to users of all technical abilities.'
        },
        {
          subtitle: 'Purpose',
          text: 'This application helps clubs to book and manage rink usage, organise team selections, run leagues and competitions, communicate with members, track live scores, and manage memberships.'
        },
        {
          subtitle: 'Logging In',
          text: 'Visit your club\'s BowlsTime URL, click "Sign In", and enter your email and password. New users need to be invited by a club admin.'
        },
        {
          subtitle: 'Basic Navigation',
          text: 'The main menu provides quick access to Rink Booking, Selection, Competitions, Leagues, My Teams, and Notifications.'
        }
      ]
    },
    {
      icon: Users,
      title: '2. User Roles Overview',
      content: [
        {
          subtitle: 'Club Admin',
          text: 'Full access to all club settings, member management, bookings, and features.'
        },
        {
          subtitle: 'Club Selector',
          text: 'Can create match selections and notify players.'
        },
        {
          subtitle: 'Club Live Scorer',
          text: 'Can enter live scores during matches.'
        },
        {
          subtitle: 'Club Member',
          text: 'Can book rinks, view selections, and manage personal availability.'
        },
        {
          subtitle: 'Team Captain',
          text: 'Additional permissions to manage league teams and player rotas.'
        }
      ]
    },
    {
      icon: Shield,
      title: '3. Club Admin Guide',
      content: [
        {
          subtitle: '3.1 Club Settings',
          text: 'Navigate to Admin → Club Settings to configure rink count, opening hours, session duration, club logo, booking approval, notifications, membership types, and competitions.'
        },
        {
          subtitle: '3.2 Member Management',
          text: 'Navigate to Admin → Members to invite new members, approve requests, edit member details, and remove members. You can assign roles and manage locker numbers.'
        },
        {
          subtitle: '3.3 Booking Management',
          text: 'Navigate to Admin → Bookings Admin to approve/reject bookings, move bookings, and create bulk bookings for special events like Open Singles or PBA tournaments.'
        },
        {
          subtitle: '3.4 League Management',
          text: 'Navigate to Admin → Leagues to create leagues, add teams, assign captains, generate fixtures, blacklist dates, auto-book rinks, enter scores, and print league tables.'
        },
        {
          subtitle: '3.5 Competition Management',
          text: 'Create tournaments (knockout or round robin), add players, auto-generate draws, progress winners, and record results.'
        },
        {
          subtitle: '3.6 Match Selection Module',
          text: 'Create new matches, select competition type, pick players, notify selected members, assign rinks, and book rinks with one click.'
        },
        {
          subtitle: '3.7 Live Scoring',
          text: 'Access live scoring module, select the match, input scores for each rink, save and publish updates in real-time.'
        }
      ]
    },
    {
      icon: ClipboardCheck,
      title: '4. Club Selector Guide',
      content: [
        {
          subtitle: 'Creating Selections',
          text: 'Navigate to Selection → New Selection, choose competition, set match date and details, pick players (system shows availability), assign rinks, and publish.'
        },
        {
          subtitle: 'Picking Players',
          text: 'View available members, drag players into positions, or use dropdown menus. Unavailable players are shown in grey. System prevents selecting same player twice.'
        },
        {
          subtitle: 'Publishing',
          text: 'Review selections carefully, click "Publish Selection". Selected players receive notifications (email/SMS) and can confirm availability.'
        }
      ]
    },
    {
      icon: Trophy,
      title: '5. Club Live Scorer Guide',
      content: [
        {
          subtitle: 'Accessing Matches',
          text: 'Navigate to Live Scoring page and select the match you\'re scoring.'
        },
        {
          subtitle: 'Entering Scores',
          text: 'Enter opposition player names, club score, opposition score, and number of ends played for each rink.'
        },
        {
          subtitle: 'Saving & Publishing',
          text: 'Click "Save Scores" to save progress. Scores update live for all members. You can edit scores at any time if corrections needed.'
        }
      ]
    },
    {
      icon: User,
      title: '6. Club Member Guide',
      content: [
        {
          subtitle: '6.1 Booking Rinks',
          text: 'Navigate to Book a Rink, select date, click available time slots (shown in green), confirm booking. Your booking is submitted and may need admin approval.'
        },
        {
          subtitle: '6.2 Availability Management',
          text: 'Go to My Profile → Availability to set unavailability periods (e.g., holidays). Selectors will see you as unavailable during these dates.'
        },
        {
          subtitle: '6.3 Viewing Teams & Leagues',
          text: 'View league tables, fixtures, rink assignments, and match results. Tables update automatically after matches.'
        }
      ]
    },
    {
      icon: Users,
      title: '7. Team Captain Guide',
      content: [
        {
          subtitle: 'Managing Your Team',
          text: 'Navigate to My Teams to add/remove players, manage player availability for fixtures, and create team rotas.'
        },
        {
          subtitle: 'Creating Rotas',
          text: 'Click "Generate Rota" for a fixture. System suggests players based on availability. You can manually adjust and save the rota.'
        }
      ]
    },
    {
      icon: Settings,
      title: '8. Notifications & Communication',
      content: [
        {
          subtitle: 'Email Notifications',
          text: 'Sent automatically for team selections, booking confirmations, rejections, changes, and match reminders.'
        },
        {
          subtitle: 'SMS Notifications',
          text: 'If enabled by club, SMS sent for urgent selections and last-minute changes. Members can opt-in/out in profile settings.'
        }
      ]
    },
    {
      icon: BookOpen,
      title: '9. FAQ',
      content: [
        {
          subtitle: 'I forgot my password',
          text: 'Click "Forgot Password" on login page, enter email, check for reset link, and set new password.'
        },
        {
          subtitle: 'I can\'t see a booking option',
          text: 'Time slot may be booked, your membership may not be approved, or club restricted booking times. Contact admin.'
        },
        {
          subtitle: 'I was selected but cannot play',
          text: 'Open selection notification, mark yourself unavailable. Selector will be notified and can choose replacement.'
        },
        {
          subtitle: 'A score was entered incorrectly',
          text: 'Contact live scorer or club admin to edit the score.'
        },
        {
          subtitle: 'How are league tables calculated?',
          text: 'Win = 2 points, Draw = 1 point, Loss = 0 points. Teams ranked by points, then goal difference if tied.'
        }
      ]
    },
    {
      icon: BookOpen,
      title: '10. Glossary',
      content: [
        { subtitle: 'Rink', text: 'A playing area (lane) on the bowling green. Clubs typically have 4-8 rinks.' },
        { subtitle: 'Fixture', text: 'A scheduled match between two teams in a league or competition.' },
        { subtitle: 'League Table', text: 'Standings showing teams ranked by points and goal difference.' },
        { subtitle: 'Blacklisted Date', text: 'Date range where no fixtures scheduled (e.g., Christmas).' },
        { subtitle: 'Auto-Approval', text: 'Setting where bookings are automatically approved without admin review.' },
        { subtitle: 'Selection Module', text: 'Feature used to pick teams for matches and notify selected players.' },
        { subtitle: 'Team Captain', text: 'Member with additional permissions to manage a league team.' },
        { subtitle: 'Live Scoring', text: 'Real-time score entry during matches, visible to all members.' }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-4">
            <BookOpen className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">User Guides</h1>
          <p className="text-xl text-gray-600 mb-6">Bowls Club Management System</p>
          <Button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Download className="w-4 h-4 mr-2" />
            {downloading ? 'Generating PDF...' : 'Download PDF Guide'}
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-8"
        >
          {sections.map((section, idx) => (
            <Card key={idx} className="border-2 hover:shadow-lg transition-shadow">
              <CardHeader className="bg-gradient-to-r from-emerald-50 to-blue-50">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <section.icon className="w-6 h-6 text-emerald-600" />
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  {section.content.map((item, itemIdx) => (
                    <div key={itemIdx} className="border-l-4 border-emerald-200 pl-4">
                      <h3 className="font-semibold text-lg text-gray-900 mb-2">
                        {item.subtitle}
                      </h3>
                      <p className="text-gray-700 leading-relaxed">
                        {item.text}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-12 text-center"
        >
          <Card className="bg-gradient-to-br from-emerald-50 to-blue-50 border-2 border-emerald-200">
            <CardContent className="py-8">
              <Calendar className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Need More Help?</h3>
              <p className="text-gray-700 mb-4">
                Contact your club administrator for personalized assistance and training.
              </p>
              <p className="text-sm text-gray-500">
                Document generated: {new Date().toLocaleDateString('en-GB', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}