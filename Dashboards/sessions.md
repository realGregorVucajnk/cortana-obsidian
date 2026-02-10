---
date: 2026-02-09
type: dashboard
domain: personal
status: active
tags: []
summary: "Recent sessions sorted by date"
---

# Sessions Dashboard

## Recent Sessions

```dataview
TABLE
  date AS "Date",
  time AS "Time",
  domain AS "Domain",
  project AS "Project",
  summary AS "Summary",
  status AS "Status"
FROM "Sessions"
WHERE type = "session"
SORT date DESC, time DESC
LIMIT 50
```

## By Domain

### Work Sessions

```dataview
TABLE date AS "Date", summary AS "Summary", project AS "Project"
FROM "Sessions"
WHERE type = "session" AND domain = "work"
SORT date DESC
LIMIT 20
```

### Personal Sessions

```dataview
TABLE date AS "Date", summary AS "Summary", project AS "Project"
FROM "Sessions"
WHERE type = "session" AND domain = "personal"
SORT date DESC
LIMIT 20
```

### Open Source Sessions

```dataview
TABLE date AS "Date", summary AS "Summary", project AS "Project"
FROM "Sessions"
WHERE type = "session" AND domain = "opensource"
SORT date DESC
LIMIT 20
```

## By Type

```dataview
TABLE
  date AS "Date",
  domain AS "Domain",
  summary AS "Summary"
FROM "Sessions"
WHERE type = "session"
GROUP BY choice(contains(tags, "research"), "Research",
  choice(contains(tags, "implementation"), "Implementation",
  choice(contains(tags, "debugging"), "Debugging",
  choice(contains(tags, "planning"), "Planning",
  choice(contains(tags, "review"), "Review", "Other")))))
SORT date DESC
```

## By Project

```dataview
TABLE
  length(rows) AS "Session Count",
  min(rows.date) AS "First Session",
  max(rows.date) AS "Last Session"
FROM "Sessions"
WHERE type = "session" AND project != null AND project != ""
GROUP BY project
SORT length(rows) DESC
```
