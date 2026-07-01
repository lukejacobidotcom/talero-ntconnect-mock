# Pieces Workflow

Pieces is the local long-term memory layer for this project. Codex should use it to recover prior work, communication context, source links, decisions, and handoff details before doing serious work. Pieces augments the existing Codex memory, `AGENTS.md`, `TASKS.md`, and project docs; it does not replace them. The repo, connected systems, and verified live data remain the source of truth.

## Default Chat-Start Ritual

For every new chat, existing chat, and serious task, first decide whether prior context could matter. If yes, query Pieces before planning, editing, replying, or sending a handoff. Serious work includes coding, debugging, data/reporting, automations, external communication, finance/tooling research, architecture, and project handoff.

Default to the last 7 days unless the user gives another window. Use a prompt shaped like:

```text
Use Pieces to find what else is relevant now for [project/topic/thread] from the last 7 days. Focus on decisions, files, workflows, communication context, source links, known failures, commands, verification, and next steps. Do not return raw private captures, credentials, or client/student data. Distill only what should affect this task.
```

Then inspect the repo and verify current state. Do not rely on Pieces alone.

## Mid-Chat Context Pulls

Codex should query Pieces again in the middle of a chat when new context might materially change the answer. Good triggers:

- The user says `pieces:context`, `pieces:now`, `what else does Pieces know`, or similar.
- Work moves to a different repo, person, project, finance instrument, source, or date window.
- Debugging stalls and prior commands, errors, or workarounds might exist.
- External communication needs stakeholder tone, prior commitments, or thread history.
- A handoff, release, report, automation, monitor, or project decision is about to be created.
- Codex notices missing background that Pieces is likely to have.

When Codex self-triggers a Pieces lookup, say briefly why, then continue.

## Command Reference

Use `docs/pieces-commands.md` as the command sheet. The most common commands are:

- `pieces:context` - pull relevant project context, defaulting to the last 7 days.
- `pieces:now` - ask what else is relevant right now before continuing.
- `pieces:debug` - retrieve prior errors, commands, scripts, and fixes.
- `pieces:comms` - retrieve communication context and tone before drafting.
- `pieces:finance` - retrieve futures-first or market-data tooling context.
- `pieces:checkpoint` - create a durable Pieces memory after meaningful work.
- `pieces:promote-week` - run the weekly 7-day promotion pass.
- `pieces:health` - verify the local MCP endpoint and important tools.

## Verified Connection

Last verified: 2026-06-30.

- MCP endpoint: `http://localhost:39300/model_context_protocol/2025-03-26/mcp`
- Health-check script: `scripts/pieces-health-check.ps1`
- Expected important tools include memory query/search, checkpoint creation, and web/search helpers.
- If native `mcp__pieces.*` tools are not exposed in Codex, treat that as a Codex session/tool-binding issue, not proof that PiecesOS is down. Run the health check and, when needed, use the direct MCP endpoint workflow.

## Use Existing Pieces Memory

Assume Pieces already contains extensive useful history. Search it before acting when context may exist, especially for:

- Prior project decisions and discarded approaches.
- Previous commands, scripts, errors, and verification outputs.
- Communication context and draft tone for Slack, email, reports, or handoffs.
- Browser research, source links, and data provenance.
- Finance/tooling research, MCP connector notes, dataset notes, and agent workflow ideas.
- Automation behavior, run windows, safety gates, and failure modes.

If Pieces returns `fetchMore` or a cursor and the answer is still thin, fetch another page. Prefer summaries and annotations for high-level recall; use raw events only when exact screen, clipboard, timestamp, app, or URL detail is necessary and safe.

## Web-Informed Query Pattern

Current Pieces guidance and community examples point to the same practical pattern:

- Combine time, source/app, topic, activity, and people when possible.
- Start with natural questions, then tighten the prompt if results are vague.
- Use Pieces MCP to retrieve context first, then let the agent apply it to files or workflows.
- Use summaries, Workstream Activity, and custom summary templates for routine reviews.
- Keep capture controls and app deny lists in mind for sensitive work.
- Watch token cost and relevance; query Pieces when it can change the outcome, not for every trivial reply.

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

Codex should create a Pieces memory when a task produces durable future value, including:

- A meaningful code or workflow change.
- A project decision or architecture choice.
- A successful deployment, verification run, or bug fix.
- A new automation, monitor, recurring process, or safety gate.
- A useful research synthesis or source map.
- A handoff package or next-step plan.

The memory should include project path, files changed, decision or outcome, verification, known caveats, and the next recommended action. Do not include secrets or raw private records.

If the Pieces tool binding is unavailable but the work should be remembered, create a Codex memory update note and tell Luke that the Pieces checkpoint could not be written from this session.

## Weekly Memory Promotion

Once a week, or when the user asks for a refresh, run a memory promotion pass:

1. Query Pieces for the last 7 days across active projects.
2. Extract stable preferences, reusable workflows, project decisions, known failure modes, and active priorities.
3. Update Codex memory notes, `AGENTS.md`, `TASKS.md`, and decision logs only where the information is durable and safe.
4. Create a Pieces checkpoint summarizing what was promoted.

## Specific Chat Updates

Only update specific Codex chats when the user names the target thread or provides a thread ID. Read the target thread first, then send a short context update scoped to that thread.

Every chat update should include:

- Retrieval date.
- Source scope, such as Pieces LTM, this repo, or a named project.
- Privacy boundary, such as "raw captured content was not copied."

Do not broadcast raw Pieces context into arbitrary chats.

## Finance And Tooling Angle

Use Pieces to make finance and tooling work cumulative. For futures-first retail investing and later stocks, Pieces should preserve research trails, market-data source notes, signal hypotheses, MCP connector evaluations, compliance caveats, agent workflow lessons, and prior tool failures. Codex should turn those memories into vetted schemas, scripts, dashboards, monitors, alerts, source maps, and decision logs.
