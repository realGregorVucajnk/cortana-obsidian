---
date: 2026-02-09
type: dashboard
domain: personal
status: active
tags: []
summary: "All decisions in chronological order"
---

# Decisions Dashboard

## All Decisions

```dataview
TABLE
  date AS "Date",
  domain AS "Domain",
  summary AS "Summary",
  status AS "Status"
FROM "Knowledge/decisions"
WHERE type = "decision"
SORT date DESC
```

## By Domain

### Work Decisions

```dataview
TABLE date AS "Date", summary AS "Summary", status AS "Status"
FROM "Knowledge/decisions"
WHERE type = "decision" AND domain = "work"
SORT date DESC
```

### Personal Decisions

```dataview
TABLE date AS "Date", summary AS "Summary", status AS "Status"
FROM "Knowledge/decisions"
WHERE type = "decision" AND domain = "personal"
SORT date DESC
```

### Open Source Decisions

```dataview
TABLE date AS "Date", summary AS "Summary", status AS "Status"
FROM "Knowledge/decisions"
WHERE type = "decision" AND domain = "opensource"
SORT date DESC
```

## Active vs Archived

### Active Decisions

```dataview
TABLE date AS "Date", domain AS "Domain", summary AS "Summary"
FROM "Knowledge/decisions"
WHERE type = "decision" AND status = "active"
SORT date DESC
```

### Archived Decisions

```dataview
TABLE date AS "Date", domain AS "Domain", summary AS "Summary"
FROM "Knowledge/decisions"
WHERE type = "decision" AND status = "archived"
SORT date DESC
```
