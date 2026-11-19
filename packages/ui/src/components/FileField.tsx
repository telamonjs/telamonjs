'use client'

import { useState, useRef } from 'react'
import { Trash2, Upload, FileText, Download } from 'lucide-react'
import { Button } from '../ui/button'
import { logger } from '../utils/logger'
import { useTelamonjsT } from '../i18n/use-t'

interface FileFieldProps {
  field: {
    name: string
    label?: string
    value?: string | File
    onChange: (value: File | null | string) => void
    onBlur?: () => void
    ref?: React.Ref<HTMLInputElement>
    placeholder?: string
    required?: boolean
    readOnly?: boolean
    disabled?: boolean
    uploadFn?: (file: string) => Promise<unknown>
    accept?: string
    maxSize?: number
    path?: string
    /** Turns the stored value (e.g. a storage key) into the download URL */
    resolveUrl?: (value: string) => string | Promise<string>
  }
  id?: string
}

export const FileField = ({ field, id }: FileFieldProps) => {
  const t = useTelamonjsT()
  const [uploading, setUploading] = useState(false)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(
    typeof field.value === 'string' ? field.value : null
  )
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Check file size
    const maxSize = field.maxSize || 10000000 // 10MB default
    if (file.size > maxSize) {
      setError(
        t('form.fileFieldTooBig', { size: (maxSize / 1000000).toFixed(1) })
      )
      return
    }

    setError(null)
    setFileName(file.name)

    // If there's an upload function, use it
    if (field.uploadFn) {
      setUploading(true)
      try {
        // Convert file to base64
        const reader = new FileReader()
        reader.onloadend = async () => {
          const base64 = reader.result?.toString().split(',')[1]
          if (!base64) {
            setError(t('form.processFileError'))
            setUploading(false)
            return
          }

          const fileJson = {
            name: file.name,
            size: file.size,
            type: file.type,
            data: base64,
          }

          try {
            // Call uploadFn - it might expect additional parameters
            // If the uploadFn is a bound function with pre-filled params, just pass the file
            const result = await field.uploadFn!(JSON.stringify(fileJson))

            // Handle the result - it might be a string or an object
            let url: string
            if (typeof result === 'string') {
              // Try to parse as JSON first
              try {
                const parsedResult = JSON.parse(result)
                url = parsedResult.url || parsedResult.path || result
              } catch {
                // If not JSON, use as is
                url = result
              }
            } else if (result && typeof result === 'object') {
              const resultObj = result as Record<string, unknown>
              url =
                (resultObj.url as string) ||
                (resultObj.path as string) ||
                JSON.stringify(result)
            } else {
              url = String(result)
            }

            setUploadedUrl(url)
            field.onChange(url)
            setUploading(false)
          } catch (uploadError) {
            setError(t('form.uploadFileError'))
            setUploading(false)
            logger.error('Upload error', { error: uploadError instanceof Error ? uploadError : String(uploadError) })
          }
        }
        reader.readAsDataURL(file)
      } catch (err) {
        setError(t('form.processFileError'))
        setUploading(false)
        logger.error('File processing error', { error: err instanceof Error ? err : String(err) })
      }
    } else {
      // If no upload function, just store the file
      field.onChange(file)
    }
  }

  const handleRemove = () => {
    setUploadedUrl(null)
    setFileName(null)
    setError(null)
    field.onChange(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDownload = () => {
    if (!uploadedUrl) return
    const resolved = field.resolveUrl?.(uploadedUrl) ?? uploadedUrl
    if (typeof resolved === 'string') {
      window.open(resolved, '_blank')
      return
    }
    // Open the tab inside the click (popup blockers drop a window.open made
    // after an await) and point it once the URL is known.
    const tab = window.open('', '_blank')
    resolved.then(
      url => {
        if (tab) tab.location.href = url
        else window.open(url, '_blank')
      },
      (err: unknown) => {
        tab?.close()
        setError(t('form.downloadFileError'))
        logger.error('Download URL error', {
          error: err instanceof Error ? err : String(err),
        })
      }
    )
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  const isDisabled = field.readOnly || field.disabled || uploading

  return (
    <div className='space-y-2'>
      <input
        ref={fileInputRef}
        type='file'
        accept={field.accept || '*/*'}
        onChange={handleFileSelect}
        disabled={isDisabled}
        className='hidden'
        id={id || field.name}
      />

      {!uploadedUrl && !fileName ? (
        <Button
          type='button'
          variant='outline'
          onClick={handleButtonClick}
          disabled={isDisabled}
          className='w-full'
          data-testid='file-field-select-button'
        >
          <Upload className='mr-2 h-4 w-4' />
          {uploading
            ? t('form.sending')
            : field.placeholder || t('form.selectFile')}
        </Button>
      ) : (
        <div className='flex items-center justify-between p-3 border rounded-md bg-muted/50'>
          <div className='flex items-center space-x-2'>
            <FileText className='h-4 w-4 text-muted-foreground' />
            <span className='text-sm text-muted-foreground'>
              {fileName || uploadedUrl?.split('/').pop() || t('form.unnamedFile')}
            </span>
          </div>
          <div className='flex items-center space-x-2'>
            {uploadedUrl && (
              <Button
                type='button'
                variant='ghost'
                size='sm'
                onClick={handleDownload}
                disabled={uploading}
                aria-label={t('form.downloadFile')}
              >
                <Download className='h-4 w-4' />
              </Button>
            )}
            {!field.readOnly && !field.disabled && (
              <Button
                type='button'
                variant='ghost'
                size='sm'
                onClick={handleRemove}
                disabled={uploading}
                aria-label={t('form.removeFile')}
              >
                <Trash2 className='h-4 w-4 text-red-500' />
              </Button>
            )}
          </div>
        </div>
      )}

      {error && <p className='text-sm text-red-500'>{error}</p>}
    </div>
  )
}
