// Teste básico para verificar se Jest está funcionando
describe('Jest Setup Test', () => {
  it('should work with basic calculations', () => {
    expect(2 + 2).toBe(4)
  })

  it('should work with strings', () => {
    expect('hello world').toContain('world')
  })

  it('should work with arrays', () => {
    const fruits = ['apple', 'banana', 'orange']
    expect(fruits).toHaveLength(3)
    expect(fruits).toContain('banana')
  })
})