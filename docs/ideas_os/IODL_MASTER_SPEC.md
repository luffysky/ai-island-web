# IODL_MASTER_SPEC.md
# Ideas OS Documentation Language (IODL)
Version: 1.0

## ROOT

```yaml
PROJECT:
  name: Ideas OS
  output_root: docs/ideas_os
  language:
    docs: English
    ui: Traditional Chinese
    code: English

GOAL:
  Generate implementation-ready documentation.

GLOBAL_RULES:
  no_placeholder: true
  no_todo: true
  no_empty_sections: true
  implementation_first: true
  include_mermaid: true
  include_database: true
  include_api: true
  include_permissions: true
  include_examples: true
```

## DOCUMENT TEMPLATE

```yaml
DOCUMENT:
  id: <unique_id>
  output: <file_name>.md
  minimum_lines: 500

PURPOSE:
  - Why this document exists

SECTIONS:
  - Overview
  - Terminology
  - Design Goals
  - Core Concepts
  - Business Rules
  - User Flow
  - Mermaid
  - Database
  - API
  - Permission Matrix
  - UI
  - Edge Cases
  - Security
  - Testing
  - MVP
  - Future
  - Implementation Notes
```

## ENTITY TEMPLATE

```yaml
ENTITY:
  name: <Entity>

GENERATE:
  - Definition
  - Lifecycle
  - Ownership
  - Metadata
  - Permission
  - State Machine
  - Version
  - Lineage
  - Search
  - Recommendation
  - Analytics
  - Database Schema
  - REST API
  - Server Actions
  - TypeScript Types
  - Zod Schema
  - Examples
```

## FEATURE TEMPLATE

```yaml
FEATURE:
  name: <Feature>

MUST_ANSWER:
  - Why does it exist?
  - Who uses it?
  - Business Rules?
  - Data Model?
  - Permission Model?
  - API?
  - UI?
  - AI interaction?
  - Edge Cases?
  - Testing?
  - Security?
  - Future?

OUTPUT:
  diagrams:
    - Flowchart
    - Sequence
    - ER
    - State
  tables:
    - Schema
    - Permission Matrix
```

## DOCUMENTS

```yaml
GENERATE:
  - 00_LOCKED_DECISIONS
  - 01_IDEAS_OS_SPEC
  - 02_CREATOR_ISLAND_PRD
  - 03_SYSTEM_ARCHITECTURE
  - 04_WORKSPACE
  - 05_ASSET_SYSTEM
  - 06_CREATION_ENGINE
  - 07_AI_SYSTEM
  - 08_MEMORY_SYSTEM
  - 09_WORKFLOW_ENGINE
  - 10_MARKETPLACE
  - 11_COMMUNITY
  - 12_GROWTH_ENGINE
  - 13_DATABASE
  - 14_API
  - 15_ADMIN
  - 16_UI_UX
  - 17_IMPLEMENTATION_GUIDE
```

## DOMAIN RULES

```yaml
WORKSPACE:
  generate:
    - Types
    - Roles
    - Ownership
    - Invitations
    - Wallet
    - AI Policy
    - Lifecycle

ASSET:
  generate:
    - Fragment
    - Work
    - Package
    - Workflow
    - Character
    - World
    - Knowledge
    - Media
    - Version
    - Merge
    - Split
    - Remix
    - Archive

AI:
  generate:
    - Agent Registry
    - Prompt Builder
    - Model Router
    - Cost Manager
    - Memory Injection
    - Tool Calling
    - Evaluation

MEMORY:
  generate:
    - Candidate
    - Confirm
    - Reject
    - Merge
    - Conflict
    - Embedding
    - Retrieval
    - Timeline

WORKFLOW:
  generate:
    - Nodes
    - Variables
    - Conditions
    - Retry
    - Replay
    - Scheduling
    - Templates

MARKETPLACE:
  generate:
    - License
    - Revenue
    - Packages
    - Ranking
    - Moderation

COMMUNITY:
  generate:
    - Follow
    - Fork
    - Remix
    - Challenge
    - Studio
    - Reputation

DATABASE:
  every_table:
    - Purpose
    - Columns
    - PK
    - FK
    - Indexes
    - RLS
    - Migration
    - Example

API:
  every_endpoint:
    - Method
    - Route
    - Permission
    - Validation
    - Request
    - Response
    - Errors
```

## QUALITY GATE

```yaml
QUALITY:
  reject_if:
    - Missing Business Rules
    - Missing Database
    - Missing API
    - Missing Permissions
    - Missing Edge Cases
    - Missing Mermaid
    - Placeholder Exists

SUCCESS:
  Documentation can be implemented directly by engineers with minimal clarification.
```
