/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Collegra'
const SITE_URL = 'https://getcollegra.com'

interface PremiumWelcomeProps {
  firstName?: string
  renewalDate?: string // pre-formatted, e.g. "May 30, 2026"
}

const PremiumWelcomeEmail = ({ firstName, renewalDate }: PremiumWelcomeProps) => {
  const greeting = firstName ? `Welcome to Premium, ${firstName}! 🎉` : 'Welcome to Premium! 🎉'

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your Collegra Premium plan is active — full access unlocked.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img
            src="https://iyaflygbuoghplhykhzd.supabase.co/storage/v1/object/public/email-assets/collegra-logo.jpeg"
            width="120"
            height="40"
            alt="Collegra"
            style={{ marginBottom: '24px' }}
          />

          <Heading style={h1}>{greeting}</Heading>

          <Text style={text}>
            Thanks for upgrading to <strong>Collegra Premium</strong>. Your payment was confirmed and your account
            is now fully unlocked.
          </Text>

          <Section style={planCard}>
            <Text style={planLabel}>YOUR PLAN</Text>
            <Text style={planName}>Collegra Premium</Text>
            <Text style={planPrice}>$9.99 / month</Text>
            <Hr style={planDivider} />
            <Text style={planMeta}>
              <strong>Status:</strong> <span style={statusBadge}>Active</span>
            </Text>
            {renewalDate ? (
              <Text style={planMeta}>
                <strong>Next renewal:</strong> {renewalDate}
              </Text>
            ) : null}
          </Section>

          <Heading as="h2" style={h2}>What's unlocked</Heading>
          <Text style={featureRow}>✓ Full match list with fit scores</Text>
          <Text style={featureRow}>✓ Side-by-side college comparison</Text>
          <Text style={featureRow}>✓ Personal notes &amp; college organizer</Text>
          <Text style={featureRow}>✓ AI-powered insights &amp; analysis</Text>
          <Text style={featureRow}>✓ Interactive campus map &amp; travel estimates</Text>
          <Text style={featureRow}>✓ Unlimited quiz retakes</Text>

          <Section style={{ textAlign: 'center', margin: '32px 0 8px' }}>
            <Button style={button} href={`${SITE_URL}/dashboard`}>
              Open your dashboard →
            </Button>
          </Section>

          <Text style={text}>
            You can manage your subscription, update payment details, or cancel anytime from your{' '}
            <Link href={`${SITE_URL}/profile`} style={link}>
              Profile page
            </Link>
            .
          </Text>

          <Hr style={divider} />

          <Text style={footer}>
            Questions? Just reply to this email — we read every message.
          </Text>
          <Text style={footer}>
            — The {SITE_NAME} team
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: PremiumWelcomeEmail,
  subject: 'Welcome to Collegra Premium — your access is unlocked',
  displayName: 'Premium welcome',
  previewData: { firstName: 'Jane', renewalDate: 'May 30, 2026' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#1b2c42',
  margin: '0 0 16px',
}
const h2 = {
  fontSize: '17px',
  fontWeight: '600' as const,
  color: '#1b2c42',
  margin: '24px 0 12px',
}
const text = {
  fontSize: '15px',
  color: '#667a8c',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const featureRow = {
  fontSize: '14px',
  color: '#1b2c42',
  lineHeight: '1.7',
  margin: '0 0 4px',
}
const planCard = {
  backgroundColor: '#f5f9fc',
  border: '1px solid #d6e4f0',
  borderRadius: '10px',
  padding: '20px 22px',
  margin: '20px 0 28px',
}
const planLabel = {
  fontSize: '11px',
  fontWeight: '600' as const,
  color: '#1172c4',
  letterSpacing: '0.08em',
  margin: '0 0 6px',
}
const planName = {
  fontSize: '20px',
  fontWeight: 'bold' as const,
  color: '#1b2c42',
  margin: '0 0 2px',
}
const planPrice = {
  fontSize: '14px',
  color: '#667a8c',
  margin: '0 0 12px',
}
const planDivider = {
  border: 'none',
  borderTop: '1px solid #d6e4f0',
  margin: '12px 0',
}
const planMeta = {
  fontSize: '14px',
  color: '#1b2c42',
  margin: '0 0 6px',
}
const statusBadge = {
  display: 'inline-block',
  backgroundColor: '#dcf5e7',
  color: '#0f7a3e',
  padding: '2px 10px',
  borderRadius: '999px',
  fontSize: '12px',
  fontWeight: '600' as const,
}
const link = { color: '#1172c4', textDecoration: 'underline' }
const button = {
  backgroundColor: '#1172c4',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600' as const,
  borderRadius: '8px',
  padding: '14px 28px',
  textDecoration: 'none',
}
const divider = {
  border: 'none',
  borderTop: '1px solid #eaeef2',
  margin: '32px 0 20px',
}
const footer = { fontSize: '12px', color: '#999999', margin: '0 0 6px' }
