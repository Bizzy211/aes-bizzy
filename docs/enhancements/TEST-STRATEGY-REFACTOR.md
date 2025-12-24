# Enhancement: Test Strategy Refactor

**Status:** Proposed
**Created:** 2024-12-24
**Priority:** Medium
**Effort:** ~4 hours

## Problem Statement

The current unit tests for CLI commands (`init`, `doctor`, `mcp-servers`) are fragile and high-maintenance:

1. **Tests break when implementation changes** - When `initConfig`/`saveConfig` were removed from `init.ts`, tests failed even though the feature still worked.

2. **Extensive mocking required** - Tests mock `execSync`, `existsSync`, `readFileSync`, and multiple modules just to test basic behavior.

3. **Tests verify implementation, not behavior** - Checking if `initConfig` was called tests *how* it works, not *what* it does.

4. **Docker E2E infrastructure exists but is underutilized** - We have a working Docker test environment that could test real behavior.

## Current State

| Test File | Type | Issues |
|-----------|------|--------|
| `tests/cli/init.test.ts` | Unit (mocked) | Tests internal function calls, requires 10+ mocks |
| `tests/cli/doctor.test.ts` | Unit (mocked) | Mocks `execSync` for every CLI command |
| `tests/installers/mcp-servers.test.ts` | Unit (mocked) | Mix of valid config tests and fragile install tests |

## Recommendation

**Delete fragile unit tests. Add E2E tests that run real commands in Docker.**

### Keep as Unit Tests (no mocks needed)
- Configuration validation (MCP server configs have required fields)
- Pure parsing functions
- Type/schema validation

### Move to E2E Tests
- `aes-bizzy init` - verify it creates expected files/directories
- `aes-bizzy doctor` - verify it outputs correct diagnostics
- MCP server installation - verify `claude mcp add` works

## Proposed Structure

```
tests/
├── unit/                           # Fast, no mocks, pure logic only
│   └── config/
│       └── mcp-servers.test.ts     # Config validation only
│
├── e2e/
│   ├── structural/
│   │   ├── config-validation.test.ts   # Existing
│   │   └── cli-commands.test.ts        # NEW: Basic CLI smoke tests
│   │
│   ├── smoke/
│   │   └── api-connectivity.test.ts    # Existing
│   │
│   └── integration/
│       ├── beads.test.ts               # Existing
│       ├── taskmaster.test.ts          # Existing
│       ├── cli-init.test.ts            # NEW: Full init workflow
│       ├── cli-doctor.test.ts          # NEW: Doctor diagnostics
│       └── mcp-servers.test.ts         # NEW: MCP install/uninstall
```

## Implementation Plan

### Phase 1: Add E2E Coverage
1. Create `tests/e2e/structural/cli-commands.test.ts`
   - Test `aes-bizzy --version` works
   - Test `aes-bizzy --help` outputs expected commands
   - Test `aes-bizzy doctor` runs without error

2. Create `tests/e2e/integration/cli-init.test.ts`
   - Test `aes-bizzy init` creates `.claude/` directory
   - Test `aes-bizzy init --skip-all` completes successfully
   - Test project structure is created correctly

3. Create `tests/e2e/integration/cli-doctor.test.ts`
   - Test doctor detects missing prerequisites
   - Test doctor reports correct status for each check
   - Test `--json` output is valid JSON

### Phase 2: Refactor Unit Tests
1. Extract pure config validation from `mcp-servers.test.ts`
2. Delete mock-heavy tests from `init.test.ts`
3. Delete mock-heavy tests from `doctor.test.ts`

### Phase 3: Cleanup
1. Remove unused mock utilities
2. Update CI to run E2E tests appropriately
3. Update documentation

## Success Criteria

- [ ] All CLI commands have E2E test coverage
- [ ] Unit tests only test pure functions (no mocks)
- [ ] Tests don't break when refactoring internals
- [ ] CI runs structural tests on every PR
- [ ] CI runs full E2E on merge to main

## Trade-offs

| Approach | Pros | Cons |
|----------|------|------|
| **Current (mocked units)** | Fast, isolated | Fragile, high maintenance |
| **Proposed (E2E focus)** | Tests real behavior, low maintenance | Slower, needs Docker |

## Notes

- E2E tests run in disposable Docker containers - no cleanup needed
- Structural E2E tests require no API keys
- Integration E2E tests require credentials (run in CI with secrets)

## Related Files

- `docker-compose.test.yml` - Docker test configuration
- `Dockerfile.test` - Test container definition
- `tests/e2e/docker-entrypoint.sh` - Test orchestration script
