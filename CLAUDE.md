<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **3D-Reporter** (171 symbols, 208 relationships, 0 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/3D-Reporter/context` | Codebase overview, check index freshness |
| `gitnexus://repo/3D-Reporter/clusters` | All functional areas |
| `gitnexus://repo/3D-Reporter/processes` | All execution flows |
| `gitnexus://repo/3D-Reporter/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |
| Work in the Api area (9 symbols) | `.claude/skills/generated/api/SKILL.md` |
| Work in the Backend area (4 symbols) | `.claude/skills/generated/backend/SKILL.md` |
| Work in the Cluster_5 area (3 symbols) | `.claude/skills/generated/cluster-5/SKILL.md` |

<!-- gitnexus:end -->

## Mandatory Protocols

### 1. Error Resolution Protocol

Before proposing a fix for any error or bug, first consult `Docs/Incident_Log.md` and `Docs/KNOWN_ERRORS.md` to check for existing patterns or prior occurrences. Ensure the solution prevents recurrence. After resolving the error, collect relevant diagnostic information and update `Docs/Incident_Log.md` with a new entry following the established format (symptom, root cause, resolution, files affected).

### 2. Knowledge Base Maintenance

Immediately following any successful error resolution, update `Docs/KNOWN_ERRORS.md` with the root cause and applied solution. If a matching category already exists, extend it; otherwise, create a new category that captures the pattern for future prevention.

### 3. Implementation Tracking

Upon successful completion of any new feature or functional implementation, update `Docs/Implementation_Log.md` to document the changes made, the files affected, and the rationale behind key decisions.

### 4. Business Logic Extraction

When processing user prompts, detect and extract business logic, domain rules, and core ideas — including constraints, workflows, validation rules, status transitions, risk calculations, or any domain-specific terminology and reasoning. Whenever such information is identified, append it to `Docs/Business-Logic.md` under a dated entry. Record the source context (feature request, bug fix, design discussion), the logic in plain language, and which part of the system it affects.
