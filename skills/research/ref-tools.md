# Ref Tools - Documentation Search and Retrieval

Ref Tools skill for searching and reading official documentation, GitHub repos, and curated resources.

## Overview

Ref Tools provides access to documentation search and URL content reading, complementing Exa AI for research-backed development.

## Core Tools

### Search Documentation

```javascript
// Search for library documentation
mcp__ref__ref_search_documentation({
  query: "React useState hook TypeScript"
})

// Framework-specific docs
mcp__ref__ref_search_documentation({
  query: "Next.js API routes middleware"
})

// Search with language context
mcp__ref__ref_search_documentation({
  query: "Python asyncio event loop"
})

// Search private docs (if configured)
mcp__ref__ref_search_documentation({
  query: "internal API documentation ref_src=private"
})
```

### Read URL Content

```javascript
// Read documentation page
mcp__ref__ref_read_url({
  url: "https://react.dev/reference/react/useState"
})

// Read GitHub README
mcp__ref__ref_read_url({
  url: "https://github.com/vercel/next.js/blob/main/README.md"
})

// Read API documentation
mcp__ref__ref_read_url({
  url: "https://docs.anthropic.com/en/api/messages"
})
```

## Beads Integration

### Track Documentation Research

```bash
# Create documentation research task
bd create "Research Prisma schema documentation" --assign backend-dev

# Log documentation sources found
bd update TASK_ID --add-note "Found official docs at prisma.io/docs/concepts/components/prisma-schema"

# Store key patterns
bd update TASK_ID --add-note "Schema uses @relation for foreign keys, @@index for performance"
```

### Documentation-Driven Development

```bash
# 1. Create research task
bd create "Research Supabase auth setup" --assign integration-expert

# 2. Search documentation
# mcp__ref__ref_search_documentation "Supabase auth JavaScript"

# 3. Read specific docs
# mcp__ref__ref_read_url "https://supabase.com/docs/guides/auth"

# 4. Log key findings
bd update TASK_ID --add-note "Auth requires createClient with anon key, use signInWithOAuth for social"

# 5. Create implementation task
bd create "Implement Supabase auth" --assign backend-dev --depends-on TASK_ID
```

## Cross-References

### Related Agents
- **meta-agent**: Uses for tool research in agent creation
- **docs-engineer**: Primary user for documentation research
- **backend-dev**: Uses for API documentation
- **frontend-dev**: Uses for component documentation

### Related Skills
- **exa-ai**: Complementary web search
- **agent-creator**: Uses for researching agent capabilities

### Related Hooks
- **post_tool_use.py**: Logs documentation tool usage
- **api_docs_enforcer.py**: Uses patterns from documentation

## Search Strategies

### Library Documentation

```javascript
// Get library API docs
mcp__ref__ref_search_documentation({
  query: "Express.js Router TypeScript middleware"
})

// Find configuration options
mcp__ref__ref_search_documentation({
  query: "Vite config resolve alias TypeScript"
})
```

### Framework Patterns

```javascript
// Search for patterns
mcp__ref__ref_search_documentation({
  query: "Next.js server components data fetching"
})

// Get migration guides
mcp__ref__ref_search_documentation({
  query: "React 18 migration concurrent features"
})
```

### API Integration

```javascript
// Search API docs
mcp__ref__ref_search_documentation({
  query: "Stripe API create payment intent"
})

// Read specific endpoint docs
mcp__ref__ref_read_url({
  url: "https://stripe.com/docs/api/payment_intents/create"
})
```

## Workflow Integration

### Research-First Development

```python
# Step 1: Search for relevant docs
search_results = mcp__ref__ref_search_documentation({
    "query": "PostgreSQL JSON operators"
})

# Step 2: Read most relevant doc
doc_content = mcp__ref__ref_read_url({
    "url": search_results[0].url
})

# Step 3: Extract patterns for implementation
# Apply documented patterns to code
```

### Combined with Exa AI

```python
# Use ref-tools for official documentation
official_docs = mcp__ref__ref_search_documentation({
    "query": "React hooks rules"
})

# Use exa for community patterns and examples
community_examples = mcp__exa__get_code_context_exa({
    "query": "React custom hooks real world examples",
    "tokensNum": 5000
})

# Combine official rules with community patterns
```

## Documentation Sources

Ref Tools searches across:

| Source Type | Examples |
|-------------|----------|
| Official Docs | react.dev, nextjs.org, docs.python.org |
| GitHub Repos | READMEs, wikis, discussions |
| API References | Stripe, Anthropic, OpenAI |
| Package Docs | npm, PyPI, crates.io |
| Private Docs | Internal wikis (if configured) |

## Best Practices

1. **Include language/framework** - Specify technology in query
2. **Use specific terms** - API names, function names, config keys
3. **Read full docs** - Use ref_read_url for complete context
4. **Log sources in Beads** - Track documentation references
5. **Combine with exa-ai** - Get both official and community resources
6. **Check version** - Ensure docs match your version

## URL Reading Tips

```javascript
// Read specific sections
mcp__ref__ref_read_url({
  url: "https://react.dev/reference/react/useState#usage"
})

// Read GitHub files directly
mcp__ref__ref_read_url({
  url: "https://github.com/org/repo/blob/main/src/example.ts"
})

// Read package.json for dependencies
mcp__ref__ref_read_url({
  url: "https://github.com/org/repo/blob/main/package.json"
})
```

---

*A.E.S - Bizzy Skill - Ref Tools Documentation v1.0.0*
