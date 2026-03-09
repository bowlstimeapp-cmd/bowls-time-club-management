import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Save, 
  Send, 
  ArrowLeft,
  Loader2,
  ShieldAlert,
  Home,
  CalendarPlus,
  Printer
} from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import RinkSelectionGrid from '@/components/selection/RinkSelectionGrid';
import TopClubSelectionGrid from '@/components/selection/TopClubSelectionGrid';
import InfoTooltip from '@/components/InfoTooltip';
import RinkClashModal from '@/components/booking/RinkClashModal';

const APP_BASE_URL = window.location.origin;

export default function SelectionEditor() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const selectionId = searchParams.get('selectionId');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [user, setUser] = useState(null);
  const [competition, setCompetition] = useState('');
  const [matchDate, setMatchDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [matchName, setMatchName] = useState('');
  const [selections, setSelections] = useState({});
  const [originalSelections, setOriginalSelections] = useState({});
  const [homeRinks, setHomeRinks] = useState(2);
  const [selectedRinks, setSelectedRinks] = useState([1, 2]);
  const [matchStartTime, setMatchStartTime] = useState('10:00');
  const [matchEndTime, setMatchEndTime] = useState('14:00');
  const [clashModalOpen, setClashModalOpen] = useState(false);
  const [clashData, setClashData] = useState({ clashes: [], nonClashingBookings: [] });

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (!clubId) {
      navigate(createPageUrl('ClubSelector'));
    }
  }, [clubId, navigate]);

  const { data: membership } = useQuery({
    queryKey: ['myMembership', clubId, user?.email],
    queryFn: async () => {
      const memberships = await base44.entities.ClubMembership.filter({ 
        club_id: clubId, 
        user_email: user.email 
      });
      return memberships[0];
    },
    enabled: !!clubId && !!user?.email,
  });

  const { data: existingSelection } = useQuery({
    queryKey: ['selection', selectionId],
    queryFn: async () => {
      const selections = await base44.entities.TeamSelection.filter({ id: selectionId });
      return selections[0];
    },
    enabled: !!selectionId,
  });

  useEffect(() => {
    if (existingSelection) {
      setCompetition(existingSelection.competition);
      setMatchDate(existingSelection.match_date);
      setMatchName(existingSelection.match_name || '');
      setSelections(existingSelection.selections || {});
      setOriginalSelections(existingSelection.selections || {});
      setHomeRinks(existingSelection.home_rinks || 2);
      setSelectedRinks(existingSelection.selected_rinks || [1, 2]);
      setMatchStartTime(existingSelection.match_start_time || '10:00');
      setMatchEndTime(existingSelection.match_end_time || '14:00');
    }
  }, [existingSelection]);

  const { data: members = [] } = useQuery({
    queryKey: ['clubMembers', clubId],
    queryFn: () => base44.entities.ClubMembership.filter({ 
      club_id: clubId, 
      status: 'approved' 
    }),
    enabled: !!clubId,
  });

  const { data: club } = useQuery({
    queryKey: ['club', clubId],
    queryFn: async () => {
      const clubs = await base44.entities.Club.filter({ id: clubId });
      return clubs[0];
    },
    enabled: !!clubId,
  });

  const { data: clubCompetitions = [] } = useQuery({
    queryKey: ['competitions', clubId],
    queryFn: () => base44.entities.Competition.filter({ club_id: clubId }),
    enabled: !!clubId,
  });

  const { data: platformCompetitions = [] } = useQuery({
    queryKey: ['platformCompetitions'],
    queryFn: async () => {
      const allComps = await base44.entities.Competition.list();
      return allComps.filter(c => !c.club_id);
    },
  });

  const allCompetitions = [...platformCompetitions, ...clubCompetitions];
  
  // Filter competitions by club's season (indoor/outdoor)
  const competitions = allCompetitions.filter(comp => comp.season === club?.season);

  const { data: existingBookings = [] } = useQuery({
    queryKey: ['bookings', clubId, matchDate],
    queryFn: () => base44.entities.Booking.filter({ club_id: clubId, date: matchDate }),
    enabled: !!clubId && !!matchDate,
  });

  const createBookingMutation = useMutation({
    mutationFn: (data) => base44.entities.Booking.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });

  const { data: unavailabilities = [] } = useQuery({
    queryKey: ['allUnavailabilities'],
    queryFn: () => base44.entities.UserUnavailability.list(),
  });

  const { data: existingAvailabilities = [] } = useQuery({
    queryKey: ['selectionAvailabilities', selectionId],
    queryFn: () => base44.entities.MemberAvailability.filter({ selection_id: selectionId }),
    enabled: !!selectionId,
  });

  const deleteAvailabilityMutation = useMutation({
    mutationFn: (id) => base44.entities.MemberAvailability.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['selectionAvailabilities'] });
    },
  });

  const isSelector = membership?.role === 'selector' || membership?.role === 'admin';

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TeamSelection.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['selections'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TeamSelection.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['selections'] });
      queryClient.invalidateQueries({ queryKey: ['selection', selectionId] });
    },
  });

  const generateTimeSlots = () => {
    if (!club) return [];
    const slots = [];
    const [openHour] = (club.opening_time || '10:00').split(':').map(Number);
    const [closeHour] = (club.closing_time || '21:00').split(':').map(Number);
    const duration = club.session_duration || 2;
    
    for (let hour = openHour; hour + duration <= closeHour; hour += duration) {
      slots.push(`${String(hour).padStart(2, '0')}:00`);
    }
    return slots;
  };

  const sendSelectionEmails = async (savedSelectionId) => {
    // Get all selected player emails
    const selectedPlayerEmails = [...new Set(Object.values(selections).filter(Boolean))];
    
    // Create notifications for all selected players
    const notificationsToCreate = selectedPlayerEmails.map(email => ({
      user_email: email,
      type: 'team_selection',
      title: 'Selected for Match',
      message: `You've been selected for ${competition}${matchName ? ' vs ' + matchName : ''} on ${format(new Date(matchDate), 'd MMMM yyyy')}. View details at app.bowls-time.com `,
    }));
    
    await base44.entities.Notification.bulkCreate(notificationsToCreate);
    
    // Build team list for notifications
    const teamList = Object.entries(selections)
      .filter(([_, email]) => email)
      .map(([pos, email]) => {
        const member = members.find(m => m.user_email === email);
        const name = member?.first_name && member?.surname 
          ? `${member.first_name} ${member.surname}` 
          : member?.user_name || email;
        return `${pos.replace('rink', 'Rink ').replace('_', ' ')}: ${name}`;
      })
      .join('\n');

    const matchUrl = `${APP_BASE_URL}${createPageUrl('SelectionView')}?clubId=${clubId}&selectionId=${savedSelectionId}`;
    
 // Email notifications
if (club?.email_member_notifications) {
  const emailMembers = members.filter(m => 
    selectedPlayerEmails.includes(m.user_email) && 
    m.email_notifications !== false
  );

  for (const member of emailMembers) {
    const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#f4f4f4; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4; padding: 30px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background-color:#1a5276; padding: 24px 32px; text-align:center;">
              <h1 style="margin:0; color:#ffffff; font-size:22px; font-weight:600;">
                ${club?.name || 'Your Bowls Club'}
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; font-size:16px; color:#333;">
                Dear ${member.first_name || 'Member'},
              </p>
              <p style="margin: 0 0 24px; font-size:16px; color:#333;">
                You have been selected to play in an upcoming match!
              </p>

              <!-- Match Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f9fa; border-radius:6px; padding:20px; margin-bottom:24px;">
                <tr>
                  <td>
                    <h2 style="margin: 0 0 16px; font-size:16px; color:#1a5276; text-transform:uppercase; letter-spacing:0.5px;">Match Details</h2>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 4px 16px 4px 0; color:#666; font-size:14px; white-space:nowrap;">Competition</td>
                        <td style="padding: 4px 0; color:#333; font-size:14px; font-weight:600;">${competition}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 16px 4px 0; color:#666; font-size:14px; white-space:nowrap;">Date</td>
                        <td style="padding: 4px 0; color:#333; font-size:14px; font-weight:600;">${format(new Date(matchDate), 'd MMMM yyyy')}</td>
                      </tr>
                      ${matchName ? `
                      <tr>
                        <td style="padding: 4px 16px 4px 0; color:#666; font-size:14px; white-space:nowrap;">Match</td>
                        <td style="padding: 4px 0; color:#333; font-size:14px; font-weight:600;">${matchName}</td>
                      </tr>` : ''}
                      ${matchStartTime ? `
                      <tr>
                        <td style="padding: 4px 16px 4px 0; color:#666; font-size:14px; white-space:nowrap;">Time</td>
                        <td style="padding: 4px 0; color:#333; font-size:14px; font-weight:600;">${matchStartTime} – ${matchEndTime}</td>
                      </tr>` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Team Selection -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f9fa; border-radius:6px; padding:20px; margin-bottom:24px;">
                <tr>
                  <td>
                    <h2 style="margin: 0 0 12px; font-size:16px; color:#1a5276; text-transform:uppercase; letter-spacing:0.5px;">Team Selection</h2>
                    <p style="margin:0; font-size:14px; color:#333; white-space:pre-line; line-height:1.7;">${teamList}</p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${matchUrl}" style="display:inline-block; background-color:#1a5276; color:#ffffff; text-decoration:none; padding:12px 32px; border-radius:6px; font-size:15px; font-weight:600;">
                      Confirm Availability
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f4f4f4; padding:16px 32px; text-align:center; border-top:1px solid #e0e0e0;">
              <p style="margin:0; font-size:12px; color:#999;">
                ${club?.name || 'Your Bowls Club'}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    await base44.integrations.Core.SendEmail({
      to: member.user_email,
      subject: `Match Selection - ${competition} on ${format(new Date(matchDate), 'd MMMM yyyy')}`,
      body: emailBody
    });
  }

  if (emailMembers.length > 0) {
    toast.success(`Emails sent to ${emailMembers.length} players`);
  }
}
    
    // SMS notifications
    if (club?.module_sms_notifications && club?.sms_member_notifications) {
      const smsMembers = members.filter(m => 
        selectedPlayerEmails.includes(m.user_email) && 
        m.sms_notifications === true &&
        m.phone
      );

      const smsMessage = `You've been selected for ${competition}${matchName ? ' vs ' + matchName : ''} on ${format(new Date(matchDate), 'd MMMM yyyy')}${matchStartTime ? ` at ${matchStartTime}` : ''}. View details at app.bowls-time.com`;

      for (const member of smsMembers) {
        try {
          await base44.functions.invoke('sendSMS', {
            to: member.phone,
            message: smsMessage
          });
        } catch (error) {
          console.error(`Failed to send SMS to ${member.phone}:`, error);
        }
      }
      
      if (smsMembers.length > 0) {
        toast.success(`SMS sent to ${smsMembers.length} players`);
      }
    }
  };

  const handleSave = async (publish = false, isRepublish = false) => {
    if (!competition) {
      toast.error('Please select a competition');
      return;
    }

    const data = {
      club_id: clubId,
      competition,
      match_date: matchDate,
      match_name: matchName,
      selections,
      home_rinks: homeRinks,
      selected_rinks: selectedRinks.map(r => String(r)),
      match_start_time: matchStartTime,
      match_end_time: matchEndTime,
      status: publish ? 'published' : 'draft',
      selector_email: user.email
    };

    if (selectionId) {
      await updateMutation.mutateAsync({ id: selectionId, data });
      toast.success(publish ? 'Selection published!' : 'Selection saved');
      if (publish && !isRepublish) {
        // Create notifications for selected players
        const selectedPlayerEmails = [...new Set(Object.values(selections).filter(Boolean))];
        const notificationsToCreate = selectedPlayerEmails.map(email => ({
          user_email: email,
          type: 'team_selection',
          title: 'Selected for Match',
          message: `You've been selected for ${competition}${matchName ? ' - ' + matchName : ''} on ${format(new Date(matchDate), 'd MMMM yyyy')}. Click to view team`,
          link_page: 'SelectionView',
          link_params: `clubId=${clubId}&selectionId=${selectionId}`,
          related_id: selectionId
        }));
        await base44.entities.Notification.bulkCreate(notificationsToCreate);
        await sendSelectionEmails(selectionId);
        navigate(createPageUrl('Selection') + `?clubId=${clubId}`);
      } else if (isRepublish) {
        // Only notify newly added players
        const currentPlayerEmails = [...new Set(Object.values(selections).filter(Boolean))];
        const originalPlayerEmails = [...new Set(Object.values(originalSelections).filter(Boolean))];
        const newlyAddedEmails = currentPlayerEmails.filter(email => !originalPlayerEmails.includes(email));
        
        if (newlyAddedEmails.length > 0) {
          const notificationsToCreate = newlyAddedEmails.map(email => ({
            user_email: email,
            type: 'team_selection',
            title: 'Selected for Match',
            message: `You've been selected for ${competition}${matchName ? ' - ' + matchName : ''} on ${format(new Date(matchDate), 'd MMMM yyyy')}. Click to view team`,
            link_page: 'SelectionView',
            link_params: `clubId=${clubId}&selectionId=${selectionId}`,
            related_id: selectionId
          }));
          await base44.entities.Notification.bulkCreate(notificationsToCreate);
          
          // Send emails/SMS only to newly added players
          const selectedPlayerEmails = newlyAddedEmails;
          const teamList = Object.entries(selections)
            .filter(([_, email]) => email)
            .map(([pos, email]) => {
              const member = members.find(m => m.user_email === email);
              const name = member?.first_name && member?.surname 
                ? `${member.first_name} ${member.surname}` 
                : member?.user_name || email;
              return `${pos.replace('rink', 'Rink ').replace('_', ' ')}: ${name}`;
            })
            .join('\n');

          const matchUrl = `${APP_BASE_URL}${createPageUrl('SelectionView')}?clubId=${clubId}&selectionId=${selectionId}`;
          
          // Email notifications
          if (club?.email_member_notifications) {
            const emailMembers = members.filter(m => 
              selectedPlayerEmails.includes(m.user_email) && 
              m.email_notifications !== false
            );

            for (const member of emailMembers) {
              const emailBody = `
Dear ${member.first_name || 'Member'},

You have been selected to play in an upcoming match!

Match Details:
- Competition: ${competition}
- Date: ${format(new Date(matchDate), 'd MMMM yyyy')}
${matchName ? `- Match: ${matchName}` : ''}
${matchStartTime ? `- Time: ${matchStartTime} - ${matchEndTime}` : ''}

Team Selection:
${teamList}

Please confirm your availability by visiting:
${matchUrl}

Best regards,
${club?.name || 'Your Bowls Club'}
              `.trim();

              await base44.integrations.Core.SendEmail({
                to: member.user_email,
                subject: `Match Selection - ${competition} on ${format(new Date(matchDate), 'd MMMM yyyy')}`,
                body: emailBody
              });
            }
            
            if (emailMembers.length > 0) {
              toast.success(`Emails sent to ${emailMembers.length} newly added player(s)`);
            }
          }
          
          // SMS notifications
          if (club?.module_sms_notifications && club?.sms_member_notifications) {
            const smsMembers = members.filter(m => 
              selectedPlayerEmails.includes(m.user_email) && 
              m.sms_notifications === true &&
              m.phone
            );

            const smsMessage = `You've been selected for ${competition}${matchName ? ' vs ' + matchName : ''} on ${format(new Date(matchDate), 'd MMMM yyyy')}${matchStartTime ? ` at ${matchStartTime}` : ''}. View details at app.bowls-time.com`;

            for (const member of smsMembers) {
              try {
                await base44.functions.invoke('sendSMS', {
                  to: member.phone,
                  message: smsMessage
                });
              } catch (error) {
                console.error(`Failed to send SMS to ${member.phone}:`, error);
              }
            }
            
            if (smsMembers.length > 0) {
              toast.success(`SMS sent to ${smsMembers.length} newly added player(s)`);
            }
          }
        }
        
        navigate(createPageUrl('Selection') + `?clubId=${clubId}`);
      }
    } else {
      const result = await createMutation.mutateAsync(data);
      if (publish) {
        toast.success('Selection published!');
        // Create notifications for selected players
        const selectedPlayerEmails = [...new Set(Object.values(selections).filter(Boolean))];
        const notificationsToCreate = selectedPlayerEmails.map(email => ({
          user_email: email,
          type: 'team_selection',
          title: 'Selected for Match',
          message: `You've been selected for ${competition}${matchName ? ' - ' + matchName : ''} on ${format(new Date(matchDate), 'd MMMM yyyy')}. Click to view team`,
          link_page: 'SelectionView',
          link_params: `clubId=${clubId}&selectionId=${result.id}`,
          related_id: result.id
        }));
        await base44.entities.Notification.bulkCreate(notificationsToCreate);
        await sendSelectionEmails(result.id);
        navigate(createPageUrl('Selection') + `?clubId=${clubId}`);
      } else {
        toast.success('Selection saved as draft');
        navigate(createPageUrl('SelectionEditor') + `?clubId=${clubId}&selectionId=${result.id}`);
      }
    }
  };

  const handleBookRinks = async () => {
    if (!competition || selectedRinks.length === 0 || !matchStartTime || !matchEndTime) {
      toast.error('Please fill in all match details first');
      return;
    }

    const duration = club?.session_duration || 2;
    const [startHour] = matchStartTime.split(':').map(Number);
    const [endHour] = matchEndTime.split(':').map(Number);
    
    const bookerName = club?.name || `${competition}${matchName ? ` - ${matchName}` : ''}`;
    const rinkCount = club?.rink_count || 6;
    const allRinks = Array.from({ length: rinkCount }, (_, i) => i + 1);

    const clashes = [];
    const nonClashingBookings = [];

    // Build proposed slots, accounting for other proposed slots in same batch
    const proposedSlots = [];
    for (const rinkNum of selectedRinks) {
      for (let hour = startHour; hour < endHour; hour += duration) {
        proposedSlots.push({ rink: rinkNum, startTime: `${String(hour).padStart(2, '0')}:00` });
      }
    }

    for (const { rink: rinkNum, startTime: slotStart } of proposedSlots) {
      const slotEnd = `${String(parseInt(slotStart) + duration).padStart(2, '0')}:00`;
      const [startH] = slotStart.split(':').map(Number);
      const slotEndStr = `${String(startH + duration).padStart(2, '0')}:00`;

      const existingBooking = existingBookings.find(
        b => b.rink_number === rinkNum &&
             b.start_time === slotStart &&
             b.status !== 'cancelled' &&
             b.status !== 'rejected'
      );

      const proposed = {
        club_id: clubId,
        rink_number: rinkNum,
        date: matchDate,
        start_time: slotStart,
        end_time: slotEndStr,
        status: 'approved',
        competition_type: 'Club',
        booker_name: bookerName,
        booker_email: user.email,
        notes: `${competition}${matchName ? ` - ${matchName}` : ''}`,
      };

      if (existingBooking) {
        // Find a suggested free rink at the same time
        const usedRinksAtTime = new Set([
          ...existingBookings
            .filter(b => b.start_time === slotStart && b.status !== 'cancelled' && b.status !== 'rejected')
            .map(b => b.rink_number),
          ...proposedSlots
            .filter(s => s.startTime === slotStart && s.rink !== rinkNum)
            .map(s => s.rink)
        ]);
        const suggestedRink = allRinks.find(r => !usedRinksAtTime.has(r)) || null;

        clashes.push({ proposedBooking: proposed, existingBooking, suggestedRink });
      } else {
        nonClashingBookings.push(proposed);
      }
    }

    if (clashes.length === 0) {
      await Promise.all(nonClashingBookings.map(b => createBookingMutation.mutateAsync(b)));
      toast.success(`${nonClashingBookings.length} booking(s) created for the match`);
    } else {
      setClashData({ clashes, nonClashingBookings });
      setClashModalOpen(true);
    }
  };

  const handleClashProceed = async (bookingsToCreate) => {
    if (bookingsToCreate.length === 0) {
      toast.info('No bookings to create');
      setClashModalOpen(false);
      return;
    }
    await Promise.all(bookingsToCreate.map(b => createBookingMutation.mutateAsync(b)));
    queryClient.invalidateQueries({ queryKey: ['bookings', clubId, matchDate] });
    toast.success(`${bookingsToCreate.length} booking(s) created`);
    setClashModalOpen(false);
  };

  const handleSelectionChange = (position, memberEmail) => {
    const previousEmail = selections[position];
    
    // If removing a player, delete their availability record
    if (previousEmail && !memberEmail) {
      const availabilityRecord = existingAvailabilities.find(a => a.user_email === previousEmail);
      if (availabilityRecord) {
        deleteAvailabilityMutation.mutate(availabilityRecord.id);
      }
    }
    
    setSelections(prev => ({
      ...prev,
      [position]: memberEmail
    }));
  };

  const handleCompetitionChange = (compName) => {
    setCompetition(compName);
    const comp = competitions.find(c => c.name === compName);
    if (comp) {
      setHomeRinks(comp.home_rinks);
      // Auto-select first N rinks as home rinks
      const newSelectedRinks = [];
      for (let i = 1; i <= comp.home_rinks; i++) {
        newSelectedRinks.push(i);
      }
      setSelectedRinks(newSelectedRinks);
    }
  };

  const handleHomeRinksChange = (value) => {
    const numRinks = parseInt(value);
    setHomeRinks(numRinks);
    const newSelectedRinks = [];
    for (let i = 1; i <= numRinks; i++) {
      newSelectedRinks.push(i);
    }
    setSelectedRinks(newSelectedRinks);
  };

  const toggleRinkSelection = (rinkNum) => {
    if (selectedRinks.includes(rinkNum)) {
      if (selectedRinks.length > 1) {
        setSelectedRinks(selectedRinks.filter(r => r !== rinkNum));
      }
    } else if (selectedRinks.length < homeRinks) {
      setSelectedRinks([...selectedRinks, rinkNum].sort((a, b) => a - b));
    }
  };

  const selectedEmails = Object.values(selections).filter(Boolean);

  if (!isSelector && user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-8"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
            <ShieldAlert className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">You need selector privileges to access this page.</p>
          <Link to={createPageUrl('Selection') + `?clubId=${clubId}`}>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              Back to Selections
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  const isTopClub = competition === 'Top Club';
  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link 
            to={createPageUrl('Selection') + `?clubId=${clubId}`}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Selections
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            {selectionId ? 'Edit Selection' : 'New Selection'}
          </h1>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Match Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Competition *</Label>
                  <Select value={competition} onValueChange={handleCompetitionChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select competition" />
                    </SelectTrigger>
                    <SelectContent>
                      {competitions.map(comp => (
                        <SelectItem key={comp.id} value={comp.name}>{comp.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Match Date *</Label>
                  <Input
                    type="date"
                    value={matchDate}
                    onChange={(e) => setMatchDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Opponent</Label>
                  <Input
                    value={matchName}
                    onChange={(e) => setMatchName(e.target.value)}
                    placeholder="e.g., vs Springfield BC"
                  />
                </div>

                {competition && competition !== 'Top Club' && (
                  <>
                    <div>
                      <Label>Number of Home Rinks</Label>
                      <Select value={String(homeRinks)} onValueChange={handleHomeRinksChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0 Rinks</SelectItem>
                          <SelectItem value="1">1 Rink</SelectItem>
                          <SelectItem value="2">2 Rinks</SelectItem>
                          <SelectItem value="3">3 Rinks</SelectItem>
                          <SelectItem value="4">4 Rinks</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="flex items-center gap-2 mb-2">
                        <Home className="w-4 h-4" />
                        Select Rinks ({selectedRinks.length}/{homeRinks})
                        <InfoTooltip content="Choose which rinks will be used for home matches. The number of rinks shown is based on your club's rink count." />
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        {Array.from({ length: club?.rink_count || 6 }, (_, i) => i + 1).slice(0, Math.min(6, club?.rink_count || 6)).map(rink => (
                          <div 
                            key={rink}
                            className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50"
                            onClick={() => toggleRinkSelection(rink)}
                          >
                            <Checkbox 
                              checked={selectedRinks.includes(rink)}
                              onCheckedChange={() => toggleRinkSelection(rink)}
                            />
                            <span className="text-sm">Rink {rink}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Start Time</Label>
                        <Select value={matchStartTime} onValueChange={setMatchStartTime}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {generateTimeSlots().map(time => (
                              <SelectItem key={time} value={time}>{time}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>End Time</Label>
                        <Select value={matchEndTime} onValueChange={setMatchEndTime}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {generateTimeSlots().filter(t => t > matchStartTime).map(time => {
                              const duration = club?.session_duration || 2;
                              const [hour] = time.split(':').map(Number);
                              const endTime = `${String(hour + duration).padStart(2, '0')}:00`;
                              return (
                                <SelectItem key={endTime} value={endTime}>{endTime}</SelectItem>
                              );
                            })}
                            {/* Add final end time option */}
                            {club && (
                              <SelectItem value={club.closing_time || '21:00'}>
                                {club.closing_time || '21:00'}
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button 
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={handleBookRinks}
                      disabled={createBookingMutation.isPending || selectedRinks.length === 0}
                    >
                      {createBookingMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CalendarPlus className="w-4 h-4 mr-2" />
                      )}
                      Book Rinks for Match
                    </Button>
                  </>
                )}

                <div className="pt-4 space-y-2">
<Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={!competition || !selectionId}
                    onClick={async () => {
                      try {
                        toast.info('Generating scorecards...');
                        const result = await base44.functions.invoke('generateSelectionScorecards', {
                          selectionId: selectionId,
                          clubId: clubId
                        });
                        const html = typeof result === 'string' ? result : result?.html || result?.data;
                        if (!html) {
                          toast.error('No scorecard data returned');
                          return;
                        }
                        const printWindow = window.open('', '_blank');
                        printWindow.document.write(html);
                        printWindow.document.close();
                        printWindow.onload = () => {
                          printWindow.focus();
                          printWindow.print();
                        };
                        toast.success('Scorecards ready — use Print > Save as PDF');
                      } catch (error) {
                        toast.error('Failed to generate scorecards');
                        console.error(error);
                      }
                    }}
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Scorecards
                  </Button>
                  <Button 
                    onClick={() => handleSave(false)}
                    variant="outline"
                    className="w-full"
                    disabled={isSaving || !competition}
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Draft
                  </Button>
                  <Button 
                    onClick={() => handleSave(true, existingSelection?.status === 'published')}
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    disabled={isSaving || !competition}
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                    {existingSelection?.status === 'published' ? 'Republish Selection' : 'Publish Selection'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            {competition ? (
              isTopClub ? (
                <TopClubSelectionGrid
                  members={members}
                  selections={selections}
                  selectedEmails={selectedEmails}
                  onSelectionChange={handleSelectionChange}
                  matchDate={matchDate}
                  unavailabilities={unavailabilities}
                />
              ) : (
                <RinkSelectionGrid
                  members={members}
                  selections={selections}
                  selectedEmails={selectedEmails}
                  onSelectionChange={handleSelectionChange}
                  matchDate={matchDate}
                  unavailabilities={unavailabilities}
                  playersPerRink={competitions.find(c => c.name === competition)?.players_per_rink || 4}
                  homeRinks={homeRinks}
                  awayRinks={competitions.find(c => c.name === competition)?.away_rinks || 0}
                />
              )
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  Select a competition to start building your team
                </CardContent>
              </Card>
            )}
          </motion.div>
        </div>
      </div>

      <RinkClashModal
        open={clashModalOpen}
        clashes={clashData.clashes}
        nonClashingBookings={clashData.nonClashingBookings}
        allBookings={existingBookings}
        club={club}
        onProceed={handleClashProceed}
        onClose={() => setClashModalOpen(false)}
        isLoading={createBookingMutation.isPending}
      />
    </div>
  );
}