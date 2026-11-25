import type { MessagesShape } from '../shape'
import type { auth as base } from '../pt-BR/auth'

export const auth = {
  identifierLabel: 'Correo electrónico',
  passwordLabel: 'Contraseña',
  showPassword: 'Mostrar contraseña',
  hidePassword: 'Ocultar contraseña',
  submit: 'Iniciar sesión',
  submitting: 'Iniciando sesión...',
  forgotPassword: '¿Olvidaste tu contraseña?',
  invalidCredentials: 'Credenciales inválidas. Revisa tus datos e inténtalo de nuevo.',
  signInError: 'No se pudo iniciar sesión. Inténtalo de nuevo.',
  forgotSubmit: 'Enviar enlace de restablecimiento',
  forgotSending: 'Enviando...',
  forgotSent: 'Si el correo está registrado, recibirás un enlace de restablecimiento en breve.',
  forgotError: 'No se pudo enviar el enlace. Inténtalo de nuevo.',
  backToSignIn: 'Volver al inicio de sesión',
} satisfies MessagesShape<typeof base>
