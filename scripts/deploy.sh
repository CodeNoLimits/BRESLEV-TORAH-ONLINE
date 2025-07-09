#!/bin/bash
# scripts/deploy.sh - Script de déploiement unifié

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${1:-development}"
ACTION="${2:-up}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Validate environment
validate_environment() {
    case $ENVIRONMENT in
        development|staging|production)
            log_info "Environment: $ENVIRONMENT"
            ;;
        *)
            log_error "Invalid environment: $ENVIRONMENT"
            echo "Usage: $0 [development|staging|production] [up|down|restart|logs|status]"
            exit 1
            ;;
    esac
}

# Load environment variables
load_env() {
    local env_file="$PROJECT_ROOT/.env.$ENVIRONMENT"
    
    if [[ -f "$env_file" ]]; then
        log_info "Loading environment from $env_file"
        set -a
        source "$env_file"
        set +a
    else
        log_error "Environment file not found: $env_file"
        exit 1
    fi
}

# Check dependencies
check_dependencies() {
    local deps=("docker" "docker-compose" "git")
    
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            log_error "$dep is not installed"
            exit 1
        fi
    done
    
    # Check Docker daemon
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi
}

# Pre-deployment checks
pre_deploy_checks() {
    log_info "Running pre-deployment checks..."
    
    # Check disk space
    local available_space=$(df -BG . | awk 'NR==2 {print $4}' | sed 's/G//')
    if [[ $available_space -lt 5 ]]; then
        log_warning "Low disk space: ${available_space}GB available"
    fi
    
    # Check ports
    local ports=(80 443 3000 8000 5432 6379)
    for port in "${ports[@]}"; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            log_warning "Port $port is already in use"
        fi
    done
    
    # Validate environment variables
    local required_vars=("DATABASE_URL" "REDIS_URL" "JWT_SECRET_KEY")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            log_error "Required environment variable not set: $var"
            exit 1
        fi
    done
}

# Build images
build_images() {
    log_info "Building Docker images..."
    
    local compose_files="-f docker-compose.yml"
    
    if [[ $ENVIRONMENT == "development" ]]; then
        compose_files="$compose_files -f docker-compose.override.yml"
    else
        compose_files="$compose_files -f docker-compose.$ENVIRONMENT.yml"
    fi
    
    docker-compose $compose_files build --parallel
    
    # Tag images for environment
    docker tag breslev-backend:latest breslev-backend:$ENVIRONMENT
    docker tag breslev-frontend:latest breslev-frontend:$ENVIRONMENT
}

# Database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    docker-compose exec -T backend poetry run alembic upgrade head
    
    # Seed initial data for non-production
    if [[ $ENVIRONMENT != "production" ]]; then
        docker-compose exec -T backend poetry run python scripts/seed_data.py
    fi
}

# Deploy application
deploy() {
    local compose_files="-f docker-compose.yml"
    
    if [[ $ENVIRONMENT == "development" ]]; then
        compose_files="$compose_files -f docker-compose.override.yml"
    else
        compose_files="$compose_files -f docker-compose.$ENVIRONMENT.yml"
    fi
    
    case $ACTION in
        up)
            log_info "Starting services..."
            docker-compose $compose_files up -d
            
            # Wait for services to be healthy
            log_info "Waiting for services to be healthy..."
            sleep 10
            
            # Run migrations
            run_migrations
            
            # Warm cache
            if [[ $ENVIRONMENT == "production" ]]; then
                docker-compose exec -T backend poetry run python scripts/warm_cache.py
            fi
            ;;
            
        down)
            log_info "Stopping services..."
            docker-compose $compose_files down
            ;;
            
        restart)
            log_info "Restarting services..."
            docker-compose $compose_files restart
            ;;
            
        logs)
            docker-compose $compose_files logs -f --tail=100
            ;;
            
        status)
            docker-compose $compose_files ps
            ;;
            
        *)
            log_error "Invalid action: $ACTION"
            exit 1
            ;;
    esac
}

# Post-deployment tasks
post_deploy() {
    if [[ $ACTION == "up" ]]; then
        log_info "Running post-deployment tasks..."
        
        # Health checks
        local services=("backend:8000/health" "frontend:3000")
        
        for service in "${services[@]}"; do
            local name="${service%%:*}"
            local endpoint="${service#*:}"
            
            if curl -sf "http://localhost:$endpoint" > /dev/null; then
                log_success "$name is healthy"
            else
                log_error "$name health check failed"
            fi
        done
        
        # Show access URLs
        echo ""
        log_success "Deployment complete!"
        echo ""
        echo "Access URLs:"
        echo "  Frontend: http://localhost:3000"
        echo "  Backend API: http://localhost:8000"
        echo "  API Docs: http://localhost:8000/docs"
        
        if [[ $ENVIRONMENT == "development" ]]; then
            echo "  Mailhog: http://localhost:8025"
            echo "  Redis Commander: http://localhost:8081"
        fi
    fi
}

# Main execution
main() {
    cd "$PROJECT_ROOT"
    
    validate_environment
    load_env
    check_dependencies
    
    if [[ $ACTION == "up" ]]; then
        pre_deploy_checks
        build_images
    fi
    
    deploy
    post_deploy
}

# Run main function
main