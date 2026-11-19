import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import * as React from 'react'

import { cn } from '../utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline:
          'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        primary:
          'bg-primary text-primary-foreground shadow-emphasis hover:bg-primary/90 hover:shadow-emphasis-hover',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        tertiary:
          'bg-tertiary border border-tertiary text-tertiary-foreground shadow-emphasis hover:bg-tertiary/70',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        // Variantes ghost-*: cor de repouso pelo token (text-slate-600 sumia no dark).
        'ghost-info':
          'text-muted-foreground hover:bg-slate-500 hover:text-white transition-colors',
        'ghost-primary':
          'text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors',
        'ghost-destructive':
          'text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        xs: 'h-7 w-8 rounded-md',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button'
    const isDisabled = disabled || loading

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isDisabled}
        data-loading={loading || undefined}
        aria-busy={loading || undefined}
        {...props}
      >
        {asChild ? (
          // Slot requires exactly one child — the loading spinner
          // cannot be injected as a sibling of children
          children
        ) : (
          <>
            {loading && (
              <Loader2 className='h-4 w-4 animate-spin' aria-hidden='true' />
            )}
            {children}
          </>
        )}
      </Comp>
    )
  }
)
Button.displayName = 'Button'

// eslint-disable-next-line react-refresh/only-export-components -- shadcn convention: component + its cva variants export, tied together on purpose
export { Button, buttonVariants }
