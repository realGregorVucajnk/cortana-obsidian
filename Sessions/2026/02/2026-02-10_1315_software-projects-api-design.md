---
date: 2026-02-10
time: "13:15"
type: session
domain: work
status: completed
tags:
  - cortana-session
  - planning
summary: "Designed REST API schema for Software Projects internal tool with RBAC and audit logging"
project: "Software-Projects"
model: claude-opus-4-6
duration_minutes: 105
isc_satisfied: 7
isc_total: 8
---

# Software Projects API Design

## Context

Software-Projects is an internal tool for tracking project health, deployments, and team ownership across the org. The current version is a spreadsheet-based system that's become unmaintainable. This session designed the REST API that will power the replacement web app.

## API Design

### Resource Model

```
/api/v1/projects
  ├── GET    /                    List projects (paginated, filterable)
  ├── POST   /                    Create project
  ├── GET    /:id                 Get project details
  ├── PATCH  /:id                 Update project
  ├── DELETE /:id                 Archive project (soft delete)
  │
  ├── GET    /:id/deployments     List deployments
  ├── POST   /:id/deployments     Record deployment
  │
  ├── GET    /:id/health          Health check summary
  └── GET    /:id/audit           Audit log for project

/api/v1/teams
  ├── GET    /                    List teams
  ├── GET    /:id/projects        Projects owned by team
  └── PATCH  /:id                 Update team metadata

/api/v1/search
  └── GET    /?q=                 Full-text search across projects
```

### RBAC Model

| Role | Can View | Can Edit | Can Delete | Can Admin |
|------|----------|----------|------------|-----------|
| viewer | All projects | None | None | None |
| editor | All projects | Own team's projects | None | None |
| admin | All projects | All projects | Archive only | User management |

### Audit Logging

Every mutation (POST, PATCH, DELETE) creates an audit log entry:

```json
{
  "timestamp": "2026-02-10T13:15:00Z",
  "actor": "gregor@company.com",
  "action": "project.update",
  "resource_id": "proj_abc123",
  "changes": { "status": ["active", "maintenance"] },
  "ip": "10.0.1.42"
}
```

Audit logs are append-only and queryable via `/api/v1/projects/:id/audit`.

## Technology Choices

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Runtime | Go + Chi router | Team expertise, low latency, single binary deploy |
| Database | PostgreSQL 16 | JSONB for flexible metadata, strong RBAC support |
| Auth | OIDC via company SSO | No custom auth, token-based API access |
| Search | pg_trgm + GIN index | Good enough for ~500 projects, avoid ElasticSearch complexity |

## Action Items

- [ ] Write OpenAPI 3.1 spec from this design
- [ ] Create Go project scaffold with Chi router and sqlc
- [ ] Design the database schema (projects, teams, deployments, audit_log tables)
- [ ] Get sign-off from platform team on RBAC model

## Related Notes

- [[2026-02-10_1402_newcomer-documentation]] — Same documentation-first approach applied to a different project
