# Rules for every builder (read first)

You are one builder on a team building "Alrashed School Safety Robot" (الراشد روبوت السلامة المدرسية),
a 3D Arabic web app for Saudi elementary students (ages 6-12). Project root: `/home/claude/alrashed`
(Vite 7 + React 19 + TypeScript + three 0.180 / @react-three/fiber 9 / drei 10 + zustand). About ten
other builders are editing other files in this same folder at the same time, so files you do not own
may be half-finished while you work.

1. Read `docs/ARCHITECTURE.md` fully, then your brief (`docs/tasks/<your-key>.md`), then the plan
   sections it names in `docs/plan/*.md`, then the code you touch and the contracts it depends on
   (`src/core/types.ts`, `src/core/locations.ts`, `src/core/ground.ts`, `src/core/stage.ts`,
   `src/core/store.ts`, `src/core/theme.ts`, `src/world/kit.tsx`, `src/cutscenes/api.ts`, and the stub
   files you replace).
2. Edit only files you own (your brief lists them). Keep every existing export name and signature of a
   stub you replace exactly as it is; others already import them. Adding exports and new files under
   your own folders is fine.
3. Never run `npm install`, `git commit`/`git stash`/`git checkout`, or anything that rewrites other
   people's files. Never write to `/mnt/project-files`. Screenshots go in `shots/<your-key>/`.
4. Typecheck: `cd /home/claude/alrashed && npx tsc -p . --noEmit 2>&1 | grep -E '<your paths>'`. Your
   files must have zero errors at the end. Errors in files you do not own are not yours.
5. Arabic: never retype Arabic text that exists in the plan; copy it exactly (programmatically when
   there is a lot). Diacritics matter. No English text may be visible to students anywhere.
6. 3D work is verified by looking: run `node tools/shot.mjs --out=shots/<your-key> "<query>" ...`, open
   the PNGs with the Read tool, judge them critically against the plan (proportions, colors, scale
   against the 1.45 m robot, nothing floating or sunk, nothing z-fighting, no empty boxes), fix, and
   repeat until it looks finished and charming. Fix every page error the tool prints.
7. Performance matters (iPads): share materials and geometries (`mat()`, `GEO` in kit.tsx), instance
   repeated objects, no real-time lights in sets, keep draw calls low.
8. Finish the whole brief, not a first pass. If something is impossible, build the closest thing and
   say so. At the end write the doc your brief names, then return your report:
   summary (what exists now), files (paths you wrote), verified (exactly how you checked it),
   gaps (anything missing or weak), requests (changes you need in files you do not own).
