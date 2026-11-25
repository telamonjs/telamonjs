import { SignInForm } from '@telamonjs/ui'
import { Layout } from 'lucide-react'

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 text-2xl font-bold">
            <Layout className="h-8 w-8" />
            TelamonJS App
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Faça login para acessar o sistema
          </p>
        </div>

        <div className="rounded-lg border bg-background p-8 shadow-sm">
          <SignInForm callbackUrl="/admin" identifierPlaceholder="admin@example.com" />
        </div>
      </div>
    </div>
  )
}
