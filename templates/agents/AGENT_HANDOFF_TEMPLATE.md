# Agent Handoff Protocol Template

> This template defines the standard handoff protocol section that should be included in all spawnable agent definitions to support the multi-agent orchestration workflow.

---

## HANDOFF DATA REPORTING PROTOCOL

### Overview

When working under pm-lead orchestration, you must report structured HandoffData upon task completion. This enables seamless context transfer between agents and maintains project state in Task Master.

### Task Completion Reporting

Report comprehensive HandoffData when completing work:

```typescript
// Structure your task completion summary in this format
interface HandoffData {
  // Task identification
  taskId: string;                    // Task Master task ID (e.g., "1.2")
  taskTitle: string;                 // Human-readable title

  // Execution context
  agent: string;                     // Your agent identifier
  status: 'completed' | 'blocked' | 'needs-review' | 'failed';

  // Work summary
  summary: string;                   // Brief description of what was done
  filesModified: string[];           // List of files changed
  filesCreated: string[];            // List of files created

  // Technical details
  decisions: Array<{
    description: string;             // What was decided
    rationale: string;               // Why this approach
    alternatives?: string[];         // Other options considered
  }>;

  // Dependencies and blockers
  dependencies?: {
    resolved: string[];              // Dependencies that were resolved
    remaining: string[];             // Still-blocked dependencies
  };

  // Next steps
  recommendations?: string[];        // Suggested follow-up actions
  warnings?: string[];               // Issues or concerns to address

  // Context for next agent
  contextForNext?: {
    keyPatterns: string[];           // Important code patterns used
    integrationPoints: string[];     // Where this connects to other code
    testCoverage?: string;           // Testing status
  };
}
```

### Example HandoffData

```json
{
  "taskId": "3.2",
  "taskTitle": "Implement user authentication API",
  "agent": "backend-dev",
  "status": "completed",
  "summary": "Implemented JWT-based authentication with refresh tokens",
  "filesModified": [
    "src/routes/auth.ts",
    "src/middleware/auth.ts"
  ],
  "filesCreated": [
    "src/utils/jwt.ts",
    "src/types/auth.ts"
  ],
  "decisions": [
    {
      "description": "Used RS256 algorithm for JWT signing",
      "rationale": "Better security for distributed systems, allows public key verification",
      "alternatives": ["HS256 (simpler but shared secret)", "EdDSA (newer, less library support)"]
    }
  ],
  "recommendations": [
    "Add rate limiting to auth endpoints",
    "Implement password reset flow"
  ],
  "contextForNext": {
    "keyPatterns": ["AuthMiddleware usage", "JWT utility functions"],
    "integrationPoints": ["User model", "Session storage"],
    "testCoverage": "Unit tests added, integration tests pending"
  }
}
```

### Reporting Mechanism

Use Task Master's update_subtask tool to log HandoffData:

```javascript
// Log your handoff data to Task Master
mcp__task-master-ai__update_subtask({
  id: "{taskId}",
  prompt: JSON.stringify(handoffData, null, 2),
  projectRoot: process.cwd()
});

// Then mark the task complete
mcp__task-master-ai__set_task_status({
  id: "{taskId}",
  status: "done",
  projectRoot: process.cwd()
});
```

### Files Modified Tracking

When reporting filesModified and filesCreated:
- List ALL files created or modified during the task
- Use relative paths from project root (e.g., `src/components/Login.tsx`)
- Include configuration files (package.json, tsconfig.json, etc.) if changed
- Include test files that were added or modified
- Include documentation files if updated

### Decision Documentation

For each significant decision made:
- **Architectural decisions**: Framework choices, design patterns, component structure
- **Technical trade-offs**: Performance vs simplicity, security vs usability
- **Library selections**: Why one library over another
- **Implementation approaches**: Data flow, state management strategies

Always explain rationale and list alternatives that were considered.

### Test Hints for test-engineer

If your work requires testing (it usually does), provide:

```typescript
contextForNext: {
  keyPatterns: [
    "How to use the new utility functions",
    "Expected input/output formats",
    "Error handling patterns"
  ],
  integrationPoints: [
    "External API endpoints called",
    "Database tables/schemas affected",
    "Events emitted or consumed"
  ],
  testCoverage: "Unit tests added for utils, integration tests pending for API"
}
```

### Completion Signal to pm-lead

When finished with your task:

1. **Format your HandoffData** as a JSON code block in your response:
   ```
   ### HandoffData
   \`\`\`json
   { ... your handoff data ... }
   \`\`\`
   ```

2. **Update task status** in Task Master:
   ```javascript
   mcp__task-master-ai__set_task_status({
     id: taskId,
     status: "done",
     projectRoot: process.cwd()
   });
   ```

3. **pm-lead monitors** for task completion and retrieves your HandoffData to pass context to the next agent.

### Handling Blockers

If you encounter a blocker that prevents task completion:

1. Set status to `'blocked'` in HandoffData
2. Document the blocker in the `blockers` field:
   ```json
   {
     "status": "blocked",
     "dependencies": {
       "remaining": ["Waiting for API endpoint from backend-dev"]
     },
     "warnings": ["Cannot proceed without authentication API"]
   }
   ```
3. Use `mcp__task-master-ai__set_task_status` with status `'blocked'`
4. pm-lead will handle escalation or re-sequencing

### Review Request

If your work needs code review before completion:

1. Set status to `'needs-review'` in HandoffData
2. List specific areas for review in recommendations:
   ```json
   {
     "status": "needs-review",
     "recommendations": [
       "Review security implications of token storage",
       "Verify error handling covers edge cases"
     ]
   }
   ```
3. pm-lead will spawn code-reviewer agent with your HandoffData context

---

*A.E.S - Bizzy Agent - Multi-Agent Orchestration Protocol v1*
