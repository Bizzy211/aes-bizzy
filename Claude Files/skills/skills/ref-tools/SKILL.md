# Ref Tools Documentation Skill

> Up-to-date documentation access for AI coding agents via ref.tools MCP

---

## When to Use This Skill

Use this skill when:
- Looking up API documentation for libraries and services
- Finding code examples from official docs
- Researching how to use a specific SDK or framework
- Checking current documentation for breaking changes
- Reading technical documentation efficiently

**Ref vs Context7 vs Web Search**:
| Tool | Best For |
|------|----------|
| Ref Tools | Documentation search & smart reading |
| Context7 | Known library docs (curated) |
| Web Search | General queries, news |

---

## MCP Server Setup

### HTTP Mode (Recommended)

```json
// In Claude Desktop or settings.json
{
  "mcpServers": {
    "Ref": {
      "type": "http",
      "url": "https://api.ref.tools/mcp"
    }
  }
}
```

### NPX Mode

```bash
# Add via Claude CLI
claude mcp add ref -s user -- npx -y ref-tools-mcp

# Or with API key for premium features
claude mcp add ref -s user -e REF_API_KEY=your-key -- npx -y ref-tools-mcp
```

---

## Quick Reference

```javascript
// Search documentation
ref_search_documentation({
  query: "React useEffect cleanup function"
})

// Read a documentation page
ref_read_url({
  url: "https://react.dev/reference/react/useEffect"
})

// Optional: Web search fallback
ref_search_web({
  query: "Next.js 14 server actions"
})
```

---

## Core Tools

### 1. ref_search_documentation

Search for documentation across the web, GitHub, and private resources.

```javascript
// Basic search
ref_search_documentation({
  query: "Figma API post comment endpoint"
})

// Search for code examples
ref_search_documentation({
  query: "Python requests library authentication examples"
})

// Search for specific framework docs
ref_search_documentation({
  query: "Tailwind CSS flexbox utilities"
})
```

**Returns**: URLs to relevant documentation pages with snippets

**Token Usage**: ~50-100 tokens per search

### 2. ref_read_url

Read and parse a documentation page, optimized for token efficiency.

```javascript
// Read a specific doc page
ref_read_url({
  url: "https://docs.stripe.com/api/charges/create"
})
```

**Features**:
- Converts HTML to clean markdown
- Uses session history to prioritize relevant sections
- Returns most relevant ~5k tokens (not full page)
- Drops irrelevant navigation, ads, etc.

**Token Usage**: ~300-500 tokens (smart truncation)

### 3. ref_search_web (Optional Fallback)

General web search when documentation-specific search doesn't find results.

```javascript
// Fallback to web search
ref_search_web({
  query: "GraphQL vs REST API comparison"
})
```

---

## Smart Token Management

### How Ref Saves Tokens

Traditional fetch:
```
fetch("https://docs.example.com/api") → 20,000+ tokens (full page)
```

Ref read:
```
ref_read_url("https://docs.example.com/api") → ~5,000 tokens (relevant only)
```

### Session-Aware Context

Ref tracks your search trajectory:

1. Search: `"Stripe API charges"` → Returns URLs
2. Read: `ref_read_url(stripe_charges_url)` → Prioritizes charge-related content
3. Search: `"Stripe refunds"` → Knows context, better results
4. Read: `ref_read_url(stripe_refunds_url)` → Drops unrelated sections

---

## Common Patterns

### Pattern 1: API Documentation Lookup

```javascript
// Step 1: Find the documentation
const searchResults = ref_search_documentation({
  query: "AWS S3 SDK JavaScript upload file"
})

// Step 2: Read the best result
const docs = ref_read_url({
  url: searchResults[0].url
})

// Now Claude has the current API docs
```

### Pattern 2: Library Quick Reference

```javascript
// Search for specific functionality
ref_search_documentation({
  query: "Prisma findMany where clause examples"
})

// Read the reference page
ref_read_url({
  url: "https://www.prisma.io/docs/reference/api-reference/prisma-client-reference#findmany"
})
```

### Pattern 3: Framework Migration Guide

```javascript
// Find migration docs
ref_search_documentation({
  query: "Next.js 13 to 14 migration app router"
})

// Read migration guide
ref_read_url({
  url: "https://nextjs.org/docs/app/building-your-application/upgrading"
})
```

### Pattern 4: Error Troubleshooting

```javascript
// Search for error documentation
ref_search_documentation({
  query: 'TypeScript error "Cannot find module" resolution'
})

// Read troubleshooting guide
ref_read_url({
  url: "https://www.typescriptlang.org/docs/handbook/module-resolution.html"
})
```

---

## Supported Documentation Sources

Ref indexes and searches:

### Official Documentation
- React, Vue, Angular, Svelte
- Node.js, Python, Go, Rust
- AWS, GCP, Azure
- Stripe, Twilio, Auth0
- And many more...

### GitHub
- README files
- Wiki pages
- Code examples
- Issues and discussions

### Private Resources (Premium)
- Your team's private repos
- Uploaded PDFs
- Custom documentation

---

## Integration with Agent Workflow

### Before Starting a Task

```javascript
// Research the technologies involved
async function researchBeforeTask(task) {
  // Identify technologies in task
  const techs = extractTechnologies(task.description)
  
  // Search docs for each
  for (const tech of techs) {
    const docs = await ref_search_documentation({
      query: `${tech} getting started guide`
    })
    
    // Read relevant docs
    if (docs.length > 0) {
      await ref_read_url({ url: docs[0].url })
    }
  }
}
```

### During Implementation

```javascript
// When encountering an API you need to use
async function lookupAPI(service, endpoint) {
  const search = await ref_search_documentation({
    query: `${service} API ${endpoint} documentation`
  })
  
  if (search.length > 0) {
    const docs = await ref_read_url({ url: search[0].url })
    return docs
  }
  
  // Fallback to web search
  return ref_search_web({
    query: `${service} ${endpoint} API reference`
  })
}
```

### Updating Beads with Research

```bash
# After researching
bd update bd-xxxx --add-note "Documentation reviewed:
- Stripe Charges API: https://docs.stripe.com/api/charges
- Node.js SDK: https://github.com/stripe/stripe-node
Key finding: Use idempotency keys for reliability"
```

---

## Best Practices

### ✅ Do

- **Be specific**: `"React useCallback vs useMemo"` > `"React hooks"`
- **Include context**: `"AWS Lambda Node.js 18 handler syntax"` > `"Lambda function"`
- **Use read after search**: Search finds URLs, read gets content
- **Trust token optimization**: Ref smart-truncates for you
- **Chain searches**: Build on session context

### ❌ Don't

- **Over-read**: Don't read every search result
- **Ignore search results**: Check URLs before reading
- **Use for non-docs**: Use web search for news/opinions
- **Forget the session**: Ref remembers your trajectory

---

## Comparison: Ref vs Context7

| Feature | Ref Tools | Context7 |
|---------|-----------|----------|
| Documentation focus | ✅ Primary purpose | ✅ Primary purpose |
| Smart truncation | ✅ Session-aware | ❌ Fixed context |
| Search capability | ✅ Web + GitHub | ❌ Curated index |
| Read any URL | ✅ Yes | ❌ Indexed only |
| Token efficiency | ✅ ~5k optimized | ✅ Pre-curated |
| Private docs | ✅ Premium | ❌ No |

**Use Ref when**: You need to search for docs, read arbitrary URLs, or access latest docs
**Use Context7 when**: You know the library and want quick, curated content

---

## Troubleshooting

### "No results found"
- Try broader search terms
- Check spelling of library/service name
- Use `ref_search_web` as fallback

### "Page content seems incomplete"
- Ref smart-truncates to ~5k tokens
- If you need more, search for specific sections
- Some sites may block scraping

### "Old documentation returned"
- Ref indexes periodically
- For cutting-edge, check official docs directly
- Report stale docs to ref.tools team

---

## Example: Complete Documentation Research

```javascript
// Task: Implement Stripe subscription billing

// 1. Search for subscription docs
const subDocs = await ref_search_documentation({
  query: "Stripe subscriptions API Node.js"
})
// Returns: [{url: "https://docs.stripe.com/billing/subscriptions"}, ...]

// 2. Read main subscription guide
const guide = await ref_read_url({
  url: "https://docs.stripe.com/billing/subscriptions/overview"
})
// Returns: Markdown with subscription concepts, ~4k tokens

// 3. Search for specific API
const apiDocs = await ref_search_documentation({
  query: "Stripe create subscription API reference"
})

// 4. Read API reference
const apiRef = await ref_read_url({
  url: "https://docs.stripe.com/api/subscriptions/create"
})
// Returns: API parameters, examples, ~3k tokens

// 5. Search for webhooks (related topic)
const webhookDocs = await ref_search_documentation({
  query: "Stripe subscription webhook events"
})

// 6. Read webhook docs
const webhooks = await ref_read_url({
  url: "https://docs.stripe.com/billing/subscriptions/webhooks"
})

// Now Claude has comprehensive knowledge to implement billing
// Total tokens used: ~15k (vs 60k+ with raw fetch)
```

---

## API Key & Limits

### Free Tier
- Searches: 100/day
- Reads: 50/day
- Public documentation only

### Premium
- Unlimited searches and reads
- Private repo access
- Priority indexing
- API key: `REF_API_KEY`

Get API key at: https://ref.tools

---

*Skill Version: 1.0.0*
*Last Updated: December 2025*
