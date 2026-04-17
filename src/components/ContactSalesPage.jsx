import React from 'react';


function ContactSalesPage() {
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [honeypot, setHoneypot] = React.useState('');
  const [status, setStatus] = React.useState('idle'); // idle | sending | sent | error | spam

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('sending');
    const aliasEmail = 'tcaibiznes@gmail.com';
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message, honeypot, to: aliasEmail })
      });
      if (res.status === 429) {
        setStatus('spam');
      } else if (res.ok) {
        setStatus('sent');
      } else {
        setStatus('error');
      }
    } catch (err) {
      setStatus('error');
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: '2rem auto', padding: '2rem', border: '1px solid #eee', borderRadius: 8 }}>
      <h1>Contact</h1>
      <form onSubmit={handleSubmit} autoComplete="off">
        <div style={{ marginBottom: '1rem' }}>
          <label>Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} required style={{ width: '100%' }} />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%' }} />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label>Message</label>
          <textarea value={message} onChange={e => setMessage(e.target.value)} required style={{ width: '100%' }} />
        </div>
        {/* Honeypot field for spam protection (hidden from users) */}
        <div style={{ display: 'none' }}>
          <label>Leave this field blank</label>
          <input type="text" value={honeypot} onChange={e => setHoneypot(e.target.value)} autoComplete="off" tabIndex="-1" />
        </div>
        <button type="submit" disabled={status === 'sending'}>Send</button>
        {status === 'sent' && <p style={{ color: 'green' }}>Message sent!</p>}
        {status === 'error' && <p style={{ color: 'red' }}>Error sending message. Please try again.</p>}
        {status === 'spam' && <p style={{ color: 'orange' }}>Spam detected. Submission blocked.</p>}
      </form>
    </div>
  );
}

export default ContactSalesPage;
