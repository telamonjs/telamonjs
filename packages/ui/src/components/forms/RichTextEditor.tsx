/**
 * RichTextEditor Component
 *
 * Rich text editor built with TipTap for WYSIWYG editing.
 * Supports markdown-like formatting, links, images, and tables.
 *
 * @example
 * <RichTextEditor
 *   value={content}
 *   onChange={(html) => setContent(html)}
 *   placeholder="Write something amazing..."
 * />
 */

'use client'

import React, { useEffect } from 'react'
import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  Minus,
} from 'lucide-react'
import { Button } from '../../ui/button'
import { Separator } from '../../ui/separator'
import { cn } from '../../utils'
import { sanitizeRichText } from '../../utils/sanitize-html'
import { useTelamonjsT } from '../../i18n/use-t'

export interface RichTextEditorProps {
  /** Current HTML content */
  value?: string
  /** Callback when content changes */
  onChange?: (html: string) => void
  /** Placeholder text */
  placeholder?: string
  /** Disable editing */
  disabled?: boolean
  /** Minimum height in pixels */
  minHeight?: number
  /** Show toolbar */
  showToolbar?: boolean
  /** Class name for container */
  className?: string
  /** Enable image upload */
  enableImages?: boolean
  /** Enable table support */
  enableTables?: boolean
  /**
   * Sanitize the incoming `value` HTML before it reaches the editor (strips
   * `<script>` and event-handler attributes). Defaults to `true`. Set to
   * `false` only when the HTML source is fully trusted.
   */
  sanitize?: boolean
  /** Accessible name of the editable region. Falls back to a localized "Text editor". */
  'aria-label'?: string
  /** Id(s) of the element(s) labelling the editable region (takes precedence over aria-label for AT). */
  'aria-labelledby'?: string
}

interface ToolbarButtonProps {
  icon: React.ReactNode
  title: string
  onClick: () => void
  isActive?: boolean
  disabled?: boolean
}

function ToolbarButton({
  icon,
  title,
  onClick,
  isActive = false,
  disabled = false,
}: ToolbarButtonProps) {
  return (
    <Button
      type='button'
      variant={isActive ? 'default' : 'ghost'}
      size='sm'
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className='h-8 w-8 p-0'
    >
      {icon}
    </Button>
  )
}

interface ToolbarProps {
  editor: Editor
  enableImages?: boolean
  enableTables?: boolean
}

function Toolbar({
  editor,
  enableImages = true,
  enableTables = true,
}: ToolbarProps) {
  const t = useTelamonjsT()

  const addLink = () => {
    const url = window.prompt('Enter URL:')
    if (url) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }

  const addImage = () => {
    const url = window.prompt('Enter image URL:')
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }

  const addTable = () => {
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run()
  }

  return (
    <div className='flex flex-wrap items-center gap-1 border-b p-2'>
      {/* Text Formatting */}
      <ToolbarButton
        icon={<Bold className='h-4 w-4' />}
        title={t('form.toolbar.bold')}
        aria-label={t('form.toolbar.bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
      />
      <ToolbarButton
        icon={<Italic className='h-4 w-4' />}
        title={t('form.toolbar.italic')}
        aria-label={t('form.toolbar.italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
      />
      <ToolbarButton
        icon={<Strikethrough className='h-4 w-4' />}
        title={t('form.toolbar.strikethrough')}
        aria-label={t('form.toolbar.strikethrough')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
      />
      <ToolbarButton
        icon={<Code className='h-4 w-4' />}
        title={t('form.toolbar.code')}
        aria-label={t('form.toolbar.code')}
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive('code')}
      />

      <Separator orientation='vertical' className='mx-1 h-6' />

      {/* Headings */}
      <ToolbarButton
        icon={<Heading1 className='h-4 w-4' />}
        title={t('form.toolbar.heading1')}
        aria-label={t('form.toolbar.heading1')}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
      />
      <ToolbarButton
        icon={<Heading2 className='h-4 w-4' />}
        title={t('form.toolbar.heading2')}
        aria-label={t('form.toolbar.heading2')}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
      />
      <ToolbarButton
        icon={<Heading3 className='h-4 w-4' />}
        title={t('form.toolbar.heading3')}
        aria-label={t('form.toolbar.heading3')}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive('heading', { level: 3 })}
      />

      <Separator orientation='vertical' className='mx-1 h-6' />

      {/* Lists */}
      <ToolbarButton
        icon={<List className='h-4 w-4' />}
        title={t('form.toolbar.bulletList')}
        aria-label={t('form.toolbar.bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
      />
      <ToolbarButton
        icon={<ListOrdered className='h-4 w-4' />}
        title={t('form.toolbar.orderedList')}
        aria-label={t('form.toolbar.orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
      />
      <ToolbarButton
        icon={<Quote className='h-4 w-4' />}
        title={t('form.toolbar.quote')}
        aria-label={t('form.toolbar.quote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
      />

      <Separator orientation='vertical' className='mx-1 h-6' />

      {/* Special */}
      <ToolbarButton
        icon={<LinkIcon className='h-4 w-4' />}
        title={t('form.toolbar.insertLink')}
        aria-label={t('form.toolbar.insertLink')}
        onClick={addLink}
        isActive={editor.isActive('link')}
      />

      {enableImages && (
        <ToolbarButton
          icon={<ImageIcon className='h-4 w-4' />}
          title={t('form.toolbar.insertImage')}
          aria-label={t('form.toolbar.insertImage')}
          onClick={addImage}
        />
      )}

      {enableTables && (
        <ToolbarButton
          icon={<TableIcon className='h-4 w-4' />}
          title={t('form.toolbar.insertTable')}
          aria-label={t('form.toolbar.insertTable')}
          onClick={addTable}
          isActive={editor.isActive('table')}
        />
      )}

      <ToolbarButton
        icon={<Minus className='h-4 w-4' />}
        title={t('form.toolbar.insertHr')}
        aria-label={t('form.toolbar.insertHr')}
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      />

      <Separator orientation='vertical' className='mx-1 h-6' />

      {/* Undo/Redo */}
      <ToolbarButton
        icon={<Undo className='h-4 w-4' />}
        title={t('form.toolbar.undo')}
        aria-label={t('form.toolbar.undo')}
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
      />
      <ToolbarButton
        icon={<Redo className='h-4 w-4' />}
        title={t('form.toolbar.redo')}
        aria-label={t('form.toolbar.redo')}
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
      />
    </div>
  )
}

export function RichTextEditor({
  value = '',
  onChange,
  placeholder = 'Start typing...',
  disabled = false,
  minHeight = 200,
  showToolbar = true,
  className,
  enableImages = true,
  enableTables = true,
  sanitize = true,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
}: RichTextEditorProps) {
  const t = useTelamonjsT()
  // Sanitize incoming HTML at the boundary unless the consumer opts out.
  const sanitizeValue = React.useCallback(
    (html: string) => (sanitize ? sanitizeRichText(html) : html),
    [sanitize]
  )

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      // StarterKit 3 bundles Link; ours (configured below) replaces it —
      // registering both logs tiptap's duplicate-extension warning.
      StarterKit.configure({ link: false }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline',
        },
      }),
      ...(enableImages ? [Image] : []),
      ...(enableTables
        ? [
            Table.configure({
              resizable: true,
            }),
            TableRow,
            TableHeader,
            TableCell,
          ]
        : []),
      Placeholder.configure({
        placeholder,
      }),
    ],
    editorProps: {
      attributes: {
        // `role` is set here because ProseMirror only applies its own default when
        // no custom attributes are given: adding the label alone left a bare
        // `contenteditable` div, and `aria-label` on a div with no role is a
        // prohibited attribute (axe `aria-prohibited-attr`) — one violation traded
        // for another. `aria-multiline` tells the reader it is a multi-line field.
        role: 'textbox',
        'aria-multiline': 'true',
        ...(ariaLabelledBy ? { 'aria-labelledby': ariaLabelledBy } : {}),
        ...(ariaLabel || !ariaLabelledBy
          ? { 'aria-label': ariaLabel ?? t('form.richTextEditor') }
          : {}),
      },
    },
    content: sanitizeValue(value),
    editable: !disabled,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onChange?.(html)
    },
  })

  // Update editor content when value prop changes externally. No update event:
  // syncing the prop must not echo back through onChange (on mount the
  // editor's normalized HTML — '<p></p>' for '' — differs from the value and
  // the echo marked the form dirty before the user typed anything).
  useEffect(() => {
    if (editor) {
      const next = sanitizeValue(value)
      if (next !== editor.getHTML()) {
        editor.commands.setContent(next, { emitUpdate: false })
      }
    }
  }, [value, editor, sanitizeValue])

  // Update editable state
  useEffect(() => {
    if (editor) {
      // false: toggling editability is not a content change (tiptap emits
      // 'update' by default, which reached onChange and dirtied the form)
      editor.setEditable(!disabled, false)
    }
  }, [disabled, editor])

  if (!editor) {
    return null
  }

  return (
    <div
      className={cn(
        'rounded-md border border-input bg-background',
        disabled && 'opacity-50',
        className
      )}
    >
      {showToolbar && (
        <Toolbar
          editor={editor}
          enableImages={enableImages}
          enableTables={enableTables}
        />
      )}

      <EditorContent
        editor={editor}
        className='prose prose-sm max-w-none p-4 focus:outline-none dark:prose-invert'
        style={{ minHeight }}
      />
    </div>
  )
}
