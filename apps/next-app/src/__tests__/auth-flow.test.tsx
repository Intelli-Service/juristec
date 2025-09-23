import { render, screen } from '@testing-library/react'

// Simulando um componente de loading simples
function LoadingComponent({ isLoading, user }: { isLoading: boolean; user?: { name: string; role: string } | null }) {
  if (isLoading) {
    return (
      <div>
        <div data-testid="loading-spinner">Loading...</div>
        <p>Verificando autenticação...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div>
        <p>Você precisa fazer login</p>
        <a href="/auth/signin">Ir para Login</a>
      </div>
    )
  }

  return (
    <div>
      <h1>Bem-vindo, {user.name}</h1>
      <p>Role: {user.role}</p>
      {user.role === 'super_admin' && (
        <button data-testid="admin-button">Admin Dashboard</button>
      )}
      {user.role === 'lawyer' && (
        <button data-testid="lawyer-button">Lawyer Dashboard</button>
      )}
    </div>
  )
}

describe('Authentication Flow Component', () => {
  it('shows loading state', () => {
    render(<LoadingComponent isLoading={true} />)
    
    expect(screen.getByTestId('loading-spinner')).toBeDefined()
    expect(screen.getByText('Verificando autenticação...')).toBeDefined()
  })

  it('shows login prompt when no user', () => {
    render(<LoadingComponent isLoading={false} user={null} />)
    
    expect(screen.getByText('Você precisa fazer login')).toBeDefined()
    expect(screen.getByText('Ir para Login')).toBeDefined()
  })

  it('shows admin dashboard for super_admin', () => {
    const adminUser = { name: 'Admin User', role: 'super_admin' }
    render(<LoadingComponent isLoading={false} user={adminUser} />)
    
    expect(screen.getByText('Bem-vindo, Admin User')).toBeDefined()
    expect(screen.getByText('Role: super_admin')).toBeDefined()
    expect(screen.getByTestId('admin-button')).toBeDefined()
  })

  it('shows lawyer dashboard for lawyer', () => {
    const lawyerUser = { name: 'Lawyer User', role: 'lawyer' }
    render(<LoadingComponent isLoading={false} user={lawyerUser} />)
    
    expect(screen.getByText('Bem-vindo, Lawyer User')).toBeDefined()
    expect(screen.getByText('Role: lawyer')).toBeDefined()
    expect(screen.getByTestId('lawyer-button')).toBeDefined()
  })

  it('does not show admin button for lawyer', () => {
    const lawyerUser = { name: 'Lawyer User', role: 'lawyer' }
    render(<LoadingComponent isLoading={false} user={lawyerUser} />)
    
    expect(screen.queryByTestId('admin-button')).toBeNull()
  })
})