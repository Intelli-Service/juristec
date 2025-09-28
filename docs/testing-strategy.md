# 🧪 Estratégia de Testes - Juristec Platform

## Visão Geral

A Juristec Platform utiliza uma **estratégia de testes em camadas** para garantir qualidade, performance e experiência do usuário. Combinamos testes automatizados tradicionais com testes avançados de frontend para cobrir todos os aspectos críticos.

## 🏗️ Arquitetura de Testes

### 1. **Testes Unitários** (Jest)
- **Propósito**: Validar funções, componentes e lógica isoladamente
- **Cobertura**: 80%+ de statements, branches e functions
- **Localização**: `apps/next-app/src/__tests__/`
- **Comando**: `npm run test`

### 2. **Testes de Integração** (Bash Scripts)
- **Propósito**: Validar APIs, infraestrutura e fluxos entre serviços
- **Ferramentas**: Scripts bash com curl para testes HTTP
- **Localização**: `scripts/manual-tests/`
- **Comando**: `bash scripts/manual-tests/integration-tests.sh`

### 3. **Testes E2E** (Playwright)
- **Propósito**: Simular usuários reais interagindo com a aplicação
- **Cenários**: Fluxos completos de usuário, navegação, formulários
- **Localização**: `apps/next-app/tests/e2e/`
- **Comando**: `npm run test:e2e`

### 4. **Testes de Acessibilidade** (axe-core)
- **Propósito**: Garantir conformidade WCAG 2.1 AA
- **Verificações**: Contraste, navegação por teclado, labels ARIA
- **Ferramenta**: `@axe-core/playwright`

### 5. **Testes de Performance** (Lighthouse + Playwright)
- **Propósito**: Validar performance, carregamento e responsividade
- **Métricas**: Tempo de carregamento, Core Web Vitals, layout shifts
- **Ferramentas**: Playwright + testes visuais

## 🎯 Casos de Uso por Tipo de Teste

### Quando Usar Cada Tipo:

| Tipo de Teste | Quando Usar | Exemplo |
|---------------|-------------|---------|
| **Unitários** | Lógica isolada, funções puras | Validar cálculo de preços, formatação de datas |
| **Integração** | APIs, banco de dados, serviços externos | Upload de arquivos, autenticação JWT |
| **E2E** | Fluxos completos do usuário | Cadastro → Chat → Pagamento → Confirmação |
| **Acessibilidade** | Interfaces visuais | Navegação por teclado, leitores de tela |
| **Performance** | UX crítica | Carregamento de página, animações |

## 🚀 Executando os Testes

### Suite Completa (Recomendado)
```bash
# Executa todos os tipos de teste em ordem
bash scripts/complete-testing-suite.sh
```

### Testes Individuais

#### Unitários
```bash
cd apps/next-app && npm run test
cd websocket-service-nest && npm run test
```

#### Integração (Infraestrutura)
```bash
bash scripts/manual-tests/integration-tests.sh
bash scripts/manual-tests/functional-tests.sh
```

#### E2E (Playwright)
```bash
cd apps/next-app
npx playwright test                    # Todos os testes
npx playwright test --headed          # Com navegador visível
npx playwright test --debug            # Modo debug
npx playwright show-report             # Ver relatório HTML
```

#### Acessibilidade
```bash
cd apps/next-app
npx playwright test accessibility.spec.ts
```

#### Performance
```bash
bash scripts/manual-tests/performance-tests.sh
cd apps/next-app && npx playwright test visual-performance.spec.ts
```

## 📊 Métricas de Qualidade

### Cobertura de Testes
- **Unitários**: ≥80% cobertura de código
- **Integração**: Todos os endpoints críticos cobertos
- **E2E**: Principais fluxos de usuário
- **Acessibilidade**: 0 violações críticas WCAG 2.1 AA

### Performance Budgets
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **Time to Interactive**: < 3.5s

### Acessibilidade
- **WCAG 2.1 AA Compliance**: 100%
- **Keyboard Navigation**: Totalmente funcional
- **Screen Reader Support**: Completo

## 🔧 Configuração e Dependências

### Playwright
```bash
cd apps/next-app
npx playwright install          # Instalar browsers
npx playwright install-deps     # Instalar dependências do sistema
```

### Acessibilidade (axe-core)
```bash
npm install --save-dev @axe-core/playwright
```

### MSW (Mock Service Worker)
```bash
npm install --save-dev msw
```

## 🎨 Testes Avançados de Frontend

### Animações e Transições
```typescript
// Testa se animações executam corretamente
await page.evaluate(() => window.scrollTo(0, 500));
await page.waitForTimeout(1000);
await expect(element).toHaveClass(/animate-fade-in/);
```

### Interações do Usuário Realistas
```typescript
// Simula digitação humana com delays
await page.keyboard.type('Olá, preciso de ajuda', { delay: 100 });
await page.keyboard.press('Enter');
```

### Testes Visuais
```typescript
// Captura e compara screenshots
const screenshot = await page.screenshot({ fullPage: true });
expect(screenshot).toMatchSnapshot('landing-page.png');
```

### Responsividade
```typescript
// Testa diferentes viewports
await page.setViewportSize({ width: 375, height: 667 }); // Mobile
await page.setViewportSize({ width: 1920, height: 1080 }); // Desktop
```

## 🚨 Debugging de Testes

### Playwright UI Mode
```bash
npx playwright test --ui
```

### Debug Step-by-Step
```bash
npx playwright test --debug
```

### Ver Relatórios
```bash
npx playwright show-report
```

### Logs Detalhados
```bash
DEBUG=pw:api npx playwright test
```

## 📈 CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run Tests
  run: |
    bash scripts/complete-testing-suite.sh

- name: Upload Test Results
  uses: actions/upload-artifact@v3
  with:
    name: test-results
    path: |
      apps/next-app/test-results/
      apps/next-app/playwright-report/
```

## 🎯 Boas Práticas

### Testes Unitários
- ✅ Funções puras e isoladas
- ✅ Mocks para dependências externas
- ✅ Nomes descritivos: `shouldCalculateTotalPrice`
- ✅ Um conceito por teste

### Testes E2E
- ✅ Cenários críticos do usuário
- ✅ Dados de teste realistas
- ✅ Cleanup automático
- ✅ Não depender de estado externo

### Testes de Performance
- ✅ Budgets definidos
- ✅ Métricas objetivas
- ✅ Ambiente controlado
- ✅ Comparação com baselines

## 🔄 Manutenção

### Atualizando Baselines Visuais
```bash
npx playwright test --update-snapshots
```

### Limpeza de Dados de Teste
```bash
# Scripts de cleanup após testes
npm run test:cleanup
```

### Monitoramento de Qualidade
- **Cobertura**: SonarQube ou Codecov
- **Performance**: Lighthouse CI
- **Acessibilidade**: axe-core reports

---

## 🎉 Conclusão

Esta estratégia de testes garante que a Juristec Platform seja **confiável**, **acessível** e **performática**. Os testes bash continuam úteis para infraestrutura, mas os testes Playwright elevam a qualidade para nível profissional, validando a experiência real do usuário.

**Próximos Passos:**
1. Implementar testes de carga com k6
2. Adicionar testes de segurança automatizados
3. Configurar monitoring de performance em produção