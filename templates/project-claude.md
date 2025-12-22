# {{PROJECT_NAME}} - Claude Instructions

## Project Overview

{{PROJECT_DESCRIPTION}}

**Template:** {{TEMPLATE}}
**Created:** {{CREATED_DATE}}

## Technology Stack

{{#if template.web}}
- **Frontend:** React, Next.js, TypeScript
- **Styling:** Tailwind CSS
- **State:** Zustand/React Query
{{/if}}

{{#if template.api}}
- **Backend:** Node.js, Express/Fastify
- **Database:** PostgreSQL with Supabase
- **ORM:** Prisma
{{/if}}

{{#if template.fullstack}}
- **Frontend:** React, Next.js, TypeScript
- **Backend:** API Routes / Server Actions
- **Database:** PostgreSQL with Supabase
- **Auth:** NextAuth.js / Supabase Auth
{{/if}}

## Project Structure

```
{{PROJECT_NAME}}/
├── src/
│   ├── app/            # Next.js app directory (if applicable)
│   ├── components/     # React components
│   ├── lib/            # Utilities and helpers
│   ├── hooks/          # Custom React hooks
│   ├── types/          # TypeScript types
│   └── api/            # API routes
├── tests/              # Test files
├── public/             # Static assets
└── docs/               # Documentation
```

## Coding Standards

### TypeScript

- Enable strict mode
- Define explicit types for all functions
- Use interfaces for object shapes
- Avoid `any` type

### React Patterns

- Use functional components with hooks
- Keep components focused and small
- Extract reusable logic into custom hooks
- Use proper prop typing

### API Design

- RESTful endpoints
- Consistent error responses
- Input validation
- Rate limiting where appropriate

## Task Management

{{#if taskmaster}}
### Task Master Integration

```bash
# List tasks
task-master list

# Get next task
task-master next

# Complete a task
task-master set-status --id=<id> --status=done
```
{{/if}}

## Testing

### Commands

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test
npm test -- path/to/test.ts
```

### Guidelines

- Write tests for new features
- Test edge cases
- Mock external services
- Maintain >80% coverage

## Environment Setup

### Required Environment Variables

```bash
# .env.local
DATABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Git Workflow

### Commit Messages

```
feat(component): add user profile page
fix(api): handle null values in response
docs: update API documentation
```

### Branches

- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - New features
- `fix/*` - Bug fixes

## Deployment

{{#if github}}
### GitHub Actions

CI/CD is configured via GitHub Actions:
- Tests run on every PR
- Deployments trigger on main branch merges
{{/if}}

## Quality Checklist

Before completing work:

- [ ] Code compiles without errors
- [ ] All tests pass
- [ ] Types are correct
- [ ] Code is formatted
- [ ] Documentation updated
- [ ] Changes committed with proper message

## Resources

- [Project README](./README.md)
- [API Documentation](./docs/api.md)
- [Component Library](./docs/components.md)

---

*Created with Claude Ecosystem CLI*
