import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const doc = new jsPDF();
    let yPos = 20;
    const pageHeight = 280;
    const leftMargin = 20;
    const rightMargin = 190;

    const addNewPageIfNeeded = (spaceNeeded = 20) => {
      if (yPos + spaceNeeded > pageHeight) {
        doc.addPage();
        yPos = 20;
      }
    };

    const addTitle = (text) => {
      addNewPageIfNeeded(15);
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      doc.text(text, leftMargin, yPos);
      yPos += 12;
    };

    const addHeading = (text) => {
      addNewPageIfNeeded(12);
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text(text, leftMargin, yPos);
      yPos += 10;
    };

    const addSubheading = (text) => {
      addNewPageIfNeeded(10);
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(text, leftMargin, yPos);
      yPos += 8;
    };

    const addText = (text, indent = 0) => {
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      const lines = doc.splitTextToSize(text, rightMargin - leftMargin - indent);
      lines.forEach(line => {
        addNewPageIfNeeded(7);
        doc.text(line, leftMargin + indent, yPos);
        yPos += 6;
      });
    };

    const addBullet = (text) => {
      addNewPageIfNeeded(7);
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      const lines = doc.splitTextToSize(text, rightMargin - leftMargin - 15);
      lines.forEach((line, idx) => {
        if (idx === 0) {
          doc.text('•', leftMargin + 5, yPos);
          doc.text(line, leftMargin + 10, yPos);
        } else {
          doc.text(line, leftMargin + 10, yPos);
        }
        yPos += 6;
      });
    };

    const addSpace = (amount = 5) => {
      yPos += amount;
    };

    // Cover Page
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text('Bowls Club Management System', 105, 100, { align: 'center' });
    doc.setFontSize(18);
    doc.text('User Guide', 105, 115, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text('A comprehensive guide for all users', 105, 130, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 105, 250, { align: 'center' });

    doc.addPage();
    yPos = 20;

    // Table of Contents
    addTitle('Table of Contents');
    addText('1. Introduction', 5);
    addText('2. User Roles Overview', 5);
    addText('3. Club Admin Guide', 5);
    addText('4. Club Selector Guide', 5);
    addText('5. Club Live Scorer Guide', 5);
    addText('6. Club Member Guide', 5);
    addText('7. Team Captain Guide', 5);
    addText('8. Notifications & Communication', 5);
    addText('9. Frequently Asked Questions', 5);
    addText('10. Glossary of Terms', 5);
    addSpace(10);

    // 1. Introduction
    addTitle('1. Introduction');
    addHeading('1.1 Overview');
    addText('Welcome to the Bowls Club Management System. This modern web-based platform helps bowling clubs manage their facilities, members, competitions, and match selections efficiently.');
    addSpace();
    addText('The system is designed to be accessible to users of all technical abilities, with a clean interface and intuitive navigation.');
    addSpace(10);

    addHeading('1.2 Purpose');
    addText('This application helps clubs to:');
    addBullet('Book and manage rink usage');
    addBullet('Organise team selections for matches');
    addBullet('Run leagues and competitions');
    addBullet('Communicate with members via email and SMS');
    addBullet('Track live match scores');
    addBullet('Manage club memberships');
    addSpace(10);

    addHeading('1.3 Logging In');
    addText('1. Visit your club\'s BowlsTime URL (e.g., app.bowls-time.com)');
    addText('2. Click "Sign In"');
    addText('3. Enter your email address and password');
    addText('4. If you\'re a new user, you\'ll need to be invited by a club admin');
    addSpace(10);

    addHeading('1.4 Basic Navigation');
    addText('The main menu provides quick access to:');
    addBullet('Rink Booking - Book or view rink availability');
    addBullet('Selection - View team selections');
    addBullet('Competitions - View and participate in club tournaments');
    addBullet('Leagues - View league tables and fixtures');
    addBullet('My Teams - Manage your league teams (if captain)');
    addBullet('Notifications - View alerts and updates');
    addSpace(10);

    // 2. User Roles
    addTitle('2. User Roles Overview');
    addText('The system uses role-based access. Your permissions depend on your assigned role:');
    addSpace(5);
    
    addSubheading('Club Admin');
    addText('Full access to all club settings, member management, bookings, and features.');
    addSpace(5);
    
    addSubheading('Club Selector');
    addText('Can create match selections and notify players.');
    addSpace(5);
    
    addSubheading('Club Live Scorer');
    addText('Can enter live scores during matches.');
    addSpace(5);
    
    addSubheading('Club Member');
    addText('Can book rinks, view selections, and manage personal availability.');
    addSpace(5);
    
    addSubheading('Team Captain');
    addText('Additional permissions to manage league teams and player rotas.');
    addSpace(10);

    // 3. Club Admin Guide
    addTitle('3. Club Admin Guide');
    
    addHeading('3.1 Club Settings');
    addText('Navigate to: Admin menu → Club Settings');
    addSpace(5);
    
    addSubheading('Rink Configuration:');
    addText('1. Set the number of rinks your club has');
    addText('2. Define opening and closing times');
    addText('3. Set session duration (typically 2 hours)');
    addSpace(5);
    
    addSubheading('Club Logo:');
    addText('1. Click "Upload Logo"');
    addText('2. Select an image file (PNG or JPG recommended)');
    addText('3. Logo appears on printed documents and match selections');
    addSpace(5);
    
    addSubheading('Booking Settings:');
    addText('• Auto-approve bookings: Toggle ON to automatically approve all bookings');
    addText('• Leave OFF if you want to manually review each booking request');
    addSpace(5);
    
    addSubheading('Notification Settings:');
    addText('• Email notifications: Sends emails when players are selected');
    addText('• SMS notifications: Sends text messages (requires SMS module)');
    addSpace(5);
    
    addSubheading('Membership Types:');
    addText('1. Select which membership categories are available');
    addText('2. Options include: Winter Indoor, Summer Indoor, Outdoor, Social');
    addText('3. These appear when members request to join');
    addSpace(5);
    
    addSubheading('Competitions:');
    addText('1. Click "Add Competition"');
    addText('2. Enter competition name (e.g., Wessex League, Denny)');
    addText('3. Set players per rink (usually 4)');
    addText('4. Set number of home and away rinks');
    addText('5. Choose season (indoor/outdoor)');
    addText('6. Click "Create"');
    addSpace(10);

    addHeading('3.2 Member Management');
    addText('Navigate to: Admin menu → Members');
    addSpace(5);
    
    addSubheading('Inviting New Members:');
    addText('1. Click "Invite Member"');
    addText('2. Enter their email address');
    addText('3. Select their role (Admin, Selector, Live Scorer, or Member)');
    addText('4. They\'ll receive an email invitation to join');
    addSpace(5);
    
    addSubheading('Approving Membership Requests:');
    addText('1. Pending requests appear in the "Pending" tab');
    addText('2. Review member details');
    addText('3. Click "Approve" or "Reject"');
    addSpace(5);
    
    addSubheading('Editing Member Details:');
    addText('1. Click on a member\'s name');
    addText('2. Edit their locker number, phone, role, or membership groups');
    addText('3. Click "Save Changes"');
    addSpace(5);
    
    addSubheading('Removing Members:');
    addText('1. Find the member in the list');
    addText('2. Click the menu icon (three dots)');
    addText('3. Select "Remove from club"');
    addSpace(10);

    addHeading('3.3 Booking Management');
    addText('Navigate to: Admin menu → Bookings Admin');
    addSpace(5);
    
    addSubheading('Approving/Rejecting Bookings:');
    addText('1. View pending bookings in the "Pending" tab');
    addText('2. Review booking details');
    addText('3. Click "Approve" or "Reject"');
    addText('4. Add optional notes when rejecting');
    addSpace(5);
    
    addSubheading('Moving Bookings:');
    addText('1. Click on a booking');
    addText('2. Select "Move Booking"');
    addText('3. Choose new date/time/rink');
    addText('4. Member receives notification of the change');
    addSpace(5);
    
    addSubheading('Bulk Booking:');
    addText('1. Click "Bulk Book"');
    addText('2. Select date range');
    addText('3. Choose rinks');
    addText('4. Set times');
    addText('5. Enter purpose (e.g., "Open Singles", "PBA Event")');
    addText('6. Click "Create Bookings"');
    addSpace(10);

    addHeading('3.4 League Management');
    addText('Navigate to: Admin menu → Leagues');
    addSpace(5);
    
    addSubheading('Creating a League:');
    addText('1. Click "Create League"');
    addText('2. Enter league name and description');
    addText('3. Select format (Triples or Fours)');
    addText('4. Set start and end dates');
    addText('5. Set weekly match times');
    addText('6. Click "Create League"');
    addSpace(5);
    
    addSubheading('Adding Teams:');
    addText('1. Open the league');
    addText('2. Click "Add Team"');
    addText('3. Enter team name');
    addText('4. Assign a team captain (they can then manage their team)');
    addText('5. Add players to the team');
    addSpace(5);
    
    addSubheading('Blacklisting Dates:');
    addText('1. Click "Manage Blacklist Dates"');
    addText('2. Add date ranges where no fixtures should be scheduled');
    addText('3. Common examples: Christmas, New Year, Bank Holidays');
    addSpace(5);
    
    addSubheading('Generating Fixtures:');
    addText('1. Click "Generate Fixtures"');
    addText('2. System creates a round-robin schedule');
    addText('3. Blacklisted dates are automatically skipped');
    addText('4. Each team plays every other team once');
    addSpace(5);
    
    addSubheading('Auto-booking Rinks:');
    addText('1. After fixtures are generated, click "Auto-book Rinks"');
    addText('2. System creates approved bookings for all fixtures');
    addText('3. Rinks are allocated based on availability');
    addSpace(5);
    
    addSubheading('Entering Scores:');
    addText('1. Navigate to the fixture');
    addText('2. Enter home and away scores');
    addText('3. League table updates automatically');
    addSpace(10);

    addHeading('3.5 Competition Management');
    addText('Navigate to: Competitions page');
    addSpace(5);
    
    addSubheading('Creating a Tournament:');
    addText('1. Click "Create Competition"');
    addText('2. Enter tournament name');
    addText('3. Choose format (Knockout or Round Robin)');
    addText('4. Add players or teams');
    addText('5. Set number of available rinks');
    addText('6. Click "Generate Draw"');
    addSpace(5);
    
    addSubheading('Managing Progress:');
    addText('1. Enter match results as they complete');
    addText('2. Winners automatically progress to next round');
    addText('3. System handles bracket updates');
    addSpace(5);
    
    addSubheading('Publishing Results:');
    addText('1. Click "Publish Tournament"');
    addText('2. Members can view draws and results');
    addSpace(10);

    addHeading('3.6 Match Selection Module');
    addText('Navigate to: Selection page → New Selection');
    addSpace(5);
    
    addSubheading('Creating a Match:');
    addText('1. Click "New Selection"');
    addText('2. Choose competition (e.g., Wessex League)');
    addText('3. Set match date');
    addText('4. Enter match name (e.g., "vs Springfield BC")');
    addText('5. Set number of home rinks');
    addText('6. Choose which rinks to use');
    addText('7. Set match times');
    addSpace(5);
    
    addSubheading('Selecting Players:');
    addText('1. Drag and drop players into positions');
    addText('2. System shows unavailable players in grey');
    addText('3. Each position must be filled');
    addSpace(5);
    
    addSubheading('Booking Rinks:');
    addText('1. Click "Book Rinks for Match"');
    addText('2. System creates bookings for selected rinks and times');
    addSpace(5);
    
    addSubheading('Publishing Selection:');
    addText('1. Click "Publish Selection"');
    addText('2. Selected players receive notifications');
    addText('3. Selection appears in members\' dashboards');
    addSpace(10);

    addHeading('3.7 Live Scoring');
    addText('Navigate to: Live Scoring page');
    addSpace(5);
    addText('1. Select the match you\'re scoring');
    addText('2. Enter scores for each rink');
    addText('3. Update opposition player names');
    addText('4. Click "Save Scores"');
    addText('5. Scores are visible to all club members in real-time');
    addSpace(10);

    // 4. Club Selector Guide
    addTitle('4. Club Selector Guide');
    addText('As a selector, you can create and publish team selections for matches.');
    addSpace(5);
    
    addHeading('4.1 Creating a New Selection');
    addText('1. Navigate to Selection page');
    addText('2. Click "New Selection"');
    addText('3. Choose the competition');
    addText('4. Set the match date and details');
    addSpace(5);
    
    addHeading('4.2 Picking Players');
    addText('1. View available members on the right');
    addText('2. Unavailable players are shown in grey');
    addText('3. Drag players into positions, or use dropdown menus');
    addText('4. System prevents selecting the same player twice');
    addSpace(5);
    
    addHeading('4.3 Assigning Rinks');
    addText('1. Select which rinks will be used');
    addText('2. System shows you available rinks');
    addText('3. You can book the rinks directly from the selection page');
    addSpace(5);
    
    addHeading('4.4 Publishing the Selection');
    addText('1. Review all selections carefully');
    addText('2. Click "Publish Selection"');
    addText('3. Selected players receive notifications (email/SMS based on club settings)');
    addText('4. Players can view the full team and confirm availability');
    addSpace(10);

    // 5. Club Live Scorer Guide
    addTitle('5. Club Live Scorer Guide');
    addText('As a live scorer, you can enter and update match scores in real-time.');
    addSpace(5);
    
    addHeading('5.1 Accessing Matches');
    addText('1. Navigate to Live Scoring page');
    addText('2. Select the match you\'re scoring');
    addSpace(5);
    
    addHeading('5.2 Entering Scores');
    addText('1. Find each rink section');
    addText('2. Enter opposition player names (if known)');
    addText('3. Enter club score in the left column');
    addText('4. Enter opposition score in the right column');
    addText('5. Enter number of ends played');
    addSpace(5);
    
    addHeading('5.3 Saving and Publishing');
    addText('1. Click "Save Scores" to save your progress');
    addText('2. Scores update live for all members viewing the match');
    addText('3. You can edit scores at any time if corrections are needed');
    addSpace(10);

    // 6. Club Member Guide
    addTitle('6. Club Member Guide');
    
    addHeading('6.1 Booking Rinks');
    addText('Navigate to: Rink Booking → Book a Rink');
    addSpace(5);
    
    addSubheading('Making a Booking:');
    addText('1. Select the date using the calendar');
    addText('2. Available time slots appear in green');
    addText('3. Click on a time slot and rink combination');
    addText('4. Confirm the booking details');
    addText('5. Your booking is submitted (may need admin approval)');
    addSpace(5);
    
    addSubheading('Viewing Your Bookings:');
    addText('1. Navigate to: Rink Booking → My Bookings');
    addText('2. View all your upcoming, pending, and past bookings');
    addText('3. Status shows: Pending, Approved, or Rejected');
    addSpace(5);
    
    addSubheading('Cancelling a Booking:');
    addText('1. Find the booking in My Bookings');
    addText('2. Click the "Cancel" button');
    addText('3. Confirm cancellation');
    addSpace(10);

    addHeading('6.2 Availability Management');
    addText('Navigate to: My Profile → Availability');
    addSpace(5);
    
    addSubheading('Setting Unavailability:');
    addText('1. Click "Add Unavailability"');
    addText('2. Select start and end dates (e.g., holiday period)');
    addText('3. Click "Save"');
    addText('4. Selectors will see you as unavailable during this period');
    addSpace(5);
    
    addSubheading('Responding to Selection:');
    addText('1. When selected, you\'ll receive a notification');
    addText('2. Open the selection to view full team');
    addText('3. Confirm your availability if needed');
    addSpace(10);

    addHeading('6.3 Viewing Teams & Leagues');
    addText('Navigate to: Leagues page');
    addSpace(5);
    
    addSubheading('League Tables:');
    addText('1. Select the league you want to view');
    addText('2. See current standings, points, and goal difference');
    addText('3. Tables update automatically after matches');
    addSpace(5);
    
    addSubheading('Fixtures:');
    addText('1. View upcoming fixtures');
    addText('2. See which rink and time each match is scheduled');
    addText('3. View completed results');
    addSpace(10);

    // 7. Team Captain Guide
    addTitle('7. Team Captain Guide');
    addText('As a team captain, you have additional permissions to manage your league team.');
    addSpace(5);
    
    addHeading('7.1 Managing Your Team');
    addText('Navigate to: My Teams page');
    addSpace(5);
    
    addSubheading('Adding Players:');
    addText('1. Click "Edit Team"');
    addText('2. Click "Add Player"');
    addText('3. Select from club members');
    addText('4. Click "Add"');
    addSpace(5);
    
    addSubheading('Removing Players:');
    addText('1. Click "Edit Team"');
    addText('2. Click the remove icon next to a player');
    addText('3. Confirm removal');
    addSpace(10);

    addHeading('7.2 Managing Player Availability');
    addText('1. View fixture list for your team');
    addText('2. Click "Manage Availability"');
    addText('3. Mark players as available or unavailable for specific fixtures');
    addText('4. System uses this to help generate rotas');
    addSpace(10);

    addHeading('7.3 Creating Rotas');
    addText('1. Click "Generate Rota" for a fixture');
    addText('2. System suggests players based on availability');
    addText('3. You can manually adjust the selection');
    addText('4. Click "Save Rota"');
    addText('5. Selected players can view their fixture assignment');
    addSpace(10);

    // 8. Notifications
    addTitle('8. Notifications & Communication');
    
    addHeading('8.1 Email Notifications');
    addText('Sent automatically for:');
    addBullet('Team selection for matches');
    addBullet('Booking confirmations');
    addBullet('Booking rejections or changes');
    addBullet('Match reminders');
    addSpace(5);
    
    addHeading('8.2 SMS Notifications');
    addText('If enabled by club, SMS is sent for:');
    addBullet('Urgent team selection notifications');
    addBullet('Last-minute match changes');
    addSpace(5);
    addText('Note: Members can opt-in or opt-out of SMS in their profile settings.');
    addSpace(10);

    addHeading('8.3 Managing Notification Preferences');
    addText('1. Go to My Profile');
    addText('2. Toggle email notifications ON/OFF');
    addText('3. Toggle SMS notifications ON/OFF (if available)');
    addText('4. Changes apply immediately');
    addSpace(10);

    // 9. FAQ
    addTitle('9. Frequently Asked Questions');
    
    addSubheading('I forgot my password');
    addText('1. Click "Forgot Password" on the login page');
    addText('2. Enter your email address');
    addText('3. Check your email for a password reset link');
    addText('4. Follow the link to set a new password');
    addSpace(5);
    
    addSubheading('I can\'t see a booking option');
    addText('Possible reasons:');
    addBullet('The time slot may already be booked');
    addBullet('You may not have an approved membership');
    addBullet('The club may have restricted booking times');
    addText('Contact your club admin if the issue persists.');
    addSpace(5);
    
    addSubheading('I was selected but cannot play');
    addText('1. Open the selection notification');
    addText('2. Mark yourself as unavailable');
    addText('3. The selector will be notified and can choose a replacement');
    addSpace(5);
    
    addSubheading('A score was entered incorrectly');
    addText('Contact the live scorer or a club admin. They can edit the score.');
    addSpace(5);
    
    addSubheading('How are league tables calculated?');
    addText('Points are awarded based on match results:');
    addBullet('Win: 2 points');
    addBullet('Draw: 1 point');
    addBullet('Loss: 0 points');
    addText('Teams are ranked by total points, then goal difference if tied.');
    addSpace(10);

    // 10. Glossary
    addTitle('10. Glossary of Terms');
    
    addSubheading('Rink');
    addText('A playing area (lane) on the bowling green. Clubs typically have 4-8 rinks.');
    addSpace(5);
    
    addSubheading('Fixture');
    addText('A scheduled match between two teams in a league or competition.');
    addSpace(5);
    
    addSubheading('League Table');
    addText('A standings table showing teams ranked by points and goal difference.');
    addSpace(5);
    
    addSubheading('Blacklisted Date');
    addText('A date range where no fixtures should be scheduled (e.g., Christmas).');
    addSpace(5);
    
    addSubheading('Auto-Approval');
    addText('A setting where bookings are automatically approved without admin review.');
    addSpace(5);
    
    addSubheading('Selection Module');
    addText('The feature used to pick teams for matches and notify selected players.');
    addSpace(5);
    
    addSubheading('Team Captain');
    addText('A member with additional permissions to manage a league team.');
    addSpace(5);
    
    addSubheading('Live Scoring');
    addText('Real-time score entry during matches, visible to all members.');
    addSpace(10);

    // Footer
    doc.setFontSize(8);
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
    }

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="BowlsTime-User-Guide.pdf"'
      }
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});