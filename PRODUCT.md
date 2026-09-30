# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Individuals and working professionals actively managing personal cashflow, daily expenses with receipts, recurring subscription commitments, and long-term capital accumulation goals denominated in Philippine Peso (PHP).

## Product Purpose
To provide an executive-tier, cohesive personal wealth management cockpit. It replaces fragmented spreadsheets and generic budgeting apps with unified daily expense logging, receipt proof storage, proactive subscription monitoring, milestone savings targets, and instant conversational financial intelligence—turning passive tracking into deliberate wealth preservation.

## Positioning
An executive personal wealth dashboard combining real-time base liquidity calibration, milestone target accumulation, and an embedded context-aware AI financial advisor (powered by Gemini) that reasons directly over live account balance and expense data.

## Operating Context
- Single-page web application accessed primarily via desktop and mobile web browsers.
- Daily & periodic rituals: Fast expense logging (with receipt camera photo or file upload), monthly subscription audits and pause toggling, periodic base liquidity calibration, milestone savings deposits, and conversational financial queries with the AI assistant.
- Primary operating currency: Philippine Peso (PHP, ₱).

## Capabilities and Constraints
- **Authentication**: Supabase Auth (email/password sign-in, signup, OTP verification, password reset) paired with an interactive animated Rive character mascot and real-time password strength evaluation.
- **Dashboard**: High-level liquidity snapshot, monthly cashflow summary, top category distributions, active goal progress bars, and quick action shortcuts.
- **Expense Logging**: Granular transaction capture (date, amount, category, payment method, recurring flag, optional notes, and receipt image upload via Multer).
- **Transaction Ledger & History**: Full searchable, filterable transaction record with inline updates and receipt inspection.
- **Wealth Target Goals**: Multi-milestone savings tracker with target dates, visual progress meters, timeline adjustments, and incremental deposit allocations.
- **Recurring Commitments**: Active and paused subscription monitoring with cadence tracking.
- **Analytics**: Category spending breakdowns, temporal spending trends, and cashflow charts.
- **AI Financial Advisor**: Embedded chatbot integrated with Google Gemini (`gemini-3.6-flash`), injected with live base balance context from PostgreSQL.
- **User Profile & Settings**: Profile personalization and raw base liquidity calibration.
- **Technical & Architectural Constraints**:
  - Global navbar and top header components are locked and must not be altered.
  - All interactive elements must implement explicit loading, empty, and error states.
  - Input validation required before any Express endpoint mutations.
  - Dual-theme system (`Midnight Forest` dark mode and `Crisp Alpine & Sage` light mode) governed via `data-theme`.
  - Sensitive environment variables, database credentials, and Gemini API keys are strictly maintained on the server backend (`.env`), never exposed client-side.

## Brand Commitments
- **Name**: Personal Expense Tracker & Wealth Dashboard.
- **Tone & Voice**: Concise, professional, executive, encouraging, and clear.
- **Core Visual Commitments**: Aurora mesh gradient accents, dark/light forest palette, locked global navigation shell, and interactive Rive mascot asset.

## Evidence on Hand
- Full-stack codebase with React 19 + Vite frontend (`frontend/`) and Node.js + Express backend (`backend/index.js`).
- Persistent PostgreSQL database storage (`transactions`, `settings`, `goals`).
- Supabase client integration (`frontend/src/supabaseClient.js`).
- Design system tokens defined in `DESIGN_SYSTEM.md` and `frontend/src/index.css`.
- Rive mascot asset (`frontend/src/global-assets/auth-character.riv`).

## Product Principles
- **Clarity Over Clutter**: Critical liquidity metrics and progress towards goals must be legible at a glance with clear visual hierarchy and progress meters.
- **Frictionless Capture**: Transaction logging, receipt attachment, and goal allocation must require minimal effort with instant visual confirmation.
- **Durable Ground Truth**: Financial calculations, balances, and ledger states must always reflect verified database reality, avoiding optimistic illusions.
- **Proactive Intelligence**: The AI companion must act as an objective, context-aware co-pilot that assists in financial discipline without unsolicited intrusiveness.

## Accessibility & Inclusion
- Accessible color contrast across both dark and light modes.
- Clear visual cues and ARIA live regions for asynchronous loading, empty states, and errors.
- Keyboard navigability across all modal dialogs, forms, and tabs.
