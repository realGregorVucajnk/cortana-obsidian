---
date: 2026-02-09
type: dashboard
domain: personal
status: active
tags: []
summary: "Weekly session summaries and statistics"
---

# Weekly Digest

## This Week's Sessions

```dataview
TABLE
  date AS "Date",
  time AS "Time",
  domain AS "Domain",
  project AS "Project",
  summary AS "Summary"
FROM "Sessions"
WHERE type = "session" AND date >= date(today) - dur(7 days)
SORT date DESC, time DESC
```

## Weekly Stats

```dataview
TABLE
  length(rows) AS "Sessions",
  length(filter(rows, (r) => r.domain = "work")) AS "Work",
  length(filter(rows, (r) => r.domain = "personal")) AS "Personal",
  length(filter(rows, (r) => r.domain = "opensource")) AS "OSS"
FROM "Sessions"
WHERE type = "session"
GROUP BY dateformat(date, "yyyy-'W'WW") AS "Week"
SORT key DESC
LIMIT 12
```

## Recent Knowledge Captured

```dataview
TABLE
  date AS "Date",
  type AS "Type",
  domain AS "Domain",
  summary AS "Summary"
FROM "Knowledge"
WHERE date >= date(today) - dur(7 days)
SORT date DESC
```

## By Domain (This Week)

### Work

```dataview
LIST summary
FROM "Sessions"
WHERE type = "session" AND domain = "work" AND date >= date(today) - dur(7 days)
SORT date DESC
```

### Personal

```dataview
LIST summary
FROM "Sessions"
WHERE type = "session" AND domain = "personal" AND date >= date(today) - dur(7 days)
SORT date DESC
```

### Open Source

```dataview
LIST summary
FROM "Sessions"
WHERE type = "session" AND domain = "opensource" AND date >= date(today) - dur(7 days)
SORT date DESC
```
