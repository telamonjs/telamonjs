import type { MessagesShape } from '../shape'
import type { auth as base } from '../pt-BR/auth'

export const auth = {
  identifierLabel: 'Email',
  passwordLabel: 'Password',
  showPassword: 'Show password',
  hidePassword: 'Hide password',
  submit: 'Sign in',
  submitting: 'Signing in...',
  forgotPassword: 'Forgot your password?',
  invalidCredentials: 'Invalid credentials. Check your details and try again.',
  signInError: 'Could not sign in. Please try again.',
  forgotSubmit: 'Send reset link',
  forgotSending: 'Sending...',
  forgotSent: "If that email is registered, you'll receive a reset link shortly.",
  forgotError: 'Could not send the link. Please try again.',
  backToSignIn: 'Back to sign in',
} satisfies MessagesShape<typeof base>
