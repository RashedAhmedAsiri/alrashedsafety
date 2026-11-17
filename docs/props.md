# Props (scenario props, vehicles, hand items, traffic)

Code: `src/props/` (`PropLayer.tsx` renders the stage props, `kinds.tsx` one renderer per `PropKind`, `items.ts` the merged
geometries of small props and hand items, `fx.tsx` GPU particles, `car.tsx` / `bus.tsx` the vehicles, `points.ts` the vehicle
dimensions and local points, `holdItems.tsx` hand items, `AmbientTraffic.tsx`, `geo.ts` the geometry builder, `textures.ts`
the painted textures). Previews: `?dev=Props&set=bus|busppl|cars|doors|holds|holdppl|pick` (`&kinds=a,b,c&gap=1&p={"fire":{"size":0.5}}`
for any props in a row, `&cam=x,y,z&look=x,y,z&fov=`), and the standard grid `?view=props`.

Everything is cartoon, real-world size, vertex-coloured merged meshes (1 to 3 draw calls per prop), no real lights, shared
materials. Particles are GPU points (one draw, no per-frame CPU) and shrink with `settings.quality` (low 40 %, medium 70 %).

## How props work

`PropLayer` subscribes only to the list of props; each prop copies `pos`, `rotY`, `scale`, `visible` from the store every frame
(the StageDriver moves them) and re-renders only when its `params` object changes. Params set with `set({ params })` are
**merged** over the previous ones for that prop id (a car keeps its colour and seed when you only change `lights`). Origin of
a prop = centre of its footprint **on the surface it stands on** (set `pos` y to the table or floor height), `+Z` = its front.
Exceptions are noted per kind (`speechBubbleIcon` and `rainbow` are centred/standing on the point, `confetti` bursts from the
point and falls back to the point's height).

## PropKind reference

Sizes in metres. "params" are all optional.

| Kind | Params | Size / notes |
| --- | --- | --- |
| `car` | `color`, `seed` (body style + default colour), `lights` off/head/brake/reverse, `wipers` (default: on in rain), `driver` (seated parent, clip `drive`), `body` sedan/suv/pickup, `doors` `{ fl, fr, rl, rr: 0..1 }` | sedan 4.5 x 1.8 x 1.57, SUV 4.7 x 1.92 x 1.78, pickup 5.3 x 1.94 x 1.8. Seed to body: 0 sedan, 1 sedan, 2 suv, 3 sedan, 4 suv, 5 pickup (repeats every 6). Headlights default on in dust. Wheels spin from the car's actual movement. See "Cars" below |
| `bus` | `door` open/closed, `stopArm`, `interior` (default true), `lights` (default on in dust), `openWindow` `[row, side]` | Conventional school bus (engine hood in front), 10.8 x 2.5 x 3.05. See "Bus" below. The door and the stop arm animate. Red lamps flash while `stopArm` |
| `ball` | `kind` football/basketball/dodge, `color` (dodge) | r 0.11 / 0.12 / 0.105, **sits on the surface** (centre 1 radius above `pos`) |
| `cone` | | traffic cone 0.66 high, base 0.38 |
| `barrierTape` | `length` (default 3) | red-white tape between two posts 1.0 high, **centred** on `pos`, along local X (turn with `rotY`), sags in the middle |
| `manhole` | | open hole r 0.36 at `pos`, iron cover lying 0.95 m to +X |
| `puddle` | `radius` (0.8), `splash` (ripples) | irregular shiny pool, flat on the ground |
| `fire` | `size` (0.4 = flame height), `out` (flame dies away) | animated flame tongues + glow, origin at the base of the flame (put it in the bin) |
| `smoke` | `density` 0..1 (0.5; below 0.02 nothing) | soft puffs rising 1.5 m, 46 particles |
| `extinguisherSpray` | | white powder cone along local +Z, 2 m long; point it with `rotY` |
| `extinguisher` | | the hand-held red extinguisher standing on the floor, 0.5 high, hose nozzle toward +Z (to show it after it is set down) |
| `wetFloorSign` | | yellow A-frame 0.6 high with the slipping pictogram on both faces |
| `umbrella` | `color`, `color2` | open umbrella on a stand, r 0.56, 1.2 high (scale it for a shade) |
| `waterBottle` | | 0.19 high |
| `sodaCan` | | 0.12 high |
| `scissors` | | kids' round-tip scissors lying flat, 0.16 long, blades toward +Z |
| `paperStar` | | flat gold star 0.2 across, lying face up |
| `beaker` | `color` (liquid) | 0.126 high glass beaker with graduations |
| `brokenGlass` | | shards scattered within r 0.3 |
| `mat` | | gym mat 1.8 x 0.9 x 0.04 (long side along X) |
| `ballCart` | | wire cart 0.9 x 0.55, 1.02 high with 8 balls |
| `firstAidKit` | | green case 0.3 x 0.18 x 0.14 with white cross |
| `chair` | | school chair, seat 0.44 high, faces +Z |
| `stool` | | round stool 0.46 high (scale 0.4 = child booster) |
| `tray` | | canteen tray 0.42 x 0.3 with rice, roll, apple, juice |
| `lunchbox` | | 0.22 x 0.14 x 0.1 teal box with handle |
| `trafficLight` | `state` red/green/greenFlash | pedestrian signal pole 2.4 high, head faces +Z, flashes green at 2.5 Hz |
| `speechBubbleIcon` | `icon` check/cross/warning/question/heart/star | 0.6 m billboard **centred** on `pos`, pops in then bobs. Place about 0.4 above a head |
| `arrowMarker` | `color` (yellow) | glowing arrow on the ground 0.7 x 1.05 pointing +Z, hovers and pulses |
| `confetti` | | burst of 170 coloured flecks from `pos`, falls to `pos`'s height, repeats every 3.4 s |
| `dustCloud` | `color` (tan; `#FFFFFF` for powder), `radius` (0.9) | expanding puff, repeats every 2.4 s |
| `rainbow` | | arc r 5 (7 bands) in the XY plane facing +Z, standing on `pos`; scale it |
| `boardImage` | `image` logo/flame/bulbOff/rain/extinguisher/firstAid/blank | 1.6 x 0.9 picture panel with frame, bottom at `pos`, faces +Z |
| `sandwich` | | 0.12 square sandwich |
| `peanutSnack` | | bag 0.125 x 0.18 with peanuts and the allergy sticker |
| `cable` | `color` | loose cable 1.1 long, plugs at both ends (lies along X) |
| `powerStrip` | | 0.4 strip with child-safety covers, cable to a plug |
| `socketCover` | | small plug-in safety cover 0.04 |
| `goggles` | | safety goggles 0.2 wide |
| `gloves` | | pair of blue rubber gloves |
| `bucket` | `color` | 0.3 high bucket with handle |
| `leaf` | | palm frond 0.28 long (scale 3.5 for a branch) |
| `plasticBag` | | crumpled white bag 0.34 |
| `stopSign` | | organizer's round «قف» sign on a 1.4 m pole, both faces |
| `pencil` | `color` (yellow) | pencil 0.2 long lying along X (added for the scenes) |

## Hold items (`hold` / `holdLeft`)

`HoldItemMesh` origin = centre of the closed fist, `+Y` up through the fist, `+Z` forward from the knuckles; real size.
Items **hang below** the grip when carried (umbrella closed with the crook in the fist and the tip down, extinguisher by its
handle with the nozzle forward, backpack by its top handle, clipboard by its clip, mop with the head near the floor when the
hand is about 0.85 m up) or **point forward** (scissors blades, pencil, brush tip).

| Item | Notes |
| --- | --- |
| `umbrella` | open, blue/white, pole through the fist, canopy r 0.5 about 0.7 above the fist |
| `umbrellaClosed` | red, 1 m long, crook above the fist, tip down |
| `extinguisher` | red bottle 0.42 high hanging below the grip, hose curls to a nozzle pointing +Z |
| `bandage` | roll of gauze with a tape tab |
| `gauze` | folded pad 0.1 |
| `ball` | football r 0.11 resting in the fist |
| `scissors` | round-tip, blades forward, orange and blue rings |
| `waterBottle` / `sodaCan` | gripped around the lower body |
| `clipboard` | 0.31 x 0.225, hangs from the clip, faces +-X |
| `mask` | surgical mask with ear loops |
| `backpack` | red, by the top handle, hangs 0.45 |
| `pencil` | yellow, tip toward +Z and a little down (writing grip) |
| `brush` | paint brush (blue handle, red-loaded bristles), same grip as the pencil (**new**) |
| `sandwich` | wrapped square sandwich |
| `mop` | 1.3 m handle, blue grip, white strand head |
| `phoneless` | renders nothing |

I added `HoldItem` `'brush'` and `PropKind` `'pencil'` to `src/core/types.ts` (the pencil `HoldItem` already existed).

## Vehicles

Frame for both: origin on the ground under the centre, **+X nose**, +Y up, **+Z right side** (the side of the door and the
sidewalk when driving on the right), driver on the **left (-Z)**. Convert with `ctx.offset(base, rotY, [x, y, z])`; a person
sitting forward in a vehicle at `rotY = vehicleRot` has `rotY = vehicleRot + PI/2` (their forward is +Z). The same values are
exported from `src/props/points.ts` (`BUS`, `busSeat(row, side, slot)`, `carPoints(typeOrSeed)`, `CAR_SPECS`).

### Bus (`BUS` in `points.ts`)

The iconic conventional yellow school bus: engine hood with a black grille, round headlights and fenders ahead of
the windscreen; a 9.15 m passenger body with gently rounded roof edges; ten evenly sized side windows a side (black
frames, the upper sash slides down) plus the driver window (left) and a narrow pane by the door (right); three
black rub rails; red (outer) and amber (inner) flashing lamps at the corners of the front and rear caps, with a
«حافلة مدرسية» sign between them; big flat mirrors on arms and convex crossview mirrors on the fenders; black
bumpers; single front / dual rear wheels with closed wheel housings (nothing inside shows through the arches); a
rear emergency door with a window («مخرج طوارئ»); «مدرسة الراشد» over «حافلة مدرسية» on both sides. Inside: floor
with a ribbed aisle runner, ten rows of padded high-back benches each side, modesty panels, the driver seat,
steering wheel, dashboard and door control. Cost: one merged body mesh, one glass mesh, 2 per door leaf, 1 per axle,
a few planes (about 22k triangles, 40 draw calls with the lamps and lettering).

Length 10.8 (tail x -5.3, front wall / windscreen x 3.85, bumper x 5.5), width 2.5, height 3.05, interior floor y
**0.82**, ceiling y 2.75.

| Point | Local (x, y, z) |
| --- | --- |
| Driver hips (floor point; clip `sit`/`sitDrive`, flags `seated`, `inBus`, `seatH` 0.42) | (3.05, 0.82, -0.62), facing +X |
| Steering wheel centre | (3.57, 1.77, -0.62) |
| Dashboard door button | (3.62, 1.71, 0.25) |
| Door (right wall): doorway centre / x range | (3.39, 1.5, 1.25) / x 3.0 .. 3.78 (just behind the front wheel); the stairwell is recessed (z 0.5 .. 1.25) |
| Top landing inside the door (floor point) | (3.39, 0.82, 0.3) |
| Treads 1 / 2 / 3 going down (tread tops; centre z); the sidewalk (0.15) is the last step | (3.39, 0.65, 0.63), (3.39, 0.48, 0.88), (3.39, 0.31, 1.12) |
| Ground just outside the steps | (3.39, ground, 2.35) (on the sidewalk when the bus stops at world z -1.9 facing -X) |
| Seat rows (x of the hips, floor y 0.82), row 0 = front | 2.2, 1.45, 0.7, -0.05, -0.8, -1.55, -2.3, -3.05, -3.8, -4.55 |
| Bench centre z (-1 left / +1 right) | +-0.8; two per bench: window half +-0.97, aisle half +-0.63 (`busSeat(row, side, slot)`) |
| Aisle line | z = 0 (about 0.8 wide), walkable from x -4.9 to 2.8 |
| Seat surface | 0.42 above the floor point (flag `seatH`); backs stand 0.25 behind the hips |
| Window sill / sash split / top | y 1.56 / 1.94 / 2.4 (a seated boy's head shows in the lower pane) |
| Stop arm hinge (left, street side) | (2.72, 1.22, -1.3); folded flat on the wall toward +X, swings out to z -1.8 |
| Left / right wall inner faces | z -+1.16 |
| Big side mirrors | (4.19, 2.02, +-1.63) |
| Axles (wheel radius 0.5, on the ground) | x 4.5 (front, under the hood), -1.6 (rear, duals) |
| Cap signs «حافلة مدرسية» | front (3.9, 2.72, 0), rear (-5.35, 2.72, 0) |

Door: `door: 'open'` folds the two glass leaves inward, flat against the stairwell sides, in about 1 s. Amber cap lamps
light while the door is open. `stopArm: true` swings the red «قف» sign out on the street side and flashes the red cap
lamps alternately. `interior: false` tints the glass (use it while the bus drives with nobody shown inside); the seats
are always built and the roof stays on. Camera inside, by the windscreen on the door side looking back at the driver
(turned) and the whole bus: `(3.72, 2.2, 0.3)` looking at `(1.0, 1.15, -0.8)` (fov 62); down the aisle from the back:
`(-4.8, 2.0, 0.1)` looking at `(3, 1.2, 0)` (fov 60). Do not put a camera ahead of x 3.8 inside (that is the hood).
`openWindow: [row, side]` slides that window's upper sash down, so its top half is open. A boy leaning out
(`leanOut`, leans to his right: side +1 facing +X) needs `seatH` about 0.64 (up on his knees) to reach the opening.

Passengers: set `flags { seated: true, inBus: true }`, `backpack: false` (a bag on the back pokes through the seat back)
and put them at `busSeat(...)`; `fillSeats(c, [[row, side], ...])` in `src/cutscenes/outside/bus.shared.ts` does that
for a busful of boys at the window halves, and `wayOut(c)` is the path from the top landing down the treads to the
sidewalk. The bus sway belongs to the clip, the bus does not carry them (use `ride()` from `bus.shared.ts`). Wheels
spin when the bus moves; the body does not sway.

### Cars (`carPoints(seedOrType)`)

Local points, front-left driver. y is the actor `pos` y for a seated person (the `drive` clip uses seatH 0.3 above it).

| Point | sedan | SUV | pickup |
| --- | --- | --- | --- |
| Driver hips (x, y, z) | (0.1, 0.34, -0.4) | (0.15, 0.42, -0.4) | (0.35, 0.44, -0.4) |
| Front passenger | (0.1, 0.34, 0.4) | (0.15, 0.42, 0.4) | (0.35, 0.44, 0.4) |
| Rear seat (left / middle / right, z -0.42 / 0 / 0.42) | x -0.95 | x -0.95 | x -0.3 |
| Front right door: hinge x / centre / stand outside | 0.95 / (0.45, 0.65, 0.9) / z 1.65 | 1.0 / (0.45, 0.65, 0.96) / z 1.71 | 1.0 / (0.45, 0.65, 0.97) / z 1.72 |
| Rear right door: hinge x / centre | -0.1 / (-0.6, 0.65, 0.9) | -0.15 / (-0.7, 0.65, 0.96) | none (single cab) |
| Left doors | same x, z -0.9 | same, z -0.96 | same, z -0.97 |
| Nose / tail | 2.25 / -2.25 | 2.35 / -2.35 | 2.65 / -2.65 |
| Roof height | 1.49 | 1.74 | 1.72 |

`carPoints(seed)` returns every value (`driver`, `frontPassenger`, `rear[3]`, `doorStand`, `doorCentre`, `steeringWheel`...).
Doors: pass `params.doors = { rr: 1 }` (0..1 per door `fl`, `fr`, `rl`, `rr`; `r` = right/sidewalk side) and set it again to close;
they ease in about 0.5 s and the closed door panel (skin, handle, window) is swapped for the swinging leaf, leaving a real
opening into the cabin. The cabin is hollow (thin side walls, floor, seats with bases, dashboard with instrument hood and
centre screen, console and gear lever, wheel wells, sedan parcel shelf) behind thin see-through windows, so seated people
sit inside it. The prop layer always builds the door-capable car; cars rendered directly from a set with `<CarModel>` draw
the door panels merged into the body unless you pass `doors`. A `driver` is a `parent` person with the `drive` clip at the
driver point (sedan: driver seat and driver 0.1 lower, pickup 0.04, so his head clears the roof). Brake lights: `lights: 'brake'`; reverse lights: `lights: 'reverse'`.

## AmbientTraffic

Cars drive the main street on the right: eastbound lane z +1.75 (+X), westbound lane z -1.75 (-X), x -140 .. 140, then loop
(each car waits out of sight a few seconds before re-entering, only if the entrance is free). 2 / 3 / 4 cars per lane on
low / medium / high quality, desired speeds 8.5 .. 13 m/s (x0.8 in rain and wet, x0.85 in dust). They follow each other
(IDM car following, never overlap), slow to about 3.8 m/s over the raised crossing (|x| < 3.5 + approach) and ride over it at
`groundHeight` with pitch, stop at the signal at x -72 (stop lines x -79 eastbound and x -65 westbound; cycle 44 s: green 26,
yellow 3, red 15), brake lights show while braking, headlights in dust, wipers in rain. On medium/high one or two cars start on the
side road (x -14, z 44 -> 8), wait at the junction and turn right into the eastbound lane when it is clear (disabled
while the active location is `flood_dip`). They stop for **people on the carriageway** (any visible actor with |z| < 3.2,
within the lane), for stage `car`/`bus` props in the lane, and for `cone`/`ballCart` props.

How a cutscene controls it: `c.flag('trafficSlow', 0)` freezes everything where it is, `0.3` makes it crawl, `1` restores;
Ambient traffic now writes the stage flags `carLight` (green/yellow/red) and `pedLight` (red/green/greenFlash) from its own signal cycle, so the lamps at `signal_crossing` match what the cars do; cars stop before the painted lines (x -61.5 west-bound, -76.5 east-bound). `c.flag('traffic', 'off')` removes the traffic (MainApp unmounts it); scripted cars should still be placed in the lane (z +-1.75) because
ambient cars yield to them. Props with `anim.faceTravel` (cars driven by `prop.drive`) keep their own speed, ambient cars follow
them as obstacles (conservatively treated as standing).

## Known limits

- Car interiors are simple (front seats, bench, wheel, dashboard). Doors open as one panel with its window; the doorway shows a
  dark inside, not the full interior, and only the front and rear doors listed above exist.
- The ambient side-road cars only drive out (side road to the main street), no cars turn into the side road.
- Cars cast the sun shadow only through the engine's shadow settings (the meshes are shadow casters); there is no real light.
