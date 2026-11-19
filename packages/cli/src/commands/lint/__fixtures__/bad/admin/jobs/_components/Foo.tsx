'use client'

import Link from 'next/link'
import { Button } from '@telamonjs/ui'
import { getIcon } from '@/lib/icons'

const Icon = getIcon('Plus')

export function Foo() {
  return (
    <div>
      {/* no-raw-link */}
      <Link href="/admin/jobs" className="underline">
        Ver jobs
      </Link>
      <a href="/admin/jobs">jobs</a>
      {/* ok: external / download / asChild */}
      <a href="https://example.com" target="_blank" rel="noreferrer">
        docs
      </a>
      <a href="/relatorio.csv" download>
        baixar
      </a>
      <Button asChild>
        <Link href="/admin/jobs">Ver jobs</Link>
      </Button>
      {/* button-icon-size */}
      <Button>
        <Icon className="h-3 w-3" />
        Novo
      </Button>
      {/* ok */}
      <Button>
        <Icon className="mr-2 h-4 w-4" />
        Novo
      </Button>
      <Button>
        <Icon className={cls} />
      </Button>
    </div>
  )
}

const cls = 'x'

export function Mail({ email }: { email: string }) {
  return <a href={`mailto:${email}`}>{email}</a>
}
