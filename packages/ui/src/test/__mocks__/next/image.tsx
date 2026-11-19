import React from 'react'

// Mock Next.js Image component
function MockNextImage({ src, alt, onError, ...props }: Record<string, unknown>) {
  return React.createElement('img', {
    src,
    alt,
    onError,
    'data-testid': 'next-image',
    ...props,
  })
}

export default MockNextImage
