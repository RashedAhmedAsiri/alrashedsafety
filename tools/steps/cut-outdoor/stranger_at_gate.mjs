import { runScenario } from './_lib.mjs';
export default (page, shot) => runScenario(page, shot, {
  id: 'stranger_at_gate', loc: 'gate', weather: 'sunny', time: 'afternoon',
  steps: [
    { part: 'setup', },
    { part: 'before', },
    { part: 'after', },
  ],
});
