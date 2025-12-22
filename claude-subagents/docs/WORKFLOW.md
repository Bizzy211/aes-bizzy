# Multi-Agent Workflow Patterns

Coordination patterns for multi-agent development.

## Sequential Pipeline

Tasks flow through agents in sequence:

```
PM-Lead → Backend-Dev → Frontend-Dev → Test-Engineer → Devops-Engineer
```

1. PM creates feature task with subtasks
2. Backend implements API
3. Frontend implements UI (depends on API)
4. Test-Engineer validates
5. DevOps deploys

## Parallel Development

Multiple agents work simultaneously:

```
         ┌─ Backend-Dev ──┐
PM-Lead ─┼─ Frontend-Dev ─┼─ Test-Engineer → DevOps
         └─ DB-Architect ─┘
```

## Code Review Flow

```
[Any Agent] → Code-Reviewer → [Fixes] → Merge
```

## Debugging Flow

```
[Error Detected] → Debugger → [Fix Applied] → Test-Engineer
```

## Hook Integration

Hooks automate workflow transitions:

```python
# hooks/agent-handoff.py
def on_task_complete(task_id, agent):
    # Notify next agent in pipeline
    next_agent = get_dependent_agent(task_id)
    if next_agent:
        notify_agent(next_agent, task_id)
```

## Best Practices

1. **Clear Dependencies**: Use `--deps` to establish task order
2. **Status Updates**: Agents update status on transitions
3. **Handoff Notes**: Include context when completing tasks
4. **Parallel When Possible**: Independent tasks run concurrently
