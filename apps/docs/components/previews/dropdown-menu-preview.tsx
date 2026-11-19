'use client'

import { useState } from 'react'
import {
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@telamonjs/ui'
import { Copy, Edit, Trash2 } from 'lucide-react'
import { ComponentPreview } from '../component-preview'

const CODE = `import {
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@telamonjs/ui'
import { Copy, Edit, Trash2 } from 'lucide-react'

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant='outline'>Actions</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align='end'>
    <DropdownMenuLabel>Row actions</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem>
      <Edit className='mr-2 h-4 w-4' /> Edit
      <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
    </DropdownMenuItem>
    <DropdownMenuItem>
      <Copy className='mr-2 h-4 w-4' /> Duplicate
    </DropdownMenuItem>
    <DropdownMenuCheckboxItem checked={showArchived} onCheckedChange={setShowArchived}>
      Show archived
    </DropdownMenuCheckboxItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem className='text-destructive'>
      <Trash2 className='mr-2 h-4 w-4' /> Delete
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>`

export function DropdownMenuPreview() {
  const [showArchived, setShowArchived] = useState(false)

  return (
    <ComponentPreview code={CODE}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='outline' data-testid='action-button'>Actions</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuLabel>Row actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Edit className='mr-2 h-4 w-4' /> Edit
            <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Copy className='mr-2 h-4 w-4' /> Duplicate
          </DropdownMenuItem>
          <DropdownMenuCheckboxItem
            checked={showArchived}
            onCheckedChange={setShowArchived}
          >
            Show archived
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className='text-destructive'>
            <Trash2 className='mr-2 h-4 w-4' /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </ComponentPreview>
  )
}
