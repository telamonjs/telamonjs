import React from 'react'

export const DropdownMenu = ({ children }: { children: React.ReactNode }) => (
  <div data-testid='dropdown-menu'>{children}</div>
)

export const DropdownMenuTrigger = ({
  children,
}: {
  children: React.ReactNode
}) => <button data-testid='dropdown-menu-trigger'>{children}</button>

export const DropdownMenuContent = ({
  children,
}: {
  children: React.ReactNode
}) => <div data-testid='dropdown-menu-content'>{children}</div>

export const DropdownMenuItem = ({ children, onClick }: any) => (
  <button data-testid='dropdown-menu-item' onClick={onClick}>
    {children}
  </button>
)

export const DropdownMenuLabel = ({
  children,
}: {
  children: React.ReactNode
}) => <div data-testid='dropdown-menu-label'>{children}</div>

export const DropdownMenuSeparator = () => (
  <hr data-testid='dropdown-menu-separator' />
)

export const DropdownMenuSub = ({
  children,
}: {
  children: React.ReactNode
}) => <div data-testid='dropdown-menu-sub'>{children}</div>

export const DropdownMenuSubTrigger = ({
  children,
}: {
  children: React.ReactNode
}) => <button data-testid='dropdown-menu-sub-trigger'>{children}</button>

export const DropdownMenuSubContent = ({
  children,
}: {
  children: React.ReactNode
}) => <div data-testid='dropdown-menu-sub-content'>{children}</div>

export const DropdownMenuGroup = ({
  children,
}: {
  children: React.ReactNode
}) => <div data-testid='dropdown-menu-group'>{children}</div>

export const DropdownMenuCheckboxItem = ({
  children,
  checked,
  onCheckedChange,
}: any) => (
  <label data-testid='dropdown-menu-checkbox-item'>
    <input
      type='checkbox'
      checked={checked}
      onChange={e => onCheckedChange?.(e.target.checked)}
    />
    {children}
  </label>
)

export const DropdownMenuRadioGroup = ({
  children,
  value,
  onValueChange,
}: any) => (
  <div data-testid='dropdown-menu-radio-group' data-value={value}>
    {children}
  </div>
)

export const DropdownMenuRadioItem = ({ children, value, onClick }: any) => (
  <button
    data-testid='dropdown-menu-radio-item'
    data-value={value}
    onClick={onClick}
  >
    {children}
  </button>
)

export const DropdownMenuPortal = ({
  children,
}: {
  children: React.ReactNode
}) => <div data-testid='dropdown-menu-portal'>{children}</div>

export const DropdownMenuShortcut = ({
  children,
}: {
  children: React.ReactNode
}) => <span data-testid='dropdown-menu-shortcut'>{children}</span>
