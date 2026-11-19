import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '../../test/test-utils'
import userEvent from '@testing-library/user-event'
import { FileUpload } from './FileUpload'

describe('FileUpload', () => {
  const mockOnChange = vi.fn()

  beforeEach(() => {
    mockOnChange.mockClear()
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    global.URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('renders drop zone', () => {
      render(<FileUpload value={[]} onChange={mockOnChange} />)

      expect(
        screen.getByText('Clique para enviar ou arraste e solte')
      ).toBeInTheDocument()
    })

    it('shows accepted file types', () => {
      render(<FileUpload value={[]} onChange={mockOnChange} accept='image/*' />)

      expect(screen.getByText(/Extensões: image\/\*/)).toBeInTheDocument()
    })

    it('shows max file size', () => {
      render(
        <FileUpload
          value={[]}
          onChange={mockOnChange}
          maxSize={5 * 1024 * 1024}
        />
      )

      expect(screen.getByText(/Limite: 5.0 MB/)).toBeInTheDocument()
    })

    it('shows max files count', () => {
      render(<FileUpload value={[]} onChange={mockOnChange} maxFiles={3} />)

      expect(screen.getByText(/Máx\.: 3 arquivos/)).toBeInTheDocument()
    })

    it('shows error message', () => {
      render(
        <FileUpload
          value={[]}
          onChange={mockOnChange}
          error='Invalid file type'
        />
      )

      expect(screen.getByText('Invalid file type')).toBeInTheDocument()
    })
  })

  describe('File Selection', () => {
    it('handles single file selection', async () => {
      const user = userEvent.setup({ delay: null })

      render(<FileUpload value={[]} onChange={mockOnChange} />)

      const file = new File(['content'], 'test.txt', { type: 'text/plain' })
      const input = screen.getByLabelText('File upload input')

      await user.upload(input, file)

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled()
      })
    })

    it('handles multiple file selection', async () => {
      const user = userEvent.setup({ delay: null })

      render(<FileUpload value={[]} onChange={mockOnChange} multiple />)

      const file1 = new File(['content1'], 'test1.txt', { type: 'text/plain' })
      const file2 = new File(['content2'], 'test2.txt', { type: 'text/plain' })
      const input = screen.getByLabelText('File upload input')

      await user.upload(input, [file1, file2])

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled()
      })
    })

    it('creates preview for image files', async () => {
      const user = userEvent.setup({ delay: null })

      render(
        <FileUpload
          value={[]}
          onChange={mockOnChange}
          showPreview
          accept='image/*'
        />
      )

      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
      const input = screen.getByLabelText('File upload input')

      await user.upload(input, file)

      await waitFor(() => {
        expect(global.URL.createObjectURL).toHaveBeenCalled()
      })
    })
  })

  describe('File Validation', () => {
    it('validates file size', async () => {
      const user = userEvent.setup({ delay: null })

      render(
        <FileUpload
          value={[]}
          onChange={mockOnChange}
          maxSize={10} // 10 bytes
        />
      )

      const largeFile = new File(['a'.repeat(100)], 'large.txt', {
        type: 'text/plain',
      })
      const input = screen.getByLabelText('File upload input')

      await user.upload(input, largeFile)

      await waitFor(() => {
        expect(screen.getByText(/Arquivo muito grande/)).toBeInTheDocument()
      })
    })

    it('validates file type with extension', async () => {
      const user = userEvent.setup({ delay: null })

      render(<FileUpload value={[]} onChange={mockOnChange} accept='.pdf' />)

      const file = new File(['content'], 'test.txt', { type: 'text/plain' })
      const input = screen.getByLabelText('File upload input')

      await user.upload(input, file)

      await waitFor(() => {
        expect(
          screen.getByText(/Tipo de arquivo não aceito/)
        ).toBeInTheDocument()
      })
    })

    it('validates file type with wildcard', async () => {
      const user = userEvent.setup({ delay: null })

      render(<FileUpload value={[]} onChange={mockOnChange} accept='image/*' />)

      const file = new File(['content'], 'test.txt', { type: 'text/plain' })
      const input = screen.getByLabelText('File upload input')

      await user.upload(input, file)

      await waitFor(() => {
        expect(
          screen.getByText(/Tipo de arquivo não aceito/)
        ).toBeInTheDocument()
      })
    })

    it('enforces max files limit', async () => {
      const user = userEvent.setup({ delay: null })

      render(
        <FileUpload value={[]} onChange={mockOnChange} maxFiles={1} multiple />
      )

      const file1 = new File(['content1'], 'test1.txt', { type: 'text/plain' })
      const file2 = new File(['content2'], 'test2.txt', { type: 'text/plain' })
      const input = screen.getByLabelText('File upload input')

      await user.upload(input, [file1, file2])

      await waitFor(() => {
        expect(
          screen.getByText(/Máximo 1 arquivo\(s\) permitido\(s\)/)
        ).toBeInTheDocument()
      })
    })
  })

  describe('File Preview', () => {
    it('shows file preview', async () => {
      const user = userEvent.setup({ delay: null })

      render(<FileUpload value={[]} onChange={mockOnChange} showPreview />)

      const file = new File(['content'], 'test.txt', { type: 'text/plain' })
      const input = screen.getByLabelText('File upload input')

      await user.upload(input, file)

      await waitFor(() => {
        expect(screen.getByText('test.txt')).toBeInTheDocument()
      })
    })

    it('hides preview when showPreview is false', async () => {
      const user = userEvent.setup({ delay: null })

      render(
        <FileUpload value={[]} onChange={mockOnChange} showPreview={false} />
      )

      const file = new File(['content'], 'test.txt', { type: 'text/plain' })
      const input = screen.getByLabelText('File upload input')

      await user.upload(input, file)

      await waitFor(() => {
        expect(screen.queryByText('test.txt')).not.toBeInTheDocument()
      })
    })

    it('removes file when clicking remove button', async () => {
      const user = userEvent.setup({ delay: null })

      render(<FileUpload value={[]} onChange={mockOnChange} showPreview />)

      const file = new File(['content'], 'test.txt', { type: 'text/plain' })
      const input = screen.getByLabelText('File upload input')

      await user.upload(input, file)

      await waitFor(() => {
        expect(screen.getByText('test.txt')).toBeInTheDocument()
      })

      const removeButtons = screen.getAllByRole('button')
      const removeButton = removeButtons.find(btn => {
        const svg = btn.querySelector('svg')
        return svg !== null
      })

      if (removeButton) {
        await user.click(removeButton)

        await waitFor(() => {
          expect(screen.queryByText('test.txt')).not.toBeInTheDocument()
        })
      }
    })
  })

  describe('Drag and Drop', () => {
    // Drop zone is the bordered container two levels above the helper text
    // (p -> div.text-center -> drop zone div)
    const getDropZone = () =>
      screen.getByText('Clique para enviar ou arraste e solte').parentElement!
        .parentElement!

    it('handles drag over event', async () => {
      render(<FileUpload value={[]} onChange={mockOnChange} />)

      const dropZone = getDropZone()

      fireEvent.dragOver(dropZone)

      await waitFor(() => {
        expect(dropZone).toHaveClass('border-primary')
        expect(screen.getByText('Solte os arquivos aqui')).toBeInTheDocument()
      })
    })

    it('handles drag leave event', async () => {
      render(<FileUpload value={[]} onChange={mockOnChange} />)

      const dropZone = getDropZone()

      fireEvent.dragOver(dropZone)

      await waitFor(() => {
        expect(dropZone).toHaveClass('border-primary')
      })

      fireEvent.dragLeave(dropZone)

      await waitFor(() => {
        expect(dropZone).not.toHaveClass('border-primary')
      })
    })
  })

  describe('Edge Cases', () => {
    it('handles empty file selection', async () => {
      const user = userEvent.setup({ delay: null })

      render(<FileUpload value={[]} onChange={mockOnChange} />)

      const input = screen.getByLabelText('File upload input')
      await user.upload(input, [])

      expect(mockOnChange).not.toHaveBeenCalled()
    })
  })
})

describe('FileUpload default value stability', () => {
  it('renders without a value prop and without re-render loops', () => {
    let renders = 0
    const Probe = () => {
      renders++
      return <FileUpload onChange={vi.fn()} />
    }
    expect(() => render(<Probe />)).not.toThrow()
    expect(renders).toBeLessThan(5)
  })
})
