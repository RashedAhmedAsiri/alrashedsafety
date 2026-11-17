# Cutscenes: first aid and heat (cut-aid)

Files: `src/cutscenes/inside/{small_cut,nosebleed,friend_fainted,heat_water}.cut.ts`, steps scripts in
`tools/steps/cut-aid/` (`play.mjs` + `run.sh SCEN TAG PROBE N`: plays a scenario, shoots N back-to-back frames once
the probe actor/prop/face (`expr:timer`) exists; screenshots in software GL are slow, so frames are 1-6 s apart).

All use `c.at(dx, dz, dy)` (dy last!). Boys keep one spec per scenario (S1 purple / yellow / green / blue shirt).

## small_cut (yard, then clinic)
setup: S1 walks in the yard, Alrashed near, wide camera. before: S1 trips, thud, scrape flag (0-2); Alrashed kneels, hand on
shoulder, they walk toward the building (2-4); `go('clinic')`; S1 sits on the bed, Alrashed by the sink, turn to camera.
after: wash hands + gloves at the sink (0-3); kneels at the knee, cup of water, gauze (3-6); spray (6-8); bandage placed,
scrape flag swapped for bandage flag (8-10); counselor walks up, star sticker flies to S1, hearts (10-13).

## nosebleed (classroom, then clinic)
setup: S1 (yellow) at row 2 desk with two classmates. before: nosebleed flag + `noseTiltBack` (0-2); Alrashed walks the
aisle, nods, tissue, S1 switches to `noseLeanForward` (2-4); two-shot. after: timer face (`timerSecs` 3, tick loop) (0-3);
chime, happy, flag off, thumbs up (3-5); `go('clinic')`, they walk in, counselor thumbs up, hearts (5-8).

## friend_fainted (yard, assembly)
setup: 8 boys in three lines (x 6/8/10) facing north, S1 (green) in the middle, Alrashed in front. before: S1 `faint` then
`lieDown`, thud (0-3); boys run into a tight ring, Alrashed arrives, `warnRaise`, ring widens (3-5); kneel beside S1.
after: teacher (umbrella) and counselor (bottle) run in from the west (0-3); counselor crouches, umbrella planted as shade,
S1 `awake`, sits (3-6); sips (`drink`), the pair walk him toward the building (6-9; no location change).

## heat_water (yard, afternoon, before + speak only)
setup: four boys chase round a sunny square, Alrashed watches (sunDrop face). before: wide + birds (0-3); S1 slows, wipes
forehead, holds head, heartbeat (3-5); Alrashed walks him to the arcade bench (18.0, -38.7; centred between the arcade columns) and points to the bag (5-8);
bottle sip, S2 offers a soda can, S1 shakes his head, hearts (8-10); speaking arrangement and a 22 s slow push-in.

## Gaps
- Sounds without an exact `SfxName`: gasp (uses `pop`), tissue pull (`slide`), ouch sigh (`cough`), glove snap (`click`),
  cicadas (`birds`), zipper (`click`).
- No spray-bottle or cup hold item: antiseptic is only the `spray` sound plus a point gesture; the cup is the `beaker`
  prop. `firstAidKit`, `paperStar`, `speechBubbleIcon`, `umbrella` props depend on the props worker (PropLayer was still a
  stub when verified, so props were not visible).
- The "nose diagram" on Alrashed's face and the sun icon in the screen corner do not exist; the default gestures play and
  the `sunDrop` face stands in.
- Heat shimmer post effect comes from the weather system, not the cutscene. Frames are timing-coarse (slow software GL).
