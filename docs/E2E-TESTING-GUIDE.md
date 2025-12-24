# E2E Testing Guide for A.E.S Bizzy

> **What is E2E Testing?**
> End-to-End (E2E) testing is like a "dress rehearsal" for your software. Instead of testing individual pieces, we test the entire system working together - just like a real user would experience it.

---

## Table of Contents

1. [Why We Need This](#why-we-need-this)
2. [What Was Created](#what-was-created)
3. [The Big Picture](#the-big-picture)
4. [Getting Started](#getting-started)
5. [Test Modes Explained](#test-modes-explained)
6. [Walkthrough: Running Your First Test](#walkthrough-running-your-first-test)
7. [Walkthrough: Setting Up for Real API Testing](#walkthrough-setting-up-for-real-api-testing)
8. [Walkthrough: Using CI/CD Automation](#walkthrough-using-cicd-automation)
9. [Understanding the Test Results](#understanding-the-test-results)
10. [Troubleshooting Common Issues](#troubleshooting-common-issues)
11. [Cost Considerations](#cost-considerations)
12. [File Reference](#file-reference)

---

## Why We Need This

### The Problem

Imagine you're building a house. You could test each brick individually, but that doesn't tell you if the whole house will stand. Similarly, our A.E.S Bizzy system has many parts:

- **Hooks** (Python scripts that run automatically)
- **Agents** (AI specialists that do specific jobs)
- **Skills** (Capabilities the system can use)
- **API Connections** (Links to external services like Claude, GitHub, Supabase)

Testing each piece separately doesn't guarantee they'll work together. That's where E2E testing comes in.

### The Solution

We created a "testing laboratory" using Docker containers. Think of Docker as a clean, isolated room where we can safely run tests without affecting your real computer or data.

```
┌─────────────────────────────────────────────────────────┐
│                    Your Computer                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │              Docker Container                      │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │  │
│  │  │   Node.js   │  │   Python    │  │   Tests   │  │  │
│  │  │   (Agents)  │  │   (Hooks)   │  │  (Vitest) │  │  │
│  │  └─────────────┘  └─────────────┘  └───────────┘  │  │
│  │                                                    │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │              Qdrant (Vector DB)              │  │  │
│  │  │         (For Heimdall Memory Tests)          │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
│  Your real files and data stay safe outside!             │
└─────────────────────────────────────────────────────────┘
```

---

## What Was Created

Here's everything that was built, explained simply:

| File | What It Does | Plain English |
|------|--------------|---------------|
| `Dockerfile.test` | Blueprint for the test container | Like a recipe that tells Docker exactly what ingredients (software) to install |
| `docker-compose.test.yml` | Orchestrates multiple containers | The conductor that makes sure all the pieces start up in the right order |
| `tests/e2e/docker-entrypoint.sh` | Main test runner script | The "start button" that decides which tests to run and reports results |
| `tests/e2e/structural/` | Structure validation tests | Checks that all files and folders are in the right place |
| `tests/e2e/smoke/` | Quick connectivity tests | Like pinging a server to see "are you there?" |
| `tests/e2e/integration/` | Full feature tests | Actually uses the features like a real user would |
| `.env.test.example` | Template for API keys | A form you fill out with your secret passwords |
| `.github/workflows/e2e-tests.yml` | Automatic testing on GitHub | Runs tests automatically when you push code |
| `scripts/run-e2e-tests.sh` | Convenience script | A friendly helper that makes running tests easier |

---

## The Big Picture

### How Everything Connects

```
┌─────────────────────────────────────────────────────────────────┐
│                         WORKFLOW OVERVIEW                        │
└─────────────────────────────────────────────────────────────────┘

   YOU                    DOCKER                    EXTERNAL APIS
    │                       │                            │
    │  "Run tests"          │                            │
    ▼                       │                            │
┌─────────┐                 │                            │
│ npm run │ ───────────────►│                            │
│ test:e2e│                 │                            │
│:smoke   │                 ▼                            │
└─────────┘           ┌───────────┐                      │
                      │  Docker   │                      │
                      │ Container │                      │
                      │           │    API Calls         │
                      │  ┌─────┐  │ ──────────────────► │
                      │  │Tests│  │                      │
                      │  └─────┘  │ ◄────────────────── │
                      │           │    Responses         │
                      └───────────┘                      │
                            │                            │
                            ▼                            │
                      ┌───────────┐                      │
                      │  Results  │                      │
                      │  Report   │                      │
                      └───────────┘                      │
                            │                            │
                            ▼                            │
                        PASS/FAIL                        │
```

### The Four Test Modes

Think of these like difficulty levels in a video game:

```
┌────────────────────────────────────────────────────────────────┐
│                        TEST MODES                               │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│   STRUCTURAL          SMOKE            INTEGRATION      FULL   │
│   ───────────        ───────          ─────────────    ─────   │
│                                                                 │
│   "Is everything     "Can we talk     "Does it         "Test   │
│    in the right       to the APIs?"    actually work?"  ALL    │
│    place?"                                              things"│
│                                                                 │
│   ✓ No API keys      ✓ Minimal API    ✓ Real API       ✓ Full │
│     needed             calls            usage            suite │
│                                                                 │
│   ✓ Fast (seconds)   ✓ Quick          ✓ Slower         ✓ Slow │
│                        (30 sec)         (minutes)        (5min)│
│                                                                 │
│   ✓ Free             ✓ ~$0.05         ✓ ~$0.50         ✓ ~$2  │
│                                                                 │
│   Good for:          Good for:        Good for:        Good    │
│   Development        Before pushing   Weekly checks    for:    │
│                      to main                           Releases│
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## Getting Started

### Prerequisites (What You Need First)

1. **Docker Desktop**
   - Think of it as a "virtual machine manager" but easier
   - Download from: https://www.docker.com/products/docker-desktop/
   - Install and make sure it's running (you'll see a whale icon in your taskbar)

2. **Your Code**
   - The A.E.S Bizzy project cloned to your computer

3. **API Keys** (only for smoke/integration/full tests)
   - At minimum: Anthropic API key
   - Optional: OpenAI, GitHub, Supabase keys

### Quick Start (30 seconds)

```bash
# Navigate to the project
cd S:/Projects/JHC-Claude-System

# Run the simplest test (no API keys needed!)
npm run test:e2e:structural
```

That's it! You just ran your first E2E test.

---

## Test Modes Explained

### 1. Structural Tests (`--structural`)

**What it checks:**
- Are all the folders where they should be?
- Do configuration files have the right format?
- Are agent files properly structured?

**When to use:**
- During development, after changing file structures
- Before committing code
- When you want fast feedback

**Example output:**
```
✓ should have valid package.json
✓ should have agents/ directory
✓ should have agent markdown files
✓ should have Python hook files
✓ should have Dockerfile.test
```

**Cost:** $0.00 (no API calls)

---

### 2. Smoke Tests (`--smoke`)

**What it checks:**
- Can we reach the Anthropic API?
- Are API keys valid?
- Basic "hello world" level connectivity

**When to use:**
- Before pushing to the main branch
- After updating API keys
- Quick sanity check

**Example output:**
```
✓ ANTHROPIC_API_KEY is configured
✓ Successfully connected to Anthropic API
✓ GitHub API is reachable
```

**Cost:** ~$0.01-0.05 (minimal API calls)

---

### 3. Integration Tests (`--integration`)

**What it checks:**
- Does Task Master actually work?
- Can Beads create and manage tasks?
- Do agent handoffs work correctly?
- Does Heimdall (memory system) store and retrieve data?

**When to use:**
- Weekly scheduled checks
- Before major releases
- After significant changes

**Example output:**
```
✓ Task Master initializes correctly
✓ Can create tasks via CLI
✓ Beads task management works
✓ Qdrant stores memories correctly
```

**Cost:** ~$0.10-0.50 (multiple API calls)

---

### 4. Full Tests (`--full`)

**What it checks:**
- Everything above, plus:
- Performance under load
- Edge cases
- Complete workflow simulations

**When to use:**
- Before major releases
- Monthly health checks
- After major refactoring

**Cost:** ~$0.50-2.00 (comprehensive testing)

---

## Walkthrough: Running Your First Test

### Step 1: Open Your Terminal

On Windows, open PowerShell or Git Bash. On Mac/Linux, open Terminal.

### Step 2: Navigate to the Project

```bash
cd S:/Projects/JHC-Claude-System
```

### Step 3: Run Structural Tests

```bash
npm run test:e2e:structural
```

### Step 4: Watch the Output

You'll see something like:

```
═══════════════════════════════════════════════════════════════
  A.E.S Bizzy E2E Test Suite
═══════════════════════════════════════════════════════════════

Test Mode: structural
Timestamp: 2024-12-24T18:00:00Z

═══════════════════════════════════════════════════════════════
  Environment Validation
═══════════════════════════════════════════════════════════════

[INFO] Structural mode - no API keys required

═══════════════════════════════════════════════════════════════
  Running Tests: structural
═══════════════════════════════════════════════════════════════

[INFO] Running: TypeScript Build Check
[SUCCESS] TypeScript Build Check passed

[INFO] Running: Component Validation
✓ should have valid package.json
✓ should have agents/ directory
... (more tests)
[SUCCESS] Component Validation passed

═══════════════════════════════════════════════════════════════
  Test Results Summary
═══════════════════════════════════════════════════════════════

Mode:   structural
Passed: 4
Failed: 0
Total:  4

[SUCCESS] All tests passed!
```

### What Just Happened?

1. Docker created an isolated container
2. The container installed all dependencies
3. Tests ran inside the container
4. Results were reported back to you
5. The container cleaned up after itself

---

## Walkthrough: Setting Up for Real API Testing

For smoke, integration, and full tests, you need API keys.

### Step 1: Create Your Environment File

```bash
# Copy the example file
cp .env.test.example .env.test
```

### Step 2: Open and Edit the File

Open `.env.test` in any text editor and fill in your keys:

```bash
# Required for smoke tests
ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here

# Optional but recommended
GITHUB_TOKEN=ghp_your-github-token-here
OPENAI_API_KEY=sk-your-openai-key-here

# For integration tests with Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ-your-anon-key
```

### Step 3: Run Smoke Tests

```bash
npm run test:e2e:smoke
```

### Step 4: Verify Connectivity

You should see:

```
═══════════════════════════════════════════════════════════════
  Environment Validation
═══════════════════════════════════════════════════════════════

[SUCCESS] ANTHROPIC_API_KEY: sk-a****here
[SUCCESS] GITHUB_TOKEN: ghp_****here

═══════════════════════════════════════════════════════════════
  Running Tests: smoke
═══════════════════════════════════════════════════════════════

[SUCCESS] API Connectivity passed
```

### Security Note

The `.env.test` file is automatically ignored by Git (via `.gitignore`). Your API keys will never be committed to the repository.

---

## Walkthrough: Using CI/CD Automation

### What is CI/CD?

CI/CD stands for "Continuous Integration / Continuous Deployment". It means:
- **CI**: Every time you push code, tests run automatically
- **CD**: If tests pass, code can be automatically deployed

### How Our Workflow Works

```
┌─────────────────────────────────────────────────────────────────┐
│                     GITHUB ACTIONS WORKFLOW                      │
└─────────────────────────────────────────────────────────────────┘

  Push Code                    GitHub Detects                 Tests Run
  to GitHub         ────►      the Push           ────►       Automatically
      │                            │                              │
      │                            │                              │
      ▼                            ▼                              ▼
┌──────────┐              ┌──────────────┐              ┌──────────────┐
│ git push │              │   Trigger    │              │  Structural  │
│  origin  │              │   Workflow   │              │    Tests     │
│   main   │              │              │              │      ▼       │
└──────────┘              └──────────────┘              │    Smoke     │
                                                        │    Tests     │
                                                        └──────────────┘
                                                               │
                                                               ▼
                                                        ┌──────────────┐
                                                        │   Results    │
                                                        │  ✓ Passed    │
                                                        │  ✗ Failed    │
                                                        └──────────────┘
```

### Setting Up GitHub Secrets

For the CI workflow to work, you need to add your API keys to GitHub:

1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret:

| Secret Name | What to Put |
|-------------|-------------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `OPENAI_API_KEY` | Your OpenAI API key (optional) |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Your Supabase anon key |

### When Tests Run Automatically

| Event | What Runs |
|-------|-----------|
| Any Pull Request | Structural → Smoke |
| Push to main branch | Structural → Smoke |
| Every Sunday at midnight | Structural → Smoke → Integration |
| Manual trigger | You choose the mode |

### Manually Triggering Tests

1. Go to your repository on GitHub
2. Click **Actions** tab
3. Click **E2E Tests** workflow
4. Click **Run workflow**
5. Select your desired test mode
6. Click **Run workflow**

---

## Understanding the Test Results

### Success Output

```
═══════════════════════════════════════════════════════════════
  Test Results Summary
═══════════════════════════════════════════════════════════════

Mode:   smoke
Passed: 5
Failed: 0
Total:  5

[SUCCESS] All tests passed!
```

What this means:
- ✅ All 5 test suites passed
- ✅ Your configuration is correct
- ✅ APIs are reachable and working

### Failure Output

```
═══════════════════════════════════════════════════════════════
  Test Results Summary
═══════════════════════════════════════════════════════════════

Mode:   smoke
Passed: 4
Failed: 1
Total:  5

[ERROR] 1 test suite(s) failed
```

What to do:
1. Scroll up to find the specific failure
2. Look for `[ERROR]` or `×` markers
3. Read the error message
4. Fix the issue and run again

### Common Error Messages Explained

| Error | Plain English | Fix |
|-------|---------------|-----|
| `ANTHROPIC_API_KEY: NOT SET` | You forgot to add your API key | Add it to `.env.test` |
| `401 Unauthorized` | Your API key is invalid or expired | Get a new key from the provider |
| `429 Rate Limited` | You're making too many requests | Wait a few minutes and try again |
| `ECONNREFUSED` | Can't connect to a service | Check if Docker is running |
| `Qdrant not available` | The memory database isn't running | Run `docker-compose up -d qdrant` |

---

## Troubleshooting Common Issues

### Issue: Docker Commands Fail

**Symptom:**
```
Cannot connect to the Docker daemon
```

**Solution:**
1. Open Docker Desktop
2. Wait for it to fully start (whale icon stops animating)
3. Try the command again

---

### Issue: Tests Timeout

**Symptom:**
```
Test timeout of 30000ms exceeded
```

**Solution:**
- AI API calls can be slow
- Increase timeout or wait for rate limits to reset
- Check your internet connection

---

### Issue: Permission Denied

**Symptom:**
```
Permission denied: ./scripts/run-e2e-tests.sh
```

**Solution:**
```bash
# Make the script executable
chmod +x scripts/run-e2e-tests.sh
```

---

### Issue: Qdrant Won't Start

**Symptom:**
```
Qdrant is not responding after 30 attempts
```

**Solution:**
```bash
# Clean up and restart
docker-compose -f docker-compose.test.yml down -v
docker-compose -f docker-compose.test.yml up -d qdrant
```

---

### Issue: "Module Not Found" Errors

**Symptom:**
```
Cannot find module '@/lib/something'
```

**Solution:**
```bash
# Rebuild the test container
npm run docker:build:test
# Or use the convenience script with --build
./scripts/run-e2e-tests.sh smoke --build
```

---

## Cost Considerations

### Understanding API Costs

Every time we call an AI API (like Claude), it costs a tiny amount of money. Here's a breakdown:

| Test Mode | API Calls | Estimated Cost | How Often to Run |
|-----------|-----------|----------------|------------------|
| Structural | 0 | $0.00 | Every commit |
| Smoke | 1-3 | $0.01-0.05 | Before pushing to main |
| Integration | 10-50 | $0.10-0.50 | Weekly |
| Full | 50-200 | $0.50-2.00 | Monthly/Releases |

### Money-Saving Tips

1. **Run structural tests often** - They're free!
2. **Run smoke tests before pushing** - Catches issues early, cheaply
3. **Schedule integration tests weekly** - Not every push
4. **Run full tests for releases only** - Save the comprehensive suite for when it matters

### Monthly Cost Estimate

For a typical development workflow:

| Activity | Frequency | Cost Each | Monthly Total |
|----------|-----------|-----------|---------------|
| Structural | 50x/month | $0.00 | $0.00 |
| Smoke | 20x/month | $0.03 | $0.60 |
| Integration | 4x/month | $0.30 | $1.20 |
| Full | 1x/month | $1.50 | $1.50 |
| **Total** | | | **~$3.30/month** |

---

## File Reference

### Quick Command Reference

```bash
# Structural tests (no API keys, free)
npm run test:e2e:structural

# Smoke tests (needs ANTHROPIC_API_KEY)
npm run test:e2e:smoke

# Integration tests (needs multiple keys)
npm run test:e2e:integration

# Full test suite
npm run test:e2e:full

# Clean up Docker containers
npm run test:e2e:cleanup

# Convenience script (alternative)
./scripts/run-e2e-tests.sh structural
./scripts/run-e2e-tests.sh smoke --build
./scripts/run-e2e-tests.sh integration --cleanup
```

### File Locations

```
S:/Projects/JHC-Claude-System/
├── .env.test.example        ← Template for your API keys
├── .env.test                ← Your actual API keys (create this)
├── Dockerfile.test          ← Container blueprint
├── docker-compose.test.yml  ← Container orchestration
├── .github/
│   └── workflows/
│       └── e2e-tests.yml    ← GitHub automation
├── scripts/
│   └── run-e2e-tests.sh     ← Helper script
└── tests/
    └── e2e/
        ├── README.md        ← Technical documentation
        ├── docker-entrypoint.sh  ← Main test runner
        ├── structural/      ← Structure validation tests
        ├── smoke/           ← API connectivity tests
        └── integration/     ← Full feature tests
```

### Environment Variables Reference

| Variable | Required For | Where to Get It |
|----------|--------------|-----------------|
| `ANTHROPIC_API_KEY` | Smoke+ | console.anthropic.com |
| `OPENAI_API_KEY` | Integration+ | platform.openai.com |
| `GITHUB_TOKEN` | GitHub tests | github.com/settings/tokens |
| `SUPABASE_URL` | Supabase tests | supabase.com dashboard |
| `SUPABASE_ANON_KEY` | Supabase tests | supabase.com dashboard |
| `PERPLEXITY_API_KEY` | Research tests | perplexity.ai |
| `EXA_API_KEY` | MCP Exa tests | exa.ai |
| `REF_API_KEY` | MCP Ref tests | ref.tools |
| `TAVILY_API_KEY` | MCP Tavily tests | tavily.com |
| `CONTEXT7_API_KEY` | MCP Context7 | context7.com |

---

## Summary

You now have a complete E2E testing system that:

1. **Runs in isolation** - Tests can't break your real system
2. **Has multiple levels** - From quick checks to comprehensive testing
3. **Automates on GitHub** - Tests run when you push code
4. **Is cost-effective** - Free tests for development, paid tests only when needed
5. **Provides clear feedback** - Easy to understand pass/fail results

Start with `npm run test:e2e:structural` and work your way up as you get comfortable!

---

*Document created: December 24, 2024*
*Part of the A.E.S Bizzy Multi-Agent Orchestration Platform*
