# Next.js and React rules

Conventions for Next.js 15 App Router and React in this repo.

## App Router conventions

- **Server Components by default.** Add `"use client"` only when you need browser APIs, event handlers, or React state. Collocate the directive at the top of the file where it is first needed.
- **Route segments live in `app/`.** Pages are `page.tsx`, layouts are `layout.tsx`, loading states are `loading.tsx`, error boundaries are `error.tsx`. No custom file names for these slots.
- **API routes live in `app/api/`.** Each route segment exports named handlers (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`). Never export a default function from an API route.
- **Server Actions** are used for form mutations and data writes. Mark them `"use server"` and keep them in `app/actions/` or co-located in the component file. Validate all inputs with zod before any database or LLM call.
- **No `pages/` directory.** This repo uses App Router exclusively.

## Data fetching

- **Fetch in Server Components.** Pass resolved data down as props; don't waterfall client-side fetches for data that is available at render time.
- **`use cache`** (Next.js 15 caching) for data that can be shared across requests. Tag caches with fine-grained keys so revalidation is surgical.
- **SWR or `useOptimistic`** for client-side mutations that need optimistic updates. Don't fetch in `useEffect` for data the server could have provided.

## Component design

- **Props interfaces are types, not interfaces.** `type Props = { ... }` not `interface Props { ... }`.
- **No prop drilling beyond two levels.** Pass via React Context or a server-component data flow if the prop fans out more than one intermediate layer.
- **Avoid `useEffect` for derived state.** If a value can be derived from props or existing state, compute it inline. `useEffect` is for syncing with external systems (timers, event listeners, DOM APIs, Stockfish worker).
- **`useReducer` for chess board state** — move history, engine lines, UI mode — where transitions are complex enough that `useState` chains become hard to follow.
- **Strict mode is on.** Effects mount twice in development; write them so double-mount is safe (cleanup function, idempotent fetch).

## Error handling

- **Every async boundary has an `error.tsx` sibling.** Unhandled rejections in Server Components become error boundaries; don't let them cascade to the root layout.
- **`notFound()`** for missing resources (unknown game ID, unknown user). This renders the nearest `not-found.tsx`, not a 500.
- **API routes return typed error shapes.** `{ error: string; code?: string }` for 4xx; never expose stack traces in the response body.

## TypeScript in Next.js

- **`NextRequest` and `NextResponse`** for API route types. Don't cast `request.json()` to `any`; parse with zod.
- **`generateStaticParams`** for static segments that are enumerable at build time.
- **Route handler return types** are `Promise<NextResponse>`. Annotate them — it catches accidental missing-return paths.

## Styling

- **CSS Modules** (`*.module.css`) are the styling mechanism. Every component's styles live in a co-located `ComponentName.module.css` file imported as `styles`.
- **Design tokens** are defined in `src/app/globals.css` as CSS custom properties (e.g., `--color-blunder`, `--spacing-md`, `--radius-card`). Reference tokens in module files — do not hardcode raw color or spacing values.
- **No CSS-in-JS.** Do not use styled-components, emotion, or any runtime style injection.
- **Inline `style` props** are allowed only for values that are genuinely runtime-dynamic and numeric (e.g., `style={{ width: `${engineDepth}%` }}`). Structural flex/grid layout that is static belongs in the module file.
- This is consistent with `web-ui.md`; see that file for accessibility and interaction conventions.

## Performance

- **`next/image`** for all `<img>` tags. Supply `width`, `height`, and meaningful `alt` text.
- **`next/font`** for web fonts. No external font CDN URLs.
- **Dynamic imports** for heavy client-only modules (Stockfish WASM, chart libraries). Import them inside a `useEffect` or behind a `next/dynamic` boundary so they do not block the initial bundle.
- **Stockfish WASM runs in a Web Worker.** Never import Stockfish in the main thread. Wrap it behind a service/hook that communicates via `postMessage`.

## When to break a rule

1. Name the rule you are breaking, in a code comment or PR description.
2. Explain why the alternative is worse for this specific case.
3. Be willing to defend it in review.
