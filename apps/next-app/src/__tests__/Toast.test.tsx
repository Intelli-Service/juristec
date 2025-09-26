import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { jest } from '@jest/globals'
import Toast, { ToastProps } from '../components/Toast'

// Mock das animações CSS para testes
const mockAnimation = jest.fn()
Object.defineProperty(window, 'requestAnimationFrame', {
  value: (cb: (time: number) => void) => setTimeout(cb, 16),
})

// Mock do ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
})) as jest.MockedClass<{ observe: jest.Mock; unobserve: jest.Mock; disconnect: jest.Mock }>

describe('Toast Component', () => {
  const defaultProps: ToastProps = {
    id: 'test-toast',
    type: 'success',
    title: 'Test Title',
    message: 'Test message',
    onClose: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders success toast with correct styling and content', () => {
    render(<Toast {...defaultProps} />)

    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Test message')).toBeInTheDocument()

    const toast = screen.getByRole('alert')
    expect(toast).toHaveClass('bg-emerald-50', 'border-emerald-200', 'text-emerald-800')
  })

  it('renders error toast with correct styling', () => {
    render(<Toast {...defaultProps} type="error" />)

    const toast = screen.getByRole('alert')
    expect(toast).toHaveClass('bg-red-50', 'border-red-200', 'text-red-800')
  })

  it('renders warning toast with correct styling', () => {
    render(<Toast {...defaultProps} type="warning" />)

    const toast = screen.getByRole('alert')
    expect(toast).toHaveClass('bg-amber-50', 'border-amber-200', 'text-amber-800')
  })

  it('renders info toast with correct styling', () => {
    render(<Toast {...defaultProps} type="info" />)

    const toast = screen.getByRole('alert')
    expect(toast).toHaveClass('bg-blue-50', 'border-blue-200', 'text-blue-800')
  })

  it('displays correct icons for each type', () => {
    const { rerender } = render(<Toast {...defaultProps} type="success" />)
    expect(screen.getByTestId('toast-icon')).toBeInTheDocument()

    rerender(<Toast {...defaultProps} type="error" />)
    expect(screen.getByTestId('toast-icon')).toBeInTheDocument()

    rerender(<Toast {...defaultProps} type="warning" />)
    expect(screen.getByTestId('toast-icon')).toBeInTheDocument()

    rerender(<Toast {...defaultProps} type="info" />)
    expect(screen.getByTestId('toast-icon')).toBeInTheDocument()
  })

  it('renders action button when provided', () => {
    const action = { label: 'Retry', onClick: jest.fn() }
    render(<Toast {...defaultProps} action={action} />)

    const actionButton = screen.getByRole('button', { name: 'Retry' })
    expect(actionButton).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', async () => {
    render(<Toast {...defaultProps} />)

    const closeButton = screen.getByRole('button', { name: /fechar/i })
    fireEvent.click(closeButton)

    await waitFor(() => {
      expect(defaultProps.onClose).toHaveBeenCalledWith('test-toast')
    })
  })

  it('calls action onClick when action button is clicked', () => {
    const action = { label: 'Retry', onClick: jest.fn() }
    render(<Toast {...defaultProps} action={action} />)

    const actionButton = screen.getByRole('button', { name: 'Retry' })
    fireEvent.click(actionButton)

    expect(action.onClick).toHaveBeenCalled()
  })

  it('auto-closes after duration', async () => {
    jest.useFakeTimers()
    render(<Toast {...defaultProps} duration={1000} />)

    expect(screen.getByRole('alert')).toBeInTheDocument()

    act(() => {
      jest.advanceTimersByTime(1000)
    })

    await waitFor(() => {
      expect(defaultProps.onClose).toHaveBeenCalledWith('test-toast')
    })

    jest.useRealTimers()
  })

  it('does not auto-close when duration is 0 (persistent)', () => {
    jest.useFakeTimers()
    render(<Toast {...defaultProps} duration={0} />)

    jest.advanceTimersByTime(10000)

    expect(defaultProps.onClose).not.toHaveBeenCalled()

    jest.useRealTimers()
  })

  it('renders without message when not provided', () => {
    render(<Toast {...defaultProps} message={undefined} />)

    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.queryByText('Test message')).not.toBeInTheDocument()
  })

  it('has correct accessibility attributes', () => {
    render(<Toast {...defaultProps} />)

    const toast = screen.getByRole('alert')
    expect(toast).toHaveAttribute('aria-live', 'assertive')
    expect(toast).toHaveAttribute('aria-atomic', 'true')
  })

  it('pauses auto-close on hover and resumes on mouse leave', async () => {
    jest.useFakeTimers()
    render(<Toast {...defaultProps} duration={2000} />)

    const toast = screen.getByRole('alert')

    // Hover - should pause
    fireEvent.mouseEnter(toast)
    act(() => {
      jest.advanceTimersByTime(1500)
    })
    expect(defaultProps.onClose).not.toHaveBeenCalled()

    // Mouse leave - should resume
    fireEvent.mouseLeave(toast)
    act(() => {
      jest.advanceTimersByTime(500)
    })

    await waitFor(() => {
      expect(defaultProps.onClose).toHaveBeenCalledWith('test-toast')
    })

    jest.useRealTimers()
  })
})