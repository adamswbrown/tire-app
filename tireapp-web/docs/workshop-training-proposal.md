# Workshop Training Proposal: Using the TIRE Assessment Tool to Drive Partner Skill-Up

> **Purpose**: Evaluate how the TIRE Application Assessment Tool can be leveraged to run guided workshops that train partners and consultants to conduct more effective client conversations during application assessments.

---

## 1. Executive Summary

The TIRE Application Assessment Tool already encodes significant domain expertise — 49 weighted strategy questions, expert-authored guidance text ("sample drivers"), a structured two-phase assessment framework, and an algorithmic scoring engine. Today, this knowledge is used solely for data capture and placement calculation.

**The opportunity**: Repurpose this same platform as a structured training environment that teaches partners not just *what* to ask, but *how* to have the conversation — how to probe, how to interpret vague answers, and how to guide clients toward accurate self-assessment.

**Expected outcomes**:
- **Consistent assessment quality** across all partners, regardless of experience level
- **Faster partner onboarding** — new consultants can practice before their first live engagement
- **Better client outcomes** — higher-quality assessments lead to more accurate TIRE placements and better migration strategies
- **Scalable training** — workshops can run with minimal facilitator overhead once the tool supports it

This proposal outlines a four-phase approach, starting with quick wins that leverage existing content and progressing to AI-powered coaching capabilities.

---

## 2. Current State Analysis — What the App Already Provides

Before building anything new, it is worth recognising what the TIRE app already brings to a training context:

### 2.1 Structured Two-Phase Assessment Framework

The app enforces a deliberate two-phase conversation flow:

| Phase | Purpose | Question Count | What It Teaches |
|-------|---------|---------------|-----------------|
| **App Questions** (Phase 1) | Gather factual application data | 26 questions across 6 sections | How to conduct a discovery interview — identifying stakeholders, technical architecture, business criticality, and risk profile |
| **Strategy Questions** (Phase 2) | Determine TIRE placement | 49 weighted questions across 5 TIRE categories | How to assess an application strategically — evaluating stability, cost/value, modernisation potential, and competitive advantage |

This sequence mirrors the real consulting engagement: first understand the facts, then make the strategic assessment. Partners who follow this flow are already learning the right conversation structure.

### 2.2 Expert-Authored Coaching Content (Currently Hidden)

Every strategy question includes a `sampleDrivers` field containing expert-written guidance explaining *why* the question matters and what a good answer looks like. Examples:

| Question | Sample Driver (Expert Guidance) |
|----------|-------------------------------|
| *"Is the current system stable and meeting our basic operational needs?"* | "Stability and Minimal Impact: If a system or application is stable, reliable, and requires minimal maintenance, a company might choose to tolerate it. The system might not be cutting-edge, but it's fulfilling its intended purpose without causing disruptions." |
| *"Is this system crucial to our core business functions?"* | "Business-Critical: If a system is vital to the core operations of the business, investing in its improvement or upgrade becomes essential..." |
| *"Does the cost to run the system outweigh the value to the organisation?"* | "Value to the business..." |

**This content is not currently surfaced in the assessment UI.** It exists in the data but is not shown to the consultant during the assessment. Surfacing it is the single highest-value, lowest-effort improvement.

### 2.3 Weighted Scoring Encodes Expert Priorities

Each strategy question carries a weight (2-5) that reflects its importance to TIRE placement. The weight distribution teaches partners what matters most:

| Weight | Meaning | Count | Example |
|--------|---------|-------|---------|
| 5 | Critical factor | ~18 questions | "Is the current system stable?", "Would migration benefits outweigh costs?" |
| 4 | Important factor | ~14 questions | "Could enhancements lead to increased productivity?", "Is the TCO justified?" |
| 3 | Contributing factor | ~14 questions | "Are users satisfied?", "Are there integration opportunities?" |
| 2 | Minor factor | ~3 questions | "Does the system lack integration capabilities?" |

Partners who understand the weighting learn which conversation topics to spend the most time on.

### 2.4 Conditional Question Paths

The App Questions phase adapts based on whether an application is COTS/ISV or custom-built — a 7-question "COTS Details" section appears only when relevant. This demonstrates a principle partners need to learn: **adapt the conversation to the application type**.

### 2.5 Real-Time Scoring Feedback

The strategy questions form already shows live TIRE score updates as answers are entered. Partners can see how each answer shifts placement — this is already a learning mechanism that shows how individual responses impact the overall recommendation.

### 2.6 Key Insight

> The app captures **what** to ask but does not teach **how** to ask it. The assessment framework provides structure; what is missing is the conversational skill layer — coaching on how to phrase questions naturally, how to probe vague responses, how to handle resistance, and how to translate client language into accurate TIRE answers.

---

## 3. Proposed Enhancement Phases

### Phase 1: Conversation Guide Enhancement (Quick Win)

**Effort**: 1-2 weeks | **Impact**: High | **Dependencies**: None

#### What It Does

Transform the assessment tool from a data-entry form into a guided conversation tool by surfacing the coaching content that already exists and adding conversation-specific guidance.

#### Features

**A) Show "Conversation Coach" Cards**

During the strategy assessment, each question gets an expandable coaching panel showing:

- **Why this matters** — the existing `sampleDrivers` text, reframed as conversation context
- **How to ask it** — 2-3 natural conversation phrasings of the formal question
- **What good looks like** — example client responses that indicate Yes, No, or Partial
- **Red flags** — signs that the client may not fully understand the question or is giving an inaccurate answer
- **Follow-up probes** — questions to dig deeper when the initial answer is vague

Example for the question *"Is the current system stable and meeting our basic operational needs?"*:

> **How to ask it**:
> - "When was the last time this system had an unplanned outage? What happened?"
> - "How would you describe the day-to-day reliability? Any recurring pain points?"
> - "If this system went down tomorrow, what would the impact be?"
>
> **What good looks like**:
> - **Yes**: "It's been solid for years. We had one incident last quarter but it was resolved quickly."
> - **Partial**: "It mostly works, but we get complaints about slowness during month-end processing."
> - **No**: "We have weekly issues. The team spends significant time firefighting."
>
> **Red flags**:
> - Client says "it's fine" without specifics — probe for concrete examples
> - Client defers to someone else — they may not be the right stakeholder for this question
>
> **Follow-ups**:
> - "How many support tickets has this system generated in the last 6 months?"
> - "Is there a formal SLA, and is the system meeting it?"

**B) Workshop Mode Toggle**

A toggle (available to Admin and Consultant roles) that:
- Shows conversation coach cards expanded by default (collapsed in normal assessment mode)
- Highlights question weights visually so partners learn relative importance
- Adds a "Facilitator Notes" field per question for workshop leaders to annotate

**C) Question Weight Visualisation**

Display the weight of each question as a visual indicator (e.g., importance dots or a bar), so partners develop intuition for which topics deserve the deepest conversation.

#### Value for Workshops

A facilitator can walk partners through a live assessment with coaching cards visible, discussing each question's conversation approach before the partner attempts it. Partners can then toggle workshop mode off when they feel confident.

---

### Phase 2: Practice Scenarios with Expert Baselines

**Effort**: 2-3 weeks | **Impact**: High | **Dependencies**: Scenario content authored by domain experts

#### What It Does

Create a safe practice environment where partners can assess fictional applications and compare their work against an expert baseline — like a flight simulator for TIRE assessments.

#### Features

**A) Pre-Built Practice Scenarios**

4-6 fictional application profiles representing common archetypes that partners will encounter:

| Scenario | Description | Expected Placement | Difficulty |
|----------|-------------|-------------------|------------|
| **Legacy Payroll ERP** | 15-year-old on-prem system, stable but on unsupported SQL Server. 500 users. Business-critical. | Tolerate (with Replace close) | Beginner |
| **Customer Portal (Custom)** | In-house built 5 years ago. Growing user base, performance issues at scale. Strategic to business. | Invest | Beginner |
| **Cloud-native CRM** | Modern SaaS tool, well-integrated, users satisfied, costs reasonable. | Retain | Beginner |
| **Legacy Reporting Tool** | Built on Access databases. 12 users. Same function available in existing BI platform. | Eliminate | Intermediate |
| **On-Prem File Server** | Heavy CAPEX, remote access issues, growing storage needs. Cloud alternatives available. | Replace | Intermediate |
| **The Ambiguous One** | Multi-purpose middleware. Some teams love it, others have moved on. Scores close across categories. | Tiebreak / Discussion | Advanced |

Each scenario includes:
- A narrative "client brief" (what the fictional client would tell the partner)
- Pre-filled App Questions answers (the factual context)
- Expert-completed Strategy Questions with reasoning for each answer
- The expected TIRE placement with score breakdown

**B) Practice Flow**

1. Partner selects a scenario and reads the client brief
2. Partner completes the strategy assessment as if conducting a real engagement
3. On completion, a **Comparison View** shows:
   - Side-by-side: partner's answers vs expert baseline
   - Agreement score (e.g., "You matched the expert on 41/49 questions")
   - Highlighted divergences with expert reasoning
   - TIRE score comparison chart
   - Overall placement: did the partner reach the correct conclusion?

**C) Difficulty Progression**

- **Beginner**: Clear-cut scenarios where the TIRE placement is obvious
- **Intermediate**: Scenarios with some ambiguity requiring deeper probing
- **Advanced**: Tiebreak scenarios where multiple placements are defensible, requiring the partner to articulate their reasoning

#### Value for Workshops

Partners practice in a risk-free environment before touching real client data. Facilitators can assign scenarios of increasing difficulty and debrief as a group — discussing why the expert answered differently and what conversation approach would have uncovered the right information.

---

### Phase 3: AI-Powered Conversation Coaching

**Effort**: 3-4 weeks | **Impact**: Very High | **Dependencies**: Claude API access, Phase 2 scenarios

#### What It Does

Integrate AI (Claude) to simulate realistic client conversations for role-play practice, and to provide intelligent feedback on assessment quality.

#### Features

**A) Client Simulator (Role-Play Mode)**

A chat interface where Claude plays the role of a client stakeholder for a selected practice scenario. The partner conducts the interview conversationally rather than filling in a form.

How it works:
1. Partner selects a practice scenario
2. AI assumes a client persona (e.g., protective IT manager, cost-focused CFO, disengaged business owner)
3. Partner asks questions naturally via chat
4. AI responds in-character — sometimes forthcoming, sometimes vague, sometimes resistant
5. AI has "hidden" information that only surfaces if the partner asks the right probing questions
6. After the conversation, the partner fills in the strategy assessment based on what they learned
7. Comparison view shows how well they extracted the information vs what was available

**Client persona examples**:

| Persona | Behaviour | Training Purpose |
|---------|-----------|-----------------|
| **Cooperative Technical Lead** | Gives detailed, accurate answers freely | Baseline — can the partner ask the right questions? |
| **Busy Executive** | Short answers, avoids technical detail, checks the time | Teaches partners to respect stakeholder time and prioritise |
| **Defensive System Owner** | Protective of their system, downplays issues | Teaches partners to probe diplomatically and cross-reference |
| **Non-Technical Business User** | Describes symptoms not causes, uses business language | Teaches partners to translate business language into technical assessment |

**B) Post-Conversation Analysis**

After a role-play session, the AI analyses the conversation and provides structured feedback:

- **Coverage score**: Which of the 49 strategy questions were effectively addressed through the conversation?
- **Missed opportunities**: Important topics the partner did not explore
- **Communication quality**: Was the partner clear, empathetic, and professional? Did they adapt to the persona?
- **Probing effectiveness**: Did the partner dig deeper when the AI gave vague answers, or did they accept surface-level responses?
- **Recommendation accuracy**: Based on what was learned, did the partner reach the correct TIRE placement?

**C) Live Assessment Copilot (Optional)**

During real client assessments, an optional AI sidebar that provides:
- Suggested follow-up questions based on answers given so far
- Inconsistency alerts (e.g., client marked system as "stable" but also noted "weekly outages")
- Confidence indicator ("Based on 30/49 answers, placement is likely Replace at 82% confidence — 4 critical questions remain")
- Contextual tips from the conversation guide

This feature should be positioned as an aid, not a replacement for the partner's judgment.

#### Value for Workshops

Role-play with AI removes the need for facilitators to play client roles (freeing them to observe and coach). Partners get unlimited practice with varied personas. The post-conversation analysis provides objective feedback that complements facilitator observation.

---

### Phase 4: Partner Performance Analytics

**Effort**: 2-3 weeks | **Impact**: Medium | **Dependencies**: Phase 2 (practice scenarios)

#### What It Does

Track partner improvement over time and give workshop facilitators visibility into cohort-wide skill gaps.

#### Features

**A) Individual Partner Dashboard**

Each partner sees:
- Practice attempts completed (total and per scenario)
- Expert match rate over time (trend line showing improvement)
- Placement accuracy (% of times they reached the correct TIRE category)
- Completion thoroughness (do they fill in all questions and notes?)
- Weak areas — which TIRE categories or question dimensions they consistently get wrong
- Time per assessment (are they becoming more efficient?)

**B) Facilitator / Cohort Dashboard**

Workshop facilitators see:
- Aggregate performance across all participants
- Common knowledge gaps (e.g., "60% of partners struggle with Invest vs Retain distinction")
- Scenario difficulty calibration (is a scenario too easy or too hard?)
- Per-participant progress for accountability
- Exportable training reports for management

**C) Workshop Session Management**

Facilitators can:
- Create a named workshop session and invite participants
- Assign specific scenarios in a specific order
- Set time limits per scenario
- View live progress during the session (who is done, who is stuck)
- Trigger a "reveal" moment where expert answers are shown to everyone simultaneously for group discussion
- Record session notes and outcomes

#### Value for Workshops

Facilitators can run data-driven workshops — identifying where the group needs more practice, tracking improvement across multiple sessions, and providing management with evidence of training effectiveness.

---

## 4. Workshop Delivery Model

### Suggested Workshop Format: Half-Day (4 hours)

| Time | Activity | Tool Feature Used |
|------|----------|-------------------|
| 0:00 - 0:30 | **Introduction**: TIRE framework overview, scoring mechanics, what makes a good assessment | Existing: show strategy questions, explain weights |
| 0:30 - 1:15 | **Guided Walk-Through**: Facilitator leads the group through one scenario with conversation coach cards visible, discussing each question's approach | Phase 1: Workshop mode with coaching cards |
| 1:15 - 1:30 | **Break** | |
| 1:30 - 2:30 | **Solo Practice**: Each partner completes a beginner scenario independently | Phase 2: Practice scenarios |
| 2:30 - 3:00 | **Group Debrief**: Compare partner answers to expert baseline, discuss divergences | Phase 2: Comparison view |
| 3:00 - 3:45 | **Role-Play Practice**: Partners conduct AI-simulated client interviews in pairs, then review feedback | Phase 3: AI client simulator |
| 3:45 - 4:00 | **Wrap-Up**: Review individual performance dashboards, identify areas for continued practice | Phase 4: Partner dashboard |

### Suggested Workshop Format: Full-Day (7 hours)

Extends the half-day with:
- Multiple practice scenarios of increasing difficulty (beginner through advanced)
- Tiebreak scenario exercise with group debate on correct placement
- Multiple AI role-play sessions with different client personas
- Paired exercises where partners take turns being consultant and observer
- End-of-day assessment: a "certification scenario" that partners must complete to a minimum expert-match threshold

### Ongoing Practice (Between Workshops)

Partners should have continuous access to:
- Practice scenarios to attempt at their own pace
- AI role-play sessions for ad-hoc practice
- Their personal performance dashboard to track improvement
- New scenarios added periodically to prevent memorisation

---

## 5. Implementation Roadmap

```
Month 1          Month 2          Month 3          Month 4
|                |                |                |
|-- Phase 1 ----|                |                |
|  Conversation  |-- Phase 2 ----|                |
|  Guides        |  Practice      |-- Phase 3 ----|-- Phase 4 --|
|  Workshop Mode |  Scenarios     |  AI Coaching   |  Analytics  |
|                |  Comparison    |  Role-Play     |  Dashboards |
|                |  View          |  Analysis      |  Sessions   |
```

| Phase | Effort | Prerequisites | Key Deliverable |
|-------|--------|---------------|-----------------|
| **Phase 1** | 1-2 weeks | None | Conversation coaching cards, workshop mode toggle |
| **Phase 2** | 2-3 weeks | Phase 1 + scenario content from domain experts | Practice scenarios, expert comparison view |
| **Phase 3** | 3-4 weeks | Phase 2 + Claude API access | AI client simulator, post-conversation analysis |
| **Phase 4** | 2-3 weeks | Phase 2 | Partner and facilitator dashboards, session management |

Phases 3 and 4 can be developed in parallel once Phase 2 is complete.

**Total estimated effort**: 8-12 weeks for all phases.

---

## 6. Technical Considerations

### Data Model Extensions

| Phase | Change | Description |
|-------|--------|-------------|
| Phase 1 | Extend strategy question schema | Add `conversationGuide` object to each question in `strategy-questions.json` |
| Phase 2 | New `PracticeScenario` model | Stores scenario name, app context, expert answers, expected placement, difficulty |
| Phase 2 | New `PracticeAttempt` model | Tracks partner attempts with agreement score, placement accuracy, timestamps |
| Phase 3 | New AI API routes | Chat endpoint (Claude API proxy), analysis endpoint |
| Phase 4 | New `WorkshopSession` model | Session management with facilitator, participants, assigned scenarios |

### Architecture Approach

- Workshop features live in a parallel route tree (`/app/workshop/...`) to keep the production assessment flow clean
- Practice assessments are flagged (`isTraining: true`) so they do not pollute production analytics
- AI features degrade gracefully — if no API key is configured, workshop mode still works without the chat and analysis features
- All new features can be gated behind feature flags for staged rollout

### Integration with Existing Features

- The existing scoring engine (`tire-scoring.ts`) is reused for both practice and comparison scoring
- The existing questionnaire components are reused in workshop mode with additional coaching overlays
- The existing analytics dashboard can be extended (not replaced) with training-specific metrics
- The existing role system (Admin, Consultant, Viewer) can be extended with a Trainer role

---

## 7. Success Metrics

| Metric | How to Measure | Target |
|--------|---------------|--------|
| Assessment consistency | Standard deviation of expert-match scores across partners | < 10% variance |
| Partner confidence | Pre/post-workshop self-assessment survey | > 80% report increased confidence |
| Placement accuracy | % of practice scenarios where partner reaches correct TIRE placement | > 85% after 3 practice rounds |
| Conversation coverage | % of critical strategy questions effectively addressed in AI role-play | > 90% after training |
| Client satisfaction | Post-engagement client feedback on assessment quality | Measurable improvement vs pre-training baseline |
| Onboarding speed | Time from partner joining to first independent client assessment | Reduce by 40% |

---

## 8. Recommendation

**Start with Phase 1.** The conversation coaching content largely already exists in the `sampleDrivers` field — it just needs to be surfaced in the UI and supplemented with conversation-specific guidance. This delivers immediate training value with minimal development effort and no external dependencies.

Phase 2 (practice scenarios) should follow quickly, as it transforms the tool from a reference aid into an active training platform. The scenario content will need to be authored by experienced consultants — this should start in parallel with Phase 1 development.

Phases 3 and 4 represent the longer-term vision and should be pursued once the fundamentals are proven in real workshop sessions.
