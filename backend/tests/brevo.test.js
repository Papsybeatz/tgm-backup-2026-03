/**
 * Brevo sender tests
 * ----------------------------------------------------------------------------
 * Regression guard for a bug that silently broke every email in the app:
 * Brevo rejects the whole send with {"code":"missing_parameter","message":
 * "name is missing in to"} when the recipient name is blank. Any account whose
 * user has no display name hit that on every single send.
 *
 * Run: cd backend && npm run test:brevo
 */
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.BREVO_API_KEY = 'test-key';
process.env.BREVO_FROM_EMAIL = 'support@thegrantsmaster.com';

const { sendBrevoEmail, buildRecipient, parseListId } = require('../utils/brevo');

test('a Brevo list id is only accepted when it is a positive integer', () => {
  // These arrive from env vars as strings. Number('') is 0 and Number('abc') is
  // NaN — both falsy — so an unusable value used to create contacts with no list
  // membership while every caller reported success.
  assert.equal(parseListId('12'), 12);
  assert.equal(parseListId(34), 34);
  assert.equal(parseListId(' 56 '), 56);

  assert.equal(parseListId(''), null);
  assert.equal(parseListId('   '), null);
  assert.equal(parseListId(undefined), null);
  assert.equal(parseListId(null), null);
  assert.equal(parseListId('abc'), null);
  assert.equal(parseListId('12abc'), null);
  assert.equal(parseListId('0'), null);
  assert.equal(parseListId('-3'), null);
  assert.equal(parseListId('3.5'), null);
});

test('buildRecipient is the single source of the recipient rule', () => {
  // Used by the invite and password-reset senders, which previously built the
  // recipient by hand and omitted the name entirely.
  assert.deepEqual(buildRecipient('A@B.com', ''), { email: 'a@b.com', name: 'a' });
  assert.deepEqual(buildRecipient('A@B.com', '  '), { email: 'a@b.com', name: 'a' });
  assert.deepEqual(buildRecipient('x@y.com', 'Hope Orphanage'), { email: 'x@y.com', name: 'Hope Orphanage' });
  assert.equal(buildRecipient('', 'x'), null);
  assert.equal(buildRecipient(null, 'x'), null);
  assert.equal(buildRecipient('   ', 'x'), null);
});

/** Capture the exact payload handed to the Brevo API. */
function captureFetch() {
  const calls = [];
  global.fetch = async (url, opts) => {
    calls.push(JSON.parse(opts.body));
    return { status: 201, ok: true, text: async () => '{"messageId":"1"}' };
  };
  return calls;
}

test('the recipient name is never blank, whatever the account has', async () => {
  const calls = captureFetch();

  const cases = [
    { toName: '', email: 'clotteythomas41@gmail.com' },
    { toName: '   ', email: 'a@b.com' },
    { toName: undefined, email: 'c@d.com' },
    { toName: 'Grace Mensah', email: 'e@f.com' },
  ];

  for (const c of cases) {
    calls.length = 0;
    const result = await sendBrevoEmail({
      to: c.email,
      toName: c.toName,
      subject: 'Subject',
      htmlContent: '<p>body</p>',
    });

    assert.equal(result.sent, true, `should send for ${c.email}`);
    const recipient = calls[0].to[0];
    assert.equal(recipient.email, c.email.toLowerCase());
    assert.equal(typeof recipient.name, 'string');
    assert.ok(recipient.name.trim().length > 0, `name must not be blank for ${c.email}`);
  }
});

test('a real display name is preserved rather than overwritten', async () => {
  const calls = captureFetch();
  await sendBrevoEmail({ to: 'x@y.com', toName: 'Hope Orphanage', subject: 'S', htmlContent: '<p>b</p>' });
  assert.equal(calls[0].to[0].name, 'Hope Orphanage');
});

test('a missing recipient is refused before hitting the network', async () => {
  const calls = captureFetch();
  const result = await sendBrevoEmail({ to: '   ', toName: 'Someone', subject: 'S', htmlContent: '<p>b</p>' });
  assert.equal(result.sent, false);
  assert.match(result.error, /recipient/i);
  assert.equal(calls.length, 0, 'must not call the provider without a recipient');
});

test('attachments are only included when present', async () => {
  const calls = captureFetch();

  await sendBrevoEmail({ to: 'a@b.com', toName: 'A', subject: 'S', htmlContent: '<p>b</p>' });
  assert.equal('attachment' in calls[0], false, 'no attachment key when none supplied');

  await sendBrevoEmail({
    to: 'a@b.com',
    toName: 'A',
    subject: 'S',
    htmlContent: '<p>b</p>',
    attachments: [{ content: Buffer.from('pdf').toString('base64'), name: 'letter.pdf' }],
  });
  assert.equal(calls[1].attachment.length, 1);
  assert.equal(calls[1].attachment[0].name, 'letter.pdf');
});
