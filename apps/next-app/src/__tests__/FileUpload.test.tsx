import { render, screen } from '@testing-library/react'
import { ToastProvider } from '../components/ToastProvider'
import FileUpload from '../components/FileUpload'

describe('FileUpload Component', () => {
  const mockOnFileSelect = jest.fn()

  it('renders upload area with correct text and styling', () => {
    render(
      <ToastProvider>
        <FileUpload onFileSelect={mockOnFileSelect} />
      </ToastProvider>
    )

    expect(screen.getByText('Clique para escolher')).toBeInTheDocument()
    expect(screen.getByText('ou arraste um arquivo')).toBeInTheDocument()
    expect(screen.getByText('PDF, DOC, DOCX, JPG, PNG (máx. 10MB)')).toBeInTheDocument()

    const uploadArea = screen.getByTestId('upload-area')
    expect(uploadArea).toHaveClass('border-2', 'border-dashed')
  })

  it('is disabled when disabled prop is true', () => {
    render(
      <ToastProvider>
        <FileUpload onFileSelect={mockOnFileSelect} disabled={true} />
      </ToastProvider>
    )

    const uploadArea = screen.getByTestId('upload-area')
    const fileInput = screen.getByTestId('file-input') as HTMLInputElement

    expect(uploadArea).toHaveClass('opacity-50', 'cursor-not-allowed')
    expect(fileInput).toBeDisabled()
  })
})