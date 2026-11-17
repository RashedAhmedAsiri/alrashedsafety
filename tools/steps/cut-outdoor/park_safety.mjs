import { runScenario } from './_lib.mjs';
export default (page, shot) => runScenario(page, shot, {
  id: 'park_safety', loc: 'park', weather: 'sunny', time: 'afternoon',
  steps: [
    { part: 'setup', },
    { part: 'before', },
    { part: 'during', },
    { part: 'after', },
  ],
});
