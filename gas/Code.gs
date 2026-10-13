/**
 * Women's Hack Day — webhook for login codes and CV storage.
 *
 * The site POSTs JSON to this web app, always with { secret, action }:
 *   send-otp   { email, otp, type }  emails the 6-digit code
 *   upload-cv  { fileName, base64 }  saves a PDF to the CV folder → { fileId }
 *   delete-cv  { fileId }            moves that CV to the Drive trash
 * Mail is sent and files are owned by the account that deployed the script.
 *
 * Setup (see gas/README.md):
 *   1. Project Settings → Script Properties → add GAS_SECRET (same value as the site's).
 *   2. Deploy → New deployment → Web app; Execute as: Me; Who has access: Anyone.
 *   3. Put the /exec URL in the site's GAS_URL.
 *
 * Apps Script web apps always answer HTTP 200, so the result is in the body:
 *   { ok: true } or { ok: false, error: '...' }.
 */

const BRAND = {
  name: "Women's Hack Day",
  pink: '#fd5cc3',
  purple: '#602aaf',
  dark: '#0e0e13',
};

const OTP_PATTERN = /^\d{6}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_LIFETIME_MINUTES = 5;
const CV_FOLDER_NAME = "Women's Hack Day CVs";
const CV_MAX_BYTES = 5 * 1024 * 1024;
const FILE_ID_PATTERN = /^[\w-]{10,200}$/;

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    const expected = PropertiesService.getScriptProperties().getProperty('GAS_SECRET');
    if (!expected) return reply({ ok: false, error: 'GAS_SECRET script property is not set' });
    if (body.secret !== expected) return reply({ ok: false, error: 'Unauthorized' });

    if (body.action === 'send-otp') return sendOtp(body);
    if (body.action === 'upload-cv') return uploadCv(body);
    if (body.action === 'delete-cv') return deleteCv(body);
    return reply({ ok: false, error: 'Unknown action: ' + body.action });
  } catch (err) {
    console.error(err);
    return reply({ ok: false, error: String(err) });
  }
}

/** Visiting the /exec URL in a browser shows this — handy to confirm the deployment is live. */
function doGet() {
  return reply({
    ok: true,
    service: BRAND.name + ' mailer',
    quotaLeft: MailApp.getRemainingDailyQuota(),
  });
}

function sendOtp(body) {
  const email = String(body.email || '').trim();
  const otp = String(body.otp || '');
  if (!EMAIL_PATTERN.test(email)) return reply({ ok: false, error: 'Invalid email' });
  if (!OTP_PATTERN.test(otp)) return reply({ ok: false, error: 'Invalid code' });

  MailApp.sendEmail({
    to: email,
    subject: otp + ' is your ' + BRAND.name + ' code',
    body:
      'Your ' +
      BRAND.name +
      ' sign-in code is ' +
      otp +
      '.\n\n' +
      'It expires in ' +
      CODE_LIFETIME_MINUTES +
      ' minutes. ' +
      "If you didn't request it, you can ignore this email.",
    htmlBody: otpHtml(otp),
    name: BRAND.name,
  });

  return reply({ ok: true });
}

function otpHtml(otp) {
  return (
    '<div style="background:' +
    BRAND.dark +
    ';padding:32px 16px;font-family:Arial,sans-serif">' +
    '<div style="max-width:420px;margin:0 auto;background:' +
    BRAND.pink +
    ';border-radius:20px;padding:12px 12px 16px">' +
    '<div style="background:' +
    BRAND.purple +
    ';border-radius:12px 12px 0 0;padding:20px;color:#fff">' +
    '<div style="font-size:20px;font-weight:bold">' +
    BRAND.name +
    '</div>' +
    '<div style="font-size:14px;opacity:.85;margin-top:4px">Your sign-in code</div>' +
    '</div>' +
    '<div style="background:' +
    BRAND.purple +
    ';border-radius:0 0 12px 12px;margin-top:8px;padding:20px;color:#fff;text-align:center">' +
    '<div style="font-size:40px;font-weight:bold;letter-spacing:10px">' +
    otp +
    '</div>' +
    '<div style="font-size:13px;opacity:.8;margin-top:12px">Expires in ' +
    CODE_LIFETIME_MINUTES +
    " minutes. If you didn't request it, ignore this email.</div>" +
    '</div>' +
    '</div>' +
    '</div>'
  );
}

/**
 * The private Drive folder CVs go into. Uses the CV_FOLDER_ID script property
 * when set; otherwise creates the folder once and remembers its id.
 */
function getCvFolder() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('CV_FOLDER_ID');
  if (id) return DriveApp.getFolderById(id);
  const folder = DriveApp.createFolder(CV_FOLDER_NAME);
  props.setProperty('CV_FOLDER_ID', folder.getId());
  return folder;
}

function uploadCv(body) {
  const fileName = String(body.fileName || '').slice(0, 120);
  if (!/\.pdf$/i.test(fileName)) return reply({ ok: false, error: 'Invalid file name' });

  const bytes = Utilities.base64Decode(String(body.base64 || ''));
  if (bytes.length === 0 || bytes.length > CV_MAX_BYTES)
    return reply({ ok: false, error: 'Invalid file size' });

  const blob = Utilities.newBlob(bytes, 'application/pdf', fileName);
  const file = getCvFolder().createFile(blob);
  return reply({ ok: true, fileId: file.getId() });
}

function deleteCv(body) {
  const fileId = String(body.fileId || '');
  if (!FILE_ID_PATTERN.test(fileId)) return reply({ ok: false, error: 'Invalid file id' });

  let file;
  try {
    file = DriveApp.getFileById(fileId);
  } catch (err) {
    // Already gone (deleted by hand in Drive): nothing left to do.
    return reply({ ok: true });
  }

  // Only ever touch files inside the CV folder, whatever id is sent.
  const folderId = getCvFolder().getId();
  const parents = file.getParents();
  let inFolder = false;
  while (parents.hasNext()) if (parents.next().getId() === folderId) inFolder = true;
  if (!inFolder) return reply({ ok: false, error: 'File is not in the CV folder' });

  file.setTrashed(true);
  return reply({ ok: true });
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

/**
 * Run this once from the editor to grant mail and Drive permission: it sends
 * you a test code and creates the CV folder.
 */
function testSendToMe() {
  const me = Session.getActiveUser().getEmail();
  sendOtp({ email: me, otp: '123456' });
  console.log('CV folder: ' + getCvFolder().getUrl());
  console.log(
    'Sent a test code to ' + me + '. Remaining daily quota: ' + MailApp.getRemainingDailyQuota(),
  );
}
