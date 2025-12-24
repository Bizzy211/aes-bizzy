# E2E Testing Infrastructure

This directory contains Docker-based end-to-end tests for the A.E.S Bizzy ecosystem.

## Overview

The E2E testing infrastructure validates the complete ecosystem in an isolated Docker environment, including:

- **API Connectivity**: Validates external API credentials work
- **Beads CLI**: Tests task management functionality
- **Task Master**: Tests AI-powered task operations
- **GitHub Integration**: Tests issue/PR workflows
- **Heimdall/Qdrant**: Tests vector database operations

## Test Modes

| Mode | API Keys | Services | Use Case |
|------|----------|----------|----------|
| `structural` | None | None | Validate code structure, schemas, configs |
| `smoke` | Minimal | None | Quick connectivity validation |
| `integration` | Full | Qdrant | Complete feature testing |
| `full` | Full | All | Comprehensive validation |

## Quick Start

### Prerequisites

1. **Docker**: Install [Docker Desktop](https://www.docker.com/products/docker-desktop/)
2. **API Keys**: Copy and configure environment file:
   ```bash
   cp .env.test.example .env.test
   # Edit .env.test with your credentials
   ```

### Running Tests

#### Using npm scripts

```bash
# Structural tests (no API keys needed)
npm run test:e2e:structural

# Smoke tests (requires ANTHROPIC_API_KEY)
npm run test:e2e:smoke

# Integration tests (requires multiple API keys)
npm run test:e2e:integration

# Full test suite
npm run test:e2e:full

# Cleanup containers
npm run test:e2e:cleanup
```

#### Using the convenience script

```bash
# Make script executable (first time only)
chmod +x scripts/run-e2e-tests.sh

# Run tests
./scripts/run-e2e-tests.sh structural
./scripts/run-e2e-tests.sh smoke --build
./scripts/run-e2e-tests.sh integration --cleanup
./scripts/run-e2e-tests.sh full --build --cleanup
```

#### Using docker-compose directly

```bash
# Build test container
docker build -f Dockerfile.test -t aes-bizzy-test .

# Run structural tests
docker-compose -f docker-compose.test.yml run --rm test-runner --structural

# Run smoke tests with credentials
docker-compose -f docker-compose.test.yml --env-file .env.test run --rm test-runner --smoke

# Run integration tests
docker-compose -f docker-compose.test.yml --env-file .env.test run --rm test-runner --integration

# Cleanup
docker-compose -f docker-compose.test.yml down -v
```

## Directory Structure

```
tests/e2e/
├── README.md                 # This file
├── docker-entrypoint.sh     # Test orchestration script
├── structural/              # Structure validation tests
│   └── config-validation.test.ts
├── smoke/                   # API connectivity tests
│   └── api-connectivity.test.ts
├── integration/             # Full integration tests
│   ├── beads.test.ts
│   ├── taskmaster.test.ts
│   └── github.test.ts
└── results/                 # Test output (gitignored)
```

## Environment Variables

### Required for Smoke Tests

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude |

### Required for Integration Tests

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `GITHUB_TOKEN` | GitHub personal access token |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous key |

### Optional

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key |
| `PERPLEXITY_API_KEY` | Perplexity API key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `QDRANT_URL` | Custom Qdrant URL (default: auto) |

## CI/CD Integration

The GitHub Actions workflow (`.github/workflows/e2e-tests.yml`) runs tests automatically:

| Trigger | Tests Run |
|---------|-----------|
| PR to main | structural → smoke |
| Push to main | structural → smoke |
| Weekly schedule | structural → smoke → integration |
| Manual dispatch | Selected mode |

### Setting Up Secrets

Add these secrets to your GitHub repository:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add repository secrets:
   - `ANTHROPIC_API_KEY`
   - `OPENAI_API_KEY` (optional)
   - `PERPLEXITY_API_KEY` (optional)
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

Note: `GITHUB_TOKEN` is automatically provided by GitHub Actions.

## Writing Tests

### Test File Conventions

- Use `.test.ts` extension
- Place in appropriate directory (structural/smoke/integration)
- Use conditional execution based on `TEST_MODE`:

```typescript
const isIntegration = process.env.TEST_MODE === 'integration' || process.env.TEST_MODE === 'full';
const hasApiKey = !!process.env.ANTHROPIC_API_KEY;

describe.skipIf(!isIntegration || !hasApiKey)('My Integration Test', () => {
  // Tests that require API keys and integration mode
});
```

### Best Practices

1. **Isolate tests**: Use temporary directories
2. **Clean up**: Remove created resources in `afterAll`
3. **Skip gracefully**: Use `.skipIf()` for optional dependencies
4. **Handle failures**: Catch errors from external services
5. **Timeout appropriately**: AI calls may take 60+ seconds

## Troubleshooting

### Docker Issues

```bash
# Reset Docker state
docker-compose -f docker-compose.test.yml down -v
docker system prune -f

# Rebuild from scratch
docker build --no-cache -f Dockerfile.test -t aes-bizzy-test .
```

### API Key Issues

```bash
# Verify keys are loaded
docker-compose -f docker-compose.test.yml --env-file .env.test run --rm test-runner env | grep API_KEY
```

### Qdrant Issues

```bash
# Check Qdrant health
docker-compose -f docker-compose.test.yml exec qdrant curl http://localhost:6333/health

# View Qdrant logs
docker-compose -f docker-compose.test.yml logs qdrant
```

## Cost Considerations

| Test Mode | Estimated Cost per Run |
|-----------|----------------------|
| structural | $0.00 (no API calls) |
| smoke | ~$0.01-0.05 (minimal calls) |
| integration | ~$0.10-0.50 (moderate calls) |
| full | ~$0.50-2.00 (comprehensive) |

Recommendations:
- Run `structural` frequently during development
- Run `smoke` before pushing to main
- Run `integration` weekly or before releases
- Run `full` only for major releases
