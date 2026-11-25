/** Inline field error, referenced by the input's `aria-describedby`. */
export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} className='text-sm font-medium text-destructive'>
      {message}
    </p>
  )
}
