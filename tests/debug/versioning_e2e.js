// Simple Node E2E test for draft versioning and restore
const fetch = global.fetch || require('node-fetch');
(async function(){
  try {
    const email = `autotest+e2e_${Date.now()}@example.com`;
    console.log('email:', email);
    // login
    let res = await fetch('http://localhost:4000/api/auth/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email }) });
    if (!res.ok) throw new Error('login failed');
    const login = await res.json();
    const token = login.token;
    console.log('token:', token);

    // create draft
    res = await fetch('http://localhost:4000/api/drafts', { method: 'POST', headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ title: 'E2E Draft', content: 'initial' }) });
    const created = await res.json();
    const draftId = created.draft.id;
    console.log('draftId:', draftId);

    // create versions
    await fetch(`http://localhost:4000/api/drafts/${draftId}/versions`, { method: 'POST', headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ content: 'v1' }) });
    await new Promise(r=>setTimeout(r,200));
    await fetch(`http://localhost:4000/api/drafts/${draftId}/versions`, { method: 'POST', headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ content: 'v2' }) });
    console.log('versions created');

    // list versions
    res = await fetch(`http://localhost:4000/api/drafts/${draftId}/versions`, { headers: { Authorization: `Bearer ${token}` } });
    const list = await res.json();
    console.log('versions count:', list.versions.length);
    if (!list.versions || list.versions.length < 2) throw new Error('versions missing');

    // restore older version (the last in array is oldest -> choose last)
    const toRestore = list.versions[list.versions.length-1];
    console.log('restoring version id', toRestore.id);
    res = await fetch(`http://localhost:4000/api/drafts/${draftId}/versions/${toRestore.id}/restore`, { method: 'POST', headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` } });
    const restored = await res.json();
    console.log('restored draft content:', restored.draft.content);
    if (restored.draft.content !== toRestore.content) throw new Error('restore mismatch');
    console.log('E2E versioning test PASSED');
  } catch (e) {
    console.error('E2E failed:', e && e.message ? e.message : e);
    process.exit(1);
  }
})();
