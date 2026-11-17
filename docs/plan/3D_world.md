# 3D world and characters

The world is one connected cartoon place: Alrashed school (two floors), its yard and football field, and the street, houses and park in front of it. Style is soft cartoon: rounded edges, chunky proportions, clean colors, gentle outlines, no realistic textures. Everything reflects a Saudi neighborhood.

## Alrashed

| Part | Design |
| --- | --- |
| Size | 1.45 m, a little taller than the tallest grade 6 student |
| Body | Glossy white rounded body, teal-green and sky-blue accent panels, soft grey joints |
| Head | Rounded capsule head with a black glass screen as the face |
| Face screen | Cartoon eyes and mouth drawn in glowing light (see Screens tab for every expression). Mouth moves with the voice using viseme data |
| Antenna | Short antenna with a round light that glows in the current status color |
| Chest | Small round badge with the «الراشد» logo |
| Arms and hands | Two arms, hands with four fingers. Must hold a child's hand, an umbrella, a fire extinguisher, a bandage, a ball |
| Legs | Two legs with rounded feet. Walks with a slight happy bounce |
| Sounds | Soft servo sounds when moving, a gentle chime when he starts listening |

**Animation clips needed for Alrashed:** idle breathing, wave, walk, jog, look left, look right, look left-right-left (one clip), point, stop hand (palm out), warning arm raise, explaining gestures (3 variations), thumbs up, nod, head shake, clap, celebrate dance, sit and drive, hold hand and walk, close umbrella, crouch to child height, catch (a falling child or swing), demonstrate extinguisher (pull, aim, squeeze, sweep), wash hands, apply bandage, put on gloves, cover face screen with hand (dust), count on fingers, kneel beside a child.

## Students

Boys only, ages 6 to 12, in three heights. Normal short-sleeved shirts in random colors (red, yellow, orange, light blue, green, purple, white, striped), blue or black pants, sneakers, backpacks in mixed colors. Skin tones across the Saudi range, short black or dark brown hair. At least 8 distinct boys, mixed randomly so no two side by side look the same.

**Student clips:** idle, walk, run, walk with head down (distracted), sudden stop and step back, look up surprised, look left-right-left, climb bus steps, sit in bus, lean arm out of window, sit and buckle seatbelt, hold hands, chase ball, hang on goal, slide down handrail, slip (caught before falling), soft trip onto knee, nose bleed tilt (wrong) and lean forward (right), cough, laugh, cover nose with shirt collar, sway and sit down (faint), drink water, stretch, forward roll, sit at desk, raise hand, cheer, clap.

## Adults (background and scenario roles)

| Character | Look | Used in |
| --- | --- | --- |
| Teacher | White thobe and white ghutra | Fire evacuation, fainting, lab |
| Health counselor | Thobe with a light-blue medical vest | Clinic, fainting |
| School guard | Dark uniform with cap, at the gate | Stranger at the gate |
| Traffic organizer | Thobe with a yellow reflective vest | Gate, dismissal, rain |
| Cleaner | Blue coverall, mop and bucket | Wet corridor |
| Unknown adult | Casual clothes, cap, sunglasses. Calm and ordinary, never scary | Stranger at the gate |
| Parents | Seen inside cars | Dismissal, family car |

## Inside the school

Two floors joined by a main staircase and an elevator. Every room is fully furnished; nothing is an empty box. Each room has its own location ID used by scenarios, short answers, creative mode and the map. All signs are in Arabic.

| Location ID | Room | Floor | What is in it | Scenarios |
| --- | --- | --- | --- | --- |
| `classroom` | Classroom 1/أ, Alrashed's home and the start of every mode | Ground | 24 desks in rows of pairs, green chalkboard plus a smartboard, teacher's desk with globe and books, wall clock, Arabic alphabet frieze, a «قواعد السلامة» poster with pictures only, student artwork, lockers with colored doors at the back, backpacks on chairs, two large windows showing the yard and the street, ceiling fans, two AC units, an evacuation map by the door, fire alarm button, a corner plant | intro, power\_outage, nosebleed (start), fire\_evacuation (start), exam |
| `lobby` | Entrance lobby | Ground | School name «مدرسة الراشد» in large letters, trophy cabinet, honor board with star frames, notice board, benches, water cooler, evacuation map, a green exit sign over the main doors | Transitions |
| `corridor_ground` | Main corridor | Ground | Long tiled corridor with a center line, classroom doors with numbers, a red fire extinguisher cabinet, fire alarm button, green exit signs, emergency lights, wall posters, drinking fountain, a yellow wet-floor sign with cleaner's cart nearby | corridor\_running, fire\_extinguisher, fire\_evacuation |
| `stairs` | Main staircase | Both | Wide stairs with yellow edge strips on each step, handrails on both sides at child height, an arrow showing keep right, a window at the landing, an elevator door beside the stairs with a «لا تستخدم عند الحريق» picture sign | stairs\_safety, fire\_evacuation |
| `clinic` | School clinic | Ground | Examination bed with paper roll, white cabinet with first aid supplies, a green cross on the door, sink with soap and paper towels, first aid kit on the wall, scale and height chart, eye chart with shapes, small fridge, desk for the health counselor, a box of gloves, a chair for students | small\_cut, nosebleed (end), friend\_fainted (end) |
| `canteen` | Canteen | Ground | Serving counter with sandwiches, juice, fruit and water bottles, round tables with stools, handwashing sinks at the entrance, trash and recycling bins, a menu board with food pictures | canteen\_safety |
| `prayer_room` | Prayer room | Ground | Green carpet with rows, shoe racks at the door, Quran shelves, a qibla marker, soft lighting | Map and background only |
| `sports_hall` | Indoor sports hall | Ground | Wooden floor with court lines, basketball hoops, blue foam mats, a ball basket, climbing rope and a low beam, wall bars, a water cooler, benches, high windows | sports\_hall |
| `principal` | Principal's office | Ground | Desk, chairs, bookshelf, school flag stand without logos, plants, framed certificates | Map and background only |
| `computer_lab` | Computer lab | First | 16 computers on desks, chairs on wheels, cable trays along the walls, power strips with safety covers, a wall socket at child height, a projector and screen, a printer, a «ممنوع الأكل والشرب» picture sign, an AC unit | electricity\_lab |
| `biology_lab` | Biology lab | First | Lab benches with sinks, stools, a skeleton model, plant pots under a grow light, a microscope on each bench, glass beakers and test tubes in racks, colored liquids in labeled bottles behind a glass cabinet, goggles and gloves on hooks, an eyewash station, a broken-glass bin, a fish tank | biology\_lab |
| `art_room` | Art room | First | Big shared tables, paint pots, brushes in jars, round-tip scissors in a tray, glue, colored paper, drying rack with paintings, easels, a sink | sharp\_tools |
| `library` | Library | First | Low bookshelves with colorful books, a reading carpet, bean bags, a librarian desk, a globe | Map and background only |
| `corridor_first` | First floor corridor | First | Same rules as the ground corridor, with windows over the yard | Transitions, fire\_evacuation |
| `yard` | Assembly yard | Outdoor, inside the fence | Large open courtyard with painted lines for class rows, a shade canopy over half of it, a small stage with a microphone stand, water coolers, benches, palm trees in planters, the fire assembly point sign (green with people icon) in one corner | friend\_fainted, heat\_water, dust\_storm, fire\_evacuation (end) |
| `football_field` | Football field | Outdoor, inside the fence | Artificial turf with white lines, two goals with nets, high fence netting, a team bench under shade, a water cooler, floodlights | football\_field |
| `gate` | Main gate and guard room | Outdoor | Sliding gate, a small guard room with a window, a waiting area with shade and benches for students waiting for parents, a traffic organizer's spot | stranger\_at\_gate, dismissal (start), heavy\_rain (start) |

## Outside the school

**Layout.** The school sits on the north side of a two-lane street, one lane each way, with traffic driving on the right as in Saudi Arabia. That is why every crossing starts by looking left: the nearest lane's cars come from the left. Houses and the park are across the street on the south side. A signal-controlled intersection is at the west end of the block, a mosque on its corner. The football field is inside the school fence on the east side.

| Location ID | Area | What is in it | Scenarios |
| --- | --- | --- | --- |
| `street_front` | Street in front of the school | Dark asphalt with white lane lines and a yellow edge line, curbs painted black and yellow by the school, two speed bumps with yellow stripes, «منطقة مدرسية» sign with children symbol, a speed limit 30 sign, street lights, drain grates along the curb, an electrical cabinet on the sidewalk | Background for all outside scenarios |
| `crosswalk_main` | Raised zebra crossing at the gate | Wide white stripes on a raised hump, flashing yellow pedestrian signs on both sides, low bollards | crossing\_road, reaching\_school, crossing\_with\_friends, dismissal, heavy\_rain |
| `signal_crossing` | Intersection with traffic lights | Car traffic lights, pedestrian lights with a red standing man and a green walking man that flashes before turning red, a push button box at child height, stop lines | traffic\_light |
| `bus_stop` | School bus stop | Shelter with a bench and roof, a yellow waiting line painted three steps back from the curb, a bus stop sign, a yellow school bus (Alrashed drives it) | getting\_out\_of\_bus, bus\_stop\_waiting, inside\_bus |
| `pickup_lane` | Parent pick-up and drop-off lane | A side lane along the school fence with numbered waiting spots, a covered waiting area on the sidewalk, a traffic organizer | dismissal, family\_car |
| `parking` | Small parking area beside the school | Parked cars in bays, reverse lights that turn on, wheel stops | parked\_cars |
| `sidewalk_far` | Sidewalk across the street | Wide sidewalk with tiles, palm trees in square planters, benches, street lights | reaching\_school (start), crossing\_road (end) |
| `houses` | Neighborhood houses | Six two-story Saudi villas: beige, white and sand-colored walls, decorative boundary walls with metal gates, palm trees and bougainvillea over the walls, AC units, water tanks on roofs, a car in front of some houses. One is Alrashed's "house" at the end of crossing scenarios | crossing\_road, dismissal, heavy\_rain |
| `roadworks` | Road works on the sidewalk | An open manhole with its cover beside it, orange cones, red-and-white barrier tape, a small pile of sand, a warning sign, uneven paving | open\_sewer |
| `park` | Neighborhood park | Grass, a playground with swings, a slide and a seesaw on soft rubber flooring, a small fountain, a walking track, shaded benches, palm trees, lamp posts, a park guard booth | park\_safety |
| `flood_dip` | Low dip in the road by the park | A low section of road where rainwater flows across like a small stream after heavy rain, with a raised sidewalk route around it | flood\_safety |
| `mosque` | Corner mosque | Small mosque with a minaret and a green dome | Background, map landmark |

**Ambient life.** Cars drive along the street at different speeds and stop at the crossings (waypoint system). Background students walk in the yard. Birds on palm trees and wires, a cat near the houses. Sounds: school bell, distant traffic, birds, footsteps, call to prayer is not played.

## Weather

The active scenario or question sets the weather. Changes blend over 3 seconds.

| Weather | Sky and light | Ground and objects | Effects and sound | Used by |
| --- | --- | --- | --- | --- |
| `sunny` | Clear blue sky, strong warm sun, crisp shadows. At midday, a light heat shimmer over the asphalt | Dry, bright colors | Birds, light breeze in palms | Default and most scenarios |
| `rain` | Dark grey clouds, dim cool light, soft shadows | Puddles forming, ground darkening and getting shiny, water running in gutters | Falling rain particles near the camera, splashes on the ground, ripples in puddles, raindrops on windows, car wipers moving, students with umbrellas, rain and soft thunder sound | Short answers about rain, creative questions about rain |
| `wet` (after rain) | Clouds breaking up with the sun coming through, a faint rainbow over the park | Dark wet asphalt with reflections, puddles of different sizes that mirror the sky and buildings, drips from roofs and canopies, wet patches drying on sidewalks, water flowing in the flood dip | Dripping sounds, cars splashing through puddles, slower car speed | heavy\_rain, flood\_safety, open\_sewer |
| `dust` | Orange-brown sky, sun as a pale disc, short visibility (fog thickening with distance) | Fine dust layer on surfaces, palm leaves bending | Dust particles streaming with the wind, a wind howl, car headlights on | dust\_storm |

## Camera

- **Cinematic shots** are authored in each cutscene (see scenario tabs). Default lens is a wide-normal view at the student's eye height (1.2 m) for street scenes, so crossings feel the way a child sees them.
- **Free look.** When nothing is playing, the student can drag or pinch to rotate around and zoom toward Alrashed within limits. It snaps back softly after 5 seconds of no touch.
- **Travel between places.** A smooth fly-over of 1.5 to 2.5 seconds between locations, or a quick fade when the distance is large (classroom to park).
- **Camera shake** only in crossing\_with\_friends, short and gentle.

## Performance targets

| Device | Target |
| --- | --- |
| iPad (9th generation and newer) | 30 frames per second or better on medium quality |
| Laptops and PCs | 60 frames per second on high quality |

Per view: under 150 draw calls and under 500,000 triangles. Use level-of-detail models for characters, cars and trees, instancing for repeated objects, baked ambient occlusion, one real-time sun with shadows only near the camera, and the quality setting to lower shadows, particles and resolution.
