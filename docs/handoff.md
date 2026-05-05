# Session Handoff

**Date**: 2026-05-05
**Repo**: https://github.com/ugurozan-eng/FlowStudio
**Netlify**: https://app.netlify.com/teams/ugurozan-eng/projects (deploy pending — html-validate plugin needs disabling)

---

## Completed Work

### 1. Bug Fixes (Critical)
- **ToastContext stale closure** (`src/context/ToastContext.tsx`): `removeToast` was used in `addToast`'s `setTimeout` before being declared. Fixed by using `setToasts` directly in timeout.
- **Modal loop bug** (`src/components/AIAssistant.tsx`): After Idea→Script move, modal stayed open with stale `project.status: 'Idea'` prop, causing infinite reopen loop. Fixed by calling `onClose()` after successful move in `handleAIPanelConfirm`.
- **StageColor mismatch** (`src/app/page.tsx`): Duplicate `stageColors` with wrong key `'Avatar/Shoot'` — replaced with `STAGE_COLORS` from types.
- **Metadata leak in scriptBody** (`src/app/api/ai/consensus/route.ts`): AI sometimes embeds JSON `{metadata, scriptBody}` inside the `scriptBody` field. Added nested JSON detection + cleanup in `safeParseJSON`.
- **Dead code removed**: `debouncedUpdate`, `createNewProject`, `isSyncing` state, unused imports across all files.
- **Supabase client memory leak** (`src/lib/supabase.ts`): Removed `NODE_ENV === 'development'` condition that recreated client on every render.
- **filteredAIs duplicate logic** (`consensus/route.ts`): Same filter applied twice — simplified to single `activeAIs` variable.
- **KanbanBoard addProject** not awaited — no error handling.

### 2. Renamed Stages (Breaking DB Change)
| Old | New |
|---|---|
| `Çekim/Avatar` / `Avatar/Shoot` | **ElevenLabs** |
| `Editing` / `editingNotes` | **Storyboard** / `storyboardPrompts` |

- **Status migration** added in `VideoContext.fetchProjects`: auto-maps old DB statuses to new names on load.

### 3. ElevenLabs TTS Stage
- Prompt completely rewritten — old format used `[pause: 2s]`, `[tense]`, `[SCENE CHANGE]`, `↑↓` which ElevenLabs reads aloud as words.
- New format: pure natural text with `...` pauses, ALL CAPS emphasis, blank lines between scenes, `---` visual separator for scene boundaries (ElevenLabs skips, Storyboard parses).

### 4. Storyboard Stage (New)
- Replaced old `Editing` stage.
- **4 AI tools**: Midjourney, Leonardo AI, Kling AI, Runway — each with tool-specific prompt format.
- Tool selector dropdown in AIAssistant modal (only visible when `project.status === 'Storyboard'`).
- **20-25 prompts target** for 10-min video.
- **Interleaved output format**: story text flows with `🎬` prompt blocks inserted at scene boundaries.
- Uses ElevenLabs script from previous stage as source (`aiData.script`).

### 5. Language Support (TR/EN)
- `LanguageContext.tsx`: Global state with localStorage persistence (`studioflow_language`).
- TR/EN toggle inside AIAssistant modal (next to Humanize selector), NOT in app header.
- All AI prompts in `route.ts` and `consensus/route.ts` are fully bilingual.
- `types/video.ts`: Added `Language` type.

### 6. Multi-Project Support
- Changed `page.tsx` from single `selectedProject` to `openProjectIds: Set<string>`.
- Multiple AIAssistant modals can be open simultaneously.
- Each modal is independent with its own state, close handler auto-saves.

### 7. Auto-Save on Close
- `handleClose()` function saves current `result` to appropriate `aiData` field before closing modal.
- All close paths (X button, backdrop click, move-to-next-stage) use `handleClose`.
- `applyResult` ("Değişiklikleri Uygula") now saves ALL stages (was missing ElevenLabs, Storyboard, Thumbnail).

### 8. Mobile Responsiveness
- `globals.css`: @media queries at 768px and 480px breakpoints.
- KanbanBoard: horizontal scroll, reduced column widths.
- Header: `flexWrap: 'wrap'`.
- AIAssistant modal: reduced padding, full width margins.
- AISelectionPanel: `repeat(auto-fit, minmax(180px, 1fr))` for responsive grid.
- Side dock: responsive positioning.

### 9. Netlify Deployment
- `netlify.toml` created with `@netlify/plugin-nextjs`.
- **Issue**: `netlify-plugin-html-validate` (UI-installed) fails because it can't validate `.next` SSR output.
- **Fix needed**: User must go to Netlify → **Project configuration → Build & deploy → Build plugins** → **Disable** `netlify-plugin-html-validate`.
- Environment variables needed on Netlify: `GEMINI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

---

## Current File Structure (Key Files)

```
src/
├── app/
│   ├── api/
│   │   ├── ai/route.ts              # Main AI route (Gemini 3.1-pro-preview, bilingual, all stages)
│   │   └── ai/consensus/route.ts    # 3-persona consensus (Gemini 2.0-flash, bilingual)
│   ├── globals.css                  # Mobile media queries added
│   ├── layout.tsx                   # LanguageProvider wrapping
│   └── page.tsx                     # Multi-project openProjectIds, responsive header
├── components/
│   ├── AIAssistant.tsx              # Language toggle, tool selector, auto-save handleClose
│   ├── AISelectionPanel.tsx         # Responsive grid, test mode
│   ├── ErrorBoundary.tsx
│   ├── KanbanBoard.tsx              # Horizontal scroll, responsive columns
│   └── VideoCard.tsx
├── context/
│   ├── LanguageContext.tsx           # NEW: TR/EN with localStorage persistence
│   ├── ToastContext.tsx             # Fixed stale closure
│   └── VideoContext.tsx             # Status migration, cleaned dead code
├── lib/
│   └── supabase.ts                  # Fixed memory leak
└── types/
    └── video.ts                     # Added StoryboardTool, Language, removed Editing/Çekim
```

---

## Known Issues

1. **Netlify build fails** due to `netlify-plugin-html-validate` — needs manual disable in Netlify UI.
2. **Gemini model** used is `gemini-3.1-pro-preview` (preview, active but could be deprecated). Consider switching to `gemini-2.5-pro` (stable) for production.
3. `.env.example` still missing.
4. No test files exist.
5. `test-supabase.mjs` has hardcoded secrets — not pushed to repo.
6. Rate limiting is in-memory `Map` — needs Redis for production SaaS.

---

## IMMEDIATE NEXT ACTION for New Session

"Handoff okundu. FlowStudio bugünkü hali: 6 aşamalı kanban (Idea → Script → ElevenLabs → Storyboard → Thumbnail → SEO/Publish), TR/EN dil desteği, 4 araçlı storyboard, çoklu proje, mobil uyumlu, Netlify deployment'ın son adımı kaldı (html-validate plugin disable). Ne yapalım?"
