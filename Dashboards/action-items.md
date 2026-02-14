---
date: 2026-02-09
type: dashboard
domain: personal
status: active
tags: []
summary: "Uncompleted tasks across all sessions"
---

# Action Items Dashboard

## Open Tasks

```dataview
TASK
FROM "Sessions"
WHERE !completed
GROUP BY file.link
SORT file.frontmatter.date DESC
```

## Open Tasks from Knowledge Notes

```dataview
TASK
FROM "Knowledge"
WHERE !completed
GROUP BY file.link
SORT file.frontmatter.date DESC
```

## By Domain

### Work Action Items

```dataview
TASK
FROM "Sessions"
WHERE !completed AND file.frontmatter.domain = "work"
GROUP BY file.link
SORT file.frontmatter.date DESC
```

### Personal Action Items

```dataview
TASK
FROM "Sessions"
WHERE !completed AND file.frontmatter.domain = "personal"
GROUP BY file.link
SORT file.frontmatter.date DESC
```

### Open Source Action Items

```dataview
TASK
FROM "Sessions"
WHERE !completed AND file.frontmatter.domain = "opensource"
GROUP BY file.link
SORT file.frontmatter.date DESC
```

## Recently Completed

```dataview
TASK
FROM "Sessions"
WHERE completed
GROUP BY file.link
SORT file.frontmatter.date DESC
LIMIT 20
```
