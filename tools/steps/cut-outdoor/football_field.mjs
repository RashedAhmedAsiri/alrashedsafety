import { runScenario } from './_lib.mjs';
export default (page, shot) => runScenario(page, shot, {
  id: 'football_field', loc: 'football_field', weather: 'sunny', time: 'morning',
  steps: [
    { part: 'setup', },
    { part: 'before', },
    { part: 'after', },
  ],
});
