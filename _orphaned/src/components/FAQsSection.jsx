// FAQsSection.jsx
// Collapsible FAQ accordion for The Grants Master
import React, { useState } from 'react';
import styles from './LandingPage.module.css';

const FAQS = [
  {
    q: 'Is this safe for nonprofits?',
    a: 'Yes. The Grants Master is designed with privacy and security in mind. Your documents are never shared or reused.'
  },
  {
    q: 'How accurate is the AI?',
    a: 'The system uses multiple agents to validate and refine each draft. You can compare outputs and run evaluations before submission.'
  },
  {
    q: 'What’s included in each tier?',
    a: 'Free includes 1 draft/month. Starter unlocks downloads and validator runs. Pro and Agency offer unlimited usage and team seats.'
  },
  {
    q: 'How does the invite-only Pro tier work?',
    a: 'You can request access directly from the upgrade modal. Approved users unlock full features and priority support.'
  },
  {
    q: 'Can I upload confidential documents?',
    a: 'Yes. Uploaded files are processed securely and never stored beyond your session unless you choose to save them.'
  },
  {
    q: 'Do you store my drafts?',
    a: 'Only if you choose to save them. You control what gets stored in your workspace.'
  },
  {
    q: 'How do team seats work?',
    a: 'Pro and Agency tiers allow multiple users to collaborate under one account. Each seat has full access to shared drafts.'
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. You can downgrade or cancel your plan at any time from your account settings.'
  }
];

export default function FAQsSection() {
  const [openIdx, setOpenIdx] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const handleToggle = idx => setOpenIdx(openIdx === idx ? null : idx);
  const filteredFaqs = FAQS.filter(faq => {
    if (!searchQuery) return true;
    const q = faq.q.toLowerCase();
    const a = faq.a.toLowerCase();
    const s = searchQuery.toLowerCase();
    return q.includes(s) || a.includes(s);
  });
  return (
    <div className={styles.faqContainer}>
      <label htmlFor="faqSearchInput" style={{ fontWeight: 500, display: 'block', marginBottom: 8 }}>Search FAQs</label>
      <input
        id="faqSearchInput"
        className={styles.faqSearchInput}
        type="text"
        placeholder="Type a keyword…"
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        style={{ marginBottom: 20, width: '100%', maxWidth: 400 }}
      />
      {filteredFaqs.length === 0 ? (
        <div style={{ color: '#888', margin: '2rem 0', textAlign: 'center' }}>No FAQs match your search.</div>
      ) : (
        filteredFaqs.map((faq, idx) => {
          // Map idx to original FAQ index for accordion
          const origIdx = FAQS.findIndex(f => f.q === faq.q && f.a === faq.a);
          return (
            <div className={styles.faqItem} key={origIdx}>
              <div
                className={styles.faqQuestion}
                onClick={() => handleToggle(origIdx)}
                tabIndex={0}
                role="button"
                aria-expanded={openIdx === origIdx}
                aria-controls={`faq-answer-${origIdx}`}
              >
                <span>{faq.q}</span>
                <span className={styles.faqToggleIcon}>{openIdx === origIdx ? '−' : '+'}</span>
              </div>
              {openIdx === origIdx && (
                <div
                  className={styles.faqAnswer}
                  id={`faq-answer-${origIdx}`}
                  aria-live="polite"
                >
                  {faq.a}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
