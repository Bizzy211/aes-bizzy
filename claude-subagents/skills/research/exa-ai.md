# Exa AI - Web Search and Code Context

Exa AI skill for real-time web search and code context retrieval using the Exa MCP tools.

## Overview

Exa provides AI-optimized web search and code context gathering, ideal for research-backed development and staying current with best practices.

## Core Tools

### Web Search

```javascript
// General web search
mcp__exa__web_search_exa({
  query: "Next.js 15 app router best practices 2024",
  numResults: 8,
  type: "auto"  // auto, fast, or deep
})

// Fast search for quick results
mcp__exa__web_search_exa({
  query: "React useState hook",
  type: "fast",
  numResults: 5
})

// Deep search for comprehensive results
mcp__exa__web_search_exa({
  query: "microservices architecture patterns",
  type: "deep",
  numResults: 10
})
```

### Code Context

```javascript
// Get code examples and documentation
mcp__exa__get_code_context_exa({
  query: "Express.js middleware authentication JWT",
  tokensNum: 5000  // 1000-50000, default 5000
})

// Framework-specific patterns
mcp__exa__get_code_context_exa({
  query: "Prisma database migrations PostgreSQL",
  tokensNum: 10000
})

// API integration examples
mcp__exa__get_code_context_exa({
  query: "Stripe payment integration Node.js",
  tokensNum: 8000
})
```

## Beads Integration

### Track Research Tasks

```bash
# Create research task
bd create "Research authentication best practices" --assign meta-agent

# Log research findings
bd update TASK_ID --add-note "Found 8 relevant articles on JWT vs session auth"

# Store key findings
bd update TASK_ID --add-note "Key insight: Use refresh tokens with short-lived access tokens"
```

### Research-to-Implementation Workflow

```bash
# 1. Create research task
bd create "Research GraphQL subscriptions" --assign integration-expert

# 2. Perform research (agent uses exa-ai skill)
# mcp__exa__web_search_exa + mcp__exa__get_code_context_exa

# 3. Log findings
bd update TASK_ID --add-note "Apollo Server subscriptions require websocket setup"

# 4. Create implementation task from research
bd create "Implement GraphQL subscriptions" --assign backend-dev \
  --depends-on RESEARCH_TASK_ID

# 5. Complete research task
bd set-status TASK_ID done
```

## Cross-References

### Related Agents
- **meta-agent**: Uses for agent creation research
- **backend-dev**: Uses for API best practices
- **frontend-dev**: Uses for UI framework patterns
- **integration-expert**: Uses for API integration research

### Related Skills
- **ref-tools**: Complementary documentation search
- **agent-creator**: Uses research for agent generation

### Related Hooks
- **post_tool_use.py**: Logs research tool usage

## Search Strategies

### Technology Research

```javascript
// Current best practices
mcp__exa__web_search_exa({
  query: "TypeScript 5.x new features best practices 2024",
  type: "deep"
})

// Framework comparisons
mcp__exa__web_search_exa({
  query: "React vs Vue vs Svelte performance comparison 2024",
  type: "auto"
})
```

### Error Resolution

```javascript
// Debug specific errors
mcp__exa__web_search_exa({
  query: "PostgreSQL connection pool exhausted error fix",
  type: "fast"
})

// Stack trace research
mcp__exa__get_code_context_exa({
  query: "Node.js ECONNRESET socket hang up solution",
  tokensNum: 5000
})
```

### Architecture Patterns

```javascript
// System design patterns
mcp__exa__web_search_exa({
  query: "event-driven architecture microservices patterns",
  type: "deep",
  numResults: 10
})

// Implementation examples
mcp__exa__get_code_context_exa({
  query: "CQRS event sourcing implementation Node.js",
  tokensNum: 15000
})
```

## Output Processing

### Extracting Key Information

```python
# Parse search results for key insights
results = mcp__exa__web_search_exa(query)

# Extract titles and URLs for reference
for result in results:
    title = result.get("title")
    url = result.get("url")
    snippet = result.get("text", "")[:200]

    # Log to Beads
    bd_update(task_id, f"Source: {title}\nURL: {url}\nKey: {snippet}")
```

### Code Context Integration

```python
# Get code examples
context = mcp__exa__get_code_context_exa({
    "query": "React custom hooks patterns",
    "tokensNum": 5000
})

# Apply patterns to implementation
# Context includes real code examples that can be adapted
```

## Best Practices

1. **Use appropriate search type** - Fast for quick lookups, deep for research
2. **Adjust token count** - Higher for complex topics, lower for simple lookups
3. **Log findings to Beads** - Create audit trail of research
4. **Combine with ref-tools** - Get both web and documentation context
5. **Specify year in queries** - Get current, relevant results
6. **Include technology names** - Be specific about frameworks/languages

## Rate Limiting

Exa has usage limits. Use efficiently:

```javascript
// Batch related queries
const queries = [
  "React hooks patterns",
  "React context best practices",
  "React performance optimization"
];

// Space out requests if needed
for (const query of queries) {
  await mcp__exa__web_search_exa({ query, type: "fast" });
  // Brief delay between calls
}
```

---

*A.E.S - Bizzy Skill - Exa AI Research v1.0.0*
