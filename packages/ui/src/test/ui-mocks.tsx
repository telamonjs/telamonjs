import React from 'react'
import { vi } from 'vitest'

// ============================================================================
// LUCIDE REACT ICONS - Proxy mock that serves ANY icon name on demand.
// Convention: each icon renders an <svg data-testid="icon-<lowercasename>">.
// Special runtime exports (icons map, createLucideIcon) are preserved so
// consumers like renderIcon ("import * as LucideIcons") keep working.
// ============================================================================
vi.mock('lucide-react', () => {
  type MockIconComponent = React.ForwardRefExoticComponent<
    React.SVGProps<SVGSVGElement> & React.RefAttributes<SVGSVGElement>
  >

  const iconCache = new Map<string, MockIconComponent>()

  const createMockIcon = (displayName: string): MockIconComponent => {
    const MockIcon = React.forwardRef<
      SVGSVGElement,
      React.SVGProps<SVGSVGElement>
    >((props, ref) =>
      React.createElement('svg', {
        ...props,
        ref,
        'data-testid': `icon-${displayName.toLowerCase()}`,
        'data-icon': displayName,
      })
    )
    MockIcon.displayName = displayName
    return MockIcon
  }

  const getIcon = (name: string): MockIconComponent => {
    let icon = iconCache.get(name)
    if (!icon) {
      icon = createMockIcon(name)
      iconCache.set(name, icon)
    }
    return icon
  }

  // Mirror of the real `icons` export: a map of icon name -> component
  const icons = new Proxy({} as Record<string, MockIconComponent>, {
    get: (_target, prop) =>
      typeof prop === 'string' ? getIcon(prop) : undefined,
    has: (_target, prop) => typeof prop === 'string',
  })

  const baseExports: Record<string, unknown> = {
    __esModule: true,
    icons,
    createLucideIcon: (name: string) => getIcon(name),
  }

  // Keys that must never be treated as icon names (module interop internals)
  const nonIconKeys = new Set(['default', 'then'])

  return new Proxy(baseExports, {
    get: (target, prop) => {
      if (typeof prop !== 'string') {
        return Reflect.get(target, prop)
      }
      if (prop in target) {
        return target[prop]
      }
      if (nonIconKeys.has(prop)) {
        return undefined
      }
      return getIcon(prop)
    },
    has: (target, prop) =>
      typeof prop === 'string' ? !nonIconKeys.has(prop) : prop in target,
  })
})

// ============================================================================
// UTILS
// ============================================================================
// Use importOriginal to test actual cn function with tailwind-merge
vi.mock('../utils', async importOriginal => {
  const original = await importOriginal<typeof import('../utils')>()
  return {
    cn: original.cn,
  }
})

// ============================================================================
// HOOKS
// ============================================================================
// Note: use-toast mock now uses importOriginal to test actual reducer logic
vi.mock('../hooks/use-toast', async importOriginal => {
  const original = await importOriginal<typeof import('../hooks/use-toast')>()

  // Use actual reducer from original module
  return {
    useToast: original.useToast,
    toast: original.toast,
    reducer: original.reducer, // Export for tests
  }
})

// ============================================================================
// UI COMPONENTS
// ============================================================================

// Button
vi.mock('../ui/button', () => ({
  Button: React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement> & {
      variant?: string
      size?: string
      asChild?: boolean
    }
  >(({ children, variant, size, asChild, ...props }, ref) =>
    React.createElement(
      'button',
      {
        ...props,
        ref,
        // Preserva data-testid do componente real (ex: form-submit-button)
        'data-testid':
          (props as Record<string, unknown>)['data-testid'] ?? 'button',
        'data-variant': variant,
        'data-size': size,
      },
      children
    )
  ),
  buttonVariants: vi.fn(),
}))

// Label
vi.mock('../ui/label', () => ({
  Label: React.forwardRef<
    HTMLLabelElement,
    React.LabelHTMLAttributes<HTMLLabelElement>
  >(({ children, ...props }, ref) =>
    React.createElement('label', { ...props, ref }, children)
  ),
}))

// Input
vi.mock('../ui/input', () => ({
  Input: React.forwardRef<
    HTMLInputElement,
    React.InputHTMLAttributes<HTMLInputElement>
  >((props, ref) =>
    React.createElement('input', { ...props, ref, 'data-testid': 'input' })
  ),
}))

// Textarea
vi.mock('../ui/textarea', () => ({
  Textarea: React.forwardRef<
    HTMLTextAreaElement,
    React.TextareaHTMLAttributes<HTMLTextAreaElement>
  >((props, ref) =>
    React.createElement('textarea', {
      ...props,
      ref,
      'data-testid': 'textarea',
    })
  ),
}))

// Select
vi.mock('../ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) =>
    React.createElement(
      'div',
      { 'data-testid': 'select', 'data-value': value },
      children
    ),
  SelectTrigger: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'select-trigger' }, children),
  SelectValue: ({ placeholder }: any) =>
    React.createElement('div', { 'data-testid': 'select-value' }, placeholder),
  SelectContent: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'select-content' }, children),
  SelectItem: ({ children, value }: any) =>
    React.createElement(
      'div',
      { 'data-testid': 'select-item', 'data-value': value },
      children
    ),
}))

// Checkbox
vi.mock('../ui/checkbox', () => ({
  Checkbox: React.forwardRef<
    HTMLInputElement,
    React.InputHTMLAttributes<HTMLInputElement> & {
      checked?: boolean | 'indeterminate'
      onCheckedChange?: (checked: boolean | 'indeterminate') => void
    }
  >(({ checked, onCheckedChange, ...props }: any, ref) =>
    React.createElement('input', {
      ...props,
      ref,
      type: 'checkbox',
      role: 'checkbox',
      checked: checked === true,
      'aria-checked':
        checked === true
          ? 'true'
          : checked === 'indeterminate'
            ? 'mixed'
            : 'false',
      onChange: (e: any) => {
        if (onCheckedChange) {
          onCheckedChange(e.target.checked)
        }
      },
      'data-testid': 'checkbox',
      'data-state':
        checked === 'indeterminate'
          ? 'indeterminate'
          : checked === true
            ? 'checked'
            : 'unchecked',
    })
  ),
}))

// Switch
vi.mock('../ui/switch', () => ({
  Switch: React.forwardRef<
    HTMLInputElement,
    React.InputHTMLAttributes<HTMLInputElement> & {
      checked?: boolean
      onCheckedChange?: (checked: boolean) => void
    }
  >(({ checked, onCheckedChange, ...props }: any, ref) =>
    React.createElement('input', {
      ...props,
      ref,
      type: 'checkbox',
      role: 'switch',
      checked,
      onChange: (e: any) => onCheckedChange?.(e.target.checked),
      'data-testid': 'switch',
      'data-state': checked ? 'checked' : 'unchecked',
    })
  ),
}))

// Card
vi.mock('../ui/card', () => ({
  Card: ({ children, className, onClick, ...props }: any) =>
    React.createElement(
      'div',
      { 'data-testid': 'card', className, onClick, ...props },
      children
    ),
  CardHeader: ({ children, className, ...props }: any) =>
    React.createElement(
      'div',
      { 'data-testid': 'card-header', className, ...props },
      children
    ),
  CardTitle: ({ children, className, ...props }: any) =>
    React.createElement(
      'h3',
      { 'data-testid': 'card-title', className, ...props },
      children
    ),
  CardDescription: ({ children, className, ...props }: any) =>
    React.createElement(
      'p',
      { 'data-testid': 'card-description', className, ...props },
      children
    ),
  CardContent: ({ children, className, ...props }: any) =>
    React.createElement(
      'div',
      { 'data-testid': 'card-content', className, ...props },
      children
    ),
  CardFooter: ({ children, className, ...props }: any) =>
    React.createElement(
      'div',
      { 'data-testid': 'card-footer', className, ...props },
      children
    ),
}))

// Badge
vi.mock('../ui/badge', () => ({
  Badge: ({ children, variant }: any) =>
    React.createElement(
      'span',
      { 'data-testid': 'badge', 'data-variant': variant },
      children
    ),
}))

// Alert
vi.mock('../ui/alert', () => ({
  Alert: ({ children, variant }: any) =>
    React.createElement(
      'div',
      { 'data-testid': 'alert', 'data-variant': variant },
      children
    ),
  AlertTitle: ({ children }: any) =>
    React.createElement('h5', { 'data-testid': 'alert-title' }, children),
  AlertDescription: ({ children }: any) =>
    React.createElement(
      'div',
      { 'data-testid': 'alert-description' },
      children
    ),
}))

// ValidationErrors component (API real: error?: string | errors?: ValidationError[])
vi.mock('../components/forms/ValidationErrors', () => ({
  ValidationErrors: ({ error, errors, className }: any) => {
    const messages: string[] = errors?.length
      ? errors.map((e: { message: string }) => e.message)
      : error
        ? [error]
        : []
    if (!messages.length) return null
    return React.createElement(
      'div',
      { 'data-testid': 'validation-error', className },
      messages.map((message, index) =>
        React.createElement('p', { key: index }, message)
      )
    )
  },
}))

// ============================================================================
// COMPLEX UI COMPONENTS
// ============================================================================

// AlertDialog
vi.mock('../ui/alert-dialog', () => ({
  AlertDialog: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'alert-dialog' }, children),
  AlertDialogTrigger: ({ children }: any) =>
    React.createElement(
      'div',
      { 'data-testid': 'alert-dialog-trigger' },
      children
    ),
  AlertDialogContent: ({ children }: any) =>
    React.createElement(
      'div',
      { 'data-testid': 'alert-dialog-content' },
      children
    ),
  AlertDialogHeader: ({ children }: any) =>
    React.createElement(
      'div',
      { 'data-testid': 'alert-dialog-header' },
      children
    ),
  AlertDialogTitle: ({ children }: any) =>
    React.createElement(
      'h2',
      { 'data-testid': 'alert-dialog-title' },
      children
    ),
  AlertDialogDescription: ({ children }: any) =>
    React.createElement(
      'p',
      { 'data-testid': 'alert-dialog-description' },
      children
    ),
  AlertDialogFooter: ({ children }: any) =>
    React.createElement(
      'div',
      { 'data-testid': 'alert-dialog-footer' },
      children
    ),
  AlertDialogAction: ({ children, onClick, disabled }: any) =>
    React.createElement(
      'button',
      { 'data-testid': 'alert-dialog-action', onClick, disabled },
      children
    ),
  AlertDialogCancel: ({ children, onClick }: any) =>
    React.createElement(
      'button',
      { 'data-testid': 'alert-dialog-cancel', onClick },
      children
    ),
}))

// Tabs
vi.mock('../ui/tabs', () => ({
  Tabs: ({ children, defaultValue }: any) =>
    React.createElement(
      'div',
      { 'data-testid': 'tabs', 'data-value': defaultValue },
      children
    ),
  TabsList: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'tabs-list' }, children),
  TabsTrigger: ({ children, value }: any) =>
    React.createElement(
      'button',
      { 'data-testid': `tab-trigger-${value}`, 'data-value': value },
      children
    ),
  TabsContent: ({ children, value }: any) =>
    React.createElement(
      'div',
      { 'data-testid': `tab-content-${value}`, 'data-value': value },
      children
    ),
}))

// Popover
vi.mock('../ui/popover', () => ({
  Popover: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'popover' }, children),
  PopoverTrigger: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'popover-trigger' }, children),
  PopoverContent: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'popover-content' }, children),
}))

// DropdownMenu
vi.mock('../ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'dropdown-menu' }, children),
  DropdownMenuTrigger: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'dropdown-trigger' }, children),
  DropdownMenuContent: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'dropdown-content' }, children),
  DropdownMenuItem: ({ children, onClick }: any) =>
    React.createElement(
      'div',
      { 'data-testid': 'dropdown-item', onClick },
      children
    ),
  DropdownMenuCheckboxItem: ({ children, checked, onCheckedChange }: any) =>
    React.createElement(
      'div',
      {
        'data-testid': 'dropdown-checkbox-item',
        'data-checked': checked,
        onClick: () => onCheckedChange?.(!checked),
      },
      children
    ),
  DropdownMenuSeparator: () =>
    React.createElement('div', { 'data-testid': 'dropdown-separator' }),
  DropdownMenuLabel: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'dropdown-label' }, children),
  DropdownMenuSub: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'dropdown-sub' }, children),
  DropdownMenuSubTrigger: ({ children }: any) =>
    React.createElement(
      'div',
      { 'data-testid': 'dropdown-sub-trigger' },
      children
    ),
  DropdownMenuSubContent: ({ children }: any) =>
    React.createElement(
      'div',
      { 'data-testid': 'dropdown-sub-content' },
      children
    ),
  DropdownMenuGroup: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'dropdown-group' }, children),
  DropdownMenuPortal: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'dropdown-portal' }, children),
  DropdownMenuRadioGroup: ({ children, value }: any) =>
    React.createElement(
      'div',
      { 'data-testid': 'dropdown-radio-group', 'data-value': value },
      children
    ),
  DropdownMenuRadioItem: ({ children, value }: any) =>
    React.createElement(
      'div',
      { 'data-testid': 'dropdown-radio-item', 'data-value': value },
      children
    ),
  DropdownMenuShortcut: ({ children }: any) =>
    React.createElement(
      'span',
      { 'data-testid': 'dropdown-shortcut' },
      children
    ),
}))

// Table
vi.mock('../ui/table', () => ({
  Table: ({ children }: any) =>
    React.createElement('table', { 'data-testid': 'table' }, children),
  TableHeader: ({ children }: any) =>
    React.createElement('thead', { 'data-testid': 'table-header' }, children),
  TableBody: ({ children }: any) =>
    React.createElement('tbody', { 'data-testid': 'table-body' }, children),
  TableHead: ({ children, onClick }: any) =>
    React.createElement('th', { onClick }, children),
  TableRow: ({ children, onClick }: any) =>
    React.createElement('tr', { onClick }, children),
  TableCell: ({ children }: any) => React.createElement('td', null, children),
}))

// Dialog
vi.mock('../ui/dialog', () => ({
  Dialog: ({ children, open }: any) =>
    open
      ? React.createElement(
          'div',
          { 'data-testid': 'dialog', 'data-open': open },
          children
        )
      : null,
  DialogTrigger: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'dialog-trigger' }, children),
  DialogContent: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'dialog-content' }, children),
  DialogHeader: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'dialog-header' }, children),
  DialogTitle: ({ children }: any) =>
    React.createElement('h2', { 'data-testid': 'dialog-title' }, children),
  DialogDescription: ({ children }: any) =>
    React.createElement('p', { 'data-testid': 'dialog-description' }, children),
  DialogFooter: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'dialog-footer' }, children),
  DialogClose: ({ children }: any) =>
    React.createElement('button', { 'data-testid': 'dialog-close' }, children),
}))

// Toast
vi.mock('../ui/toast', () => ({
  Toast: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'toast' }, children),
  ToastTitle: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'toast-title' }, children),
  ToastDescription: ({ children }: any) =>
    React.createElement(
      'div',
      { 'data-testid': 'toast-description' },
      children
    ),
  ToastClose: ({ children }: any) =>
    React.createElement('button', { 'data-testid': 'toast-close' }, children),
  ToastAction: ({ children }: any) =>
    React.createElement('button', { 'data-testid': 'toast-action' }, children),
  ToastProvider: ({ children }: any) => children,
  ToastViewport: () =>
    React.createElement('div', { 'data-testid': 'toast-viewport' }),
}))

// Command
vi.mock('../ui/command', () => ({
  Command: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'command' }, children),
  CommandInput: (props: any) =>
    React.createElement('input', { ...props, 'data-testid': 'command-input' }),
  CommandList: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'command-list' }, children),
  CommandEmpty: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'command-empty' }, children),
  CommandGroup: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'command-group' }, children),
  CommandItem: ({ children, onSelect }: any) =>
    React.createElement(
      'div',
      { 'data-testid': 'command-item', onClick: onSelect },
      children
    ),
  CommandSeparator: () =>
    React.createElement('div', { 'data-testid': 'command-separator' }),
}))

// Calendar
vi.mock('../ui/calendar', () => ({
  Calendar: ({ selected, onSelect, mode }: any) =>
    React.createElement(
      'div',
      {
        'data-testid': 'calendar',
        'data-selected': selected?.toISOString?.(),
        'data-mode': mode,
      },
      'Calendar'
    ),
}))

// ============================================================================
// RADIX UI PRIMITIVES (used by some UI components)
// ============================================================================
vi.mock('@radix-ui/react-slot', () => ({
  Slot: ({ children, ...props }: any) =>
    React.createElement('div', { ...props, 'data-slot': true }, children),
}))

vi.mock('@radix-ui/react-label', () => ({
  Root: React.forwardRef<
    HTMLLabelElement,
    React.LabelHTMLAttributes<HTMLLabelElement>
  >(({ children, ...props }, ref) =>
    React.createElement('label', { ...props, ref }, children)
  ),
}))
