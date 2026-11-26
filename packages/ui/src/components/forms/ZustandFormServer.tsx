import dynamic from 'next/dynamic'
import type { FormSection, FormActionResult } from './AdminForm'

// Dynamically import ZustandForm for client-side only rendering
const ClientZustandForm = dynamic(
  () => import('./ZustandForm').then(mod => ({ default: mod.ZustandForm })),
  {
    loading: () => (
      <div className='space-y-6'>
        <div className='animate-pulse'>
          <div className='h-8 bg-muted rounded mb-4'></div>
          <div className='space-y-3'>
            <div className='h-4 bg-muted rounded'></div>
            <div className='h-10 bg-muted rounded'></div>
          </div>
        </div>
      </div>
    ),
  }
)

/**
 * ZustandFormServerProps - Configuration for ZustandFormServer component
 *
 * @category Forms
 *
 * @description
 * Props for ZustandFormServer component. Identical to ZustandFormProps since this is
 * a Server Component wrapper that forwards all props to the client-side ZustandForm.
 */
interface ZustandFormServerProps {
  /** Unique form ID for Zustand store isolation. Each form instance needs a unique ID. */
  formId: string

  /** Form sections with fields. Supports nested row structure for grid layouts. */
  sections: FormSection[]

  /** Initial form data. Used to pre-populate fields in edit mode or provide defaults. */
  data?: Record<string, unknown>

  /** Server Action that receives FormData. Mutually exclusive with onSubmit. */
  action?: (formData: FormData) => Promise<FormActionResult | void> | void

  /** Client-side submit handler. Receives typed form data object. Mutually exclusive with action. */
  onSubmit?: (data: Record<string, unknown>) => Promise<void> | void

  /** Text for submit button. Default: "Salvar" */
  submitText?: string

  /** Enable tab navigation between sections. Creates a multi-step wizard UI. Default: false */
  useTabs?: boolean

  /** Additional CSS classes for the form container */
  className?: string

  /** Show debug panel with form state (data, meta, validation). Useful for development. Default: false */
  showDebug?: boolean

  /** Entity ID for edit mode. Enables CRUD fields and editOnly sections/fields. */
  id?: string

  /** Callback executed after successful Server Action. Receives action result. */
  onSuccess?: (result: FormActionResult) => void | Promise<void>

  /** Cancel button handler. Default: window.history.back() */
  cancelAction?: () => void

  /** Hide submit/cancel buttons. Useful for custom button layouts. Default: false */
  hideButtons?: boolean
}

/**
 * ZustandFormServer - Server Component wrapper for ZustandForm
 *
 * @category Forms
 * @status stable
 *
 * @description
 * Server Component-compatible wrapper for ZustandForm. Uses Next.js dynamic import
 * to lazily load the client-side ZustandForm component, allowing usage in Server
 * Components without hydration errors. Displays an animated loading skeleton while
 * the client component loads.
 *
 * **Key Features:**
 * - **Server Component compatible:** Can be used in `async` Server Components
 * - **Dynamic import:** Lazy loads ZustandForm only on client side
 * - **Loading skeleton:** Shows animated placeholder during load
 * - **Zero hydration errors:** Proper SSR/client boundary
 * - **Identical API:** Same props as ZustandForm, transparent wrapper
 *
 * **When to use:**
 * - **Server Components:** When your page component is a Server Component (async function)
 * - **SSR data fetching:** When you fetch data server-side and pass to form
 * - **Server Actions:** When using Next.js Server Actions (recommended)
 * - **SEO/performance:** When you want better SEO and initial page load
 *
 * **When NOT to use:**
 * - **Client Components:** If your page is already 'use client', use `ZustandForm` directly
 * - **No SSR needed:** If you don't need server-side rendering, use `ZustandForm`
 *
 * **How it works:**
 * 1. Server Component renders ZustandFormServer
 * 2. Next.js dynamic import loads ZustandForm client-side only
 * 3. Loading skeleton shows while component loads
 * 4. Client ZustandForm hydrates with server-fetched data
 *
 * **Best practices:**
 * - Use with Server Actions for best DX (type-safe, no API routes)
 * - Fetch data server-side and pass via `data` prop
 * - Combine with Suspense for better loading states
 * - Use same formId pattern as ZustandForm
 *
 * @example
 * Server Component with data fetching:
 * ```tsx
 * // app/users/[id]/edit/page.tsx (Server Component)
 * import { ZustandFormServer } from '@telamonjs/ui'
 * import { getUser } from '@/services/users'
 * import { updateUser } from './actions'
 * import { userFormSections } from './config'
 *
 * export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
 *   const { id } = await params
 *
 *   const user = await getUser(id)
 *
 *   if (!user) {
 *     return <div>User not found</div>
 *   }
 *
 *   return (
 *     <ZustandFormServer
 *       formId={`edit-user-${id}`}
 *       id={id}
 *       data={user}
 *       sections={userFormSections}
 *       action={updateUser}
 *       useTabs
 *     />
 *   )
 * }
 * ```
 *
 * @example
 * Server Component with multi-step wizard:
 * ```tsx
 * // app/onboarding/page.tsx (Server Component)
 * import { ZustandFormServer } from '@telamonjs/ui'
 * import { createOnboarding } from './actions'
 * import { onboardingSections } from './config'
 *
 * export default async function OnboardingPage() {
 *   return (
 *     <div className="max-w-4xl mx-auto py-8">
 *       <h1>Welcome! Let's set up your account</h1>
 *
 *       <ZustandFormServer
 *         formId="onboarding-wizard"
 *         sections={onboardingSections}
 *         action={createOnboarding}
 *         useTabs
 *         submitText="Complete Onboarding"
 *         onSuccess={() => {
 *           window.location.href = '/dashboard'
 *         }}
 *       />
 *     </div>
 *   )
 * }
 * ```
 *
 * @example
 * With Suspense for better loading:
 * ```tsx
 * import { Suspense } from 'react'
 * import { ZustandFormServer } from '@telamonjs/ui'
 * import { getProduct } from '@/services/products'
 * import { updateProduct } from './actions'
 *
 * async function ProductForm({ id }: { id: string }) {
 *   const product = await getProduct(id)
 *
 *   return (
 *     <ZustandFormServer
 *       formId={`edit-product-${id}`}
 *       id={id}
 *       data={product}
 *       sections={productSections}
 *       action={updateProduct}
 *     />
 *   )
 * }
 *
 * export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
 *   const { id } = await params
 *
 *   return (
 *     <Suspense fallback={<div>Loading product...</div>}>
 *       <ProductForm id={id} />
 *     </Suspense>
 *   )
 * }
 * ```
 *
 * @example
 * Creating new entity (no data prop):
 * ```tsx
 * // app/products/add/page.tsx (Server Component)
 * import { ZustandFormServer } from '@telamonjs/ui'
 * import { createProduct } from './actions'
 * import { productSections } from '../config'
 *
 * export default async function AddProductPage() {
 *   return (
 *     <ZustandFormServer
 *       formId="create-product"
 *       sections={productSections}
 *       action={createProduct}
 *       useTabs
 *       submitText="Create Product"
 *     />
 *   )
 * }
 * ```
 *
 * @example
 * With client-side onSubmit (fetch API):
 * ```tsx
 * import { ZustandFormServer } from '@telamonjs/ui'
 * import { surveySections } from './config'
 *
 * export default async function SurveyPage() {
 *   const handleSubmit = async (data: Record<string, any>) => {
 *     const response = await fetch('/api/surveys', {
 *       method: 'POST',
 *       headers: { 'Content-Type': 'application/json' },
 *       body: JSON.stringify(data),
 *     })
 *
 *     if (!response.ok) {
 *       throw new Error('Failed to submit survey')
 *     }
 *
 *     window.location.href = '/thank-you'
 *   }
 *
 *   return (
 *     <ZustandFormServer
 *       formId="survey"
 *       sections={surveySections}
 *       onSubmit={handleSubmit}
 *       useTabs
 *     />
 *   )
 * }
 * ```
 *
 * @example
 * With parallel data fetching:
 * ```tsx
 * import { ZustandFormServer } from '@telamonjs/ui'
 * import { getOrder, getCustomers, getProducts } from '@/services'
 * import { updateOrder } from './actions'
 *
 * export default async function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
 *   const { id } = await params
 *
 *   const [order, customers, products] = await Promise.all([
 *     getOrder(id),
 *     getCustomers(),
 *     getProducts(),
 *   ])
 *
 *   const sections = getOrderSections({ customers, products })
 *
 *   return (
 *     <ZustandFormServer
 *       formId={`edit-order-${id}`}
 *       id={id}
 *       data={order}
 *       sections={sections}
 *       action={updateOrder}
 *     />
 *   )
 * }
 * ```
 *
 * @see {@link /apps/docs/content/docs/patterns/form-pattern.mdx | Form Pattern}
 * @see {@link ZustandForm} for client-side usage and detailed API docs
 * @see {@link CreateForm} for simple creation forms
 * @see {@link EditForm} for simple edit forms
 */
export function ZustandFormServer(props: ZustandFormServerProps) {
  return <ClientZustandForm {...props} />
}
