# Ecosystem Component Test Suite

This directory contains tests for the A.E.S Bizzy ecosystem components including hooks, scripts, skills, commands, and agents.

## Test Categories

| Category | Framework | Location | Command |
|----------|-----------|----------|---------|
| **TypeScript/Core** | Vitest | `tests/*.test.ts` | `npm run test:run` |
| **Components** | Vitest | `tests/components/` | `npm run test:components` |
| **Hooks** | pytest | `tests/hooks/` | `npm run test:hooks` |
| **Scripts** | bats | `tests/scripts/` | `npm run test:scripts` |

## Prerequisites

### Python Hooks Testing

```bash
# Install Python dependencies
pip install -r tests/hooks/requirements.txt

# Or install directly
pip install pytest pytest-mock pytest-cov
```

### Shell Script Testing (bats-core)

**Windows (via npm):**
```bash
npm install -g bats
```

**macOS:**
```bash
brew install bats-core
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install bats
```

**Manual installation:**
```bash
git clone https://github.com/bats-core/bats-core.git
cd bats-core
./install.sh /usr/local
```

## Running Tests

### All TypeScript Tests
```bash
npm run test:run
```

### Component Validation (agents, skills, commands)
```bash
npm run test:components
```

### Python Hooks Tests
```bash
npm run test:hooks

# With coverage
npm run test:hooks:coverage
```

### Shell Script Tests
```bash
npm run test:scripts
```

### Full Ecosystem Test Suite
```bash
npm run test:ecosystem
```

### Everything (TypeScript + Ecosystem)
```bash
npm run test:all
```

## Test Structure

```
tests/
├── README.md                    # This file
├── components/                  # Markdown component validation
│   ├── agent-schema.test.ts    # Agent frontmatter/structure
│   ├── skill-structure.test.ts # Skill section validation
│   └── command-structure.test.ts# Command structure validation
├── hooks/                       # Python hook tests
│   ├── conftest.py             # Pytest fixtures
│   ├── pytest.ini              # Pytest configuration
│   ├── requirements.txt        # Python dependencies
│   ├── test_session_start.py   # Session start hook tests
│   └── test_common.py          # Common utilities tests
├── scripts/                     # Shell script tests
│   ├── test_helper.bash        # Bats helper functions
│   └── test_setup_heimdall.bats# Heimdall setup tests
├── fixtures/                    # Test fixtures
│   ├── beads/                  # Beads context fixtures
│   └── hooks/                  # Hook test fixtures
└── ... (existing TypeScript tests)
```

## Writing New Tests

### Component Tests (Vitest)
```typescript
// tests/components/my-component.test.ts
import { describe, it, expect } from 'vitest';

describe('My Component', () => {
  it('should validate structure', () => {
    expect(true).toBe(true);
  });
});
```

### Hook Tests (pytest)
```python
# tests/hooks/test_my_hook.py
import pytest

def test_hook_function(temp_project_dir, mock_beads_cli):
    """Test hook with fixtures."""
    # Use fixtures from conftest.py
    pass
```

### Script Tests (bats)
```bash
#!/usr/bin/env bats
# tests/scripts/test_my_script.bats

load 'test_helper'

@test "my script runs successfully" {
    run ./scripts/my-script.sh
    [ "$status" -eq 0 ]
}
```

## Fixtures

### Python Fixtures (conftest.py)

- `temp_project_dir`: Isolated temp directory with .git and .beads
- `beads_context_dir`: .beads directory with sample data
- `mock_beads_cli`: Factory for mocking bd CLI responses
- `mock_subprocess_success/failure`: Subprocess mocks
- `sample_tasks`: List of sample task dictionaries

### Bats Helpers (test_helper.bash)

- `setup_test_environment`: Create isolated test environment
- `teardown_test_environment`: Cleanup
- `create_mock_docker`: Mock Docker command
- `create_mock_curl`: Mock curl responses
- `assert_*`: Assertion helpers

## CI Integration

Tests can be run in GitHub Actions:

```yaml
# .github/workflows/test.yml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - uses: actions/setup-python@v5
      - run: pip install -r tests/hooks/requirements.txt
      - run: npm ci
      - run: npm run test:all
```
