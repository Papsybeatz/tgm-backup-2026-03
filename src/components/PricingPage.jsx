
import styles from './PricingPage.module.css';
import { logEvent } from '../utils/logger';
import { useTranslation } from 'react-i18next';

export default function PricingPage() {
  const { t } = useTranslation();
  const starterCheckout = 'https://grantsmaster.lemonsqueezy.com/checkout/buy/2efea376-b1ae-4032-a611-2d43d03d3430';
  const proCheckout = 'https://grantsmaster.lemonsqueezy.com/checkout/buy/6e1e2b7c-6c2a-4b2e-8e2a-7e2b7c6c2a4b';
  const agencyStarterCheckout = 'https://grantsmaster.lemonsqueezy.com/checkout/buy/f9a73e20-a3dd-4bf3-a267-946258010531';
  const agencyUnlimitedCheckout = 'https://grantsmaster.lemonsqueezy.com/checkout/buy/bbba7a22-44c0-4082-8530-ef5cf48bfcc5';

  return (
    <div className={styles.pricingPageContainer}>
      <h1 className={styles.pricingTitle}>{t('pricing')}</h1>
      <h2 className={styles.pricingSubtitle}>Start free. Upgrade as you grow.</h2>
      <div className={styles.pricingGrid}>
        {/* Free Tier */}
        <div className={styles.pricingCard}>
          <h3>Free</h3>
          <p><b>$0/mo</b></p>
          <ul>
            <li>5 drafts per month</li>
            <li>Basic validator access</li>
          </ul>
          <button className={styles.pricingButton} onClick={() => window.location.href = '/dashboard/free?success=true'}>
            Start Free
          </button>
        </div>
        {/* Starter Tier */}
        <div className={styles.pricingCard}>
          <h3>Starter</h3>
          <p><b>$19.99/mo</b></p>
          <ul>
            <li>5 drafts per month</li>
            <li>Downloadable proposals</li>
            <li>1 team seat</li>
            <li>Basic validator access</li>
          </ul>
          <button className={styles.pricingButton} onClick={() => {
            logEvent('TIER_UPGRADE_CLICK', { tier: 'Starter' });
            window.location.href = starterCheckout;
          }}>Upgrade</button>
        </div>
        {/* Pro Tier */}
        <div className={styles.pricingCard}>
          <h3>Pro</h3>
          <p><b>$49/mo</b></p>
          <ul>
            <li>Unlimited grant drafts</li>
            <li>Advanced agent guidance</li>
            <li>Analytics dashboard</li>
            <li>Priority support</li>
          </ul>
          <button className={styles.pricingButton} onClick={() => {
            logEvent('TIER_UPGRADE_CLICK', { tier: 'Pro' });
            window.location.href = proCheckout;
          }}>Upgrade</button>
        </div>
        {/* Agency Starter Tier */}
        <div className={styles.pricingCard}>
          <h3>Agency Starter</h3>
          <p><b>$79/mo</b></p>
          <ul>
            <li>Up to 10 seats</li>
            <li>Unlimited drafts</li>
            <li>Up to 5 client workspaces</li>
            <li>White-label proposals</li>
            <li>Analytics dashboard</li>
            <li>Priority support</li>
          </ul>
          <button className={styles.pricingButton} onClick={() => {
            logEvent('TIER_UPGRADE_CLICK', { tier: 'Agency Starter' });
            window.location.href = agencyStarterCheckout;
          }}>Upgrade</button>
        </div>
        {/* Agency Unlimited Tier */}
        <div className={styles.pricingCard}>
          <h3>Agency Unlimited</h3>
          <p><b>$249/mo</b></p>
          <ul>
            <li>Unlimited seats</li>
            <li>Unlimited drafts</li>
            <li>Unlimited client workspaces</li>
            <li>Full white-label</li>
            <li>Advanced analytics</li>
            <li>Priority support + onboarding</li>
          </ul>
          <button className={styles.pricingButton} onClick={() => {
            logEvent('TIER_UPGRADE_CLICK', { tier: 'Agency Unlimited' });
            window.location.href = agencyUnlimitedCheckout;
          }}>Upgrade</button>
        </div>
      </div>
    </div>
  );
}
