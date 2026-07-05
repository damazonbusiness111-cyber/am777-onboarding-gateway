/**
 * AM777 Onboarding Gateway — Apps Script backend
 *
 * Setup:
 * 1. Create a Google Sheet, open Extensions > Apps Script, paste this file in as Code.gs.
 * 2. Set SHEET_ID below to that Sheet's ID (from its URL).
 * 3. Set SIGNATURE_FOLDER_ID to a Google Drive folder ID where signature images will be saved.
 * 4. Set ADMIN_EMAIL to where new-submission notifications should go.
 * 5. Run setupSheets() once (Run > setupSheets) to create all tabs with headers.
 * 6. Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone.
 * 7. Copy the deployment URL into APPS_SCRIPT_URL in script.js.
 */

var SHEET_ID = '1FHAUFSkXUXw9w71dGbpZpnDNTVjU47T4nP8pSxWmIVw';
var SIGNATURE_FOLDER_ID = '1PZmYQdwWxacMuhTfkGC8xhCSVp_TyvdO';
var ADMIN_EMAIL = 'damazonbusiness111@gmail.com';

// routeType -> { tab, idPrefix }
var ROUTE_MAP = {
  va: { tab: 'VA Agreement Submissions', idPrefix: 'AM777-VA' },
  admin: { tab: 'Admin Agreement Submissions', idPrefix: 'AM777-ADM' },
  perks: { tab: 'Perks-Based Supporter Submissions', idPrefix: 'AM777-PERK' },
  funder: { tab: 'Revenue-Share Funder Submissions', idPrefix: 'AM777-FND' },
  capital: { tab: 'Formal Capital Inquiries', idPrefix: 'AM777-CAP-INQ' }
};

var MASTER_LOG_TAB = 'Onboarding Master Log';

// Tabs created by setupSheets() for the wider ecosystem this gateway feeds
// into. Only MASTER_LOG_TAB and the 5 submission tabs above are written to
// by doPost() below — the rest are for manual/downstream ops tracking.
var ALL_TABS = [
  MASTER_LOG_TAB,
  'VA Agreement Submissions',
  'Admin Agreement Submissions',
  'Perks-Based Supporter Submissions',
  'Revenue-Share Funder Submissions',
  'Formal Capital Inquiries',
  'Support Contributions',
  'Funded Initiatives',
  'Qualified Revenue',
  'Approved Costs',
  'Payout Tracker',
  'Perk Fulfillment Tracker',
  'Tech Stack Needs',
  'Hardware Upgrade Tracker',
  'Tool Subscription Tracker',
  'Admin Review Log',
  'Reports'
];

function setupSheets() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  ALL_TABS.forEach(function (tabName) {
    if (!ss.getSheetByName(tabName)) {
      var sheet = ss.insertSheet(tabName);
      if (tabName === MASTER_LOG_TAB) {
        sheet.appendRow(['Record ID', 'Route', 'Full Name', 'Email', 'Mobile', 'Location', 'Submitted At']);
      } else if (Object.values(ROUTE_MAP).some(function (r) { return r.tab === tabName; })) {
        sheet.appendRow(['Record ID', 'Timestamp', 'Full Name', 'Email', 'Mobile', 'Location', 'Facebook/Profile Link', 'Typed Signature', 'Signature Image Link', 'Confirm Statement', 'Extra Fields (JSON)']);
      }
      sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).setFontWeight('bold');
    }
  });
  Logger.log('Sheets ready: ' + ALL_TABS.join(', '));
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var route = ROUTE_MAP[payload.routeType];
    if (!route) {
      return jsonResponse({ error: 'Unknown routeType: ' + payload.routeType });
    }

    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName(route.tab);
    if (!sheet) {
      return jsonResponse({ error: 'Sheet tab not found: ' + route.tab + '. Run setupSheets() first.' });
    }

    var recordId = generateRecordId(sheet, route.idPrefix);
    var timestamp = payload.timestamp || new Date().toLocaleString();
    var sigLink = saveSignatureToDrive(payload.drawnSignature, recordId);

    sheet.appendRow([
      recordId,
      timestamp,
      payload.fullName || '',
      payload.email || '',
      payload.mobile || '',
      payload.location || '',
      payload.fbLink || '',
      payload.typedSignature || '',
      sigLink,
      payload.confirmStatement || '',
      JSON.stringify(payload.extra || {})
    ]);

    var masterSheet = ss.getSheetByName(MASTER_LOG_TAB);
    if (masterSheet) {
      masterSheet.appendRow([recordId, route.tab, payload.fullName || '', payload.email || '', payload.mobile || '', payload.location || '', timestamp]);
    }

    notifyAdmin(route, recordId, payload);
    sendApplicantEmail(payload.routeType, route, recordId, payload);

    return jsonResponse({ recordId: recordId, timestamp: timestamp, status: 'received' });
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

function doGet() {
  return jsonResponse({ status: 'AM777 Onboarding Gateway backend is running' });
}

function generateRecordId(sheet, idPrefix) {
  var lastRow = sheet.getLastRow(); // includes header row
  var seq = Math.max(1, lastRow); // header counts as slot 0, so this stays >=1
  var d = new Date();
  var stamp = Utilities.formatDate(d, Session.getScriptTimeZone() || 'Asia/Manila', 'yyyyMMdd');
  var seqStr = ('000' + seq).slice(-4);
  return idPrefix + '-' + stamp + '-' + seqStr;
}

function saveSignatureToDrive(dataUrl, recordId) {
  if (!dataUrl || dataUrl.indexOf('base64,') === -1) return '';
  try {
    var base64 = dataUrl.split('base64,')[1];
    var blob = Utilities.newBlob(Utilities.base64Decode(base64), 'image/png', recordId + '-signature.png');
    var folder = DriveApp.getFolderById(SIGNATURE_FOLDER_ID);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (err) {
    return 'Error saving signature: ' + err.message;
  }
}

function notifyAdmin(route, recordId, payload) {
  try {
    MailApp.sendEmail({
      to: ADMIN_EMAIL,
      subject: 'AM777 Gateway — New ' + route.tab + ' — ' + recordId,
      body:
        'A new onboarding submission was received.\n\n' +
        'Record ID: ' + recordId + '\n' +
        'Route: ' + route.tab + '\n' +
        'Name: ' + (payload.fullName || '') + '\n' +
        'Email: ' + (payload.email || '') + '\n' +
        'Mobile: ' + (payload.mobile || '') + '\n' +
        'Location: ' + (payload.location || '') + '\n\n' +
        'Review this in the "' + MASTER_LOG_TAB + '" and "' + route.tab + '" tabs.\n' +
        'Reminder: no submission is auto-approved.'
    });
  } catch (err) {
    Logger.log('Notification failed: ' + err.message);
  }
}

// Perk tier benefits, keyed to the exact option strings used in script.js's
// ROUTES.perks.extraFields perkTier list — used to build the applicant's
// tier breakdown below.
var PERK_TIER_BENEFITS = {
  'Supporter (PHP 500-999)': ['Small tool/software support credit toward AM777\'s stack', 'A Supporter ID for your records', 'Optional thank-you mention', 'Build update emails'],
  'Builder Supporter (PHP 1,000-2,999)': ['Contribution toward AI tools, domains, or assets', 'Early access to templates', '10% discount on AM777 services'],
  'Stack Sponsor (PHP 3,000-4,999)': ['Contribution toward tech stack / CRM development', 'Beta access to new tools', '20% discount on AM777 services', 'Optional mention'],
  'Infrastructure Sponsor (PHP 5,000-9,999)': ['Contribution toward hardware / GPU / local AI infrastructure', 'A workflow diagnosis session', 'Priority beta access'],
  'Ecosystem Patron (PHP 10,000+)': ['Larger infrastructure support', 'A private automation roadmap session', '25% discount on AM777 services', 'Optional sponsor mention']
};

function sendApplicantEmail(routeType, route, recordId, payload) {
  try {
    var extra = payload.extra || {};
    var name = payload.fullName || 'there';
    var breakdown = buildRouteBreakdown(routeType, extra);

    var body =
      'Hi ' + name + ',\n\n' +
      'Thanks for submitting your ' + route.tab.replace(' Submissions', '').replace(' Agreement', '') + ' application to AM777 Automation Solutions.\n\n' +
      'Record ID: ' + recordId + '\n\n' +
      breakdown +
      '\nWhat happens next:\n' +
      'This submission is not automatically approved. The AM777 team reviews every application personally. If approved, you\'ll receive a follow-up with next steps specific to your role — this email is your confirmation and terms reference, not an acceptance.\n\n' +
      'Keep this email and your printed/saved copy from the gateway for your records.\n\n' +
      '— AM777 Automation Solutions\n' +
      'Part of the InfraMind777 ecosystem';

    MailApp.sendEmail({
      to: payload.email,
      subject: 'AM777 — Your ' + route.tab.replace(' Submissions', '') + ' Application (' + recordId + ')',
      body: body
    });
  } catch (err) {
    Logger.log('Applicant email failed: ' + err.message);
  }
}

function buildRouteBreakdown(routeType, extra) {
  if (routeType === 'va') {
    return (
      'Your terms recap:\n' +
      '- Collaboration-based, not salaried employment.\n' +
      '- Dividend = (Client Payment - Approved Expenses) x your agreed %.\n' +
      '- No CRM record means no commission claim — log every lead.\n' +
      '- New payments are held 7 days before commission is released (refund/dispute protection).\n' +
      '- A lead stays credited to you only with a recorded follow-up at least every 30 days.\n' +
      '- Preferred payment method on file: ' + (extra.paymentMethod || 'not provided') + '\n'
    );
  }
  if (routeType === 'admin') {
    return (
      'Your terms recap:\n' +
      '- Collaboration-based, no ownership stake in AM777.\n' +
      '- Dividend = (Client Payment - Approved Expenses) x your agreed %.\n' +
      '- CRM accuracy and confidentiality are your direct responsibility in this role.\n' +
      '- Admin role type on file: ' + (extra.adminRoleType || 'not provided') + '\n'
    );
  }
  if (routeType === 'perks') {
    var tier = extra.perkTier || '';
    var benefits = PERK_TIER_BENEFITS[tier];
    var lines = 'Your selected tier: ' + (tier || 'not provided') + '\n';
    if (benefits) {
      lines += 'What this tier includes:\n' + benefits.map(function (b) { return '- ' + b; }).join('\n') + '\n';
    }
    lines += '\nThis is perks-based support only — no equity, no revenue-share, no repayment, and no guaranteed return.\n';
    return lines;
  }
  if (routeType === 'funder') {
    return (
      'Your proposed terms recap (subject to review and approval):\n' +
      '- Contribution amount proposed: ' + (extra.contributionAmount || 'not provided') + '\n' +
      '- Funded initiative: ' + (extra.fundedInitiative || 'not provided') + '\n' +
      '- Proposed share terms: ' + (extra.proposedShareTerms || 'not provided') + '\n' +
      '- Proposed cap: ' + (extra.proposedCap || 'not provided') + '\n' +
      '- Proposed term length: ' + (extra.proposedTermLength || 'not provided') + '\n' +
      '- Reporting cadence: ' + (extra.reportingCadence || 'not provided') + '\n\n' +
      'This is a revenue-share, not equity or a guaranteed-return loan. Your share depends on actual project performance and is not guaranteed.\n'
    );
  }
  if (routeType === 'capital') {
    return (
      'Your inquiry recap:\n' +
      '- Proposed amount / range: ' + (extra.proposedAmountRange || 'not provided') + '\n' +
      '- Inquiry type: ' + (extra.inquiryType || 'not provided') + '\n\n' +
      'This is a formal inquiry only. It does not create an accepted arrangement, ownership right, repayment right, or revenue-share agreement. The AM777 team will follow up to discuss further.\n'
    );
  }
  return '';
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
