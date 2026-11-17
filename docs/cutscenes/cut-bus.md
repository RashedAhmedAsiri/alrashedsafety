# cut-bus cutscenes

Files: src/cutscenes/outside/{getting_out_of_bus,bus_stop_waiting,inside_bus,family_car}.cut.ts, helper bus.shared.ts (not a cutscene), tools/steps/cut-bus/run.mjs (runs parts directly with runCutscene and shoots at times).

Beats follow the plan tables (see comments in each file). Vehicles do not carry actors, so `ride()` in bus.shared.ts moves riders along the vehicle path (cruise, then half speed over the braking distance).

Gaps: props (PropLayer, BusModel, CarModel) were still stubs when written, so bus and car never rendered. All bus/car local points (BL in bus.shared.ts, car door/seat numbers in family_car) are guesses and must be re-tuned against docs/props.md. getting_out_of_bus was run end to end: set, boys and walks look right, no errors. The other three were typechecked only (the shot run timed out). No pencil prop exists: a small yellow ball stands in. The guard teleports to the gate during a camera cut. No window or car-door animation params exist.
