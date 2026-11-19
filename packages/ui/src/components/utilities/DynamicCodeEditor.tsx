'use client'

import { Suspense, lazy } from 'react'
import { Textarea } from '../../ui/textarea'
import { useTelamonjsT } from '../../i18n/use-t'

const CodeEditor = lazy(() =>
  import('@uiw/react-textarea-code-editor').then(module => ({
    default: module.default,
  }))
)

interface DynamicCodeEditorProps {
  value: string
  language?: string
  placeholder?: string
  onChange: (event: { target: { value: string } }) => void
  wrap?: string
  className?: string
  style?: React.CSSProperties
}

export function DynamicCodeEditor({
  value,
  language = 'js',
  placeholder,
  onChange,
  className,
  style,
}: DynamicCodeEditorProps) {
  const t = useTelamonjsT()
  const resolvedPlaceholder = placeholder ?? t('common.codePlaceholder')
  return (
    <Suspense
      fallback={
        <Textarea
          value={value}
          placeholder={resolvedPlaceholder}
          onChange={e => onChange({ target: { value: e.target.value } })}
          className={className}
          style={style}
          rows={10}
        />
      }
    >
      <CodeEditor
        value={value}
        language={language}
        placeholder={resolvedPlaceholder}
        onChange={evn => onChange(evn)}
        padding={15}
        className={className}
        style={{
          fontSize: 12,
          fontFamily:
            'ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace',
          ...style,
        }}
      />
    </Suspense>
  )
}

DynamicCodeEditor.displayName = 'DynamicCodeEditor'
