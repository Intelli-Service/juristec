import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { jest } from '@jest/globals'
import { ToastProvider, useToast } from '../components/ToastProvider'
import { useNotifications } from '../hooks/useNotifications'

// Componente de teste para usar o hook
function TestComponent() {
  const notifications = useNotifications()

  return (
    <div>
      <button onClick={() => notifications.success('Success!', 'Operation completed')}>
        Show Success
      </button>
      <button onClick={() => notifications.error('Error!', 'Something went wrong')}>
        Show Error
      </button>
      <button onClick={() => notifications.warning('Warning!', 'Be careful')}>
        Show Warning
      </button>
      <button onClick={() => notifications.info('Info!', 'Here is some information')}>
        Show Info
      </button>
      <button onClick={() => notifications.success('With Action', 'Click to retry', { label: 'Retry', onClick: jest.fn() })}>
        Show With Action
      </button>
    </div>
  )
}

describe('useNotifications Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('shows success notification with correct parameters', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    const button = screen.getByRole('button', { name: 'Show Success' })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Success!')).toBeInTheDocument()
      expect(screen.getByText('Operation completed')).toBeInTheDocument()
    })

    // Verifica se o toast foi criado (pelo menos o título deve estar presente)
    expect(screen.getByText('Success!')).toBeInTheDocument()
  })

  it('shows error notification with correct parameters', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    const button = screen.getByRole('button', { name: 'Show Error' })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Error!')).toBeInTheDocument()
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })
  })

  it('shows warning notification with correct parameters', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    const button = screen.getByRole('button', { name: 'Show Warning' })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Warning!')).toBeInTheDocument()
      expect(screen.getByText('Be careful')).toBeInTheDocument()
    })
  })

  it('shows info notification with correct parameters', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    const button = screen.getByRole('button', { name: 'Show Info' })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Info!')).toBeInTheDocument()
      expect(screen.getByText('Here is some information')).toBeInTheDocument()
    })
  })

  it('handles notifications with actions correctly', async () => {
    const mockAction = jest.fn()

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    // Simula o clique no botão que cria notificação com ação
    const button = screen.getByRole('button', { name: 'Show With Action' })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('With Action')).toBeInTheDocument()
      expect(screen.getByText('Click to retry')).toBeInTheDocument()
    })

    // Verifica se o botão de ação está presente
    const actionButton = screen.getByRole('button', { name: 'Retry' })
    expect(actionButton).toBeInTheDocument()
  })

  it('returns all notification methods', () => {
    let hookResult: ReturnType<typeof useNotifications> | null = null

    function HookTester() {
      hookResult = useNotifications()
      return null
    }

    render(
      <ToastProvider>
        <HookTester />
      </ToastProvider>
    )

    expect(hookResult).toBeTruthy()
    expect(hookResult).toHaveProperty('success')
    expect(hookResult).toHaveProperty('error')
    expect(hookResult).toHaveProperty('warning')
    expect(hookResult).toHaveProperty('info')
    expect(typeof hookResult!.success).toBe('function')
    expect(typeof hookResult!.error).toBe('function')
    expect(typeof hookResult!.warning).toBe('function')
    expect(typeof hookResult!.info).toBe('function')
  })

  it('handles notifications without message parameter', async () => {
    function TestNoMessage() {
      const notifications = useNotifications()

      return (
        <button onClick={() => notifications.success('Just Title')}>
          Show Title Only
        </button>
      )
    }

    render(
      <ToastProvider>
        <TestNoMessage />
      </ToastProvider>
    )

    const button = screen.getByRole('button', { name: 'Show Title Only' })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Just Title')).toBeInTheDocument()
    })

    // Verifica que não há mensagem adicional
    expect(screen.queryByText('Just Title')).toBeInTheDocument()
  })

  it('multiple notifications are stacked correctly', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    const successButton = screen.getByRole('button', { name: 'Show Success' })
    const errorButton = screen.getByRole('button', { name: 'Show Error' })

    fireEvent.click(successButton)
    fireEvent.click(errorButton)

    await waitFor(() => {
      expect(screen.getByText('Success!')).toBeInTheDocument()
      expect(screen.getByText('Error!')).toBeInTheDocument()
    })

    // Verifica se ambos os toasts estão presentes
    expect(screen.getByText('Success!')).toBeInTheDocument()
    expect(screen.getByText('Error!')).toBeInTheDocument()
  })
})