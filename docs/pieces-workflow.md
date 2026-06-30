# Pieces Workflow

Pieces is the local long-term memory layer for this project. Codex should use it to recover prior work, communication context, source links, decisions, and handoff details before doing serious work. Codex should still treat the repo, connected systems, and verified live data as the source of truth.

## Default Ritual

For any serious work, start with a scoped Pieces context pull before planning or editing. Serious work includes coding, debugging, data/reporting, automations, external communication, finance/tooling research, architecture, and project handoff.

Use a prompt shaped like:

```text
Use Pieces to find relevant prior context for [project/topic] from [time window]. Focus on decisions, files, workflows, communication context, source links, known failures, and next steps. Do not return raw private captures, credentials, or client/student data. Distill only what should affect this task.
```

Then inspect the repo and verify current state. Do not rely on Pieces alone.

## Use Existing Pieces Memory

Assume Pieces already contains extensive useful history. Search it before acting when context may exist, especially for prior decisions, previous commands, communication context, browser research, finance/tooling research, automation behavior, run windows, safety gates, and failure modes.

If Pieces returns `fetchMore` or a cursor and the answer is still thin, fetch another page. Prefer summaries and annotations for high-level recall; use raw events only when exact screen, clipboard, or timestamp detail is necessary and safe.

## What To Promote

Promote only distilled, durable, non-sensitive context:

- `AGENTS.md`: stable project rules future agents must follow.
- `docs/decision-log.md`: dated decisions with reason and impact.
- `TASKS.md`: active follow-up work.
- Pieces memory: checkpoints after meaningful decisions, fixes, demos, or handoffs.
- Codex global memory: stable cross-project behavior explicitly requested by the user.

## What Not To Promote

Do not copy raw Pieces captures into repo docs, Codex memory, or chat updates:

- Screenshots, clipboard captures, private messages, credentials, API keys, or production logs.
- Student records, disability information, client/customer data, or real message transcripts.
- Large undifferentiated Pieces exports.

## Automatic Pieces Checkpoints

Codex should create a Pieces memory when a task produces durable future value, including meaningful code/workflow changes, decisions, successful deployments or verification runs, bug fixes, new automations or monitors, research synthesis, source maps, handoff packages, or next-step plans.

The memory should include project path, files changed, decision or outcome, verification, known caveats, and the next recommended action. Do not include secrets or raw private records.

## Weekly Memory Promotion

Once a week, or when the user asks for a refresh, run a memory promotion pass:

1. Query Pieces for the last 7 days across active projects.
2. Extract stable preferences, reusable workflows, project decisions, known failure modes, and active priorities.
3. Update Codex memory notes, `AGENTS.md`, `TASKS.md`, and decision logs only where the information is durable and safe.
4. Create a Pieces checkpoint summarizing what was promoted.

## Finance And Tooling Angle

Use Pieces to make finance and tooling work cumulative. For futures-first retail investing and later stocks, Pieces should preserve research trails, market-data source notes, signal hypotheses, MCP connector evaluations, compliance caveats, and agent workflow lessons. Codex should turn those memories into vetted schemas, scripts, dashboards, monitors, and decision logs.
