# Authentication Credentials Taxonomy

**Generated:** 2024-12-24
**Source:** Code analysis of Task 73 - Tracing actual runtime API key requirements

This document provides the definitive reference for all authentication credentials used by the A.E.S Bizzy Claude System, verified by tracing actual code invocations in hooks, skills, installers, and MCP servers.

---

## Credential Type Classification

### 1. API Keys (Static Service Credentials)

| Credential | Prefix Pattern | Used By | Source File |
|------------|---------------|---------|-------------|
| `ANTHROPIC_API_KEY` | `sk-ant-api03-*` | Hook LLM utilities, TaskMaster MCP* | `hooks/utils/llm/anth.py:29` |
| `OPENAI_API_KEY` | `sk-*` | Hook LLM/TTS utilities, Heimdall | `hooks/utils/llm/oai.py:28` |
| `EXA_API_KEY` | UUID format | Exa MCP server | `.claude/mcp.json:52` |
| `REF_API_KEY` | `ref-*` | Ref MCP server | `.claude/mcp.json:31` |
| `TAVILY_API_KEY` | `tvly-*` | Tavily search MCP | `.claude/mcp.json:255` |
| `FIRECRAWL_API_KEY` | `fc-*` | Firecrawl MCP | `.claude/mcp.json:99` |
| `PERPLEXITY_API_KEY` | `pplx-*` | TaskMaster research | `src/installers/api-keys.ts:115` |
| `ELEVENLABS_API_KEY` | N/A | ElevenLabs TTS | `hooks/utils/tts/elevenlabs_tts.py:36` |

> **\* TaskMaster Note:** `ANTHROPIC_API_KEY` is only required when using TaskMaster via MCP tools (`mcp__task-master-ai__*`). When using CLI commands (`task-master parse-prd`, etc.), TaskMaster runs within Claude Code's context and uses its API access - no separate key needed.

### 2. Personal Access Tokens (PATs)

| Credential | Prefix Pattern | Used By | Source File |
|------------|---------------|---------|-------------|
| `GITHUB_TOKEN` | `ghp_*`, `gho_*`, `github_pat_*` | GitHub CLI, GitHub API | `src/installers/api-keys.ts:85` |
| `GH_TOKEN` | Same as GITHUB_TOKEN | Fallback alias | `src/cli/github.ts:51` |
| `SUPABASE_ACCESS_TOKEN` | `sbp_*` | Official Supabase MCP | `.claude/mcp.json:68` |
| `SUPABASE_API_KEY` | `sbp_*` | supabase-2 MCP | `.claude/mcp.json:81` |

### 3. JWT Tokens (JSON Web Tokens)

| Credential | Prefix Pattern | Used By | Source File |
|------------|---------------|---------|-------------|
| `SUPABASE_KEY` | `eyJ*` (base64 JWT) | projectmgr-context MCP | `.claude/mcp.json:285` |
| `SUPABASE_ANON_KEY` | `eyJ*` (base64 JWT) | Supabase client auth | Test configurations |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ*` (base64 JWT) | Supabase admin operations | Test configurations |

### 4. Bearer Token Usage Patterns

Bearer tokens are HTTP Authorization header values. The following patterns are used:

```typescript
// OpenAI pattern (hooks/utils/llm/oai.py:77)
Authorization: `Bearer ${OPENAI_API_KEY}`

// GitHub pattern (src/installers/github.ts:88)
Authorization: `Bearer ${GITHUB_TOKEN}`

// Heimdall pattern (src/heimdall/storage-manager.ts:83)
Authorization: `Bearer ${OPENAI_API_KEY}`
```

---

## MCP Server Credential Requirements

### Verified from `.claude/mcp.json` (Ground Truth)

| MCP Server | Required Env Var | Actual Config Key | Status |
|------------|------------------|-------------------|--------|
| task-master-ai | ANTHROPIC_API_KEY | inherited from env | Active |
| ref | REF_API_KEY | REF_API_KEY | Active |
| exa | EXA_API_KEY | EXA_API_KEY | Active |
| Cisco Security App Supabase | SUPABASE_ACCESS_TOKEN | SUPABASE_ACCESS_TOKEN | Active |
| supabase-2 | SUPABASE_API_KEY | SUPABASE_API_KEY | Active |
| firecrawl | FIRECRAWL_API_KEY | FIRECRAWL_API_KEY | Active |
| **Magic UX/UI** | **API_KEY** | **API_KEY** | **CRITICAL** |
| tavily-search-server | TAVILY_API_KEY | TAVILY_API_KEY | Active |
| projectmgr-context | SUPABASE_URL, SUPABASE_KEY | SUPABASE_URL, SUPABASE_KEY | Active |

### Servers Without API Keys

These MCP servers do not require API keys:

- `shadcn-ui-server` - Local component library
- `mcp-installer` - Package installer
- `sequential-thinking` - Logic processor
- `desktop-commander` - File operations
- `playwright-mcp-server` - Browser automation
- `memory` - Local memory store
- `superdesign-mcp-server` - Local design tools
- `codebase-map` - Local code analysis

---

## CRITICAL: Environment Variable Naming Issues

### Issue #1: Magic UX/UI MCP Server

**Problem:** Test configurations use `MAGIC_21ST_API_KEY` but actual MCP config uses `API_KEY`

**Files affected:**
- `docker-compose.test.yml:53` - Uses wrong variable name
- `.env.test.example:99` - Documents wrong variable name

**Actual config (.claude/mcp.json:119):**
```json
"Magic UX/UI": {
  "env": {
    "API_KEY": "64aff77ee20251d65caa423a26595662165683f8e3d7fec9b1ce0ddde7ba82ff"
  }
}
```

**Fix Required:** Change `MAGIC_21ST_API_KEY` to `API_KEY` in test configurations.

### Issue #2: Supabase Credential Aliases

Multiple MCP servers use different Supabase credential names:

| MCP Server | URL Variable | Key Variable |
|------------|-------------|--------------|
| projectmgr-context | SUPABASE_URL | SUPABASE_KEY |
| supabase-2 | N/A | SUPABASE_API_KEY |
| Official Supabase | N/A | SUPABASE_ACCESS_TOKEN |

**Recommendation:** Ensure all three variants are available in test environment.

---

## Skills MCP Tool Dependencies

From analysis of `skills/**/*.md` files:

| Skill | MCP Tools Used | Required Credentials |
|-------|---------------|---------------------|
| bizzy (orchestration) | `mcp__exa__*`, `mcp__ref__*`, `mcp__task_master_ai__*`, `mcp__github__*` | EXA_API_KEY, REF_API_KEY, ANTHROPIC_API_KEY, GITHUB_TOKEN |
| exa-ai (research) | `mcp__exa__web_search_exa`, `mcp__exa__get_code_context_exa` | EXA_API_KEY |
| ref-tools (research) | `mcp__ref__ref_search_documentation`, `mcp__ref__ref_read_url` | REF_API_KEY |
| skill-creator | `mcp__exa__*`, `mcp__ref__*` | EXA_API_KEY, REF_API_KEY |
| agent-creator | `mcp__exa__*`, `mcp__ref__*` | EXA_API_KEY, REF_API_KEY |

---

## Hook Utility Dependencies

### LLM Clients (hooks/utils/llm/)

| Client | File | Environment Variable | Graceful Degradation |
|--------|------|---------------------|---------------------|
| AnthropicClient | `anth.py` | ANTHROPIC_API_KEY | Yes (`is_available()` check) |
| OpenAIClient | `oai.py` | OPENAI_API_KEY | Yes (`is_available()` check) |
| OllamaClient | `ollama.py` | N/A (local) | Yes |

### TTS Clients (hooks/utils/tts/)

| Client | File | Environment Variable | Graceful Degradation |
|--------|------|---------------------|---------------------|
| ElevenLabsTTS | `elevenlabs_tts.py` | ELEVENLABS_API_KEY | Yes (`is_available()` check) |
| OpenAITTS | `openai_tts.py` | OPENAI_API_KEY | Yes |
| Pyttsx3TTS | `pyttsx3_tts.py` | N/A (local) | Yes |

---

## Installer API Key Definitions

From `src/installers/api-keys.ts`:

```typescript
export const API_KEY_DEFS: ApiKeyDef[] = [
  {
    key: 'GITHUB_TOKEN',
    required: true,
    validate: (v) => v.startsWith('ghp_') || v.startsWith('gho_') || v.startsWith('github_pat_'),
  },
  {
    key: 'EXA_API_KEY',
    required: true,
    validate: (v) => v.length > 10,
  },
  {
    key: 'REF_API_KEY',
    required: true,
    validate: (v) => v.startsWith('ref-'),
  },
  {
    key: 'ANTHROPIC_API_KEY',
    required: false,
    validate: (v) => v.startsWith('sk-ant-'),
  },
  {
    key: 'PERPLEXITY_API_KEY',
    required: false,
    validate: (v) => v.startsWith('pplx-'),
  },
];
```

---

## GitHub Token Priority Chain

From `src/cli/github.ts:51`:

```typescript
return options.token || process.env.GITHUB_TOKEN || process.env.GH_TOKEN || null;
```

**Priority:**
1. Command-line `--token` flag
2. `GITHUB_TOKEN` environment variable
3. `GH_TOKEN` environment variable (fallback)
4. `gh auth token` CLI command (auto-detect)

---

## Test Environment Credential Summary

### Structural Tests (No API Calls)
- No credentials required

### Smoke Tests (Minimal API Calls)
- `ANTHROPIC_API_KEY` (required)
- `GITHUB_TOKEN` (optional)
- `QDRANT_URL` (auto-provided by Docker)

### Integration Tests (Full API Coverage)
All credentials recommended:
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `GITHUB_TOKEN`
- `EXA_API_KEY`
- `REF_API_KEY`
- `TAVILY_API_KEY`
- `FIRECRAWL_API_KEY`
- `API_KEY` (for Magic UX/UI - NOT MAGIC_21ST_API_KEY)
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SUPABASE_ACCESS_TOKEN`
- `PERPLEXITY_API_KEY`

---

## Quick Reference: Credential Providers

| Provider | Console URL | Credential Type |
|----------|-------------|-----------------|
| Anthropic | console.anthropic.com | API Key (sk-ant-*) |
| OpenAI | platform.openai.com/api-keys | API Key (sk-*) |
| GitHub | github.com/settings/tokens | PAT (ghp_*, github_pat_*) |
| Supabase | supabase.com/dashboard | JWT (eyJ*) or PAT (sbp_*) |
| Exa.ai | dashboard.exa.ai | API Key (UUID) |
| Ref.tools | ref.tools | API Key (ref-*) |
| Tavily | tavily.com | API Key (tvly-*) |
| Firecrawl | firecrawl.dev | API Key (fc-*) |
| Perplexity | perplexity.ai | API Key (pplx-*) |
| ElevenLabs | elevenlabs.io | API Key |
| 21st.dev | 21st.dev | API Key |

---

## Validation Commands

```bash
# Check GitHub token format
echo $GITHUB_TOKEN | grep -E '^(ghp_|gho_|github_pat_)'

# Check Anthropic key format
echo $ANTHROPIC_API_KEY | grep -E '^sk-ant-'

# Check Supabase JWT format
echo $SUPABASE_KEY | grep -E '^eyJ'

# Check Supabase PAT format
echo $SUPABASE_ACCESS_TOKEN | grep -E '^sbp_'
```
