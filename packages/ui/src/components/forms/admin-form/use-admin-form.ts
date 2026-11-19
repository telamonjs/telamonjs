'use client'

import type {
  FormField,
  FormSection,
  FormActionResult,
  AdminFormProps,
} from '../../../types/forms/admin-form'
import { AdminForm } from '../AdminForm'

/**
 * useAdminForm - Hook for creating reusable form components
 *
 * @category Forms
 * @status stable
 *
 * @description
 * Factory hook that creates a pre-configured AdminForm component and returns it
 * along with the fields/sections configuration. Useful for creating reusable
 * form components with consistent configuration.
 *
 * **Benefits:**
 * - DRY principle: Define fields/sections once, reuse everywhere
 * - Type safety: Fully typed FormComponent
 * - Consistency: Same form config across create/edit modes
 * - Flexibility: Can override props when rendering
 *
 * @example
 * Creating a reusable user form:
 * ```tsx
 * // userForm.ts
 * import { useAdminForm, FormSection } from '@telamonjs/ui'
 * import { userSchema, createUser, updateUser } from './actions'
 *
 * const sections: FormSection[] = [
 *   {
 *     label: 'Personal Info',
 *     fields: [
 *       { name: 'name', label: 'Name', type: 'text', required: true },
 *       { name: 'email', label: 'Email', type: 'email', required: true }
 *     ]
 *   }
 * ]
 *
 * export const useUserForm = () => useAdminForm(sections, createUser)
 * ```
 *
 * @example
 * Using the reusable form:
 * ```tsx
 * // CreateUserPage.tsx
 * 'use client'
 * import { useUserForm } from './userForm'
 *
 * export default function CreateUserPage() {
 *   const { FormComponent } = useUserForm()
 *
 *   return (
 *     <div>
 *       <h1>Create User</h1>
 *       <FormComponent
 *         validation={userSchema}
 *         onSuccess={() => router.push('/users')}
 *       />
 *     </div>
 *   )
 * }
 * ```
 *
 * @example
 * Overriding action for edit mode:
 * ```tsx
 * // EditUserPage.tsx
 * 'use client'
 * import { useUserForm } from './userForm'
 * import { updateUser } from './actions'
 *
 * export default function EditUserPage({ user }: { user: User }) {
 *   const { FormComponent, sections } = useUserForm()
 *
 *   return (
 *     <AdminForm
 *       sections={sections}
 *       action={updateUser} // Override action
 *       data={user}
 *       id={user.id}
 *     />
 *   )
 * }
 * ```
 */
export function useAdminForm<T extends Record<string, unknown>>(
  fieldsOrSections: readonly FormField[] | readonly FormSection[],
  action: (formData: FormData) => Promise<FormActionResult<T> | void>
) {
  const isFields = fieldsOrSections.length > 0 && 'name' in fieldsOrSections[0]

  if (isFields) {
    return {
      FormComponent: (props: Omit<AdminFormProps<T>, 'fields' | 'action'>) =>
        AdminForm({
          ...props,
          fields: fieldsOrSections as readonly FormField[],
          action,
        }),
      fields: fieldsOrSections as readonly FormField[],
    }
  }

  return {
    FormComponent: (props: Omit<AdminFormProps<T>, 'sections' | 'action'>) =>
      AdminForm({
        ...props,
        sections: fieldsOrSections as readonly FormSection[],
        action,
      }),
    sections: fieldsOrSections as readonly FormSection[],
  }
}
