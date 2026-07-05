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

// Appended to every submission tab's header row — the admin-only review
// columns applicants never see (they're the backend CRM, not the form).
var REVIEW_COLUMNS = ['CRM Status', 'PDF Package Sent', 'Date Sent', 'Reviewed By', 'Next Action'];

function setupSheets() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  ALL_TABS.forEach(function (tabName) {
    if (!ss.getSheetByName(tabName)) {
      var sheet = ss.insertSheet(tabName);
      if (tabName === MASTER_LOG_TAB) {
        sheet.appendRow(['Record ID', 'Route', 'Full Name', 'Email', 'Mobile', 'Location', 'Submitted At']);
      } else if (Object.values(ROUTE_MAP).some(function (r) { return r.tab === tabName; })) {
        sheet.appendRow(['Record ID', 'Timestamp', 'Full Name', 'Email', 'Mobile', 'Location', 'Facebook/Profile Link', 'Typed Signature', 'Signature Image Link', 'Confirm Statement', 'Extra Fields (JSON)'].concat(REVIEW_COLUMNS));
      }
      sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).setFontWeight('bold');
    }
  });
  Logger.log('Sheets ready: ' + ALL_TABS.join(', '));
}

// One-time migration for tabs that already existed before REVIEW_COLUMNS was
// added — appends the missing headers without disturbing existing data/columns.
function addReviewColumns() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  Object.values(ROUTE_MAP).forEach(function (route) {
    var sheet = ss.getSheetByName(route.tab);
    if (!sheet) return;
    var lastCol = sheet.getLastColumn();
    var existingHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var missing = REVIEW_COLUMNS.filter(function (c) { return existingHeaders.indexOf(c) === -1; });
    if (missing.length > 0) {
      sheet.getRange(1, lastCol + 1, 1, missing.length).setValues([missing]).setFontWeight('bold');
    }
  });
  Logger.log('Review columns synced.');
}

// Custom Sheet menu — lets admin trigger a package send manually from
// whichever submission tab + row they have selected. Nothing here fires
// automatically on status change; every send requires this explicit click.
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('AM777 Onboarding')
    .addItem('Send Onboarding Package for Selected Row', 'sendOnboardingPackage')
    .addToMenu();
}

// route key -> { displayName, fileIds: [Drive file IDs to attach] }
// File IDs verified against the actual Drive folder as of 2026-07-05 —
// re-verify if these documents are ever replaced/re-uploaded (Drive assigns
// a new file ID on replace, not just a new version of the same ID).
var PACKAGE_MAP = {
  va: {
    displayName: 'VA Outreach Collaborator Package',
    fileIds: ['10M6IyfzdzXPrU9soL4NHKGRm78E9z7bO', '1vVaclwy4YdDELc--M3N87F6p0pc29zxq', '1YV1fzpvEsnO4eCr6aAbOYxIu3ssjxKoO']
  },
  admin: {
    displayName: 'Admin / Operator Package',
    fileIds: ['1g0flxJlgMNT7ZAks1yTh4_hTKLi4xBJv', '1vVaclwy4YdDELc--M3N87F6p0pc29zxq', '1YV1fzpvEsnO4eCr6aAbOYxIu3ssjxKoO']
  },
  perks: {
    displayName: 'Perks-Based Supporter Package',
    fileIds: ['1yXij9c_dwjRzpYFkJ25guxzAAFpxm7BA', '1YV1fzpvEsnO4eCr6aAbOYxIu3ssjxKoO']
  },
  funder: {
    displayName: 'Revenue-Share Funder Package',
    fileIds: ['1wcvQls2TvmwQOzacKRqSn7GGv-myu5wT', '1YR2K6H2Ukc_rI7fs59fZLsdoKzZlNMUs']
  },
  capital: {
    displayName: 'Formal Capital Inquiry Package (manual review only)',
    fileIds: ['1YR2K6H2Ukc_rI7fs59fZLsdoKzZlNMUs']
  }
};

// tab name -> routeType key, so the menu function knows which package
// applies without needing a separate lookup table.
var TAB_TO_ROUTE = {};
Object.keys(ROUTE_MAP).forEach(function (key) { TAB_TO_ROUTE[ROUTE_MAP[key].tab] = key; });

function sendOnboardingPackage() {
  var ui = SpreadsheetApp.getUi();
  var sheet = SpreadsheetApp.getActiveSheet();
  var routeKey = TAB_TO_ROUTE[sheet.getName()];

  if (!routeKey) {
    ui.alert('Wrong tab', 'Run this from one of the 5 submission tabs (VA/Admin/Perks/Funder/Capital), not "' + sheet.getName() + '".', ui.ButtonSet.OK);
    return;
  }

  var row = sheet.getActiveRange().getRow();
  if (row < 2) {
    ui.alert('Select a data row', 'Click a cell in the applicant\'s row (not the header row) before running this.', ui.ButtonSet.OK);
    return;
  }

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  function col(name) { return headers.indexOf(name) + 1; }

  var recordId = sheet.getRange(row, col('Record ID')).getValue();
  var fullName = sheet.getRange(row, col('Full Name')).getValue();
  var email = sheet.getRange(row, col('Email')).getValue();
  var crmStatus = col('CRM Status') ? sheet.getRange(row, col('CRM Status')).getValue() : '';

  if (!email) {
    ui.alert('No email on this row', 'Record ' + recordId + ' has no email address — cannot send.', ui.ButtonSet.OK);
    return;
  }

  var pkg = PACKAGE_MAP[routeKey];
  var warningLine = '';
  if (routeKey === 'capital') {
    warningLine = '\n\n⚠ FORMAL CAPITAL INQUIRY — manual review only. Sending this does NOT approve funding terms, create an arrangement, or confirm acceptance. Confirm you intend to send the transparency/review-process reference only.';
  }
  if (crmStatus && ['Qualified', 'Approved Pending Funding', 'Active'].indexOf(crmStatus) === -1) {
    warningLine += '\n\n⚠ Current CRM Status is "' + crmStatus + '" — packages are normally sent only at Qualified/Approved. Sending anyway if you confirm.';
  }

  var confirm = ui.alert(
    'Send ' + pkg.displayName + '?',
    'Record: ' + recordId + '\nName: ' + fullName + '\nEmail: ' + email + '\nFiles: ' + pkg.fileIds.length + warningLine,
    ui.ButtonSet.OK_CANCEL
  );
  if (confirm !== ui.Button.OK) return;

  var attachments = pkg.fileIds.map(function (id) { return DriveApp.getFileById(id).getBlob(); });

  MailApp.sendEmail({
    to: email,
    subject: 'AM777 — Your ' + pkg.displayName + ' (' + recordId + ')',
    body:
      'Hi ' + (fullName || 'there') + ',\n\n' +
      'Attached is your ' + pkg.displayName + ' following review of your AM777 onboarding submission (Record ID: ' + recordId + ').\n\n' +
      'Please read through the attached document(s) — they cover your role/support terms, next steps, and what is and isn\'t guaranteed at this stage.\n\n' +
      '— AM777 Automation Solutions\n' +
      'Part of the InfraMind777 ecosystem',
    attachments: attachments
  });

  if (col('PDF Package Sent')) sheet.getRange(row, col('PDF Package Sent')).setValue(pkg.displayName);
  if (col('Date Sent')) sheet.getRange(row, col('Date Sent')).setValue(new Date());
  if (col('Reviewed By')) sheet.getRange(row, col('Reviewed By')).setValue(Session.getActiveUser().getEmail());

  ui.alert('Sent', pkg.displayName + ' sent to ' + email + '.', ui.ButtonSet.OK);
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
