# Example

Complete admin application template built with Next.js 15, React 19, TypeScript and the TelamonJS UI framework.

## 🚀 Features

- ✅ **Next.js 15** with App Router and React 19
- ✅ **TypeScript** in strict mode
- ✅ **Authentication** fully set up with NextAuth v5
- ✅ **PostgreSQL** as the database
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
2. Set the production secrets in `.env` (Compose reads it; `cp .env.example .env`
   first): `NEXTAUTH_SECRET` (`openssl rand -base64 32`) and `DB_PASSWORD`
   (URL-safe, e.g. `openssl rand -hex 24`). Compose refuses to start without them.
3. Run the production compose file (`docker-compose.yml` holds only the
   database, for local development). The first start, on an empty database,
   also needs `SEED_ADMIN_PASSWORD` (the first admin's password):

```bash
SEED_ADMIN_PASSWORD='choose-a-password' docker compose -f docker-compose.prod.yml up --build
```

4. Wait for the build and startup (the first run can take ~5 minutes)
5. Open http://localhost:3001
6. Sign in with:
   - **Email:** admin@example.com
   - **Password:** the `SEED_ADMIN_PASSWORD` you chose (read only when the
     seed creates the first admin, on an empty database)

## 💻 Local Development (without Docker)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up the database

Make sure PostgreSQL is running locally, or use Docker for the database only:

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

On an empty database the seed creates the default user (the sign-in page does
not show it): **admin@example.com** / **12345**. A re-run only syncs the
permission catalog: it never touches existing accounts.

### 5. Start the development server

```bash
pnpm dev
```

Open http://localhost:3001

## 📁 Project Structure

```
example/
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
├── docker-compose.yml          # PostgreSQL only (local development)
├── docker-compose.prod.yml     # PostgreSQL + App (production build)
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
- **Password:** 12345 (in production: the value of `SEED_ADMIN_PASSWORD`)
- **Role:** `admin` (built-in, holds every permission)

The seed creates it on an empty database only; rename it or change its
password freely, a re-run of `pnpm db:seed` leaves it alone.

### Roles and Permissions

Roles and permissions live in the database (`Role`, `Permission`,
`RolePermission`, `UserRole`) and are copied into the session token at sign-in.
Manage them at `/admin/papeis` (role CRUD + permission matrix) and assign roles
to users at `/admin/usuarios`. The permission catalog is code: `src/rbac.ts`.
After adding a permission there, run `pnpm db:seed` (idempotent) to create it
and grant it to `admin`.

Role or permission changes apply on the user's next request (the token is
refreshed); deactivating a user ends their sessions.

### Protecting Routes

Route Handlers check a permission with `requirePermission` (`src/lib/auth.ts`):

```typescript
import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'

export async function GET() {
  const user = await requirePermission('users.read') // 401/403 response, or the user
  if (user instanceof NextResponse) return user
  // ...
}
```

In the UI, `permission` on a menu item and `permissions` in a CrudConfig hide
what the user can't do (the `PermissionsProvider` in `LayoutProviders.tsx`).

### Middleware

`src/middleware.ts` redirects signed-out visitors away from `/admin/*`, and
`src/app/admin/layout.tsx` checks the session again. On `/api/*` the middleware
only refuses writes (POST, PATCH, PUT, DELETE) whose `Origin` header names
another origin: the session cookie would ride a form post from a sibling
subdomain or another localhost port. Requests without an `Origin` (curl, server
to server) pass, and each Route Handler calls `getCurrentUser()` itself.

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
`Dockerfile`. It needs `NEXTAUTH_SECRET` and `DB_PASSWORD` in the environment
or in `.env`, plus `SEED_ADMIN_PASSWORD` on the first start (empty database:
the container stops if the seed cannot create the first admin), and publishes
the database on `127.0.0.1` only.

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
`example`:

```bash
docker exec -it example sh
```

## 📝 Available Scripts

```bash
# Development
pnpm dev                # Dev server (port 3001)
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

Next.js (App Router), React, TypeScript, PostgreSQL with Prisma, NextAuth v5,
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
