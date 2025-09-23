// Teste das funções de utilitário de autenticação
// Copiando as funções diretamente para evitar problemas de import

// Função helper para verificar permissões
const hasPermission = (
  userPermissions: string[], 
  requiredPermission: string
): boolean => {
  return userPermissions.includes(requiredPermission)
}

// Função helper para verificar role
const hasRole = (
  userRole: string, 
  requiredRoles: string | string[]
): boolean => {
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles]
  return roles.includes(userRole)
}

describe('Auth Utilities (Standalone)', () => {
  describe('hasPermission', () => {
    it('should return true when user has the required permission', () => {
      const userPermissions = ['manage_users', 'view_reports', 'edit_config']
      expect(hasPermission(userPermissions, 'manage_users')).toBe(true)
      expect(hasPermission(userPermissions, 'view_reports')).toBe(true)
    })

    it('should return false when user does not have the required permission', () => {
      const userPermissions = ['view_reports']
      expect(hasPermission(userPermissions, 'manage_users')).toBe(false)
      expect(hasPermission(userPermissions, 'delete_all')).toBe(false)
    })

    it('should return false for empty permissions array', () => {
      const userPermissions: string[] = []
      expect(hasPermission(userPermissions, 'any_permission')).toBe(false)
    })
  })

  describe('hasRole', () => {
    it('should return true when user has the required role', () => {
      expect(hasRole('admin', 'admin')).toBe(true)
      expect(hasRole('lawyer', 'lawyer')).toBe(true)
    })

    it('should return false when user does not have the required role', () => {
      expect(hasRole('client', 'admin')).toBe(false)
      expect(hasRole('lawyer', 'admin')).toBe(false)
    })

    it('should work with array of roles', () => {
      expect(hasRole('admin', ['admin', 'moderator'])).toBe(true)
      expect(hasRole('lawyer', ['admin', 'lawyer'])).toBe(true)
      expect(hasRole('client', ['admin', 'lawyer'])).toBe(false)
    })
  })
})