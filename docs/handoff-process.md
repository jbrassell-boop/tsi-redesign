# Claude.ai → Claude Code Handoff Process

## How It Works

1. Feature specs, business rules, and architecture decisions get hashed out in Claude.ai
2. Claude.ai outputs them as markdown following the format below
3. Joseph saves the file to `docs/<feature-name>-spec.md` and commits
4. Claude Code picks it up and builds from it

## Spec Format

- What the feature does (1-2 sentences)
- API endpoints (only NEW/undocumented ones — method, path, request/response)
- Field mappings (only NEW ones)
- Business rules and edge cases
- Decisions and rationale ("chose X over Y because Z")
- UI behavior that isn't obvious

## What NOT to include in specs

- Anything already in CLAUDE.md or memory (API endpoints, CSS vars, design standards, data model)
- Status tracking, timestamps, or metadata headers
- Implementation details — Claude Code decides how to build it

## Existing Specs

- `departments-spec.md` — department field/tab/bug spec
- `suppliers-spec.md` — supplier page spec
- `inventory-spec.md` — inventory page spec
- `design-standards.md` — CSS/layout specs
- `legacy-mapping.md` — field/workflow mapping from legacy
