/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to join Collegra</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://iyaflygbuoghplhykhzd.supabase.co/storage/v1/object/public/email-assets/collegra-logo.jpeg"
          width="120"
          height="40"
          alt="Collegra"
          style={{ marginBottom: '24px' }}
        />
        <Heading style={h1}>You've been invited! 🎓</Heading>
        <Text style={text}>
          You've been invited to join{' '}
          <Link href={siteUrl} style={link}>
            <strong>Collegra</strong>
          </Link>
          . Click the button below to accept and create your account.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Accept Invitation →
        </Button>
        <Text style={footer}>
          If you weren't expecting this invitation, you can safely ignore this
          email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '32px 28px' }
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#1b2c42',
  margin: '0 0 20px',
}
const text = {
  fontSize: '15px',
  color: '#667a8c',
  lineHeight: '1.6',
  margin: '0 0 24px',
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
const footer = { fontSize: '12px', color: '#999999', margin: '32px 0 0' }
