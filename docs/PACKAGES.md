# Contributing & Architectural Design Guidelines

## 🏗️ Monorepo Package Hierarchy & Dependency Boundaries

```mermaid
graph TD
    subgraph Apps
        A1[apps/web - Next.js 16 App Router]
        A2[apps/api - Express 5 API Server]
    end

    subgraph Core Packages
        P1[@sanjeevani/types - Contracts & Zod Schemas]
        P2[@sanjeevani/config - Environment & Consts]
        P3[@sanjeevani/medical-safety - Deterministic Safety & Triage Engine]
        P4[@sanjeevani/ai - Orchestrator & Multi-Provider LLM Integration]
        P5[@sanjeevani/maps - Facility Ranking & Geolocation]
        P6[@sanjeevani/voice - STT/TTS Providers & Audio Streams]
        P7[@sanjeevani/ui - Design Tokens & Atomic Components]
        P8[@sanjeevani/db - Prisma ORM Layer]
    end

    A1 --> P1 & P2 & P3 & P5 & P6 & P7
    A2 --> P1 & P2 & P3 & P4 & P5 & P6 & P8
    P3 --> P1 & P2
    P4 --> P1 & P2 & P3
    P5 --> P1 & P2
    P6 --> P1 & P2
```

## 📦 Package Catalog

| Package | Workspace | Primary Purpose | Key Exports |
|---|---|---|---|
| **`@sanjeevani/types`** | `packages/types` | Central type contracts, Zod schemas, state domain definitions | `Domain`, `API`, `Constants` |
| **`@sanjeevani/config`** | `packages/config` | Validated environment configs, emergency numbers, regions | `serverEnv`, `emergencyContacts` |
| **`@sanjeevani/medical-safety`** | `packages/medical-safety` | Deterministic emergency circuit breaker, multilingual extraction | `safetyEngine`, `vignettes` |
| **`@sanjeevani/ai`** | `packages/ai` | Prompt engineering, multi-turn LLM routing, safe function calling | `orchestrator`, `geminiProvider` |
| **`@sanjeevani/maps`** | `packages/maps` | Google Places (New), Routes API, curated emergency ranking | `facilityProvider`, `geohash` |
| **`@sanjeevani/voice`** | `packages/voice` | Web STT/TTS, Gemini Live, ElevenLabs voice bridge | `voiceStack`, `player` |
| **`@sanjeevani/ui`** | `packages/ui` | Design tokens, spring animations, accessible primitives | `button`, `sheet`, `tokens.css` |
| **`@sanjeevani/db`** | `packages/db` | PostgreSQL schema abstraction, AES-256 encrypted fields | `prismaClient`, `schema` |

## 🛡️ Clinical Integrity Rules
1. **Never import `@sanjeevani/ai` into `apps/web`**: Generative AI models must remain strictly server-side behind schema-checked API barriers.
2. **Deterministic Triage Independence**: `@sanjeevani/medical-safety` must never depend on external AI providers or remote networks.
