# Humans (boys and adults)

Code: `src/characters/Human.tsx` (components), `src/characters/human/` (`looks.ts` appearance, `body.ts` skinned
geometry + rig, `clips.ts` procedural clips, `rig.ts` poses, `model.ts` playback, `build.ts` mesh helpers).
Preview: `?dev=Humans&set=boys|heights|adults|flags|crowd|actor&clip=<clip>&cam=x,y,z&look=x,y,z&robot=0` (the info box
shows draw calls); the standard row is `?view=characters&clip=<clip>` (4 boys + the 7 adult kinds, in that order).

## Kinds and look

`Human({ actorId })` renders any non-robot actor. `kind` is a `CharacterKind`; the look is deterministic from the
actor id (same id, same person; sequential ids `s1,s2,...` step through palettes so neighbours differ).

- **boy**: cartoon head (about 1/4.5 of height), eyes with highlights, brows, smile, blush, ears, 5 hair styles
  (crop, fringe, tuft, side, buzz; black or dark brown), 5 skin tones, short-sleeved shirt (plain or striped, colors
  from `SHIRT_COLORS`), blue or black pants, sneakers with accent colors, optional backpack with straps, optional
  round glasses. Heights: small 1.15 m, medium 1.30 m, tall 1.42 m (robot is 1.45 m). `actor.spec` (`BoySpec`)
  overrides `shirt, striped, pants, skin, height, hair, backpack`; missing fields come from the id hash.
- **teacher** white thobe + ghutra with igal, beard, sometimes glasses. **counselor** thobe + light-blue vest with
  green cross, glasses, no headwear. **guard** dark uniform, cap, badge, mustache (1.80 m). **organizer** thobe,
  ghutra + yellow reflective vest. **cleaner** blue coverall with reflective cuffs, blue cap (1.70 m). **stranger**
  grey-blue polo, khaki trousers, olive cap, sunglasses, stubble (calm, ordinary). **parent** thobe + red-white
  shemagh + igal. Adults are about 1.75 m; skin tones 1..3; beard/glasses vary with the id.

## Clips (all 51 `HumanClip`s exist; nat. duration in s)

Loops: idle 4, walk 1 cycle, run 0.6, walkDistracted, climbSteps, sit, sitDesk, leanOut 3, holdHands, chaseBall,
hangGoal, slideRail, noseTiltBack, noseLeanForward, cough, laugh, coverNose, lieDown, raiseHand, cheer, clap, wave,
point, talk, crouch, holdHead, washHands, eat, cut, mop, drive, swing 2.7, slide, carry.
One-shots: stopStepBack 1.2, lookUpSurprised 1.6, lookLRL 3, buckle 2.4, kick 0.9, slip 1.4, trip 1.7, faint 3.6,
drink 2.6, stretch 3, forwardRoll 1.8, jump 0.9, wipeForehead 2.2, pushButton 1.5, thumbsUp 1.6, nod 1.2,
headShake 1.2. Exact table: `HUMAN_CLIP_INFO` (re-exported from `Human.tsx`).

Playback (`model.ts`): crossfade 0.2 s between clips; a one-shot is time-scaled to `clipDuration` when set, otherwise
it plays at its natural length and holds its last pose (or repeats for nod/headShake/kick and similar). While an actor
`move`s, the clip is `move.clip` (`walk`, `run`, `jog` = run) and the gait phase follows the move speed (stride
0.68 H walking, 1.2 H running), matching 1.3 m/s walk and 3.2 m/s run. Walk-type clips played in place preview the
gait at a nominal speed. The head turns toward `lookAt`, blinks every few seconds, and follows the face of the clip.
Sit clips: position = floor point under the hips, hips sit at knee height (override with flag `seatH`, metres).
`swing` hangs its seat from a bar 2.2 m above the actor (frame must be there); `slide`/`slideRail`: position is the
surface under the hips.

## Flags (`actor.flags`)

`seated`, `inBus` (bus-seat posture + sway), `seatbelt` (shoulder + lap belt), `collarUp` (collar over the nose),
`umbrellaOpen` (right arm holds an open umbrella pose), `scrape`, `bandage` (bare knee with scrape / bandage),
`nosebleed`, `goggles`, `gloves`, `backpack:false` (hide pack), `lookDown`, `face:'smile|happy|laugh|surprised|worried|
sleep|talk|pain|calm'`, `seatH`, `amp` (swing amplitude), `onBack`/`awake` (lieDown variants), `holdHand`.

## Held items

`hold` / `holdLeft` render `HoldItemMesh` in the hand socket (`model.socketR/socketL`, upright, +Z forward, per the
ARCHITECTURE grip convention). Nothing shows until the props worker implements `HoldItemMesh`.

## Sets: StaticPerson and Crowd

```tsx
<StaticPerson kind="guard" position={[3,0,-2]} rotY={Math.PI} clip="idle" />
<StaticPerson kind="boy" seed={7} spec={{ height: 'small' }} position={[0,0,0]} clip="sitDesk" flags={{ seated: true }} />
<StaticPerson kind="cleaner" position={[1,0,2]} clip="mop" hold="mop" />
<Crowd people={[{ seed: 1, position: [0,0,0], clip: 'idle' },
  { seed: 4, position: [5,0,5], clip: 'walk', path: [[5,0,5],[12,0,5],[12,0,9]], speed: 1.3 }]} />
```

`StaticPerson` (detail 0.8) and `Crowd` (detail 0.6, shared geometry per look) take `kind`, `seed`, `spec`; Crowd
members may also have `path` (looped walk). Crowd clips: idle, talk, laugh, cheer, clap, wave, raiseHand, walk,
run, sit, sitDesk, eat, drink (else idle). Seated static/crowd people need flag `seated` (Crowd sets it for sit/sitDesk).
Crowd hides people beyond 90 m and updates them every 2nd/3rd frame beyond 15/30 m.

## Performance

One merged skinned mesh per person, one vertex-coloured Lambert material shared by all: 1 draw call each (budget
12), about 5-9k triangles at full detail (16 boys = 150k tris at detail 0.8). Shadows cast and received.
Crowd is NOT instanced: it is one draw call per person (40 people = 40 calls); keep set crowds to about 20-30.
