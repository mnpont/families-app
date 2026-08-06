# Phase 2 — Additional Exercise/Practice Methods: Research & Complexity Evaluation

Scope: **research and evaluation only, no implementation.** This picks up where `docs/learning-science.md` and `docs/v2-plan.md` left off. Those docs already cover — and the app already ships — spaced repetition (SM-2), confidence self-rating, and contextual example sentences shown during review. `docs/v2-plan.md` Phase 2 additionally scoped production-mode typing and cloze fill-in-the-blank, which are not yet built (`ReviewLog.mode` reserves `'production'`/`'cloze'` but only `'recognition'` is ever written).

This doc does **not** re-cover any of that. It researches practice methods absent from the existing docs, then evaluates each one against what this specific codebase and its available tools can actually support today.

---

## Part 1 — Research: Practice Methods Not Yet Covered

### 1.1 Multiple-choice recognition with plausible distractors

A step between pure recognition (flip-to-reveal) and full production (typing): show the target word/sentence with 3-4 translation options, one correct. The research nuance that matters for design: **distractor quality determines the learning value**. Random distractors (unrelated words) make the task trivially easy and teach little; *semantically or grammatically plausible* distractors (same part of speech, same deck/topic, similar gender/register) force real discrimination and produce a testing-effect benefit closer to production tasks, without production's typing friction. This is a good "rung 2" between flip-cards and typed answers for a word early in its learning curve.

### 1.2 Sentence/word-order reconstruction (scrambled sentence)

Take a known sentence (e.g. the stored example sentence) and present its words shuffled; the learner reconstructs correct order by tapping/dragging words into place. This targets **syntax**, not vocabulary meaning — word order is exactly where German (verb-second, verb-final in subordinate clauses) and French (adjective placement, pronoun position) diverge most from English/Spanish, and word-order errors are a documented persistent error type in both languages' L2 learners even after vocabulary is well-known. It's a production task in the sense that the learner reconstructs form, but avoids spelling/typing friction (only ordering, not text entry), so it's lower-friction than typing while still being a strong retrieval activity.

### 1.3 Listening-based recall (dictation / audio recognition)

The learner hears the word or sentence (text-to-speech) and either types what they heard or matches it to a written option. This engages **dual coding** (Paivio): pairing verbal and auditory encoding of the same item produces a stronger, more retrievable memory trace than either channel alone, and it's the only practice mode in this list that trains listening comprehension specifically — a skill that reading/typing-based review never touches at all, and one where learners often report a large gap between "I can read/recall it" and "I can understand it spoken."

### 1.4 Speaking/pronunciation practice

The learner speaks the word or sentence aloud; the app judges correctness (via speech-to-text comparison) or simply lets the learner self-assess against a played reference. Output/articulatory practice is a distinct memory pathway from silent recall — the "production effect" literature (MacLeod et al.) shows that speaking words aloud during study measurably improves later recall vs. silent reading, independent of the testing effect. It's also the only mode addressing actual spoken production, which flashcards/typing never touch.

### 1.5 Grammatical-gender / article drills (language-specific, grammar-focused)

Distinct from vocabulary meaning: quiz specifically on **der/die/das** (German) or **le/la** (French) for a noun the learner already knows the meaning of. This targets a well-documented, persistently difficult feature for L2 learners of gendered languages — gender is largely arbitrary (not predictable from meaning) and adult L2 learners typically lag native speakers on gender-agreement accuracy long after vocabulary itself is solid. The second-language-acquisition literature on "focus on form" (Norris & Ortega's meta-analysis, among others) finds that explicit, isolated practice on a specific grammatical feature — interleaved with meaning-focused practice, not replacing it — produces measurably better accuracy on that feature than meaning-only practice alone, where gender errors simply never get corrective retrieval pressure.

### 1.6 Retrieval-format variation across reviews

Rather than one fixed exercise type per word, rotate which practice method is used for the *same* word across successive reviews (recognition this time, cloze next time, listening the time after). Building on "transfer-appropriate processing," varying the retrieval format forces a more flexible, generalizable memory representation instead of one narrowly tuned to a single question format — a risk with SRS apps that always quiz the same way, where learners can pattern-match the *format* rather than truly retrieve the *meaning*. This is a meta-level design principle more than a standalone exercise type — it's about how exercise types 1.1–1.5 (plus the already-planned production/cloze) get *scheduled* against each other, not a new mechanic itself.

### 1.7 Morphological/word-family expansion

Given a known word, teach its morphological relatives (e.g. German `sprechen` → `versprechen`, `besprechen`, `Gespräch`; a stem + affix family). Morphological awareness training is linked in the vocabulary-acquisition literature (Bauer & Nation's classic word-family framework, later corpus/L2 work building on it) to more efficient vocabulary growth than learning words as unrelated singletons, since a handful of productive affixes unlocks recognition of many related words at once. This is a genuinely new *content* dimension (not just a new quiz format) — it requires generating/curating the family relationships themselves.

### 1.8 Collocation / chunk-based practice

Practicing multi-word expressions ("make a decision," not "make" + "decision" separately) as a single retrieval unit, per the Lexical Approach (Lewis, 1993) and later corpus-linguistics-backed vocabulary research showing that a large share of fluent language use is prefabricated chunks, not word-by-word composition. The app already has a `phrase` word type in its data model, which is a natural (if currently unused for this purpose) hook — this would mostly be about treating `phrase`-typed entries as a distinct review mode rather than mixing them into single-word drills.

### 1.9 Elaborative interrogation / "why" prompts on grammar rules

Rather than only drilling word-level recall, periodically prompt a "why" question about a grammar point the learner just got wrong (e.g., after a gender miss: "why is this word feminine?" with a brief rule-based explanation, or a self-explanation prompt). Elaborative interrogation appears in Dunlosky et al.'s 2013 utility review of learning techniques as a technique with moderate, fairly reliable effect sizes for factual/conceptual material — it fits grammar-rule learning (a concept) better than raw vocabulary (an arbitrary pairing), which is why it's listed here as grammar-adjacent rather than a vocabulary technique.

### 1.10 Fluency/speed drills

A distinct, deliberately *un*-SRS-scheduled mode: rapid-fire review of already-mastered words under a time constraint, optimizing for automaticity/speed of retrieval rather than accuracy-driven interval scheduling. This targets a separate construct from what SM-2 optimizes for — Segalowitz's work on L2 fluency argues that accuracy and automaticity are separable and that accuracy-focused spaced practice alone under-trains speed of access, which matters for real-time language use (conversation) even once a word is "known."

### 1.11 Mnemonic keyword method

For words the learner repeatedly fails, offer (or LLM-generate) a keyword/imagery mnemonic — a memorable, often absurd association linking the target word's sound to a vivid image tied to its meaning. This is one of the most heavily studied vocabulary mnemonics (Atkinson & Raugh's original keyword-method studies, replicated widely) with a consistently demonstrated short-to-medium-term recall advantage, particularly useful as a *targeted* intervention for specific stubborn items (a `reviewCount` reset / repeated "again" grade is a natural trigger) rather than a blanket practice mode for every word.

### 1.12 Dual-coding image association

Pairing a word with a relevant image (rather than only its translation) during study/review. Paivio's dual-coding theory and a large body of follow-on vocabulary research consistently find an advantage for concrete, imageable vocabulary studied with an image present vs. text-only, though the effect is weaker/absent for abstract vocabulary where a meaningful image is hard to source. This is the most infrastructure-heavy item on this list (see Part 2) since nothing in the current schema or app touches images at all.

---

## Part 2 — Complexity Evaluation Against This Codebase

Evaluated against what actually exists today: React + TypeScript + Vite frontend; Supabase Postgres with RLS and an in-repo migration history (`migrations/001`–`014`); an SM-2 scheduler (`src/utils/scheduler.ts`) and review pipeline (`useReviewSession`/`vocabularyApi.fetchReviewSession`/`submitReview`) that already grade against `word_schedule_state` and log to `review_log`; a `ReviewLog.mode` enum already reserving `recognition`/`production`/`cloze`; nouns that already carry resolved `gender` (migration 014, `genderApi.ts`); example sentences already generated and stored per word via a working Supabase Edge Function pattern (`generate-example-sentence`, calling OpenAI server-side with `OPENAI_API_KEY` as a secret — the key never reaches the browser); and **no** existing audio or image infrastructure, though the browser's built-in Web Speech API (`SpeechSynthesis` for TTS, `SpeechRecognition`/`webkitSpeechRecognition` for STT) is free, keyless, and requires no backend at all.

The single biggest cost-reducer already in place: the LLM-generation pattern (Edge Function + `OPENAI_API_KEY` secret + JSON-mode prompt) is proven and reusable. Any exercise type needing generated content (distractors, cloze blanks, word families, mnemonics) is "write a new prompt + a new Edge Function following the existing template," not "stand up LLM infrastructure from scratch."

### Very Low complexity

**1.5 Gender/article drills.** The data (`words.gender`) already exists and is already populated at write-time for every eligible noun — this needs zero new data collection. A new review mode is: filter to gender-eligible words that have a resolved gender, show the noun, ask for der/die/das (or le/la), grade right/wrong. Could plug into the existing `ReviewCard`/grading pipeline almost as-is (it's still "show prompt, get answer, grade it"), or run as a lightweight separate mode outside the SM-2 queue entirely (gender mastery arguably doesn't need its own full spaced-repetition state — a simpler right/wrong tally may be enough to start). This is the standout "cheap and well-matched to this app specifically" item on the whole list, because the underlying feature (gender resolution) was already built for a different reason (the gender chip) and is sitting there unused for practice purposes.

### Low complexity

**1.2 Sentence/word-order reconstruction.** Every ingredient already exists: `ExampleSentence.text` is already stored per word (the same field the flashcard back already renders). The exercise is: split the stored sentence into tokens, shuffle client-side (`shuffleArray` already exists and is reused), render as tappable chips, compare the learner's ordering to the original. No new data, no new backend calls, no LLM needed — this is a new component plus a client-side ordering/compare function, wired into the existing `mode: 'cloze'`-adjacent review-log slot (or its own new mode value, a one-line schema addition to the `mode` enum/check constraint).

**1.1 Multiple-choice with distractors, cheap version.** A "good enough" distractor pool can be pulled from *other translations already in the same deck/language* (no generation needed) — genuinely plausible since same-deck words share topic/register by construction (the deck-grouping the app already has). This ships as a client-side query (words already fetched per language) + a selection component; it degrades gracefully to "less carefully chosen" distractors in a small deck, which is an acceptable v1 tradeoff. A future upgrade to LLM-selected/generated distractors (better semantic plausibility) reuses the same Edge Function pattern as sentence generation, at which point it moves toward "Medium."

### Medium complexity

**1.3 Listening-based recall.** No backend work needed — `window.speechSynthesis` is built into every major browser (Web Speech API), keyless, free, no Edge Function required. The real cost is voice/language coverage: quality and availability of German/French synthetic voices varies by browser/OS (particularly on iOS Safari and older Android WebViews), so this needs a fallback path (e.g., hide the mode, or fall back to a "no audio available" state) rather than assuming every learner's device has a usable voice for every target language. Moderate because of this device-variance testing surface, not because the API itself is complex.

**1.6 Retrieval-format variation.** Not a new exercise type, a scheduling change: once 2+ exercise types exist (recognition + at least one new mode), extend `submitReview`'s hardcoded `mode: 'recognition'` to record which mode was actually used, and add selection logic (random, or round-robin, or weighted by `reviewCount`) to `fetchReviewSession`/`useReviewSession` choosing which mode to serve for a given due card. Medium because it touches the core review pipeline (not purely additive like the exercise types above), but it's a modest, well-scoped change to code that already exists and already has the `mode` column ready for exactly this.

**1.8 Collocation/chunk practice.** The `phrase` word type already exists in `WORD_TYPES`; this is mostly "treat existing `phrase`-tagged entries as their own review-mode filter" rather than new data modeling. Medium rather than Low because it likely wants its own lightweight UI treatment (e.g., blanking one word of the chunk, similar to cloze) to be pedagogically distinct from just reviewing phrases as flashcards, which the app can already do today with zero changes.

**1.7 Morphological/word-family expansion.** Needs genuinely new content generation — no stem/affix/family data exists anywhere in the schema or seed data. Reuses the proven Edge Function + LLM pattern (a new prompt: "given this word, list N morphologically related words with glosses"), plus a small new table (or a `word_id -> related word_id` join, echoing the existing `DeckWord` join-table shape) and review-surfacing UI. Medium: the generation piece is cheap by the established pattern, but it's new schema plus a first LLM-grounded correctness question (will the model actually produce real morphological relatives reliably across German and French, not just "related-sounding" words) that needs some manual spot-checking before trusting it at scale, similar to how `batch-generate-sentences` needed to exist as a manual sweep/catch-up tool.

**1.11 Mnemonic keyword method.** Same LLM-generation pattern again ("given this word and its meaning, generate a keyword/imagery mnemonic"), triggered narrowly (e.g., on N consecutive "again" grades for a word) rather than for every word — which also keeps API cost bounded. Needs one new nullable text field (`words.mnemonic` or a small side table) and a UI surface (shown as an extra hint on the flashcard back, or a dedicated "stuck word" view). Medium mostly because "when to trigger generation" and "where to surface it without cluttering the core review flow" are real UX decisions, not because the generation step itself is hard.

### High complexity

**1.4 Speaking/pronunciation practice.** The STT half (`SpeechRecognition`/`webkitSpeechRecognition`) is far less consistently supported than TTS — it's essentially Chrome/Chromium-only in practice, absent or degraded in Safari/Firefox, and mobile browser support is patchy, which is a real problem for a PWA meant to work across whatever devices family members carry. Multilingual recognition accuracy (correctly transcribing German/French speech, not just English) adds another reliability gap. Even with recognition working, comparing transcribed speech to the target word needs fuzzy matching tuned for STT-specific error patterns (different from typo-tolerant text matching), and there's no existing infrastructure (no audio recording/storage, no STT service) to lean on. This is buildable, but the cross-browser support gap alone pushes it to High rather than Medium — it's the kind of feature that risks working great for the one person testing on desktop Chrome and silently not working for everyone else.

**1.12 Dual-coding image association.** The only item requiring genuinely new infrastructure the app has none of at all: an image-sourcing pipeline (a stock-photo/image-search API, or LLM image generation — both have cost, rate-limit, and licensing considerations a text-only Edge Function call doesn't), a new storage concern (Supabase Storage bucket, or hotlinked external URLs with their own reliability/CORS/hotlinking-policy risk), a new schema field, and new UI (image loading states, fallback for words with no good image, especially abstract vocabulary where dual-coding's own research shows the technique doesn't clearly help anyway). High complexity for a benefit that's also the most conditional one on this list (concrete vocabulary only).

**1.9 Elaborative interrogation / "why" prompts.** Two different implementations at very different costs. A *static* version (canned rule explanations per grammar pattern, e.g. a fixed explanation string for "der/die/das" categories) is closer to Low, but is really a content-authoring project (writing correct, well-scoped grammar explanations for every relevant pattern across German and French) rather than an engineering one, and doesn't scale automatically to new words the way everything else in this list does. A *dynamic* LLM-generated version ("explain why this specific word has this specific gender") is High: it needs open-ended natural-language *generation* that has to actually be linguistically correct per word (not just plausible-sounding — gender rules have real exceptions, and a wrong confident explanation is worse than no explanation), which is a materially harder correctness bar than the existing sentence-generation Edge Function ever had to clear.

**1.10 Fluency/speed drills.** Not hard technically (a timer, a rapid-fire card sequence, no new data), but it's High for a different reason: it's the one item that needs a *second, parallel* concept of "mastery" alongside SM-2's interval/ease state — deciding which words qualify as "known enough" to drill for speed (some derived threshold on `reviewCount`/`easeFactor`/`intervalDays`) and how (or whether) speed-drill performance feeds back into the SM-2 state without corrupting the spacing algorithm's own assumptions. That's a design question about how a second practice mode coexists with the existing scheduler's state model, not just a new screen — it risks quietly undermining the carefully-tuned scheduler in `src/utils/scheduler.ts` if wired in carelessly.

---

## Part 3 — Two Constraints That Cut Across All 12: Modality and Proficiency

Parts 1–2 evaluated each method as if every learner faced it the same way. Two real constraints change that, and both are cheap to state precisely because the app's data model already scopes everything by `languageId` — proficiency, in particular, isn't a single number for "the learner," it's a per-language fact (this project's own case: German B1+, French A1).

### 3.1 Text-only scope, for now

Three of the 12 depend on a modality this phase explicitly excludes: **1.3 Listening-based recall** (needs synthesized audio), **1.4 Speaking/pronunciation practice** (needs speech recognition), and **1.12 Dual-coding image association** (needs sourced images). None of that changes their research backing or their complexity rating in Part 2 — they're simply out of scope for this pass, not ruled out permanently. That leaves **9 text-only candidates** to actually sequence from: 1.1, 1.2, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11.

### 3.2 Proficiency is per-language, not per-learner

Because every word, deck, and review session already carries a `languageId`, the natural home for a proficiency setting is the same place — not a single app-wide "skill level," which would be actively wrong the moment someone (or some family member) is learning two languages at different stages. The concrete shape:

- **Storage:** a small new table, e.g. `language_level(language_id, owner_id, level)`, following the exact owner-scoping precedent already established by `decks.owner_id` (migration `006`) and `review_log.user_id` (migration `009`) — same shape, same rationale, nothing novel. `level` can be as simple as an integer (1-5) or a CEFR string; either is a one-column addition.
- **Surface:** a slider on the future practice screen, next to the language selector, read/written through a couple of API calls in the same style as `fetchLanguages`/`createLanguage` in `src/lib/vocabularyApi.ts`.
- **Persistence:** Supabase, not `localStorage` — the app deliberately avoids localStorage-only state (`docs/audit.md` flags exactly this pattern, `emptyFamilies`, as a bug: it silently diverges across devices). A level setting that only lived on one browser would have the same problem.

On its own this is **Low complexity** — comparable to the gender-column migration (`014_add_words_gender.sql`) plus a form control. The catch is sequencing, not difficulty: a slider has nothing to gate or tune until at least two text-only exercise modes exist side by side. Building it before that point is inert UI. **Build it after the first 2-3 new modes ship, not before.**

### 3.3 How the 9 text-only methods relate to level

Once the slider exists, it can do two different jobs depending on the method — some methods just need a *difficulty knob* on an otherwise-identical mechanic, others only make sense to *offer at all* past a certain level, and a couple work the same regardless of level entirely:

| Method | Level relationship | Why |
|---|---|---|
| 1.5 Gender/article drill | **Level-agnostic** | Gender errors are documented as persisting from early through advanced learners — it's never a "beginner-only" or "advanced-only" drill, it's just always relevant. No tuning needed. |
| 1.6 Retrieval-format variation | **Level-agnostic** | A scheduling principle, not a technique itself — it just decides which *other* modes to rotate through, so it applies unchanged at any level. |
| 1.2 Word-order reconstruction | **Level-tunable** | The mechanic doesn't change — only sentence complexity does (short/simple for A1, subordinate clauses and verb-final constructions for B1+), and that's driven by which stored example sentences get selected, not new logic. |
| 1.1 Multiple-choice (distractors) | **Level-tunable** | Distractor *closeness* is the knob — obviously-wrong options at A1, near-synonyms/same-gender nouns at B1+. Same component, different selection rule. |
| 1.8 Collocation/chunk practice | **Level-tunable** | Survival-level fixed phrases work from A1; more nuanced/idiomatic collocations are more of a B1+ payoff. |
| 1.11 Mnemonic keyword method | **Level-gated — early** | The original keyword-method research shows its biggest advantage during *initial* encoding of new vocabulary; once a word is well-established (which is more likely at higher levels), the technique has less left to offer. |
| 1.7 Morphological word-family expansion | **Level-gated — later** | Needs an existing base vocabulary for affix patterns to be recognizable at all; low payoff for someone who barely has root words yet. |
| 1.9 Elaborative interrogation ("why" prompts) | **Level-gated — later** | Explaining *why* a grammar rule applies presumes the learner already has the foundational concept it's explaining — thin value before that exists. |
| 1.10 Fluency/speed drills | **Level-gated — later** | By definition only operates on already-mastered words; meaningless for a learner who doesn't have a mastered pool yet (i.e., not a true beginner in that language). |

Practically, this means the same feature set serves German (B1+) and French (A1) very differently for this project specifically: French would mostly surface the level-agnostic pair plus mnemonics, while German would additionally unlock word-family expansion, elaborative interrogation, and fluency drills once built — without either language needing its own code path, just a different `level` value gating the same modes.

---

## Summary Table

| # | Method | Modality | New data/infra needed | Level relationship | Complexity |
|---|---|---|---|---|---|
| 1.5 | Gender/article drill | Text | None — `words.gender` already exists | Level-agnostic | **Very Low** |
| 1.2 | Word-order reconstruction | Text | None — `ExampleSentence` already exists | Level-tunable | **Low** |
| 1.1 | Multiple-choice (deck-sourced distractors) | Text | None | Level-tunable | **Low** |
| 1.3 | Listening-based recall | Audio *(out of scope for now)* | None (Web Speech API, client-only) | — | **Medium** (device/voice coverage) |
| 1.6 | Retrieval-format variation | Text | `mode` column already exists | Level-agnostic | **Medium** |
| 1.8 | Collocation/chunk practice | Text | None — `phrase` word type already exists | Level-tunable | **Medium** |
| 1.7 | Morphological word-family expansion | Text | New join table + LLM prompt | Level-gated (later) | **Medium** |
| 1.11 | Mnemonic keyword method | Text | New nullable field + LLM prompt | Level-gated (early) | **Medium** |
| 1.4 | Speaking/pronunciation practice | Audio *(out of scope for now)* | STT (inconsistent browser support) | — | **High** |
| 1.12 | Dual-coding image association | Image *(out of scope for now)* | Image API/storage, new field, new UI | — | **High** |
| 1.9 | Elaborative interrogation ("why" prompts) | Text | Static: content authoring. Dynamic: LLM correctness bar | Level-gated (later) | **High** |
| 1.10 | Fluency/speed drills | Text | New "mastery" concept alongside SM-2 state | Level-gated (later) | **High** |

*(1.9's static/canned variant is closer to Low-Medium as a content-writing task, but doesn't scale like the others — flagged above rather than in the main list since it isn't really an engineering complexity question.)*

## Suggested next step

Given the Very Low / Low tier is unusually well-matched to work already sitting in this codebase, the highest-leverage next slice is likely **1.5 (gender drill) + 1.2 (word-order reconstruction) + 1.1 (deck-sourced multiple choice)** — none require new schema, new infrastructure, or new LLM calls, all three reuse data and utilities that already exist for other reasons, and all three are text-only and either level-agnostic or level-tunable, so they're useful for German and French alike from day one, before the level slider (3.2) even exists. The slider becomes worth building once a second wave of modes — likely drawn from the Medium tier, chosen per-language against the level-relationship table in 3.3 — is ready to be gated by it. This doc stops short of proposing a full build plan or timeline beyond that observation — that's a follow-up decision, not a research one.
