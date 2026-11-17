// OWNER: exam worker. Teacher dashboard: 4-digit PIN, the five views of docs/plan/Exam.md, CSV export.
// Data: the Worker when online (all devices), otherwise this device's local results.
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Chart } from 'chart.js/auto';
import { ArrowLeft, Delete, Download, HardDrive, Cloud, X } from 'lucide-react';
import { COLORS } from '../core/theme';
import { TEACHER_LABEL } from '../ui/labels';
import { ToyButton } from '../ui/ToyButton';
import { API_BASE, isOnline, checkTeacherPin, getResults, setTeacherPin, teacherPinIsSet, type ExamRow } from '../backend/api';
import { EXAM_VERSION, loadLocalRows } from './results';
import { DEFAULT_FILTERS, TOPICS, computeStats, filterRows, toCsv, type Filters } from './stats';

const FONT = '"IBM Plex Sans Arabic", sans-serif';
const PRE = COLORS.short;
const POST = COLORS.inside;
const PIN_KEY = 'alrashed.teacher.pin.v1';
const DIGITS = '٠١٢٣٤٥٦٧٨٩';

const nf1 = new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 1 });
const nf0 = new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 0 });
const num = (v: number | null, d = 1) => (v === null ? '—' : (d === 0 ? nf0 : nf1).format(v));

const T = {
  title: TEACHER_LABEL,
  setPin: 'اخْتَرْ رَقْمًا سِرِّيًّا مِنْ أَرْبَعَةِ أَرْقَامٍ',
  confirmPin: 'أَعِدْ كِتَابَةَ الرَّقْمِ',
  enterPin: 'أَدْخِلِ الرَّقْمَ السِّرِّيَّ',
  badPin: 'الرَّقْمُ غَيْرُ صَحِيحٍ',
  noMatch: 'الرَّقْمَانِ غَيْرُ مُتَطَابِقَيْنِ',
  needNet: 'يَحْتَاجُ إِلَى الْإِنْتِرْنِتْ',
  forgot: 'نَسِيتُ الرَّقْمَ',
  adminPin: 'رَقْمُ الْمُسْؤُولِ',
  go: 'مُتَابَعَةٌ',
  before: 'قَبْلَ التَّدْرِيبِ',
  after: 'بَعْدَ التَّدْرِيبِ',
  avgBefore: 'مُتَوَسِّطُ الدَّرَجَاتِ قَبْلَ',
  avgAfter: 'مُتَوَسِّطُ الدَّرَجَاتِ بَعْدَ',
  tests: 'اخْتِبَارًا',
  perQuestion: 'نِسْبَةُ الْإِجَابَاتِ الصَّحِيحَةِ لِكُلِّ سُؤَالٍ',
  spread: 'تَوْزِيعُ الدَّرَجَاتِ',
  paired: 'مُقَارَنَةُ كُلِّ جِهَازٍ (لَيْسَ كُلَّ طَالِبٍ)',
  filters: 'التَّصْفِيَةُ',
  from: 'مِنْ',
  to: 'إِلَى',
  all: 'الْكُلُّ',
  boy: 'بَطَلٌ',
  girl: 'بَطَلَةٌ',
  latest: 'آخِرُ مُحَاوَلَةٍ',
  allAttempts: 'كُلُّ الْمُحَاوَلَاتِ',
  csv: 'تَصْدِيرُ الْجَدْوَلِ',
  noData: 'لَا تُوجَدْ نَتَائِجُ بَعْدُ',
  thisDevice: 'هَذَا الْجِهَازُ',
  allDevices: 'كُلُّ الْأَجْهِزَةِ',
  tapShare: 'نِسْبَةُ الْإِجَابَةِ بِاللَّمْسِ',
  loading: '…',
};

/* ------------------------------------------------------------------------ PIN storage */

async function sha(text: string): Promise<string> {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    let h = 2166136261;
    for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return `f${(h >>> 0).toString(16)}`;
  }
}

interface StoredPin {
  salt: string;
  hash: string;
}
function loadPin(): StoredPin | null {
  try {
    const v = JSON.parse(localStorage.getItem(PIN_KEY) ?? 'null') as StoredPin | null;
    return v && typeof v.salt === 'string' && typeof v.hash === 'string' ? v : null;
  } catch {
    return null;
  }
}
async function savePin(pin: string) {
  const salt = Math.random().toString(36).slice(2, 12);
  try {
    localStorage.setItem(PIN_KEY, JSON.stringify({ salt, hash: await sha(salt + pin) }));
  } catch {
    /* private mode: the PIN lives on the Worker only */
  }
}
async function localMatches(pin: string): Promise<boolean | null> {
  const s = loadPin();
  if (!s) return null;
  return (await sha(s.salt + pin)) === s.hash;
}

/* ------------------------------------------------------------------------- charts */

type ChartCfg = ConstructorParameters<typeof Chart>[1];

function ChartBox({ cfg, height }: { cfg: ChartCfg; height: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    Chart.defaults.font.family = FONT;
    Chart.defaults.font.weight = 500;
    Chart.defaults.color = COLORS.ink;
    const ch = new Chart(ref.current, cfg);
    return () => ch.destroy();
  }, [cfg]);
  return (
    <div style={{ position: 'relative', height }}>
      <canvas ref={ref} />
    </div>
  );
}

const rtlBase = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 350 },
  plugins: { legend: { rtl: true, textDirection: 'rtl' as const, labels: { font: { family: FONT, size: 14 }, usePointStyle: true } }, tooltip: { rtl: true, textDirection: 'rtl' as const } },
};

/* ------------------------------------------------------------------------- PIN pad */

function PinPad({ title, error, onDone, extra }: { title: string; error: string; onDone: (pin: string) => void; extra?: React.ReactNode }) {
  const [v, setV] = useState('');
  const [shake, setShake] = useState(0);
  useEffect(() => {
    if (error) {
      setV('');
      setShake((s) => s + 1);
    }
  }, [error]);
  const press = (d: string) => {
    if (v.length >= 4) return;
    const n = v + d;
    setV(n);
    if (n.length === 4) setTimeout(() => onDone(n), 160);
  };
  return (
    <div className="td-pin">
      <h2>{title}</h2>
      <div key={shake} className={`td-pins${shake ? ' is-shake' : ''}`}>
        {[0, 1, 2, 3].map((i) => (
          <i key={i} className={i < v.length ? 'on' : ''} />
        ))}
      </div>
      <div className="td-err">{error}</div>
      <div className="td-pad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
          <ToyButton key={d} color="#EFE3CB" fg={COLORS.ink} className="td-key" onPress={() => press(String(d))} data={{ key: String(d) }}>
            {DIGITS[d]}
          </ToyButton>
        ))}
        <ToyButton color="#EFE3CB" fg={COLORS.ink} className="td-key" label="مسح" onPress={() => setV((s) => s.slice(0, -1))} data={{ key: 'del' }}>
          <Delete size={28} />
        </ToyButton>
        <ToyButton color="#EFE3CB" fg={COLORS.ink} className="td-key" onPress={() => press('0')} data={{ key: '0' }}>
          {DIGITS[0]}
        </ToyButton>
        <span />
      </div>
      {extra}
    </div>
  );
}

/* ------------------------------------------------------------------------ dashboard */

function Seg<V extends string>({ value, onPick, options }: { value: V; onPick: (v: V) => void; options: { id: V; label: string }[] }) {
  return (
    <div className="td-seg">
      {options.map((o) => (
        <button key={o.id} type="button" className={o.id === value ? 'on' : ''} onClick={() => onPick(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Dashboard({ rows, source }: { rows: ExamRow[]; source: 'server' | 'local' }) {
  const [f, setF] = useState<Filters>(() => DEFAULT_FILTERS(EXAM_VERSION));
  const [sel, setSel] = useState<number | null>(null);
  const shown = useMemo(() => filterRows(rows, f), [rows, f]);
  const st = useMemo(() => computeStats(shown), [shown]);
  const pct = (x: number | null) => (x === null ? 0 : Math.round(x * 100));

  const perQ = useMemo<ChartCfg>(
    () => ({
      type: 'bar',
      data: {
        labels: TOPICS.map((_, i) => nf0.format(i + 1)),
        datasets: [
          { label: T.before, data: st.perQuestionPre.map(pct), backgroundColor: PRE, borderRadius: 6 },
          { label: T.after, data: st.perQuestionPost.map(pct), backgroundColor: POST, borderRadius: 6 },
        ],
      },
      options: {
        ...rtlBase,
        onClick: (_e, els) => setSel(els.length ? els[0].index : null),
        scales: {
          x: { reverse: true, grid: { display: false } },
          y: { min: 0, max: 100, ticks: { callback: (v) => `${nf0.format(Number(v))}٪` } },
        },
      },
    }),
    [st],
  );

  const hist = useMemo<ChartCfg>(
    () => ({
      type: 'bar',
      data: {
        labels: Array.from({ length: 11 }, (_, i) => nf0.format(i)),
        datasets: [
          { label: T.before, data: st.histPre, backgroundColor: `${PRE}CC`, grouped: false, borderRadius: 6 },
          { label: T.after, data: st.histPost, backgroundColor: `${POST}99`, grouped: false, borderRadius: 6, barPercentage: 0.55 },
        ],
      },
      options: { ...rtlBase, scales: { x: { reverse: true, grid: { display: false } }, y: { beginAtZero: true, ticks: { precision: 0, callback: (v) => nf0.format(Number(v)) } } } },
    }),
    [st],
  );

  const pairedCfg = useMemo<ChartCfg>(() => {
    const ds = st.paired.map((p) => ({
      label: '',
      data: [p.pre, p.post],
      borderColor: 'rgba(30,42,59,.28)',
      backgroundColor: 'rgba(30,42,59,.28)',
      borderWidth: 2,
      pointRadius: 4,
      tension: 0,
    }));
    const m = (k: 'pre' | 'post') => (st.paired.length ? st.paired.reduce((a, p) => a + p[k], 0) / st.paired.length : null);
    ds.push({ label: '', data: [m('pre') ?? 0, m('post') ?? 0], borderColor: COLORS.exam, backgroundColor: COLORS.exam, borderWidth: 6, pointRadius: 7, tension: 0 });
    return {
      type: 'line',
      data: { labels: [T.before, T.after], datasets: ds },
      options: { ...rtlBase, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { reverse: true, offset: true, grid: { display: false } }, y: { min: 0, max: 10, ticks: { stepSize: 2, callback: (v) => nf0.format(Number(v)) } } } },
    };
  }, [st]);

  const exportCsv = () => {
    const blob = new Blob([toCsv(shown)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'alrashed-results.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };

  const delta = st.avgPre !== null && st.avgPost !== null ? st.avgPost - st.avgPre : null;
  return (
    <div className="td-body">
      <section className="td-filters">
        <strong>{T.filters}</strong>
        <label>
          {T.from}
          <input type="date" value={f.from ?? ''} onChange={(e) => setF({ ...f, from: e.target.value || undefined })} />
        </label>
        <label>
          {T.to}
          <input type="date" value={f.to ?? ''} onChange={(e) => setF({ ...f, to: e.target.value || undefined })} />
        </label>
        <Seg<'all' | 'boy' | 'girl'> value={f.gender} onPick={(g) => setF({ ...f, gender: g })} options={[{ id: 'all', label: T.all }, { id: 'boy', label: T.boy }, { id: 'girl', label: T.girl }]} />
        <Seg<'latest' | 'all'> value={f.latestOnly ? 'latest' : 'all'} onPick={(v) => setF({ ...f, latestOnly: v === 'latest' })} options={[{ id: 'latest', label: T.latest }, { id: 'all', label: T.allAttempts }]} />
        <span className="td-src">
          {source === 'server' ? <Cloud size={18} /> : <HardDrive size={18} />}
          {source === 'server' ? T.allDevices : T.thisDevice}
        </span>
        <ToyButton color={COLORS.teal} className="td-csv" onPress={exportCsv} disabled={!shown.length} data={{ td: 'csv' }}>
          <Download size={22} />
          {T.csv}
        </ToyButton>
      </section>

      {!shown.length ? (
        <p className="td-empty">{T.noData}</p>
      ) : (
        <>
          <section className="td-big">
            <div className="td-num" style={{ '--c': PRE } as CSSProperties}>
              <small>{T.avgBefore}</small>
              <b>{num(st.avgPre)}</b>
              <em>
                {nf0.format(st.countPre)} {T.tests}
              </em>
            </div>
            <div className="td-arrow" style={{ color: delta === null ? COLORS.grey : delta >= 0 ? POST : COLORS.exam }}>
              <ArrowLeft size={54} strokeWidth={3} />
              <span>{delta === null ? '' : `\u200F${delta > 0 ? '+' : ''}${num(delta)}`}</span>
            </div>
            <div className="td-num" style={{ '--c': POST } as CSSProperties}>
              <small>{T.avgAfter}</small>
              <b>{num(st.avgPost)}</b>
              <em>
                {nf0.format(st.countPost)} {T.tests}
              </em>
            </div>
          </section>
          <section className="td-card td-wide">
            <h3>{T.perQuestion}</h3>
            <ChartBox cfg={perQ} height={250} />
            <div className="td-topic">
              {sel === null ? '' : `${nf0.format(sel + 1)} · ${TOPICS[sel]}`}
              {sel !== null ? ` — ${T.before} ${nf0.format(pct(st.perQuestionPre[sel]))}٪ · ${T.after} ${nf0.format(pct(st.perQuestionPost[sel]))}٪` : ''}
            </div>
          </section>
          <section className="td-card">
            <h3>{T.spread}</h3>
            <ChartBox cfg={hist} height={230} />
          </section>
          <section className="td-card">
            <h3>{T.paired}</h3>
            {st.paired.length ? <ChartBox cfg={pairedCfg} height={230} /> : <p className="td-empty">{T.noData}</p>}
            {st.tapShare !== null ? (
              <p className="td-tap">
                {T.tapShare}: {nf0.format(Math.round(st.tapShare * 100))}٪
              </p>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}

type Mode = 'loading' | 'set' | 'set2' | 'enter' | 'reset' | 'view';

export function TeacherDashboard({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<Mode>('loading');
  const [err, setErr] = useState('');
  const [rows, setRows] = useState<ExamRow[]>([]);
  const [source, setSource] = useState<'server' | 'local'>('local');
  const first = useRef('');
  const admin = useRef('');
  const adminInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let live = true;
    void (async () => {
      if (loadPin()) return live && setMode('enter');
      const set = await teacherPinIsSet();
      if (live) setMode(set === true ? 'enter' : 'set');
    })();
    return () => {
      live = false;
    };
  }, []);

  const openView = async (pin: string) => {
    const r = await getResults(pin);
    if (r.ok) {
      setRows(r.rows.filter((x) => x && typeof x.score === 'number'));
      setSource('server');
    } else {
      setRows(loadLocalRows());
      setSource('local');
      // A PIN made offline reaches the Worker the first time we are online.
      if (r.reason === 'no-pin') void setTeacherPin({ pin });
    }
    setErr('');
    setMode('view');
  };

  const onEnter = async (pin: string) => {
    const local = await localMatches(pin);
    if (local) return void openView(pin);
    const remote = await checkTeacherPin(pin);
    if (remote === true) {
      await savePin(pin);
      return void openView(pin);
    }
    setErr(remote === null && local === null ? T.needNet : T.badPin);
    setTimeout(() => setErr(''), 1800);
  };

  const onSet = async (pin: string) => {
    if (mode === 'set') {
      first.current = pin;
      setErr('');
      return setMode('set2');
    }
    if (pin !== first.current) {
      setErr(T.noMatch);
      setMode('set');
      return void setTimeout(() => setErr(''), 1800);
    }
    if (admin.current) {
      const out = await setTeacherPin({ pin, admin: admin.current });
      if (out !== 'ok') {
        admin.current = '';
        setErr(out === null ? T.needNet : T.badPin);
        return setMode('reset');
      }
      admin.current = '';
      await savePin(pin);
    } else {
      await savePin(pin);
      void setTeacherPin({ pin });
    }
    void openView(pin);
  };

  const startReset = async () => {
    const a = adminInput.current?.value.trim() ?? '';
    if (!a) return;
    if (!API_BASE || !isOnline()) return setErr(T.needNet);
    admin.current = a;
    setErr('');
    setMode('set');
  };

  return (
    <div className="td-modal" data-exam="teacher">
      <style>{CSS}</style>
      <div className="td-panel">
        <header>
          <h1>{T.title}</h1>
          <ToyButton color={COLORS.exam} round className="td-x" label="إغلاق" onPress={onClose} data={{ td: 'close' }}>
            <X size={30} />
          </ToyButton>
        </header>
        {mode === 'loading' ? <p className="td-empty">{T.loading}</p> : null}
        {mode === 'set' ? <PinPad key="s1" title={T.setPin} error={err} onDone={(p) => void onSet(p)} /> : null}
        {mode === 'set2' ? <PinPad key="s2" title={T.confirmPin} error={err} onDone={(p) => void onSet(p)} /> : null}
        {mode === 'enter' ? (
          <PinPad
            key="e"
            title={T.enterPin}
            error={err}
            onDone={(p) => void onEnter(p)}
            extra={
              API_BASE ? (
                <button type="button" className="td-link" onClick={() => { setErr(''); setMode('reset'); }}>
                  {T.forgot}
                </button>
              ) : null
            }
          />
        ) : null}
        {mode === 'reset' ? (
          <div className="td-pin">
            <h2>{T.adminPin}</h2>
            <input ref={adminInput} className="td-admin" type="password" dir="ltr" autoFocus />
            <div className="td-err">{err}</div>
            <ToyButton color={COLORS.teal} className="td-csv" onPress={() => void startReset()} data={{ td: 'admin-go' }}>
              {T.go}
            </ToyButton>
          </div>
        ) : null}
        {mode === 'view' ? <Dashboard rows={rows} source={source} /> : null}
      </div>
    </div>
  );
}

const CSS = `
.td-modal{position:fixed;inset:0;z-index:50;background:rgba(30,42,59,.45);display:grid;place-items:center;pointer-events:auto;direction:rtl;font-family:'IBM Plex Sans Arabic',system-ui,sans-serif;color:#1E2A3B}
.td-modal *{box-sizing:border-box}
.td-panel{width:min(1100px,96vw);max-height:94vh;overflow:auto;background:#FFF8EC;border-radius:30px;padding:20px clamp(14px,3vw,30px) 28px;box-shadow:0 8px 0 #EADBC2,0 24px 40px -14px rgba(30,42,59,.5)}
.td-panel header{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.td-panel h1{margin:0;font-size:clamp(22px,3vw,32px);font-weight:700}
.td-panel h2{margin:0 0 6px;font-size:22px;font-weight:700;text-align:center}
.td-panel h3{margin:0 0 10px;font-size:18px;font-weight:700}
.td-pin{display:flex;flex-direction:column;align-items:center;gap:12px;padding:6px 0 10px}
.td-pins{display:flex;gap:16px;margin:4px 0}
.td-pins i{width:26px;height:26px;border-radius:50%;background:#E8DDC8;box-shadow:inset 0 -3px 0 rgba(30,42,59,.12)}
.td-pins i.on{background:#14B8A6}
.td-pins.is-shake{animation:tdShake .4s}
@keyframes tdShake{20%{transform:translateX(-10px)}40%{transform:translateX(10px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}}
.td-err{min-height:26px;color:#D6264C;font-weight:700}
.td-pad{display:grid;grid-template-columns:repeat(3,84px);gap:6px 14px;direction:ltr}
.toy.td-key{min-width:84px;min-height:68px;font-size:30px;padding:0}
.td-link{background:none;border:0;color:#2D8CFF;font:700 17px 'IBM Plex Sans Arabic',sans-serif;cursor:pointer;padding:10px}
.td-admin{font-size:26px;padding:10px 16px;border-radius:16px;border:3px solid #EADBC2;width:min(320px,80vw);text-align:center}
.td-body{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.td-filters,.td-big,.td-wide,.td-empty{grid-column:1 / -1}
.td-filters{display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;background:#F6EAD6;border-radius:20px;padding:10px 16px}
.td-filters label{display:flex;gap:6px;align-items:center;font-weight:700}
.td-filters input[type=date]{font:500 16px 'IBM Plex Sans Arabic',sans-serif;padding:6px 8px;border-radius:10px;border:2px solid #EADBC2;background:#fff}
.td-seg{display:flex;background:#fff;border-radius:14px;padding:3px;gap:3px;border:2px solid #EADBC2}
.td-seg button{font:700 15px 'IBM Plex Sans Arabic',sans-serif;border:0;background:none;padding:8px 14px;border-radius:11px;cursor:pointer;color:#1E2A3B}
.td-seg button.on{background:#14B8A6;color:#fff}
.td-src{display:inline-flex;gap:6px;align-items:center;color:#4A5568;font-weight:700;margin-inline-start:auto}
.toy.td-csv{min-height:52px;font-size:16px;padding:0 18px}
.td-big{display:flex;align-items:center;justify-content:center;gap:clamp(10px,3vw,40px);flex-wrap:wrap}
.td-num{background:#fff;border-radius:24px;padding:12px 28px;text-align:center;border-bottom:6px solid var(--c);min-width:220px;box-shadow:0 8px 14px -10px rgba(30,42,59,.4)}
.td-num small{display:block;font-weight:700;color:#4A5568}
.td-num b{display:block;font-size:clamp(46px,7vw,76px);line-height:1.1;color:var(--c)}
.td-num em{font-style:normal;color:#4A5568}
.td-arrow{display:flex;flex-direction:column;align-items:center;font-weight:700;font-size:24px}
.td-card{background:#fff;border-radius:24px;padding:14px 16px 16px;box-shadow:0 8px 14px -10px rgba(30,42,59,.4)}
.td-topic{min-height:28px;margin-top:8px;font-size:20px;font-weight:700;text-align:center;color:#1E2A3B}
.td-empty{text-align:center;color:#4A5568;font-weight:700;padding:30px}
.td-tap{margin:8px 0 0;color:#4A5568;font-weight:700;text-align:center}
@media (max-width:820px){.td-body{grid-template-columns:1fr}}
@media (max-height:520px) and (orientation:landscape){
.td-panel{max-height:calc(100dvh - 16px);padding:12px 20px 16px;border-radius:24px}
.td-panel header{margin-bottom:4px}
.td-panel .toy.td-x{min-width:52px;min-height:52px;width:52px;height:52px}
.td-pin:has(.td-pad){display:grid;grid-template-columns:auto auto;grid-auto-flow:column;grid-template-rows:auto auto auto 1fr;justify-content:center;align-items:center;column-gap:clamp(20px,5vw,56px);row-gap:6px}
.td-pin:has(.td-pad) > *{grid-column:1;justify-self:center}
.td-pin:has(.td-pad) > .td-pad{grid-column:2;grid-row:1 / span 4}
.td-pad{grid-template-columns:repeat(3,72px);gap:4px 10px}
.toy.td-key{min-width:72px;min-height:54px;font-size:26px}
}
@media (max-width:420px){.td-pad{grid-template-columns:repeat(3,76px);gap:6px 10px}.toy.td-key{min-width:76px}.td-num{min-width:0;padding:10px 18px}}
`;
