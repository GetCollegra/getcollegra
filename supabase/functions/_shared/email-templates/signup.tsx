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

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to Collegra — verify your email to get started</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://iyaflygbuoghplhykhzd.supabase.co/storage/v1/object/public/email-assets/collegra-logo.jpeg"
          width="120"
          height="40"
          alt="Collegra"
          style={{ marginBottom: '24px' }}
        />
        <Heading style={h1}>Welcome aboard! 🎓</Heading>
        <Text style={text}>
          Thanks for signing up for{' '}
          <Link href={siteUrl} style={link}>
            <strong>Collegra</strong>
          </Link>
          ! You're one step away from discovering your perfect college matches.
        </Text>
        <Text style={text}>
          Please verify your email (
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ) to activate your account:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Get Started →
        </Button>
        <Text style={footer}>
          If you didn't create an account, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

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
