# cut-labs cutscenes

Files: `src/cutscenes/inside/{electricity_lab,biology_lab,sharp_tools}.cut.ts`; steps script `tools/steps/cut-labs/play.mjs`
(`SCEN=<id> node tools/shot.mjs --out=shots/cut-labs --size=640x400 --wait=6000 --script=tools/steps/cut-labs/play.mjs "name=x"`;
runs setup, before, 6 s of during, after via `playCutsceneScript`, so speech is skipped).

## electricity_lab (computer_lab) - setup, before, during, after
Before: wide push (3 s, surprised, click/hum loops); warning beep, he walks to the socket, takes the pencil from S2, juice flag moves to the shelf, S2 sits at W4 (~5.5 s).
During: points at socket, keyboard, cable tray. After: close on socket, cover flag snaps on (2 s); S1 stands, dries hands (washHands), sits back (3 s); wide, both work, thumbs up (3 s).
## biology_lab - setup, before, during, after
Before: S1 raises beaker (prop) to nose, S2 startles, glass flag `broken`, crash; palms to S1 then S2 (~5.5 s). During: points at goggles, glass, sink. After: goggles then gloves flags (pop, snap); Alrashed kneels and sweeps, glass `swept`; microscope look, both wash hands at the sink (water flag, tap sfx), thumbs up.
## sharp_tools (art_room) - setup, during, after
Setup: scissors in hand at the table, S1 purple, S2 striped yellow, S3 red. During: slow 24 s push-in. After: S1 cuts a star (snip), hands scissors to S2 (ding, nod), S3 waves scissors, Alrashed closes them and points, S3 sits; top-down, stars flag, chime.

## Gaps
- PropLayer and hold items are still stubs, so the beaker, pencil, scissors and paper star do not show yet; staging is written to the prop contract.
- No brush/dustpan hold item: the sweep is a kneel plus `bandage` loop. "Lightning bolt" face uses `warning`.
- Beats run slightly long in bio After 2 (robot walks around the benches).
