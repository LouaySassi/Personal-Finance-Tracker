# AI Integration Plan — Tracky

This document revises the AI feature plan for Tracky with two important constraints you provided:
- You will NOT use bank APIs or automated CSV imports — all transactions are entered manually through the existing UI.
- You have access to Google Gemini (AI Studio) API and are willing to use it optionally; usage should remain opt-in and mindful of free-trial/quotas.

Contents
- Goals & assumptions
- High-level architecture
- Feature list (user-visible)
- Backend endpoints & adapters
- Data storage & schema choices
- Prompt templates & expected JSON schemas
- Gemini integration (security, env, quota handling)
- Rule-based fallback (MVP)
- Frontend changes and UX flows
- Testing, validation & safety
- Rollout plan, timeline & milestones
- Concrete next steps (todo list)

1. Goals & assumptions
- Primary goal: provide a helpful, local-first AI assistant that can suggest payment plans, savings strategies, and contextual explanations based on manual data the user enters.
- Manual-only input: no bank CSV ingestion or live banking integrations — everything comes from `App`'s existing transaction/bill/goal UI.
- Gemini usage: optional and opt-in. Default behavior uses a deterministic rule-based engine. Gemini adapter is available for enhanced natural language and summarization when enabled.

2. High-level architecture
- Frontend: React components for chat and AI cards.
  - New components: `AIChat`, `AICard`, `GoalPlanner`, `AISettings`.
  - API calls go to `/api/ai/*` routes.
- Backend: Express routes in `server/routes/ai.js` and a pluggable `server/ai-service.js` that routes requests to the active adapter.
  - Adapters: `ruleAdapter` (default), `geminiAdapter` (optional).
- Storage: keep AI artifacts local, stored either inside `monthly_data` JSON (under `aiSuggestions`) or in a new `ai_suggestions` table. Default: embed in `monthly_data` for minimal schema churn.

3. Feature list (user-visible)
- Conversational assistant: ask questions about budgets, goals, and transactions.
- Generate payment/savings plans for a selected goal: preview and apply to months (creates transactions or planned transfers).
- Dashboard AI cards: suggested plans, quick tips (e.g., "Move $X to savings"), and anomaly alerts.
- Feedback mechanism: thumbs up/down and optional comment stored locally to improve heuristics and record acceptance rates.

4. Backend endpoints & adapter responsibilities
- Endpoints (initial):
  - `POST /api/ai/chat` — { monthKey?, messages: [{role,content}] } -> { messages, aiResponse }
  - `POST /api/ai/plan` — { monthKey, goalId, constraints } -> { planId, planPayload }
  - `GET /api/ai/suggestions?monthKey=` -> list stored suggestions for the month
  - `POST /api/ai/apply` — { planId, monthKey } -> applies plan (creates transactions/updates data)
  - `POST /api/ai/feedback` — { planId, rating, comment } -> stores feedback

- `server/ai-service.js` responsibilities:
  - Compose a minimal context from `monthly_data` (salary, bills, expenses, goals, transactions)
  - Route the request to the active adapter (rule or gemini)
  - Validate outputs against expected JSON schemas; if invalid, fallback to ruleAdapter and return a safe result

5. Data storage & schema choices
- Minimal-change approach (recommended):
  - Add `aiSuggestions` array inside each month object in `monthly_data` (JSON). Example entry:
    {
      id: 'ai-20251118-1',
      kind: 'savings_plan',
      payload: { ... },
      status: 'suggested'|'applied'|'dismissed',
      created_at: 'ISO8601'
    }

- If you prefer a normalized table later, add `ai_suggestions` table with columns `(id TEXT PRIMARY KEY, month_key TEXT, kind TEXT, payload TEXT, status TEXT, created_at TEXT)`.

6. Prompt templates & JSON schemas
- Always request structured JSON from Gemini when used. Provide a strict schema in the prompt (example below).

- Example Plan JSON schema (for model output):
  - `planId` (string), `kind` (string), `forGoalId` (string), `monthlySteps` (array of {monthKey, action, amount, target, note}), `summary` (string), `confidence` (number 0-1).

- Example prompt outline (system + user):
  - System: "You are a conservative personal finance assistant. Output valid JSON only. Ensure bills are fully funded and do not propose negative end-of-month balances. Use months as YYYY-MM."
  - User: Provide serialized month context and constraints (max extra per month, earliest payment month).

7. Gemini integration (practical notes)
- Opt-in only: user must enable Gemini in `AI Settings` and provide `GEMINI_API_KEY` in `.env`.
- Server wrapper: `server/ai-adapters/geminiAdapter.js` reads `process.env.GEMINI_API_KEY` and makes server-side requests; do NOT expose the key to the frontend.
- Rate/Quota handling: implement simple usage guard in server: count calls per day in memory or local store and stop calling Gemini if usage exceeds a threshold. Show clear UI warnings when limit approaches.
- Cost control: keep Gemini prompts small; prefer ruleAdapter for routine suggestions; only send high-value requests to Gemini (complex plan generation, long explanations).

8. Rule-based fallback (MVP)
- Implement a deterministic planner that:
  - Calculates remainingFunds = salary + extraFunds - totalBillsSpent - totalExpenses - manualSavingsThisMonth
  - Prioritizes bills by due-date or linked goals
  - Allocates up to `maxExtra` toward the goal each month without making remainingFunds negative
  - Produces `monthlySteps` for the next N months until goal met or a user-defined horizon
- Advantages: immediate, predictable, fast, no external deps

9. Frontend changes and UX flows
- `AI Settings` (new): toggle AI enabled, backend selection (`rule` or `gemini`), clear AI data, show Gemini quota usage and opt-in consent.
- `AI Chat` modal: start conversation; include context summary and quick actions like 'Generate plan for goal X'.
- `GoalPlanner` flow: pick goal -> set constraints -> generate plan -> preview -> apply/dismiss.
- Dashboard: show `AICard` suggestions; pin/accept/dismiss actions. Applying a plan triggers existing save endpoints.

10. Testing, validation & safety
- JSON schema validation: server must validate Gemini outputs and reject/mask invalid or unsafe results.
- Unit tests for ruleAdapter algorithms and for apply-plan logic (ensuring no negative balances).
- Integration tests for API endpoints (mock Gemini if enabled).

11. Rollout plan & timeline (4 sprints)
- Sprint 1 (1 week): design, types, ai-service skeleton, ruleAdapter, `POST /api/ai/plan` + basic UI to show suggestions. Store suggestions in `monthly_data`.
- Sprint 2 (1 week): `AIChat` modal, `GoalPlanner` flow, `POST /api/ai/apply`, feedback endpoint, unit tests.
- Sprint 3 (1 week): Gemini adapter + settings page (opt-in), JSON schema enforcement, docs for GEMINI_API_KEY and usage notes.
- Sprint 4 (1 week): polish, more tests, user feedback collection, and optional embeddings/RAG exploration.

12. Concrete next steps (short-term todos)
- Design AI types and add to `src/types.ts` (AIPlan, AISuggestion, AIFeedback).
- Add `server/routes/ai.js` and mount in `server/index.js`.
- Implement `server/ai-service.js` and `server/ai-adapters/ruleAdapter.js` (MVP planner).
- Add `src/api/client.ts` wrappers for AI routes and scaffold `AIChat` + `AICard` components with simple UI.

13. Gemini `.env` and README notes (for later docs)
- Add `.env.example` snippet in docs:

  GEMINI_API_KEY=your_gemini_api_key_here

- Do NOT commit real keys. Add docs/GEMINI_SETUP.md with steps to obtain an API key and recommended quota limits.

14. Privacy & data handling
- Default: AI off. When turned on, AI artifacts are stored locally and removable via UI.
- Explicit consent before enabling Gemini. Show notice that data is sent to Google's API when Gemini is used.

If you want, I can now scaffold the MVP pieces: add AI types, create `server/routes/ai.js`, implement the ruleAdapter, and wire up a minimal `AIChat` UI. Which subset should I start with? (I recommend: create ai-service + ruleAdapter + `/api/ai/plan` endpoint and a minimal GoalPlanner UI.)
