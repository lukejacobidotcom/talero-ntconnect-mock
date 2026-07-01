# Pieces Commands

Use these commands in any serious Codex chat when prior context might matter. The default time window is the last 7 days unless you specify another window.

## Core Commands

| Command | Use When | Codex Should Do |
| --- | --- | --- |
| `pieces:context` | Starting serious work or resuming a project | Query Pieces for the last 7 days of relevant project/topic context, then verify against the repo or live system. |
| `pieces:context project=<name> window=<range>` | You know the project and date range | Query that scope explicitly, then summarize only durable task-relevant context. |
| `pieces:now` | Mid-chat, before continuing | Ask Pieces what else is relevant now and adjust the plan if needed. |
| `pieces:debug` | A command, build, deployment, or integration is failing | Retrieve prior errors, commands, fixes, and known failure modes for this project/tool. |
| `pieces:comms person=<name> topic=<topic>` | Drafting Slack, email, handoff, or status updates | Retrieve tone, commitments, prior decisions, and thread context without copying raw private messages. |
| `pieces:finance topic=<topic>` | Working on futures, stocks, market data, MCP finance tooling, or broker/connectors | Retrieve prior research trails, source notes, signal hypotheses, compliance caveats, and tool evaluations. |
| `pieces:thread thread=<id-or-name>` | Updating a specific existing Codex chat | Read the target thread, query Pieces for its project/topic, then send a scoped context brief. |
| `pieces:checkpoint outcome=<summary>` | Meaningful work just completed | Create a Pieces memory with project path, files changed, outcome, verification, caveats, and next action. |
| `pieces:promote-week` | Weekly cleanup or user-requested refresh | Query the last 7 days across active projects and promote only safe durable context into Codex/project docs. |
| `pieces:health` | Pieces seems missing or Codex cannot call it | Run the local health check and report whether the endpoint and important tools are available. |

## Canonical Prompt

```text
Use Pieces to find what else is relevant now for [project/topic/thread] from the last 7 days. Focus on decisions, files, workflows, communication context, source links, known failures, commands, verification, and next steps. Do not return raw private captures, credentials, or client/student data. Distill only what should affect this task.
```

## Follow-Up Prompts

```text
Narrow that to [app/source/person/file] and only include context that changes what we should do next.
```

```text
Find prior failures or commands related to [tool/error/workflow] and summarize the fix path, verification, and caveats.
```

```text
Create a safe Pieces checkpoint for this completed work. Include the project path, files changed, outcome, verification, caveats, and next recommended action. Exclude secrets and raw private records.
```

## Safety Boundary

Pieces can contain raw captures, private messages, clipboard content, screenshots, and sensitive data. Codex should use Pieces for distilled context, not bulk copying. Promote only durable, safe, task-relevant memory into `AGENTS.md`, `TASKS.md`, decision logs, Codex memory notes, or chat updates.
