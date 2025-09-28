#!/bin/bash

# Script para executar testes E2E realistas da plataforma Juristec
# Usa ambiente Docker isolado com MongoDB local e credenciais reais

set -e  # Parar em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função de log
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Verificar se Docker está rodando
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        error "Docker não está rodando. Por favor, inicie o Docker e tente novamente."
        exit 1
    fi
}

# Verificar se arquivo .env existe
check_env() {
    if [ ! -f "apps/next-app/.env.local" ] && [ ! -f "apps/websocket-service-nest/.env" ]; then
        error "Arquivos .env não encontrados. Verifique se existem:"
        error "  - apps/next-app/.env.local"
        error "  - apps/websocket-service-nest/.env"
        exit 1
    fi
}

# Subir ambiente de teste
start_test_environment() {
    log "Subindo ambiente de teste Docker..."
    docker-compose -f docker-compose.test.yml up -d --build

    # Aguardar serviços ficarem saudáveis
    log "Aguardando serviços ficarem prontos..."
    max_attempts=30
    attempt=1

    while [ $attempt -le $max_attempts ]; do
        if docker-compose -f docker-compose.test.yml ps | grep -q "healthy"; then
            success "Ambiente de teste pronto!"
            return 0
        fi

        log "Tentativa $attempt/$max_attempts - Aguardando serviços..."
        sleep 10
        ((attempt++))
    done

    error "Timeout: Serviços não ficaram saudáveis"
    docker-compose -f docker-compose.test.yml logs
    exit 1
}

# Executar testes E2E
run_e2e_tests() {
    log "Executando testes E2E realistas..."

    # Entrar no container do frontend para executar os testes
    docker-compose -f docker-compose.test.yml exec -T frontend sh -c "
        cd /app &&
        npx playwright install chromium &&
        npx playwright test --config playwright.e2e.config.ts
    "

    if [ $? -eq 0 ]; then
        success "Testes E2E passaram com sucesso!"
    else
        error "Testes E2E falharam"
        return 1
    fi
}

# Executar testes de API (bash scripts existentes)
run_api_tests() {
    log "Executando testes de API..."

    # Testes funcionais
    if bash scripts/manual-tests/functional-tests.sh; then
        success "Testes funcionais passaram"
    else
        error "Testes funcionais falharam"
        return 1
    fi

    # Testes de integração
    if bash scripts/manual-tests/integration-tests.sh; then
        success "Testes de integração passaram"
    else
        error "Testes de integração falharam"
        return 1
    fi
}

# Executar testes de performance
run_performance_tests() {
    log "Executando testes de performance..."

    if bash scripts/manual-tests/performance-tests.sh; then
        success "Testes de performance passaram"
    else
        error "Testes de performance falharam"
        return 1
    fi
}

# Limpar ambiente de teste
cleanup() {
    log "Limpando ambiente de teste..."
    docker-compose -f docker-compose.test.yml down -v
    success "Ambiente de teste limpo"
}

# Função principal
main() {
    log "🚀 Iniciando suite de testes E2E realistas da plataforma Juristec"

    # Verificações iniciais
    check_docker
    check_env

    # Trap para cleanup em caso de erro
    trap cleanup EXIT

    # Subir ambiente
    start_test_environment

    # Executar testes
    local test_failed=0

    # Testes E2E com Playwright
    if ! run_e2e_tests; then
        test_failed=1
    fi

    # Testes de API (bash)
    if ! run_api_tests; then
        test_failed=1
    fi

    # Testes de performance
    if ! run_performance_tests; then
        test_failed=1
    fi

    # Resultado final
    if [ $test_failed -eq 0 ]; then
        success "🎉 Todos os testes passaram com sucesso!"
        log "📊 Cobertura de testes:"
        log "   - E2E (Playwright): Fluxos completos do usuário"
        log "   - API (Bash): Endpoints e integrações"
        log "   - Performance: Carga e resposta"
        exit 0
    else
        error "💥 Alguns testes falharam. Verifique os logs acima."
        exit 1
    fi
}

# Executar função principal
main "$@"