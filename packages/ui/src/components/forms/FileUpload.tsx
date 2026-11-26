/**
 * FileUpload Component
 *
 * Advanced file upload component with drag & drop, multiple files,
 * preview, progress bar and validation.
 *
 * @example
 * <FileUpload
 *   value={files}
 *   onChange={(files) => setFiles(files)}
 *   accept="image/*"
 *   maxFiles={3}
 *   maxSize={5 * 1024 * 1024}
 * />
 */

'use client'

import React, { useCallback, useState, useRef } from 'react'
import {
  Upload,
  X,
  File as FileIcon,
  FileImage,
  FileText,
  Check,
  AlertCircle,
} from 'lucide-react'
import { Button } from '../../ui/button'
import { Progress } from '../../ui/progress'
import { cn } from '../../utils'
import { logger } from '../../utils/logger'
import { useTelamonjsT } from '../../i18n/use-t'

export interface FileUploadProps {
  /** Current files (File[], string[] URLs, or single string URL) */
  value?: File[] | string[] | string
  /** Callback when files change */
  onChange?: (files: File[]) => void
  /** Accept file types (e.g., 'image/*', '.pdf', etc.) */
  accept?: string
  /** Maximum number of files */
  maxFiles?: number
  /** Maximum file size in bytes */
  maxSize?: number
  /** Disable upload */
  disabled?: boolean
  /** Allow multiple files */
  multiple?: boolean
  /** Show preview */
  showPreview?: boolean
  /** Class name for container */
  className?: string
  /** Error message */
  error?: string
  /** API endpoint for immediate upload (e.g., '/api/upload/route') */
  uploadEndpoint?: string
  /** Additional params to send with upload (e.g., { clienteId: '123' }) */
  uploadParams?: Record<string, unknown>
  /** Callback when upload completes successfully */
  onUploadComplete?: (metadata: { url: string; key: string }) => void
}

interface FileWithPreview extends File {
  preview?: string
  progress?: number
  error?: string
  uploaded?: boolean
}

// Interface for a file that already exists on the server (edit mode)
interface ExistingFile {
  url: string
  name: string
  size?: number
  type?: string
  isExisting: true
}

// Union type to accept both
type FileItem = FileWithPreview | ExistingFile

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Derives `files` state from the `value` prop. Returns `undefined` when the
// value doesn't match a recognized shape, meaning the caller should leave
// the current `files` state untouched (matches the previous effect-based
// behavior, which simply didn't call setFiles in that case).
function filesFromValue(
  value: FileUploadProps['value'],
  t: ReturnType<typeof useTelamonjsT>
): FileItem[] | undefined {
  if (Array.isArray(value) && value.length > 0) {
    if (value[0] instanceof File) {
      // value is File[]
      return value as FileWithPreview[]
    }
    if (typeof value[0] === 'string') {
      // value is string[] (array of URLs)
      const urlArray = value as string[]
      return urlArray.map(url => {
        const fileName =
          url.split('/').pop()?.split('?')[0] || t('form.unnamedFile')
        const decodedName = decodeURIComponent(fileName)
        return {
          url,
          name: decodedName,
          isExisting: true,
        }
      })
    }
    return undefined
  }
  if (typeof value === 'string' && value.startsWith('http')) {
    // value is a single string (single URL) - typical edit mode
    const fileName =
      value.split('/').pop()?.split('?')[0] || t('form.unnamedFile')
    const decodedName = decodeURIComponent(fileName)
    return [
      {
        url: value,
        name: decodedName,
        isExisting: true,
      },
    ]
  }
  if (!value || (Array.isArray(value) && value.length === 0)) {
    // Clear files if value is empty
    return []
  }
  return undefined
}

/**
 * Extracts the S3 key from a full URL
 * @param url - Full URL (e.g., "https://bucket.s3.region.amazonaws.com/rotas/arquivos/123/file.kml")
 * @returns S3 key (e.g., "rotas/arquivos/123/file.kml") or null if invalid
 */
function extractS3KeyFromUrl(url: string): string | null {
  try {
    // Match everything after .amazonaws.com/
    const match = url.match(/\.amazonaws\.com\/(.+)/)
    return match ? decodeURIComponent(match[1]) : null
  } catch {
    return null
  }
}

function getFileIcon(file: FileItem): React.ReactNode {
  // Determine type from File.type or URL extension
  const isExisting = 'isExisting' in file && file.isExisting
  let type: string

  if (isExisting) {
    // Infer type from URL/name extension
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
      type = 'image/'
    } else if (ext === 'pdf') {
      type = 'application/pdf'
    } else {
      type = 'unknown'
    }
  } else {
    type = (file as File).type
  }

  if (type.startsWith('image/')) {
    return <FileImage className='h-8 w-8 text-blue-500 dark:text-blue-300' />
  }

  if (type === 'application/pdf') {
    return <FileText className='h-8 w-8 text-red-500 dark:text-red-300' />
  }

  return <FileIcon className='h-8 w-8 text-muted-foreground' />
}

function FilePreview({
  file,
  onRemove,
  disabled,
}: {
  file: FileItem
  onRemove: () => void
  disabled?: boolean
}) {
  const t = useTelamonjsT()
  const isExisting = 'isExisting' in file && file.isExisting

  // Determine if image from type or extension
  let isImage = false
  if (isExisting) {
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)
  } else {
    isImage = (file as File).type.startsWith('image/')
  }

  // Get preview URL (File.preview or ExistingFile.url)
  const previewUrl = isExisting ? file.url : (file as FileWithPreview).preview

  // Display info
  const displayName = file.name
  const displaySize =
    isExisting && file.size
      ? formatFileSize(file.size)
      : isExisting
        ? t('form.existingFile')
        : formatFileSize((file as File).size)

  return (
    <div className='relative flex items-center gap-3 rounded-lg border p-3 bg-card'>
      {/* Preview/Icon */}
      <div className='flex-shrink-0'>
        {isImage && previewUrl ? (
          <img
            src={previewUrl}
            alt={displayName}
            className='h-16 w-16 rounded object-cover'
          />
        ) : (
          <div className='flex h-16 w-16 items-center justify-center rounded bg-muted'>
            {getFileIcon(file)}
          </div>
        )}
      </div>

      {/* File Info */}
      <div className='flex-1 min-w-0'>
        <p className='text-sm font-medium truncate'>{displayName}</p>
        <p className='text-xs text-muted-foreground'>{displaySize}</p>

        {/* Status for existing file */}
        {isExisting && (
          <div className='flex items-center gap-1 mt-1 text-xs text-blue-600 dark:text-blue-300'>
            <Check className='h-3 w-3' />
            {t('form.fileOnServer')}
          </div>
        )}

        {/* Progress/Status/Error for new files */}
        {!isExisting && (
          <>
            {/* Progress Bar */}
            {(file as FileWithPreview).progress !== undefined &&
              (file as FileWithPreview).progress! < 100 && (
                <Progress
                  value={(file as FileWithPreview).progress}
                  className='mt-2 h-1'
                />
              )}

            {/* Uploaded */}
            {(file as FileWithPreview).uploaded && (
              <div className='flex items-center gap-1 mt-1 text-xs text-green-600 dark:text-green-300'>
                <Check className='h-3 w-3' />
                {t('form.uploaded')}
              </div>
            )}

            {/* Error */}
            {(file as FileWithPreview).error && (
              <div className='flex items-center gap-1 mt-1 text-xs text-red-600 dark:text-red-300'>
                <AlertCircle className='h-3 w-3' />
                {(file as FileWithPreview).error}
              </div>
            )}
          </>
        )}
      </div>

      {/* Remove Button */}
      <Button
        type='button'
        variant='ghost'
        size='sm'
        onClick={onRemove}
        disabled={disabled}
        aria-label={t('form.removeFile')}
        className='flex-shrink-0 h-8 w-8 p-0'
      >
        <X className='h-4 w-4' />
      </Button>
    </div>
  )
}

// Module-level default: a fresh `[]` per render defeated the prevValue check
// below (adjust-state-during-render) and could loop.
const EMPTY_VALUE: string[] = []

export function FileUpload({
  value = EMPTY_VALUE,
  onChange,
  accept,
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024, // 10MB default
  disabled = false,
  multiple = true,
  showPreview = true,
  className,
  error,
  uploadEndpoint,
  uploadParams,
  onUploadComplete,
}: FileUploadProps) {
  const t = useTelamonjsT()
  const [files, setFiles] = useState<FileItem[]>(
    () => filesFromValue(value, t) ?? []
  )
  const [isDragging, setIsDragging] = useState(false)
  const [validationError, setValidationError] = useState<string | undefined>(
    error
  )
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Convert value to files on change (React "adjusting state when a prop
  // changes" pattern — avoids an extra effect + render; mount is covered by
  // the lazy useState initializer above).
  const [prevValue, setPrevValue] = useState(value)
  if (value !== prevValue) {
    setPrevValue(value)
    const nextFiles = filesFromValue(value, t)
    if (nextFiles !== undefined) {
      setFiles(nextFiles)
    }
  }

  const validateFile = useCallback(
    (file: File): string | undefined => {
      // Check file size
      if (maxSize && file.size > maxSize) {
        return t('form.uploadMax', { size: formatFileSize(maxSize) })
      }

      // Check file type
      if (accept) {
        const acceptedTypes = accept.split(',').map(a => a.trim())
        const fileType = file.type
        const fileExt = `.${file.name.split('.').pop()?.toLowerCase()}`

        const isAccepted = acceptedTypes.some(type => {
          if (type.startsWith('.')) {
            return fileExt === type.toLowerCase()
          }
          if (type.endsWith('/*')) {
            const category = type.split('/')[0]
            return fileType.startsWith(category + '/')
          }
          return fileType === type
        })

        if (!isAccepted) {
          return t('form.uploadInvalidType', { accept })
        }
      }

      return undefined
    },
    [maxSize, accept, t]
  )

  const processFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const fileArray = Array.from(newFiles)

      // If maxFiles=1 and there is already an existing file, replace (do not add)
      const hasExistingFile =
        files.length > 0 && 'isExisting' in files[0] && files[0].isExisting
      const isReplacing =
        maxFiles === 1 && hasExistingFile && fileArray.length === 1

      if (isReplacing) {
        // Will replace, continue processing
      } else if (files.length + fileArray.length > maxFiles) {
        // Check max files (only when not replacing)
        setValidationError(t('form.uploadMaxFiles', { count: maxFiles }))
        return
      }

      setValidationError(undefined)

      // If replacing an existing file (maxFiles=1), delete the old file from S3 first,
      // unless the replacement is rejected: then the record still points at the old file.
      if (isReplacing && uploadEndpoint && !validateFile(fileArray[0])) {
        const existingFile = files[0] as ExistingFile
        const oldKey = extractS3KeyFromUrl(existingFile.url)

        if (oldKey) {
          // Async delete (does not block the upload)
          fetch(`${uploadEndpoint}?key=${encodeURIComponent(oldKey)}`, {
            method: 'DELETE',
          }).catch(error => {
            logger.warn('[FileUpload] Failed to delete old file (continuing)', {
              error: error instanceof Error ? error : String(error),
            })
            // Continue with the upload even if the delete fails
          })
        }
      }

      const processedFiles: FileWithPreview[] = fileArray.map(file => {
        const validationErr = validateFile(file)
        const fileWithPreview = file as FileWithPreview

        // Create preview for images
        if (file.type.startsWith('image/') && showPreview) {
          fileWithPreview.preview = URL.createObjectURL(file)
        }

        if (validationErr) {
          fileWithPreview.error = validationErr
        } else if (uploadEndpoint) {
          // Real upload to endpoint
          fileWithPreview.progress = 0

          const performUpload = async () => {
            try {
              const formData = new FormData()
              formData.append('file', file)

              // Add uploadParams (resolve dynamic values from form data)
              if (uploadParams) {
                Object.entries(uploadParams).forEach(([key, value]) => {
                  // If value is a string like 'clienteId', get it from current form context
                  // For now, pass as-is (will be resolved by parent component)
                  formData.append(key, String(value))
                })
              }

              const response = await fetch(uploadEndpoint, {
                method: 'POST',
                body: formData,
              })

              if (!response.ok) {
                const errorData = await response
                  .json()
                  .catch(() => ({ error: 'Upload failed' }))
                throw new Error(
                  errorData.error || `Upload failed: ${response.statusText}`
                )
              }

              const result = await response.json()

              fileWithPreview.progress = 100
              fileWithPreview.uploaded = true

              // Notify parent component with metadata
              if (onUploadComplete) {
                onUploadComplete({ url: result.url, key: result.key })
              }

              setFiles(prev => [...prev])
            } catch (error) {
              logger.error('[FileUpload] Upload error', {
                error: error instanceof Error ? error : String(error),
              })
              fileWithPreview.error =
                error instanceof Error ? error.message : 'Upload failed'
              setFiles(prev => [...prev])
            }
          }

          performUpload()
        } else {
          // Fallback: simulate upload (backward compatibility)
          fileWithPreview.progress = 0
          setTimeout(() => {
            fileWithPreview.progress = 100
            fileWithPreview.uploaded = true
            setFiles(prev => [...prev])
          }, 500)
        }

        return fileWithPreview
      })

      // Replace (maxFiles=1) or add
      const updatedFiles = isReplacing
        ? processedFiles // Replace existing file
        : [...files, ...processedFiles] // Add to existing ones

      setFiles(updatedFiles)

      const validFiles = updatedFiles.filter(
        f => !('error' in f) || !f.error
      ) as File[]

      onChange?.(validFiles)
    },
    [
      files,
      maxFiles,
      showPreview,
      onChange,
      uploadEndpoint,
      uploadParams,
      onUploadComplete,
      validateFile,
      t,
    ]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      if (disabled) return

      const droppedFiles = e.dataTransfer.files
      if (droppedFiles.length > 0) {
        processFiles(droppedFiles)
      }
    },
    [disabled, processFiles]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files
      if (selectedFiles && selectedFiles.length > 0) {
        processFiles(selectedFiles)
      }
      // Reset input value to allow selecting the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [processFiles]
  )

  const handleRemoveFile = useCallback(
    (index: number) => {
      const fileToRemove = files[index]
      const isExisting = 'isExisting' in fileToRemove && fileToRemove.isExisting

      // If it is an existing file, just remove it (no need to revoke object URL)
      if (isExisting) {
        setFiles([])
        // Clear the form field (send null on submit)
        onChange?.([])
        return
      }

      // If it is a new File, revoke the object URL
      if ((fileToRemove as FileWithPreview).preview) {
        URL.revokeObjectURL((fileToRemove as FileWithPreview).preview!)
      }

      const updatedFiles = files.filter((_, i) => i !== index)
      setFiles(updatedFiles)

      const validFiles = updatedFiles.filter(
        f => !('error' in f) || !f.error
      ) as File[]

      onChange?.(validFiles)
    },
    [files, onChange]
  )

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click()
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Error Message (top, full width) */}
      {(validationError || error) && (
        <div className='flex items-center gap-2 text-sm text-red-600 dark:text-red-300'>
          <AlertCircle className='h-4 w-4' />
          {validationError || error}
        </div>
      )}

      {/* Horizontal Layout: Drop Zone (50%) + Preview (50%) */}
      <div className='grid grid-cols-2 gap-4'>
        {/* Left Column: Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleClick}
          className={cn(
            'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors',
            'cursor-pointer hover:border-primary/50 hover:bg-muted/50',
            'min-h-[180px]',
            isDragging && 'border-primary bg-primary/5',
            disabled && 'cursor-not-allowed opacity-50',
            (validationError || error) && 'border-red-500'
          )}
        >
          <Upload className='h-8 w-8 text-muted-foreground mb-3' />
          <div className='text-center'>
            <p className='text-sm font-medium'>
              {isDragging ? t('form.dropHere') : t('form.uploadDrop')}
            </p>
            <p className='text-xs text-muted-foreground mt-1'>
              {accept
                ? t('form.acceptedExtensions', { accept })
                : t('form.anyFileType')}
              {maxSize &&
                ` • ${t('form.uploadLimit', { size: formatFileSize(maxSize) })}`}
            </p>
            <p className='text-xs text-muted-foreground'>
              {multiple
                ? t('form.maxFiles', { count: maxFiles })
                : t('form.singleFileOnly')}
            </p>
          </div>

          <input
            ref={fileInputRef}
            type='file'
            accept={accept}
            multiple={multiple}
            onChange={handleFileSelect}
            disabled={disabled}
            className='sr-only'
            aria-label='File upload input'
          />
        </div>

        {/* Right Column: File List/Preview */}
        <div className='flex flex-col gap-2'>
          {showPreview && files.length > 0 ? (
            files.map((file, fileIdx) => (
              <FilePreview
                key={file.name}
                file={file}
                onRemove={() => handleRemoveFile(fileIdx)}
                disabled={disabled}
              />
            ))
          ) : (
            <div className='flex items-center justify-center h-full min-h-[180px] rounded-lg border-2 border-dashed bg-muted/20'>
              <p className='text-sm text-muted-foreground'>
                {t('form.noFileSelected')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
