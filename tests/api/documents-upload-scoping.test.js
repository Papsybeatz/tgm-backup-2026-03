const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  sanitizeUserId,
  userUploadDir,
  listUserUploads,
} = require('../../backend/utils/uploadStorage');

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'tgm-uploads-'));
}

test('uploads for different users are stored in different directories', () => {
  const root = tempRoot();
  const a = userUploadDir(root, 'user_A');
  const b = userUploadDir(root, 'user_B');

  assert.notEqual(a, b);
  assert.equal(path.dirname(a), root);
  assert.equal(path.dirname(b), root);
  assert.ok(fs.existsSync(a));
  assert.ok(fs.existsSync(b));
});

test('a user only lists their own uploads', () => {
  const root = tempRoot();
  const a = userUploadDir(root, 'user_A');
  const b = userUploadDir(root, 'user_B');

  fs.writeFileSync(path.join(a, '1700000000000-own-doc.pdf'), 'A');
  fs.writeFileSync(path.join(b, '1700000000001-other-doc.pdf'), 'B');

  const listA = listUserUploads(root, 'user_A');
  const listB = listUserUploads(root, 'user_B');

  assert.deepEqual(listA.map((f) => f.name), ['own-doc.pdf']);
  assert.deepEqual(listB.map((f) => f.name), ['other-doc.pdf']);
});

test('legacy files in the shared root are not exposed to any user', () => {
  const root = tempRoot();
  fs.writeFileSync(path.join(root, '1600000000000-legacy-leak.pdf'), 'legacy');

  assert.deepEqual(listUserUploads(root, 'user_A'), []);
  assert.deepEqual(listUserUploads(root, 'user_B'), []);
});

test('a crafted user id cannot escape the upload root', () => {
  const root = tempRoot();
  const dir = userUploadDir(root, '../../etc');

  assert.equal(dir, path.join(root, 'etc'));
  assert.ok(dir.startsWith(root));
});

test('an empty or non-usable user id is rejected', () => {
  assert.throws(() => sanitizeUserId('../../'), /valid user id/);
  assert.throws(() => sanitizeUserId(''), /valid user id/);
  assert.throws(() => sanitizeUserId(null), /valid user id/);
});
