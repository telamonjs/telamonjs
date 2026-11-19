'use client'

import { useEffect } from 'react'
import { signOut } from 'next-auth/react'

export default function SignOutPage() {
  useEffect(() => {
    signOut({
      callbackUrl: '/sign-in',
      redirect: true,
    })
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <p className="text-lg">Saindo...</p>
      </div>
    </div>
  )
}
