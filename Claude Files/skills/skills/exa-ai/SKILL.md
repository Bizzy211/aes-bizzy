# Exa AI Search Skill

> AI-powered semantic search and web research via Exa.ai

---

## When to Use This Skill

Use this skill when:
- Performing semantic/meaning-based web searches
- Finding similar content to a given URL or text
- Researching topics with AI-enhanced results
- Getting cleaned, parsed content from web pages
- Finding recent news or articles on a topic
- Building research-backed responses

**Exa vs Traditional Search**:
| Traditional Search | Exa AI |
|-------------------|--------|
| Keyword matching | Semantic understanding |
| SEO-optimized results | Quality/relevance optimized |
| Raw HTML/snippets | Cleaned, parsed content |
| Link lists | Full text extraction |

---

## MCP Server Setup

```bash
# Add Exa MCP server
claude mcp add exa -s user -- npx -y @anthropic/exa-mcp

# Or with API key in env
claude mcp add exa -s user -e EXA_API_KEY=your-key -- npx -y @anthropic/exa-mcp
```

### Get API Key
1. Go to https://exa.ai
2. Sign up / Log in
3. Navigate to API Keys
4. Create new key
5. Add to environment: `EXA_API_KEY=exa-xxxx`

---

## Quick Reference

```javascript
// Semantic search
exa_search({
  query: "best practices for implementing OAuth 2.0",
  numResults: 10,
  type: "neural"
})

// Find similar pages
exa_find_similar({
  url: "https://example.com/great-article",
  numResults: 5
})

// Get page contents
exa_get_contents({
  ids: ["result-id-1", "result-id-2"],
  text: true
})

// Search with auto-content
exa_search_and_contents({
  query: "React server components tutorial",
  numResults: 5,
  text: true
})
```

---

## Core Concepts

### Search Types

| Type | Best For |
|------|----------|
| `neural` | Semantic/meaning-based queries (default) |
| `keyword` | Exact phrase matching |
| `auto` | Let Exa decide |

### Content Options

| Option | Description |
|--------|-------------|
| `text` | Get full text content (cleaned) |
| `highlights` | Get relevant snippets |
| `summary` | Get AI-generated summary |

### Filters

| Filter | Example |
|--------|---------|
| `includeDomains` | `["github.com", "stackoverflow.com"]` |
| `excludeDomains` | `["pinterest.com", "reddit.com"]` |
| `startPublishedDate` | `"2024-01-01"` |
| `endPublishedDate` | `"2024-12-31"` |
| `category` | `"news"`, `"research paper"`, `"company"` |

---

## Search Patterns

### Basic Semantic Search

```javascript
// Find articles about a topic
const results = exa_search({
  query: "implementing zero-knowledge proofs in blockchain",
  numResults: 10,
  type: "neural"
})

// Results include:
// - title
// - url
// - publishedDate
// - author
// - id (for content retrieval)
```

### Search with Domain Filtering

```javascript
// Search only trusted sources
exa_search({
  query: "Kubernetes security best practices",
  numResults: 10,
  includeDomains: [
    "kubernetes.io",
    "cloud.google.com",
    "docs.aws.amazon.com",
    "learn.microsoft.com"
  ]
})
```

### Search with Date Filtering

```javascript
// Find recent articles only
exa_search({
  query: "AI model developments",
  numResults: 10,
  startPublishedDate: "2024-06-01",
  endPublishedDate: "2024-12-31"
})
```

### News Search

```javascript
// Find news articles
exa_search({
  query: "Federal Reserve interest rate decision",
  numResults: 10,
  category: "news",
  startPublishedDate: "2024-12-01"
})
```

### Research Paper Search

```javascript
// Find academic papers
exa_search({
  query: "transformer architecture improvements",
  numResults: 10,
  category: "research paper",
  includeDomains: ["arxiv.org", "papers.nips.cc", "aclanthology.org"]
})
```

---

## Find Similar Content

### Find Similar to URL

```javascript
// Find pages similar to a known good resource
exa_find_similar({
  url: "https://react.dev/learn/thinking-in-react",
  numResults: 10
})
```

### Find Similar with Filters

```javascript
// Find similar but from different domains
exa_find_similar({
  url: "https://blog.example.com/great-tutorial",
  numResults: 10,
  excludeDomains: ["example.com"],  // Exclude source domain
  startPublishedDate: "2024-01-01"   // Recent only
})
```

---

## Getting Content

### Get Content by IDs

```javascript
// After search, get full content
const searchResults = exa_search({ query: "..." })
const ids = searchResults.results.map(r => r.id)

exa_get_contents({
  ids: ids.slice(0, 5),  // First 5 results
  text: true,            // Full text
  highlights: true       // Relevant snippets
})
```

### Search and Get Content Together

```javascript
// Combined search + content retrieval
exa_search_and_contents({
  query: "implementing rate limiting in Node.js",
  numResults: 5,
  text: true,
  highlights: {
    numSentences: 3,
    highlightsPerUrl: 2
  }
})
```

---

## Advanced Queries

### Autoprompt

Let Exa enhance your query:

```javascript
exa_search({
  query: "good React tutorials",
  useAutoprompt: true,  // Exa will enhance this query
  numResults: 10
})
// Exa might search for: "comprehensive React.js tutorial for beginners with hooks and components"
```

### Keyword Search

For exact matching:

```javascript
exa_search({
  query: '"error handling" "try catch" javascript',
  type: "keyword",
  numResults: 10
})
```

### Company Search

```javascript
exa_search({
  query: "AI startups focused on healthcare",
  category: "company",
  numResults: 20
})
```

---

## Integration Patterns

### Research for Task Context

```javascript
// When starting a task, research best practices
async function researchForTask(taskDescription) {
  const results = await exa_search_and_contents({
    query: `best practices ${taskDescription}`,
    numResults: 5,
    text: true,
    includeDomains: [
      "docs.microsoft.com",
      "developer.mozilla.org",
      "cloud.google.com"
    ]
  })
  
  // Add to Beads task
  const summary = results.results.map(r => 
    `- ${r.title}: ${r.url}`
  ).join('\n')
  
  // bd update <task-id> --add-note "Research:\n${summary}"
  return results
}
```

### Competitive Research

```javascript
// Find competitors/similar products
async function findCompetitors(productUrl) {
  const similar = await exa_find_similar({
    url: productUrl,
    numResults: 10,
    excludeDomains: [new URL(productUrl).hostname]
  })
  
  return similar.results
}
```

### Documentation Search

```javascript
// Search official documentation
async function searchDocs(technology, topic) {
  const domainMap = {
    "react": ["react.dev", "reactjs.org"],
    "node": ["nodejs.org", "nodejs.dev"],
    "python": ["docs.python.org", "python.org"],
    "typescript": ["typescriptlang.org"]
  }
  
  return exa_search_and_contents({
    query: `${technology} ${topic}`,
    numResults: 5,
    includeDomains: domainMap[technology] || [],
    text: true
  })
}
```

---

## Research Workflow

### Step 1: Broad Search

```javascript
// Start with broad semantic search
const initial = exa_search({
  query: "microservices authentication patterns",
  numResults: 20,
  type: "neural"
})
```

### Step 2: Filter Best Results

```javascript
// Get content from top results
const detailed = exa_get_contents({
  ids: initial.results.slice(0, 5).map(r => r.id),
  text: true,
  highlights: true
})
```

### Step 3: Find Similar to Best

```javascript
// Expand from the best result
const expanded = exa_find_similar({
  url: detailed.results[0].url,
  numResults: 10
})
```

### Step 4: Synthesize

```javascript
// Combine all research
const allContent = [...detailed.results, ...expanded.results]
// Use Claude to synthesize findings
```

---

## Best Practices

### ✅ Do

- **Use semantic queries**: Natural language works best
- **Filter by domain**: Include trusted sources
- **Filter by date**: For timely information
- **Get full text**: When you need detailed content
- **Use highlights**: For quick scanning
- **Combine with find_similar**: Expand good finds

### ❌ Don't

- **Over-fetch**: Request only needed results (costs credits)
- **Skip domain filtering**: Unfiltered can include low-quality sources
- **Ignore dates**: Old content may be outdated
- **Use for real-time**: Exa indexes, not real-time

---

## Rate Limits & Costs

| Plan | Searches/Month | Content Retrievals |
|------|----------------|-------------------|
| Free | 1,000 | 1,000 |
| Pro | 10,000+ | 10,000+ |

Tips:
- Cache results when possible
- Use `numResults` wisely
- Combine search + contents when appropriate

---

## Comparison: Exa vs Web Search vs Tavily

| Feature | Exa | Web Search | Tavily |
|---------|-----|------------|--------|
| Semantic search | ✅ Excellent | ❌ Keyword-based | ✅ Good |
| Content extraction | ✅ Built-in | ❌ Need to fetch | ✅ Built-in |
| Find similar | ✅ Yes | ❌ No | ❌ No |
| Speed | Fast | Fast | Fast |
| Best for | Research, similarity | General queries | LLM-optimized |

**Use Exa when**: Deep research, finding similar content, quality over quantity
**Use Web Search when**: Current events, general lookups
**Use Tavily when**: Quick LLM-ready answers

---

## Troubleshooting

### "No results found"
- Try broader query
- Remove domain filters
- Use `type: "auto"` instead of `"neural"`

### "Content not available"
- Some sites block scraping
- Try different results
- Use `highlights` instead of full `text`

### "Rate limit exceeded"
- Check your plan limits
- Reduce `numResults`
- Cache results

---

## Example: Complete Research Session

```javascript
// Research OAuth implementation for a project

// 1. Initial search
const authResults = await exa_search_and_contents({
  query: "OAuth 2.0 PKCE implementation Node.js",
  numResults: 10,
  text: true,
  includeDomains: ["auth0.com", "oauth.net", "developer.okta.com"]
})

// 2. Find similar to best result
const similar = await exa_find_similar({
  url: authResults.results[0].url,
  numResults: 5
})

// 3. Get recent security advisories
const security = await exa_search({
  query: "OAuth security vulnerabilities 2024",
  numResults: 5,
  category: "news",
  startPublishedDate: "2024-01-01"
})

// 4. Compile research summary
const summary = `
## OAuth Research Summary

### Best Practices (from ${authResults.results.length} sources)
${authResults.results.map(r => `- [${r.title}](${r.url})`).join('\n')}

### Similar Resources
${similar.results.map(r => `- [${r.title}](${r.url})`).join('\n')}

### Recent Security Updates
${security.results.map(r => `- [${r.title}](${r.url})`).join('\n')}
`

// 5. Add to task
// bd update <task-id> --add-note "Research completed:\n${summary}"
```

---

*Skill Version: 1.0.0*
*Last Updated: December 2025*
