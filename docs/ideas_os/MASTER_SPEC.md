# MASTER_SPEC.md

# Ideas OS Master Documentation Specification

> This document is the master specification used to generate the entire Ideas OS documentation.
> It is written for AI coding agents (Claude Code, Codex, GPT, Gemini CLI), not end users.

---

# 1. Mission

The generated documentation must be implementation-ready.

It must allow a new engineer to understand:

- why the system exists
- how every subsystem works
- how data flows
- how permissions work
- how AI is integrated
- how the database should be designed
- how APIs should behave
- how the UI should work
- what belongs to MVP
- what belongs to Future

Do not write marketing content.

Write engineering documentation.

---

# 2. Writing Rules

Every markdown document MUST contain:

- Purpose
- Overview
- Terminology
- Design Goals
- Core Concepts
- Business Rules
- User Flow
- Mermaid Diagrams
- Database Considerations
- API Considerations
- Permission Model
- UI Considerations
- Edge Cases
- Security
- Performance
- Future Expansion
- Implementation Notes

Never output:

- TODO
- Placeholder
- Coming Soon
- TBD
- Empty headings

Each document should normally exceed 300 lines or contain equivalent engineering depth.

---

# 3. Documentation Tree

00_LOCKED_DECISIONS.md
01_IDEAS_OS_SPEC.md
02_CREATOR_ISLAND_PRD.md
03_SYSTEM_ARCHITECTURE.md
04_ASSET_SYSTEM.md
05_AI_SYSTEM.md
06_MEMORY_SYSTEM.md
07_WORKFLOW_ENGINE.md
08_MARKETPLACE.md
09_COMMUNITY.md
10_GROWTH_ENGINE.md
11_DATABASE.md
12_API.md
13_ADMIN.md
14_UI_UX.md
15_IMPLEMENTATION_GUIDE.md

---

# 4. Required Content By Document

## 00_LOCKED_DECISIONS

Record every immutable decision.

Include:

- Workspace-first
- Roles
- Ownership
- Work != Blog
- Existing Z Coin
- Dust
- Admin boundary
- AI routing
- Existing AI tables
- Future Islands

---

## 01_IDEAS_OS_SPEC

Must explain:

- Vision
- Philosophy
- Four Engines
- Six Domains
- Asset lifecycle
- Business lifecycle
- Product comparison
- Future evolution

---

## 02_CREATOR_ISLAND_PRD

Must include:

- Personas
- Dashboard IA
- Navigation
- Workspace UX
- Fragment Library
- Work Library
- Work Editor
- AI Actions
- Marketplace preview
- Community preview
- Growth preview
- Error UX
- Metrics
- MVP
- Future

---

## 03_SYSTEM_ARCHITECTURE

Must describe:

- Layered architecture
- Service boundaries
- Shared services
- AI layer
- Queue
- Search
- Cache
- Storage
- Logging
- Monitoring
- Deployment

---

## 04_ASSET_SYSTEM

Every asset section must describe:

- Purpose
- Ownership
- Lifecycle
- Metadata
- Permission
- Version
- Snapshot
- Merge
- Split
- Fork
- Remix
- Archive
- Restore
- Package
- Dependency
- Search
- Recommendation
- Analytics

---

## 05_AI_SYSTEM

Document:

- Agent Registry
- Agent Capability
- Prompt Builder
- Prompt Composer
- Model Router
- Cost Manager
- Memory Injection
- Tool Calling
- Retry
- Evaluation
- Queue
- agent_runs

Every agent requires:

Purpose
Input
Output
Prompt strategy
JSON schema
Failure handling

---

## 06_MEMORY_SYSTEM

Document:

Personal Memory
Workspace Memory
Project Memory
Session Memory
Candidate
Confirm
Reject
Conflict
Merge
Timeline
Version
Confidence
Embedding
Retrieval
Injection
Cleanup

Each memory type explains:

Creation
Permission
Prompt usage
Expiration
Search
Storage

---

## 07_WORKFLOW_ENGINE

Document:

Workflow Definition
Nodes
Variables
Input
Output
Conditions
Loops
Retry
Replay
Templates
Marketplace
Analytics

---

## 08_MARKETPLACE

Document:

Packages
Bundles
Licenses
Pricing
Revenue
Workspace income
Creator income
Platform fee
Transactions
Reviews
DMCA
Disputes
Moderation

---

## 09_COMMUNITY

Document:

Follow
Collect
Fork
Remix
Comments
Mentions
Notifications
Challenges
Exchange
Profiles
Studios

---

## 10_GROWTH_ENGINE

Document:

XP
Creator DNA
Timeline
Insights
Coach
Achievements
Weekly report
Skill map

---

## 11_DATABASE

Every table requires:

Purpose
Columns
PK
FK
Indexes
Constraints
RLS
Migration
Future fields
Example row

Finish with ER diagram.

---

## 12_API

Every endpoint requires:

Method
Route
Permission
Validation
Request
Response
Errors
Pagination
Filtering
Rate limits
Examples
Related tables

---

## 13_ADMIN

Document:

Dashboard
Users
Workspace management
AI queue
Marketplace moderation
Reports
Audit
Logs
Analytics
Feature flags

---

## 14_UI_UX

Every page requires:

Purpose
Components
Desktop
Mobile
Responsive
Accessibility
Loading
Empty state
Error state
Animation

---

## 15_IMPLEMENTATION_GUIDE

Include:

Milestones
Sprint plan
Dependencies
Implementation order
Testing checklist
Release checklist
Regression checklist

---

# 5. Quality Checklist

Every generated document should answer:

Why does this feature exist?
Who uses it?
How does it work?
How is it stored?
How is it secured?
How is it extended?
How is it tested?

If any answer is missing, expand the document.

---

# 6. Final Goal

The complete documentation should become the engineering bible for Ideas OS.

Claude Code should be able to generate code directly from these specifications with minimal clarification.
