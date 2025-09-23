import { render, screen } from '@testing-library/react'

// Componente simples para testar
function SimpleComponent({ title, isVisible = true }: { title: string; isVisible?: boolean }) {
  if (!isVisible) return null
  
  return (
    <div data-testid="simple-component">
      <h1>{title}</h1>
      <p>This is a test component</p>
      <button>Click me</button>
    </div>
  )
}

describe('Simple React Component Test', () => {
  it('renders title and content correctly when visible', () => {
    render(<SimpleComponent title="Test Title" isVisible={true} />)
    
    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('This is a test component')).toBeInTheDocument()
    expect(screen.getByTestId('simple-component')).toBeInTheDocument()
  })

  it('renders interactive button', () => {
    render(<SimpleComponent title="Test" isVisible={true} />)
    
    const button = screen.getByRole('button', { name: 'Click me' })
    expect(button).toBeInTheDocument()
    expect(button).toBeEnabled()
  })

  it('does not render when isVisible is false', () => {
    render(<SimpleComponent title="Hidden Test" isVisible={false} />)
    
    expect(screen.queryByText('Hidden Test')).not.toBeInTheDocument()
    expect(screen.queryByTestId('simple-component')).not.toBeInTheDocument()
  })

  it('uses default visibility when isVisible is not provided', () => {
    render(<SimpleComponent title="Default Visibility" />)
    
    expect(screen.getByText('Default Visibility')).toBeInTheDocument()
  })

  it('re-renders correctly when props change', () => {
    const { rerender } = render(<SimpleComponent title="First Title" isVisible={true} />)
    expect(screen.getByText('First Title')).toBeInTheDocument()
    
    rerender(<SimpleComponent title="Second Title" isVisible={true} />)
    expect(screen.getByText('Second Title')).toBeInTheDocument()
    expect(screen.queryByText('First Title')).not.toBeInTheDocument()
  })
})