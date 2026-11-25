# {{appName}}

Complete admin application template built with Next.js 15, React 19, TypeScript and the TelamonJS UI framework.

## 🚀 Features

- ✅ **Next.js 15** with App Router and React 19
- ✅ **TypeScript** in strict mode
- ✅ **Authentication** fully set up with NextAuth v5
- ✅ **{{databaseName}}** as the database
- ✅ **Prisma ORM** for type-safe queries
- ✅ **AdminShell**: sidebar, breadcrumb, header and Cmd+K command palette
- ✅ **Theme System** (light/dark)
- ✅ **TelamonJS UI components** ready to use
- ✅ **Dashboard** with stat cards
- ✅ **Docker Compose** for development

## 📦 Prerequisites

- Docker and Docker Compose
- Node.js 22+ (for local development)
- pnpm 9+

## 🏃 Quick Start with Docker

1. Clone or extract this template
2. Run the production compose file (`docker-compose.yml` holds only the
   database, for local development):

```bash
docker compose -f docker-compose.prod.yml up --build
```

3. Wait for the build and startup (the first run can take ~5 minutes)
4. Open http://localhost:{{appPort}}
5. Sign in with:
   - **Email:** admin@example.com
   - **Password:** 12345

## 💻 Local Development (without Docker)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up the database

Make sure {{databaseName}} is running locally, or use Docker for the database only:

```bash
docker compose up db -d
```

### 3. Set up environment variables

Copy `.env.example` to `.env` and adjust if needed:

```bash
cp .env.example .env
```

### 4. Run migrations and seed

```bash
pnpm prisma migrate dev
pnpm db:seed
```

The seed creates the default user (the sign-in page does not show it):
**admin@example.com** / **12345**.

### 5. Start the development server

```bash
pnpm dev
```

Open http://localhost:{{appPort}}

## 📁 Project Structure

```
{{projectName}}/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (public)/           # Public landing page
│   │   ├── (auth)/sign-in/     # Sign-in page
│   │   ├── admin/              # Admin area
│   │   │   ├── layout.tsx      # Session gate + AdminShell
│   │   │   ├── page.tsx        # Dashboard
│   │   │   └── usuarios/       # Reference CRUD module
│   │   └── api/                # NextAuth + Route Handlers (api/usuarios)
│   │
│   ├── components/
│   │   └── providers/          # App providers + AdminShell wrapper
│   │
│   ├── config/menu.ts          # Menu structure
│   ├── i18n/                   # Locale config and request
│   ├── lib/
│   │   ├── api/                # Typed REST clients (the only place that calls fetch)
│   │   ├── auth.ts             # Authentication helpers
│   │   ├── icons.ts            # Icon registry used by menu/header strings
│   │   └── prisma.ts           # Prisma client
│   └── types/                  # TypeScript types
│
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── seed.ts                 # Seed with admin user
│
├── docker-compose.yml          # {{databaseName}} only (local development)
├── docker-compose.prod.yml     # {{databaseName}} + App (production build)
├── Dockerfile                  # Application build
└── README.md                   # This file
```

## 🗂️ Menu Structure

The menu is configured in `src/config/menu.ts`. Icons are **strings**, resolved through the
registry in `src/lib/icons.ts` (add a name there when you use a new icon):

```typescript
import type { MenuItem } from '@telamonjs/ui'

export const menuConfig: MenuItem[] = [
  { id: 'dashboard', type: 'single', title: 'Dashboard', href: '/admin', icon: 'LayoutDashboard' },
  {
    id: 'admin-group',
    type: 'group',
    title: 'Administração',
    icon: 'Settings',
    children: [
      { id: 'usuarios', type: 'single', title: 'Usuários', href: '/admin/usuarios', icon: 'Users' },
    ],
  },
]
```

## 🎨 How to Create a New CRUD Module

The app defaults to pt-BR, so the examples below follow the reference module's
Portuguese naming (`usuarios`, `produtos`). Any name works.

1. Add the model to `prisma/schema.prisma` and migrate (`pnpm db:migrate`).
2. Generate the module from it:

```bash
pnpm telamonjs generate crud produtos --model Produto
```

This emits `src/app/admin/produtos/{config.tsx,page.tsx,_components/ProdutoDetail.tsx}`,
`src/lib/api/produtos-client.ts` and the Route Handlers in `src/app/api/produtos/`, and adds the
module to the menu. View/create/edit/delete live in the list's dialogs.

The heart of a module is its `CrudConfig` in `config.tsx`, which **must start with
`'use client'`** (React Query hooks run in it):

```tsx
// src/app/admin/produtos/config.tsx
'use client'

import { z } from 'zod'
import type { CrudColumnDef, CrudConfig, FormSection } from '@telamonjs/ui'
import { produtosApi, type Produto } from '@/lib/api/produtos-client'

export const validationSchema = z.object({ nome: z.string().min(1) })
export type ProdutoFormData = z.infer<typeof validationSchema>

export const columns: CrudColumnDef<Produto>[] = [{ header: 'Nome', accessorKey: 'nome' }]
export const formSections: FormSection[] = [
  { label: 'Dados', grid: '2', fields: [{ name: 'nome', label: 'Nome', type: 'text', required: true }] },
]

export const produtosConfig: CrudConfig<Produto, ProdutoFormData> = {
  module: { name: 'produtos', title: 'Produtos', description: '', route: '/admin/produtos' },
  list: { title: '', description: '', columns, serverSidePagination: true },
  form: { sections: formSections, validation: validationSchema },
  // queryFn resolves PaginatedResponse<Produto> ({ data, page, total, totalPages })
  query: { queryKey: ['produtos'], queryFn: produtosApi.list },
  mutations: {
    // mutationFn resolves { success, data? } -- adapt here if the client returns the raw entity
    create: {
      mutationFn: async (data) => ({ success: true, data: await produtosApi.create(data) }),
      invalidates: [['produtos']],
    },
    update: {
      mutationFn: async ({ id, data }) => ({ success: true, data: await produtosApi.update(id, data) }),
      invalidates: [['produtos']],
    },
    delete: {
      mutationFn: async ({ id }) => {
        await produtosApi.delete(id)
        return { success: true }
      },
      invalidates: [['produtos']],
    },
    getForEdit: produtosApi.getById,
    getForView: produtosApi.getById,
  },
}
```

```tsx
// src/app/admin/produtos/page.tsx
import { ListPage } from '@telamonjs/ui'
import { produtosConfig } from './config'

export default function ProdutosPage() {
  return <ListPage config={produtosConfig} />
}
```

`src/app/admin/usuarios/` is the complete reference (rich view dialog, soft delete, password
handling). `pnpm lint:telamonjs` checks modules against these conventions.

## 🗄️ Database Schema

The Prisma schema (`prisma/schema.prisma`) includes only the models required for NextAuth v5 authentication:

- `User` - System users
- `Account` - OAuth accounts (NextAuth)
- `Session` - Sessions (NextAuth)
- `VerificationToken` - Verification tokens (NextAuth)

### Adding New Models

1. Edit `prisma/schema.prisma`
2. Create the migration:

```bash
pnpm prisma migrate dev --name add_seu_model
```

3. The Prisma Client will be regenerated automatically

## 🔐 Authentication

### Default User

- **Email:** admin@example.com
- **Password:** 12345
- **Role:** ADMIN

### Protecting Routes

Use the helpers in `src/lib/auth.ts`:

```typescript
import { requireAuth, requireAdmin } from '@/lib/auth'

export default async function MinhaPage() {
  const user = await requireAuth() // Requires authentication
  // or
  const admin = await requireAdmin() // Requires the ADMIN role

  return <div>Conteúdo protegido</div>
}
```

### Middleware

`src/middleware.ts` redirects signed-out visitors away from `/admin/*`, and
`src/app/admin/layout.tsx` checks the session again. `/api/*` is not covered by
the middleware: each Route Handler calls `getCurrentUser()` itself.

## 🎨 Customization

### Changing Colors and Theme

Edit the CSS variables in `src/styles/globals.css`:

```css
:root {
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  /* ... other variables */
}
```

### Changing the Application Name

Edit:

- `src/components/providers/LayoutProviders.tsx` (`systemName` prop of `AdminShell`)
- `src/app/layout.tsx` (metadata)
- `.env` (NEXT_PUBLIC_APP_NAME)

## 🐳 Docker

`docker-compose.yml` runs only the database (for `pnpm dev`);
`docker-compose.prod.yml` runs the database plus the app built from the
`Dockerfile`.

### Useful Commands

```bash
# Database only (local development)
docker compose up -d

# Database + app (production build)
docker compose -f docker-compose.prod.yml up -d --build

# View app logs
docker compose -f docker-compose.prod.yml logs -f app

# Stop services
docker compose -f docker-compose.prod.yml down

# Remove volumes (CAREFUL: data is lost)
docker compose -f docker-compose.prod.yml down -v
```

### Accessing the container

The app container (started from `docker-compose.prod.yml`) is named
`{{projectName}}`:

```bash
docker exec -it {{projectName}} sh
```

## 📝 Available Scripts

```bash
# Development
pnpm dev                # Dev server (port {{appPort}})
pnpm build              # Production build
pnpm start              # Start production
pnpm lint               # ESLint
pnpm type-check         # TypeScript check

# Database
pnpm prisma studio      # Database UI
pnpm prisma migrate dev # New migration
pnpm db:push            # Push schema without a migration
pnpm db:seed            # Seed the database
```

## 🛠️ Tech Stack

Next.js (App Router), React, TypeScript, {{databaseName}} with Prisma, NextAuth v5,
`@telamonjs/ui`, Tailwind CSS, TanStack Query, React Hook Form + Zod, Lucide icons and
Framer Motion. The exact versions are in `package.json`.

## 📚 Documentation

- [Next.js 15](https://nextjs.org/docs)
- [React 19](https://react.dev)
- [Prisma](https://www.prisma.io/docs)
- [NextAuth v5](https://authjs.dev)
- [TelamonJS](https://github.com/telamonjs/telamonjs)
- `AGENTS.md` in this folder — the conventions this app follows, written for coding agents
- [Tailwind CSS](https://tailwindcss.com)

## 🤝 Contributing

This is a base template. Feel free to customize it to your needs!

## 📄 License

MIT

---

**Built with the TelamonJS Framework** 🚀
