# AI RAG Quality & Knowledge Operations Platform

Production-grade RAG evaluation, retrieval benchmarking, citation verification, stale knowledge detection, and reviewed documentation operations platform.

Built with an independently deployable **NestJS API** on Render and **Next.js 14 Web Application** on Vercel.

---

## Architecture Overview

```
                                      ┌────────────────────────────────────────────────────────┐
                                      │                     Vercel                             │
                                      │  Next.js 14 Frontend Application                       │
                                      │  (Overview, Datasets, Evaluations, Freshness, Review)  │
                                      └──────────────────────────┬─────────────────────────────┘
                                                                 │ HTTPS (x-tenant-id)
                                                                 ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                                           Render                                             │
│  NestJS Backend API (/api/v1) [0.0.0.0:$PORT]                                                │
│                                                                                              │
│  ├── Health Probes: GET /health (Liveness) & GET /health/ready (Readiness)                   │
│  ├── Datasets Module: Versioned benchmarks, immutable snapshots, synthetic tags              │
│  ├── Evaluations Module: Candidate vs Baseline retrieval benchmarks, evidence recording     │
│  ├── Knowledge Sources Module: SHA-256 drift detection, TTL staleness, SSRF validation        │
│  ├── Documentation Proposals Module: Human review queue, unified diffs, sign-off audit       │
│  └── Integrations & Fallbacks Module: Resilient adapters for AI Platform & Notification      │
└───────────────┬───────────────────────────────┬───────────────────────────────┬──────────────┘
                │ x-api-key                     │ x-api-key                     │ x-api-key
                ▼                               ▼                               ▼
    ┌──────────────────────┐        ┌──────────────────────┐        ┌──────────────────────┐
    │  Shared AI Platform  │        │   Model Regression   │        │     Notification     │
    │  - /api/v1/rag/query │        │  - /regression/check │        │  - /v1/notifications │
    │  - /ai/evaluation/run│        │  - /baselines        │        │  - Email & Push      │
    └──────────────────────┘        └──────────────────────┘        └──────────────────────┘
```

---

## 1. Product Capabilities

### 1. Versioned Benchmark Datasets
- Manage versioned datasets with queries, expected answers, relevant document/chunk identifiers, and optional expected citations.
- Immutable snapshot freezing (`snapshotHash`) ensures historical evaluations remain 100% reproducible over time.
- Clearly labeled `SYNTHETIC DATA` vs `PRODUCTION GROUND TRUTH` badges prevent synthetic data from being misrepresented as production telemetry.

### 2. Repeatable Retrieval Evaluations & Baseline Comparison
- Configurable retrieval pipelines: Dense Vector, Sparse BM25, Hybrid Search, and Dense + BGE Reranker.
- Side-by-side comparison between candidate configurations and authoritative baseline runs.
- Full evidence recording: retrieved chunk text, document versions, similarity scores, and citation mappings.

### 3. Production Retrieval Metrics (Strict Label Guard)
- **Recall@K**: Fraction of labeled relevant chunks retrieved in top K.
- **Precision@K**: Fraction of top K retrieved chunks that are relevant.
- **MRR (Mean Reciprocal Rank)**: Reciprocal rank of the first relevant chunk ($1/r$).
- **nDCG@K (Normalized Discounted Cumulative Gain)**: Discounted cumulative gain normalized by Ideal DCG.
- **STRICT GUARD**: Retrieval metrics are computed **only** when the dataset contains verified chunk-level ground-truth labels. Unlabeled cases explicitly return `null` and are badged as `UNLABELED` rather than generating misleading zeroes or ones.

### 4. Quality & Groundedness Scoring (Visible Distinction)
- **Answer Relevance**: Lexical & semantic overlap comparing candidate answers to ground-truth answers.
- **Citation Coverage**: Verifies expected citations against retrieved documents and citations.
- **Groundedness**: Evaluates context faithfulness without hallucinations.
- **Honest Labeling**: Model-judged scores (`LLM_JUDGE_AI_PLATFORM`) are explicitly labeled and visibly separated from deterministic ground-truth label matches.

### 5. Stale Knowledge Detection & Impact Analysis
- Tracks knowledge sources (Documents, URLs, API Specs, Markdown) with SHA-256 content hashes, last modified timestamps, and TTL thresholds.
- Dynamic impact analysis identifies exactly which evaluation test cases and datasets depend on outdated or drifted knowledge sources.
- Triggers automatic alerts to the Notification Service when documents become stale or content drift is detected.

### 6. Reviewed Documentation Maintenance
- Generates proposed documentation additions or corrections when benchmark runs reveal ambiguities or missing evidence.
- Unified diff viewer highlights line-by-line additions and deletions.
- **Safety Guarantee**: Authoritative documents are **never silently rewritten**. Edits require human review, reviewer identity, and audit sign-off before downstream publication.

---

## 2. Shared Services Integration & Local Fallbacks

The platform inspects and integrates with the shared services:

| Shared Service | Verified Endpoints | Authentication | Timeout | Local Fallback Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **Shared AI Platform** | `POST /api/v1/rag/query`<br/>`POST /api/v1/ai/evaluation/run`<br/>`POST /api/v1/rag/documents` | `x-api-key: <key>` or `Authorization: Bearer <token>` | `10000ms` | Automatically switches to deterministic simulated retrieval adapter tagged visibly as `LOCAL_DETERMINISTIC_ADAPTER`. |
| **Model Regression Detection** | `POST /api/v1/regression/check`<br/>`GET /api/v1/baselines` | `x-api-key: <key>` or `Authorization: Bearer <token>` | `8000ms` | Local deterministic regression engine checks candidate metric deltas against baseline thresholds (>5% drop triggers failure), tagged as `LOCAL_DETERMINISTIC_ENGINE`. |
| **Shared Notification Service** | `POST /v1/notifications`<br/>`GET /health` | `x-api-key: NOTIFICATION_RAG_OPS_API_KEY` | `5000ms` | Dispatches priority alerts (`CRITICAL`/`BULK`). If offline or unconfigured, safely logs alerts without failing benchmark execution or boot. |

---

## 3. Deployment & Hosting Configuration

### Independent Deployments
- `frontend/`: Next.js 14 on Vercel with its own `package.json`, compatible lockfile, and frontend-only production build.
- `backend/`: NestJS on Render with its own `package.json`, compatible lockfile, and backend-only production build.
- Neither deployment relies on root `node_modules` or aggregate builds.

### Vercel (Frontend)
1. In Vercel Project Settings, set **Root Directory** to `frontend`.
2. Framework preset: **Next.js**.
3. Build command: `npm run build`.
4. Output directory: Next.js default (`.next`).
5. Set environment variable: `NEXT_PUBLIC_API_URL=https://<your-render-backend-service>.onrender.com/api/v1`.

### Render (Backend)
1. Use `render.yaml` or create a Web Service pointing to `backend/`.
2. Runtime: **Node.js**.
3. Build command: `npm install && npm run build`.
4. Start command: `npm run start:prod`.
5. Health check path: `/health` (verified liveness probe).
6. Auto-deploy build filter: `backend/**` (ensures frontend commits do not rebuild backend).
7. Binds to `0.0.0.0` and respects platform-provided `$PORT`.

---

## 4. Environment Variables Reference

### Backend (`backend/.env.example`)
| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | HTTP port the server listens on | `4000` |
| `NODE_ENV` | Runtime environment mode | `development` / `production` |
| `API_PREFIX` | Global routing prefix | `api/v1` |
| `FRONTEND_URL` | Allowed CORS origin | `http://localhost:3000` |
| `DEFAULT_TENANT_ID` | Default tenant identifier | `tenant-default` |
| `AI_PLATFORM_URL` | Base URL of Shared AI Platform | `http://localhost:5000` |
| `AI_PLATFORM_API_KEY` | Service API key for AI Platform | *(secret)* |
| `AI_PLATFORM_APPLICATION_ID` | Application identifier registered with AI Platform | `ai-rag-quality-ops` |
| `MODEL_REGRESSION_SERVICE_URL` | Base URL of Model Regression Detection service | `http://localhost:4002` |
| `MODEL_REGRESSION_SERVICE_API_KEY` | Service API key for Regression service | *(secret)* |
| `NOTIFICATION_SERVICE_URL` | Base URL of Notification service | `http://localhost:3001` |
| `NOTIFICATION_SERVICE_API_KEY` | Service API key for Notification service | *(secret)* |
| `NOTIFICATION_ALERT_RECIPIENT_EMAIL` | Destination email for regression & freshness alerts | `ops-alerts@example.com` |
| `ALLOWED_EXTERNAL_SOURCE_DOMAINS` | Comma-separated domain allowlist for SSRF validation | `docs.example.com,api.example.com` |
| `MAX_DOCUMENT_SIZE_BYTES` | Maximum upload / content size for documents | `5242880` (5MB) |

### Frontend (`frontend/.env.example`)
| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Public backend API endpoint | `http://localhost:4000/api/v1` |
| `NEXT_PUBLIC_DEFAULT_TENANT_ID` | Default workspace tenant ID | `tenant-default` |
| `NEXT_PUBLIC_ACCESS_ENABLED` | Public demo access flag | `true` |

---

## 5. Local Setup & Smoke Test

### Prerequisites
- Node.js >= v20 (tested on Node v22.23.1)
- npm >= 10 (tested on npm 12.0.2)

### Step 1: Clone & Install Dependencies
```bash
# Backend installation
cd backend
npm install
cd ..

# Frontend installation
cd frontend
npm install
cd ..
```

### Step 2: Run Tests & Build
```bash
# Run backend tests
npm --prefix backend test

# Run frontend tests
npm --prefix frontend test

# Build both applications
npm --prefix backend run build
npm --prefix frontend run build
```

### Step 3: Start the Backend Service
```bash
npm --prefix backend run start:dev
# Server starts on http://localhost:4000
# Swagger documentation at http://localhost:4000/api/docs
# Liveness health check at http://localhost:4000/health
# Readiness health check at http://localhost:4000/health/ready
```

### Step 4: Start the Frontend Application
```bash
npm --prefix frontend run dev
# Next.js app available at http://localhost:3000
```

### Step 5: Smoke Test with cURL
```bash
# 1. Root service metadata
curl -s http://localhost:4000/

# 2. Liveness probe
curl -s http://localhost:4000/health

# 3. Readiness probe
curl -s http://localhost:4000/health/ready

# 4. List benchmark datasets
curl -s http://localhost:4000/api/v1/datasets

# 5. List historical evaluation runs
curl -s http://localhost:4000/api/v1/evaluations

# 6. Trigger an evaluation run
curl -s -X POST http://localhost:4000/api/v1/evaluations/run \
  -H "Content-Type: application/json" \
  -d '{
    "datasetId": "ds_cust_support",
    "candidateLabel": "Hybrid Retrieval + BGE Reranker",
    "retrievalMethod": "HYBRID",
    "topK": 5,
    "minScore": 0.5,
    "baselineRunId": "run_baseline_001"
  }'

# 7. Check source freshness
curl -s -X POST http://localhost:4000/api/v1/sources/check-all
```

---

## 6. Verification Results

| Gate | Description | Command | Result |
| :--- | :--- | :--- | :--- |
| **1** | Clean Frontend Dependencies | `npm --prefix frontend install` | **PASSED** (0 errors) |
| **2** | Frontend Lint & Type Check | `npm --prefix frontend run lint` | **PASSED** (0 errors, 0 warnings) |
| **3** | Frontend Tests | `npm --prefix frontend test` | **PASSED** (3 tests passed) |
| **4** | Frontend Production Build | `npm --prefix frontend run build` | **PASSED** (Next.js 14 optimized static build) |
| **5** | Clean Backend Dependencies | `npm --prefix backend install` | **PASSED** (0 errors) |
| **6** | Backend Lint & Type Check | `npm --prefix backend run lint` | **PASSED** (0 errors, 0 warnings) |
| **7** | Backend Unit/Integration Tests | `npm --prefix backend test` | **PASSED** (7 suites, 23 tests passed) |
| **8** | Backend Production Build | `npm --prefix backend run build` | **PASSED** (`nest build` completed) |
| **9** | Root Aggregate Validation | `npm run test && npm run lint && npm run build` | **PASSED** (all aggregate scripts passed) |
| **10** | API Prefix, Root & Health Tests | `health.spec.ts` & `exception-filter.spec.ts` | **PASSED** (status preservation, header tracing, route isolation) |
| **11** | Integration Timeout & Fallbacks | `integrations.spec.ts` | **PASSED** (bounded timeouts, deterministic fallbacks) |
| **12** | Tenant Isolation & SSRF Tests | `tenant-isolation.spec.ts` & `ssrf-validator.spec.ts` | **PASSED** (private IP/metadata blocked, tenant isolation verified) |
| **13** | Documented Local Smoke Test | Exact curl commands executed live | **PASSED** (all endpoints verified live) |
| **14** | Image Optimization Config Tests | `npm --prefix frontend test` (`image-config.spec.ts`) | **PASSED** (WebP enforcement, 31-day TTL, pruned size variants) |

---

## 7. Vercel Image Optimization & Asset Delivery Strategy

To operate strictly within Vercel's included monthly allowance (5,000 transformations) and avoid overage charges, this repository enforces a lean, deterministic asset delivery model.

### Image Audit Summary
- **App Type**: Next.js 14 App Router.
- **Image Usages**:
  - `Navigation.tsx`: Brand logo (`/logo.svg`, 36x36 vector icon).
  - `layout.tsx`: Favicon (`/favicon.svg`) and Apple touch icon (`/logo.svg`).
  - Page Icons: Inline SVG components via `lucide-react` (`Database`, `BarChart3`, etc.).
- **Remote Providers**: None. Datasets and evaluation runs are purely textual and structured JSON.

### Optimization Rules Applied
1. **Component-Level Selective Bypassing (`unoptimized`)**:
   - The brand logo in `<Navigation />` sets `unoptimized`.
   - **Why**: SVGs are vector graphics that scale mathematically. Routing them through `/_next/image` converts them into raster bitmaps and burns monthly transformations with zero compression benefit.
   - Bypassing serves `/logo.svg` directly from Vercel's Global Edge Network (CDN) with zero transformation consumption.
   - Preserves `<Image>` width, height, aspect ratio, priority preloading, and accessibility `alt` text.
2. **Resilience Against Transformation Failures**:
   - Includes an inline `<Shield />` vector fallback (`onError`) to ensure the navbar never renders an empty or broken box if edge assets fail to load.
3. **Optimized Next.js Configuration (`frontend/next.config.js`)**:
   - **Single Output Format**: `formats: ['image/webp']` prevents Next.js from generating duplicate AVIF + WebP permutations for any future raster assets.
   - **Pruned Width Variants**: Restricts `deviceSizes` to `[640, 750, 1080, 1200, 1920]` and `imageSizes` to `[32, 48, 64, 96, 128, 256]` (down from the 16 Next.js default sizes), preventing excessive dimension variants.
   - **Extended Cache TTL**: Configures `minimumCacheTTL: 2678400` (31 days) to prevent Vercel from re-transforming identical assets every 60 seconds (the Next.js default).
   - **Restricted Remote Patterns**: `remotePatterns: []` blocks arbitrary remote domains from triggering unauthorized image transformations.

### Guidelines for Adding New Visual Assets
- **SVGs, Small Icons & Logos (<64px)**: Always add `unoptimized` to `<Image>` or render as inline SVG components.
- **Project Thumbnails / Cards**: Pre-optimize locally as `.webp` at exact rendered dimensions (e.g. 384x216) and serve from `public/` with `unoptimized` if dimensions are fixed.
- **Large Photography / Banners**: Use Next.js `<Image>` with explicit `sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"` so the optimizer only generates necessary variants.
- **Verification**: Inspect network requests in DevTools to ensure static assets return `Content-Type: image/svg+xml` or `image/webp` directly from static routes without hitting `/_next/image?url=...`.

