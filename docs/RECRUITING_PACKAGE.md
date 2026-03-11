# NACHBAR.IO — Project Overview & Recruiting Package

> **Hyperlocal Care & Community Platform**
> Helping elderly people live independently at home — longer, safer, and more connected.

---

## The Problem

Europe is aging fast. In Germany alone, 5.6 million people need care — and that number grows every year. Most want to stay in their own home. But the current system is failing them:

- **Delayed emergencies** — seniors living alone may not be found for hours or days after a fall
- **Missed medication** — without reminders, adherence drops dramatically
- **Caregiver overload** — family members and professional caregivers are stretched thin
- **Loneliness** — social isolation is as deadly as smoking 15 cigarettes a day
- **Fragmented communication** — neighbors, family, caregivers, and municipalities don't share a common system

The infrastructure to keep seniors safe at home simply doesn't exist yet.

---

## The Solution: Nachbar.io

A platform that turns neighborhoods into care networks. Nachbar.io connects **seniors**, **neighbors**, **families**, **caregivers**, and **municipalities** through a single system — combining a modern web platform with dedicated hardware terminals for people who can't use smartphones.

### How It Works

1. **Neighborhoods sign up** as a group (invite-only, verified households)
2. **Seniors get a simple terminal** — a physical device with 3 buttons (SOS, Check-in, Status)
3. **Neighbors coordinate** through the web app — alerts, help requests, events, shared resources
4. **Caregivers get dashboards** — medication tracking, appointment management, care documentation
5. **Families stay informed** — real-time status, check-in confirmations, emergency escalation

The key insight: **the neighborhood is the smallest and most effective unit of care**. Nachbar.io makes that network visible, organized, and reliable.

---

## What's Already Built

This is not a slide deck. The system is implemented and running.

### Web Platform (Next.js + TypeScript + Supabase)

| Category | What Exists |
|----------|-------------|
| **API Endpoints** | 38 production routes across care, community, news, push, device, and admin modules |
| **Database** | 44 tables with Row-Level Security, 33 migrations deployed |
| **Care Module** | SOS alerts with escalation, daily check-ins, medication tracking with reminders, appointment management, helper network, care reports (PDF), audit logging, encrypted care data |
| **Community** | Alerts, help requests, events, marketplace, lending library, lost & found, polls, direct messaging, package reception, noise board |
| **Admin** | User management, household management, invite codes, content moderation, news management, push broadcast, system health monitoring, activity feed |
| **Map** | Interactive SVG-based neighborhood map with 76 houses across 3 streets |
| **Infrastructure** | Web Push notifications, PWA with offline support, Capacitor (Android), subscription billing with feature gates |
| **Quality** | Unit tests (Vitest), E2E tests (Playwright), ESLint, TypeScript strict mode |

### Hardware Terminal (ESP32-S3 + E-Paper)

| Component | Status |
|-----------|--------|
| **Device** | Seeed reTerminal E1001 — ESP32-S3, 7.5" E-Paper (800x480), 3 physical buttons |
| **Firmware** | PlatformIO/Arduino, WiFi auto-connect, NTP time sync, HTTP API client |
| **Screens** | Home (weather, time, check-in status, message preview), Alert view (category, description, word-wrap), Emergency (112 call prompt, maximum contrast), Check-in confirmation |
| **Integration** | Device token auth, status polling (adaptive intervals), check-in API, alert acknowledgment |
| **UX** | Designed for seniors — large text, high contrast mono display, 3-button navigation, audible feedback |

### Documentation

16 concept documents covering product vision, target audience, feature modules, UX concept, GDPR compliance, technical architecture, data model, MVP definition, roadmap, monetization, risk analysis, branding, and reputation system. Plus technical docs: API reference, database schema, care workflows, architecture guide, deployment guide, pilot readiness checklist.

---

## Technology Stack

```
Frontend:       Next.js 16  |  React 19  |  TypeScript 5
Styling:        Tailwind CSS 4  |  shadcn/ui 4
Backend:        Supabase (PostgreSQL + Auth + Realtime + Storage)
Hosting:        Vercel (Frontend)  |  Supabase Cloud EU Frankfurt (Backend)
Push:           Web Push API + Service Worker (no third-party dependency)
AI:             Claude API (Haiku) for news aggregation
Testing:        Vitest + React Testing Library + Playwright
Mobile:         Capacitor (Android)
Hardware:       ESP32-S3 + GxEPD2 (E-Paper) + ArduinoJson + PlatformIO
Privacy:        GDPR-first design, RLS on all tables, EU data residency
```

---

## Market & Vision

### Pilot
- **Location:** Bad Saeckingen, Germany (3 streets, ~30-40 households)
- **Phase:** Technical MVP complete, preparing for real-world pilot

### Roadmap

| Phase | Scope | Focus |
|-------|-------|-------|
| **1 — Pilot** | 1 neighborhood, 30-40 households | Validate core features, refine UX with real seniors |
| **2 — Multi-neighborhood** | 5-10 neighborhoods in 2-3 cities | Scalability, onboarding automation, municipal partnerships |
| **3 — City-wide** | Full city deployments | Municipal smart-city integration, care service partnerships |
| **4 — Platform** | Multi-city, B2B SaaS | White-label for municipalities, care providers, housing companies |

### Revenue Model
- Sponsored model in pilot phase (local businesses, municipality)
- B2B SaaS for care organizations and municipalities
- Hardware terminal sales/leasing
- Premium features for professional caregivers

### Deployment Scenarios
- Residential neighborhoods
- Senior housing complexes
- Assisted living environments
- Municipal smart-city programs
- Care service provider networks

---

## Open Roles

We're looking for people who want to build something that matters. Every role has direct impact on the lives of real people in real neighborhoods.

### Software Engineers (Full-Stack / Frontend / Backend)

**What you'd work on:**
- Next.js App Router with TypeScript — server components, API routes, real-time features
- Supabase integration — PostgreSQL, Row-Level Security, Edge Functions
- Care workflows — medication tracking, emergency escalation, check-in monitoring
- PWA features — offline support, push notifications, installability
- Admin dashboards — analytics, content moderation, system health

**What we need:**
- TypeScript and React experience
- Interest in building accessible, senior-friendly interfaces
- Comfort with PostgreSQL and API design
- Bonus: Supabase, Tailwind CSS, Playwright experience

---

### Embedded Engineers

**What you'd work on:**
- ESP32-S3 firmware for the senior terminal (PlatformIO/Arduino)
- E-Paper display rendering — optimized layouts for 800x480 mono display
- Hardware integration — buttons, buzzer, LED feedback, power management
- OTA firmware updates
- New sensor integrations (environmental, motion, health)
- Production readiness — reliability, error recovery, watchdog timers

**What we need:**
- C/C++ embedded development experience
- ESP32 or similar microcontroller experience
- Interest in IoT and assistive technology
- Bonus: E-Paper displays, low-power design, PlatformIO

---

### UX / UI Designers

**What you'd work on:**
- Senior-accessible interface design (WCAG AAA, 80px touch targets, high contrast)
- E-Paper UI design (monochrome, no animations, limited refresh)
- Information architecture for care workflows
- User research with elderly participants
- Design system maintenance (8px grid, Inter font, defined color palette)

**What we need:**
- Experience designing for accessibility or elderly users
- Understanding of cognitive load reduction
- Ability to design within strict constraints (mono display, 3 buttons)
- Bonus: German language skills, care-tech domain knowledge

---

### Care-Tech / Domain Experts

**What you'd work on:**
- Care workflow design — how check-ins, escalation, and medication tracking should actually work
- Regulatory compliance — German care regulations, data protection requirements
- Municipal partnerships — integration with existing care infrastructure
- User research — interviews with seniors, caregivers, and municipal stakeholders
- Pilot coordination — onboarding households, training, feedback collection

**What we need:**
- Knowledge of elderly care systems (Germany preferred)
- Understanding of GDPR in healthcare context
- Experience with municipal or social service organizations
- Bonus: Nursing/care background, gerontology, social work

---

### Co-Founders / Early Team

**What we're looking for:**
- Someone who sees the same problem and wants to solve it
- Technical or business background (ideally complementary to existing skills)
- Willingness to work in the messy early stage
- Located in or willing to relocate to southern Germany (or remote with regular visits)
- Equity-based compensation with path to funding

**What you'd get:**
- Co-founder equity stake
- Direct influence on product, strategy, and company direction
- A codebase that already works — not starting from zero
- A pilot neighborhood ready for real-world validation

---

### Open-Source Contributors

The platform is being considered for partial open-source release. Areas where contributors could help:

- **Senior UI component library** — accessible React components for elderly users
- **E-Paper rendering engine** — optimized text layout for monochrome displays
- **Care protocol implementations** — standardized check-in, escalation, and medication workflows
- **Localization** — German is primary, but the architecture supports multi-language
- **Testing** — accessibility audits, E2E test coverage, device testing
- **Documentation** — API docs, deployment guides, contributor guides

---

## Why Join Now

1. **It's real.** 38 API endpoints, 44 database tables, working firmware on real hardware. This isn't a pitch deck — it's a running system.

2. **The timing is right.** Europe's aging population is the defining demographic challenge of the next 20 years. Digital care infrastructure is still in its infancy.

3. **The approach is different.** Most care-tech focuses on institutions. Nachbar.io focuses on neighborhoods — the most natural and cost-effective unit of care.

4. **The tech is modern.** Next.js 16, React 19, TypeScript, Supabase, ESP32-S3, E-Paper. No legacy code. Clean architecture. Good documentation.

5. **Privacy is built in.** GDPR-first design with Row-Level Security, EU data residency, encrypted care data. Not bolted on after the fact.

6. **You'd have real impact.** Every feature you build will be used by real seniors in a real neighborhood. The feedback loop is weeks, not years.

---

## Technical Highlights for Engineers

```
nachbar-io/
  app/
    (app)/              # 20+ feature modules (dashboard, care, map, admin...)
    api/                # 38 API routes
  components/           # 30+ React components (map, emergency, senior UI...)
  lib/                  # Shared utilities, Supabase client, encryption
  supabase/
    migrations/         # 33 SQL migrations (full schema + RLS policies)
  public/               # Static assets, PWA manifest

nachbar-companion/      # ESP32-S3 firmware (PlatformIO)
  src/
    main.cpp            # Entry point, setup, event loop
    state.cpp           # State machine (HOME, ALERT, EMERGENCY, CHECKIN)
    api_client.cpp      # HTTP client with auto HTTPS, JSON parsing
    display.cpp         # E-Paper rendering (GxEPD2, FreeSans fonts)
    input.cpp           # 3-button polling with debounce
    screens/            # Screen renderers (home, alert, emergency, checkin)

docs/                   # 16 concept docs + technical docs
```

### Code Quality Indicators
- TypeScript strict mode throughout
- Row-Level Security on every database table
- Unit tests (Vitest) + E2E tests (Playwright)
- ESLint enforced
- Modular API architecture (each route is self-contained)
- Adaptive polling (day/night/alert intervals)
- Event-driven state machine on hardware

---

## Contact

Interested? Want to learn more, contribute, or explore co-founding?

**Project:** Nachbar.io
**Location:** Bad Saeckingen, Germany
**Stage:** Pre-seed / Technical MVP

<!-- Add your contact details here -->
[Your Name]
[Email]
[LinkedIn / GitHub]

---

*This document was generated from the actual codebase and project documentation of Nachbar.io.*
*Last updated: March 2026*
