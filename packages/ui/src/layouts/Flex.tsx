import { cn } from '../utils'
import { ReactNode, forwardRef } from 'react'

export const Flex = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  return (
    <div ref={ref} className={cn('flex', className)} {...props}>
      {children}
    </div>
  )
})

Flex.displayName = 'Flex'

export function FlexCol({
  children,
  className,
  ...props
}: {
  children: ReactNode
  className?: string
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-col', className)} {...props}>
      {children}
    </div>
  )
}
