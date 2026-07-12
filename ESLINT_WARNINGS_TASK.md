# ESLint Warnings Burn-Down

Status: open
Owner: engineering
Created: 2026-07-02
Initial baseline: 419 warnings, 0 errors
Current: 45 warnings, 0 errors

## Goal

Reduce frontend ESLint warnings from 419 to 0 without weakening the current lint gate.

Current gate:

```bash
npm run lint
```

The command must keep passing after every phase. ESLint errors are already blocking; warnings are visible technical debt until this task is complete.

## Baseline By Rule

Measured with:

```bash
npx eslint . --format json
```

| Rule | Warnings | Cleanup phase |
|---|---:|---|
| `@typescript-eslint/no-unused-vars` | 0 | 1 done |
| `prefer-const` | 0 | 1 done |
| `@typescript-eslint/no-explicit-any` | 0 | 2 done |
| `react-hooks/exhaustive-deps` | 20 | 3 |
| `react-refresh/only-export-components` | 25 | 3 |

## Phase 1: Unused Vars And `prefer-const`

Status: done on 2026-07-02.

Result: 83 targeted warnings to 0. Total warnings went from 419 to 331 because removing dead mock/generic code also removed 5 `no-explicit-any` warnings.

Work order:

1. Remove dead imports, variables, args, and caught errors when they are truly unused.
2. Rename intentionally unused values to `_name` only when keeping the signature matters.
3. Convert `let` to `const` for values that are never reassigned.

Validation:

```bash
npm run lint:eslint -- --quiet
npm run lint
npm test
```

## Phase 2: Replace `any`

Status: done on 2026-07-02.

Result: 286 targeted warnings to 0. Total warnings went from 331 to 45.

Work order:

1. Start with shared boundaries: `types.ts`, `services/*`, `src/engine/*`.
2. Replace external/unknown payloads with `unknown` plus narrowing.
3. Introduce small local types only when the shape is stable and reused.
4. Avoid cosmetic casts that only silence ESLint and reduce type safety.

Validation:

```bash
npm run lint
npm test
npm run test:functions
npm run build
```

## Phase 3: React Hooks And Refresh

Target: 45 warnings to 0.

Work order:

1. Fix `react-hooks/exhaustive-deps` by stabilizing callbacks/memos or intentionally simplifying effects.
2. Do not blindly add dependencies if it changes fetch, autosave, router, or store lifecycle behavior.
3. Move non-component exports out of component files for `react-refresh/only-export-components`.

Validation:

```bash
npm run lint
npm test
npm run verify
```

## Done Criteria

- `npm run lint` passes with `0 errors, 0 warnings`.
- `npm run verify` passes.
- After reaching zero warnings, decide whether to enforce `--max-warnings 0` in `lint:eslint`.
