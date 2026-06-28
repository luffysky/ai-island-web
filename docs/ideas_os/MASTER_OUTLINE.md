# MASTER_OUTLINE.md

# Ideas OS Documentation Generation Specification

> This file is **not** a product document.
>
> It is the specification that Claude Code (or any AI coding agent) must follow to generate the complete Ideas OS documentation.

---

# Global Rules

## Goal

Generate a complete documentation system for Ideas OS.

The result must be detailed enough that a new engineer can start implementing the product without asking for high-level design clarification.

---

## Every markdown document MUST contain

- Purpose
- Overview
- Design Goals
- Core Concepts
- Business Rules
- User Flow
- Mermaid Flowchart
- Database Considerations
- API Considerations
- Permission Model
- UI Considerations
- Edge Cases
- Security
- Performance
- Future Expansion
- Implementation Notes

---

## Minimum Quality

Each document should generally be:

- at least 300 lines (preferred)
- or 8 KB+
- fully written
- independently readable

Forbidden:

- TODO
- Placeholder
- Coming Soon
- TBD
- Empty headings

---

## Required diagrams

Where appropriate include Mermaid diagrams:

- Flowchart
- Sequence
- ER Diagram
- State Diagram

---

## Required schema style

Whenever data is discussed include:

- Fields
- PK
- FK
- Index
- Constraints
- RLS
- Migration notes

---

# Documentation Structure

## 00_LOCKED_DECISIONS.md

Write all immutable product decisions.

Must include:

- Workspace
- Ownership
- Roles
- AI
- Memory
- Workflow
- Marketplace
- Z Coin
- Dust
- Creator Island
- Future Islands
- Admin boundary
- Work vs Blog

---

## 01_IDEAS_OS_SPEC.md

Explain:

- What Ideas OS is
- Why it exists
- Problems it solves
- Philosophy
- Four Engines
- Six Domains
- Asset lifecycle
- Business lifecycle
- Future Islands

Compare with:

- ChatGPT
- Notion
- Obsidian
- Cursor
- GitHub

---

## 02_CREATOR_ISLAND_PRD.md

Include:

- Personas
- Dashboard
- Navigation
- Workspace
- Studio
- Fragment Library
- Work Library
- Work Editor
- AI Actions
- Marketplace
- Community
- Growth
- Onboarding
- MVP
- Future
- Metrics
- Error UX

---

## 03_SYSTEM_ARCHITECTURE.md

Include:

- Overall Architecture
- Services
- Shared Services
- AI Layer
- Search
- Storage
- Database
- Queue
- Cache
- Logging
- Monitoring
- Deployment
- Scalability

---

## 04_ASSET_SYSTEM.md

Include:

- Asset Types
- Fragment
- Work
- Package
- Workflow
- Knowledge
- Character
- Media
- Ownership
- Version
- Snapshot
- Fork
- Clone
- Merge
- Split
- Remix
- Archive
- Restore
- Recommendation
- Analytics

---

## 05_AI_SYSTEM.md

Include:

- Agent Registry
- Agent Capability
- Prompt Composer
- Prompt Builder
- Model Router
- Cost Manager
- Tool Calling
- Memory Injection
- Agent Runs
- Retry
- Evaluation
- Queue

Document every agent:

- Purpose
- Input
- Output
- Prompt
- Schema

---

## 06_MEMORY_SYSTEM.md

Include:

- Personal Memory
- Workspace Memory
- Project Memory
- Session Memory
- Candidate
- Confirm
- Reject
- Merge
- Conflict
- Timeline
- Version
- Confidence
- Retrieval
- Injection
- Embedding
- Cleanup

---

## 07_WORKFLOW_ENGINE.md

Include:

- Workflow Definition
- Node
- Variable
- Input
- Output
- Condition
- Loop
- Retry
- Schedule
- Replay
- Template
- Marketplace
- Analytics

---

## 08_MARKETPLACE.md

Include:

- Package
- Bundle
- License
- Pricing
- Revenue
- Creator Income
- Workspace Income
- Platform Fee
- Transactions
- Review
- Rating
- Promotion
- DMCA
- Report
- Ranking

---

## 09_COMMUNITY.md

Include:

- Follow
- Collect
- Fork
- Remix
- Like
- Comment
- Mention
- Challenge
- Exchange
- Creator Profile
- Studio Page

---

## 10_GROWTH_ENGINE.md

Include:

- XP
- Creator DNA
- Skill Tree
- Timeline
- Weekly Report
- Coach
- Analytics
- Insights
- Achievements

---

## 11_DATABASE.md

For every table include:

- Purpose
- Columns
- PK
- FK
- Indexes
- Constraints
- RLS
- Migration
- Future fields

Finish with ER Diagram.

---

## 12_API.md

Every endpoint includes:

- Method
- Route
- Permission
- Request
- Response
- Errors
- Rate Limit
- Related Tables
- Examples

---

## 13_ADMIN.md

Include:

- Dashboard
- Users
- Workspaces
- AI Queue
- Audit
- Reports
- Marketplace Moderation
- Logs
- Cost Dashboard
- Analytics
- Feature Flags

---

## 14_UI_UX.md

For every page include:

- Purpose
- Components
- Desktop
- Mobile
- Responsive
- Accessibility
- Empty State
- Error State
- Loading State
- Animation

---

## 15_IMPLEMENTATION_GUIDE.md

Define:

- Sprint plan
- Milestones
- Dependency graph
- Build order
- Testing checklist
- Release checklist

---

# Final Requirement

The generated documentation should be treated as the authoritative product specification for Ideas OS.

It must be implementation-oriented rather than marketing-oriented.
