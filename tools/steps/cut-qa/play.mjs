// Plays any outside scenario's parts and shoots ~0.9 s after every camera change (640x400, UI hidden).
//   ID=getting_out_of_bus [LOC=bus_stop WEATHER=sunny TIME=morning PARTS=setup,after] \
//   node tools/shot.mjs --out=shots/cut-qa --size=640x400 --wait=6000 --script=tools/steps/cut-qa/play.mjs "name=qa"
// Contact sheet: tools/steps/cut-qa/sheet.sh shots/cut-qa <id>
import { runScenario } from '../cut-outdoor/_lib.mjs';
const T = {
  getting_out_of_bus: ['bus_stop', 'sunny', 'morning'],
  bus_stop_waiting: ['bus_stop', 'sunny', 'morning'],
  inside_bus: ['bus_stop', 'sunny', 'morning'],
  family_car: ['gate', 'sunny', 'afternoon'],
  crossing_road: ['gate', 'sunny', 'afternoon'],
  reaching_school: ['gate', 'sunny', 'morning'],
  crossing_with_friends: ['gate', 'sunny', 'afternoon'],
  traffic_light: ['signal_crossing', 'sunny', 'afternoon'],
  open_sewer: ['roadworks', 'wet', 'morning'],
  heavy_rain: ['gate', 'rain', 'afternoon'],
  parked_cars: ['parking', 'sunny', 'afternoon'],
  flood_safety: ['flood_dip', 'wet', 'afternoon'],
  dismissal: ['gate', 'sunny', 'afternoon'],
  stranger_at_gate: ['gate', 'sunny', 'afternoon'],
  dust_storm: ['yard', 'sunny', 'morning'],
  football_field: ['football_field', 'sunny', 'morning'],
  park_safety: ['park', 'sunny', 'afternoon'],
};
const id = process.env.ID;
const d = T[id] || [];
export default (page, shot) =>
  runScenario(page, shot, {
    id,
    loc: process.env.LOC || d[0],
    weather: process.env.WEATHER || d[1],
    time: process.env.TIME || d[2],
    steps: (process.env.PARTS || 'setup,before,during,after').split(',').map((part) => ({ part })),
  });
