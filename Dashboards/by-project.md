---
date: 2026-02-09
type: dashboard
domain: personal
status: active
tags: []
summary: "Sessions grouped by project"
---

# Projects Dashboard

## Sessions by Project

```dataview
TABLE
  length(rows) AS "Sessions",
  min(rows.date) AS "First",
  max(rows.date) AS "Last",
  rows.domain[0] AS "Domain"
FROM "Sessions"
WHERE type = "session" AND project != null AND project != ""
GROUP BY project
SORT length(rows) DESC
```

## Active Projects (Recent Activity)

```dataview
TABLE
  length(rows) AS "Sessions",
  max(rows.date) AS "Last Active"
FROM "Sessions"
WHERE type = "session" AND project != null AND project != "" AND date >= date(today) - dur(30 days)
GROUP BY project
SORT max(rows.date) DESC
```

## Project Detail Lists

### Work Projects

```dataview
TABLE
  date AS "Date",
  summary AS "Summary",
  status AS "Status"
FROM "Sessions"
WHERE type = "session" AND domain = "work" AND project != null AND project != ""
SORT project ASC, date DESC
```

### Personal Projects

```dataview
TABLE
  date AS "Date",
  summary AS "Summary",
  status AS "Status"
FROM "Sessions"
WHERE type = "session" AND domain = "personal" AND project != null AND project != ""
SORT project ASC, date DESC
```

### Open Source Projects

```dataview
TABLE
  date AS "Date",
  summary AS "Summary",
  status AS "Status"
FROM "Sessions"
WHERE type = "session" AND domain = "opensource" AND project != null AND project != ""
SORT project ASC, date DESC
```

## Decisions by Project

```dataview
TABLE
  date AS "Date",
  summary AS "Summary"
FROM "Knowledge/decisions"
WHERE project != null AND project != ""
GROUP BY project
SORT key ASC
```
