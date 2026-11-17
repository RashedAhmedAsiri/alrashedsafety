import { runScenario } from './_lib.mjs';
export default (page, shot) => runScenario(page, shot, {
  id: 'dust_storm', loc: 'yard', weather: 'sunny', time: 'morning',
  steps: [
    { part: 'setup', },
    { part: 'before', },
    { part: 'during', },
    { part: 'after', },
  ],
});
