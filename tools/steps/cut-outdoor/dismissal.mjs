import { runScenario } from './_lib.mjs';
export default (page, shot) => runScenario(page, shot, {
  id: 'dismissal', loc: 'gate', weather: 'sunny', time: 'afternoon',
  steps: [
    { part: 'setup', },
    { part: 'after', },
  ],
});
