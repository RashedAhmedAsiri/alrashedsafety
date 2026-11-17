# Alrashed (robot)

`<Robot actorId="alrashed" />` reads its actor from the stage store every frame. Code: `src/characters/Robot.tsx`,
`src/characters/robot/` (`geometry.ts` meshes and materials, `rig.ts` dimensions and pose maths, `clips.ts` clips,
`face.ts` face screen, `model.ts` hierarchy, overlays and per-frame update).

## Sizes (root space, metres, +Z forward, +X his left)

| Point | Height |
|---|---|
| Top of antenna light | 1.45 |
| Head top | 1.36 |
| Eyes | 1.10 |
| Neck | 0.97 |
| Shoulders | 0.88 (x = ±0.255) |
| Pelvis | 0.55 |

Hand sockets (`model.socket('r' | 'l')`) sit at the centre of a closed fist, 0.088 below the wrist. Held items stay
upright in his frame; a clip can tilt them with the pose keys `ix` / `iz`.

## Clips

Loops keep going until the clip changes. One-shots play once over their natural length (pass it as `dur`) and then
hold the last pose. Every change crossfades over 0.22 s.

| Clip | Length (s) | Kind |
|---|---|---|
| idle | 7.3 | loop |
| talk | 4 | loop |
| explain1 / explain2 / explain3 | 2.6 / 2.8 / 3.2 | loop |
| walk / jog / holdHandWalk | gait follows speed (walk 1.2 m/s, jog 2.2) | loop |
| wave | 2.2 | one-shot |
| lookLeft / lookRight | 1.6 | one-shot |
| lookLRL | 2.5 | one-shot (the face's eyes slide with it) |
| point | 1.8 | one-shot |
| stopHand | 1.6 | one-shot |
| warnRaise | 1.6 | one-shot |
| thumbsUp | 1.8 | one-shot |
| nod | 1.2 | one-shot |
| headShake | 1.4 | one-shot |
| bow | 1.8 | one-shot |
| clap | 2.0 | loop |
| celebrate | 3.2 | loop |
| sitDrive | 6 | loop |
| closeUmbrella | 2.6 | one-shot |
| crouch / kneel | 2 | one-shot (holds low) |
| catch | 1.6 | one-shot |
| extinguisher | 4 | loop (pull pin, aim, squeeze, sweep) |
| washHands / bandage | 3 | loop |
| gloves | 3.4 | one-shot |
| coverFace | 2 | one-shot |
| countFingers | 3.4 | loop |

Human clip names map over automatically: `run`/`chaseBall` play `jog`, `holdHands` plays `holdHandWalk`,
`walkDistracted` plays `walk`, `drive` plays `sitDrive`, `sit` plays `idle` seated.

## Flags (`actor.flags`)

| Flag | Effect |
|---|---|
| `seated` (or `inBus`), `seatHeight` (default 0.42) | Sits on a seat at that height; free hands rest on the thighs |
| `turnToCamera` | Turns waist, chest and head toward the camera. In `sitDrive` the hand on that side leaves the wheel to talk |
| `holdHand: 'r' \| 'l' \| 'both'`, `holdHandX/Y/Z` (0.3, 0.62, 0.06) | Hand lowered to a child's hand height |
| `handOnShoulder: 'r' \| 'l'`, `shoulderX/Y/Z` (0.3, 0.98, 0.18) | Hand resting on a child's shoulder |
| `reach: 'r' \| 'l' \| 'both'`, `reachX/Y/Z` (0.16, 1.0, 0.36) | Reaches forward and grips (door, swing chain, cart) |
| `umbrellaOpen` (or holding `umbrella`) | Holds the umbrella up over his head, also seated |
| `countTo` (3), `countStep` (0.75 s) | Settings for the `counting` face |

## Face

Every `Expression` is drawn on the black glass screen. `useApp.mouth > 0` opens the mouth over any expression, and
the eyes glance toward `actor.lookAt`. The antenna light glows in `STATUS_COLORS[useApp.status]`. The `counting`
face counts 1, 2, 3 and then shows a tick.

## Tips for cutscene writers

- **Bus driver:** put him at the driver's seat with clip `sitDrive` and his feet on the floor. Add
  `turnToCamera: true` when he talks to the children.
- Use `crouch` or `kneel` before talking face to face with a child. `lookAt` the child's head (about 1.0–1.1 m).
- Give one-shots their natural length as `dur` so the next line starts after the gesture finishes.
