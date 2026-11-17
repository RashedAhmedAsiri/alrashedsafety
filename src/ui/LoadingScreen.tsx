// OWNER: ui worker. Loading screen: Alrashed the robot floats over a soft teal glow, the «الراشد» logo
// springs in, a safety tip changes every few seconds and a chunky progress bar fills right → left with a
// small school bus riding its tip. When loading ends the bus reaches the school flag, the robot waves and
// the screen fades out.
import { useEffect, useState, type CSSProperties } from 'react';
import { useApp } from '../core/store';
import { APP_TITLE } from './labels';
import { Logo } from './Logo';
import { NAME_CLIP } from '../content/voiceLines';
import { getVoiceStatus, isVoiceLocked, onVoiceStatus, speak, whenVoiceUnlocked, type VoiceStatus } from '../voice/speech';

const TIPS = [
  'انظر يمينًا ويسارًا قبل أن تعبر الشارع',
  'اربط حزام الأمان في كل رحلة',
  'امشِ بهدوء في الممرات ولا تركض',
  'اغسل يديك قبل الأكل وبعده',
  'ابقَ مع معلمك عند الخروج من المدرسة',
];
const TIP_MS = 2800;

/**
 * Says his name once while the screen shows it: the recorded clip («ui.name») when present, else the browser's
 * Arabic voice, else a silent mouth animation. Browsers block sound until the first tap, so the line is queued and
 * plays on that tap; `status` drives the speaker icon (no text) that tells the child to tap.
 */
function useSayName(active: boolean): VoiceStatus {
  const [status, setStatus] = useState<VoiceStatus>(getVoiceStatus());
  useEffect(() => {
    if (!active) return;
    const ctl = new AbortController();
    const off = onVoiceStatus(setStatus);
    void (async () => {
      try {
        if (isVoiceLocked()) {
          setStatus('locked');
          if (!(await whenVoiceUnlocked(0, ctl.signal))) return;
          setStatus(getVoiceStatus() === 'locked' ? 'ok' : getVoiceStatus());
        }
        await speak({ key: NAME_CLIP.key, text: NAME_CLIP.text });
      } catch {
        /* aborted or no sound available: stay silent */
      }
    })();
    return () => {
      ctl.abort();
      off();
    };
  }, [active]);
  return status;
}

function SpeakerHint({ status }: { status: VoiceStatus }) {
  if (status === 'ok') return null;
  if (status === 'net') {
    return (
      <svg className="ld-speaker" viewBox="0 0 24 24" width={40} height={40} role="status" aria-label="net">
        <path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor" />
        <path d="M16 9a4 4 0 0 1 0 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
        <circle cx="20" cy="5" r="2.5" fill="currentColor" />
      </svg>
    );
  }
  const muted = status !== 'locked';
  return (
    <svg className={`ld-speaker${muted ? ' is-muted' : ' is-pulse'}`} viewBox="0 0 24 24" width={40} height={40} role="status" aria-label={status}>
      <path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor" />
      {muted ? (
        <path d="M16 8l6 8M22 8l-6 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      )}
    </svg>
  );
}

/** Alrashed, front view: white shell, dark face screen with cyan eyes, teal ear cups, shield on the chest. */
function Mascot({ done }: { done: boolean }) {
  return (
    <svg className={`ld-bot${done ? ' is-done' : ''}`} viewBox="0 0 220 230" aria-hidden>
      <defs>
        <linearGradient id="ldShell" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#DCE5EE" />
        </linearGradient>
        <linearGradient id="ldScreen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2A3A52" />
          <stop offset="1" stopColor="#16202F" />
        </linearGradient>
      </defs>
      {/* body */}
      <g className="ld-bot-body">
        <rect x="64" y="150" width="92" height="66" rx="30" fill="url(#ldShell)" stroke="#C5D1DE" strokeWidth="3" />
        <path d="M110 164l19 7v13c0 11-8 19-19 23-11-4-19-12-19-23v-13z" fill="#14B8A6" stroke="#0B8C7E" strokeWidth="3" strokeLinejoin="round" />
        <path d="M101 186l7 7 12-14" fill="none" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        {/* arms; the right one waves when loading is done */}
        <rect x="38" y="158" width="26" height="46" rx="13" fill="url(#ldShell)" stroke="#C5D1DE" strokeWidth="3" />
        <g className="ld-bot-wave">
          <rect x="156" y="158" width="26" height="46" rx="13" fill="url(#ldShell)" stroke="#C5D1DE" strokeWidth="3" />
          <circle cx="169" cy="206" r="10" fill="#14B8A6" stroke="#0B8C7E" strokeWidth="3" />
        </g>
        <circle cx="51" cy="206" r="10" fill="#14B8A6" stroke="#0B8C7E" strokeWidth="3" />
      </g>
      {/* neck */}
      <rect x="94" y="140" width="32" height="16" rx="6" fill="#9FB0C2" />
      {/* head */}
      <g className="ld-bot-head">
        <rect x="26" y="74" width="20" height="40" rx="10" fill="#14B8A6" stroke="#0B8C7E" strokeWidth="3" />
        <rect x="174" y="74" width="20" height="40" rx="10" fill="#14B8A6" stroke="#0B8C7E" strokeWidth="3" />
        <rect x="40" y="30" width="140" height="116" rx="50" fill="url(#ldShell)" stroke="#C5D1DE" strokeWidth="3" />
        <rect x="58" y="54" width="104" height="68" rx="30" fill="url(#ldScreen)" />
        <path d="M70 62q40-10 80 0" fill="none" stroke="#FFFFFF" strokeOpacity="0.12" strokeWidth="5" strokeLinecap="round" />
        <g className="ld-bot-eyes">
          <rect x="82" y="76" width="16" height="22" rx="8" fill="#5FE3FF" />
          <rect x="122" y="76" width="16" height="22" rx="8" fill="#5FE3FF" />
        </g>
        <path d="M95 106q15 12 30 0" fill="none" stroke="#5FE3FF" strokeWidth="5" strokeLinecap="round" />
        <circle cx="72" cy="102" r="6" fill="#FF8FA3" opacity="0.55" />
        <circle cx="148" cy="102" r="6" fill="#FF8FA3" opacity="0.55" />
      </g>
    </svg>
  );
}

function Bus() {
  // Side view, front to the LEFT (it drives leftwards). 96 x 58.
  return (
    <svg viewBox="0 0 96 58" width={72} height={44} aria-hidden>
      <rect x="4" y="6" width="88" height="40" rx="10" fill="#E8A400" />
      <rect x="4" y="2" width="88" height="40" rx="10" fill="#FFC62B" />
      <path d="M4 26h88v8a8 8 0 0 1-8 8H12a8 8 0 0 1-8-8z" fill="#F2B21B" />
      <rect x="4" y="27" width="88" height="4" fill="#1E2A3B" opacity="0.85" />
      <rect x="9" y="8" width="13" height="14" rx="4" fill="#BFE6FF" />
      {[27, 43, 59, 75].map((x) => (
        <rect key={x} x={x} y="8" width="12" height="12" rx="3.5" fill="#BFE6FF" />
      ))}
      <rect x="11" y="10" width="4" height="9" rx="2" fill="#FFFFFF" opacity="0.7" />
      <rect x="3" y="33" width="6" height="5" rx="2.5" fill="#FFF3C4" />
      <rect x="88" y="33" width="5" height="5" rx="2.5" fill="#F0476B" />
      {[22, 72].map((x) => (
        <g key={x}>
          <circle cx={x} cy="45" r="10" fill="#1E2A3B" />
          <circle cx={x} cy="45" r="4.2" fill="#D9DEE6" />
        </g>
      ))}
    </svg>
  );
}

function SchoolFlag() {
  return (
    <svg viewBox="0 0 56 64" width={44} height={50} aria-hidden>
      <path d="M6 30 28 16l22 14z" fill="#F0476B" />
      <rect x="9" y="28" width="38" height="30" rx="4" fill="#FFFFFF" stroke="#E3D6BF" strokeWidth="2" />
      <rect x="23" y="40" width="10" height="18" rx="3" fill="#2D8CFF" />
      <rect x="13" y="34" width="7" height="7" rx="2" fill="#BFE6FF" />
      <rect x="36" y="34" width="7" height="7" rx="2" fill="#BFE6FF" />
      <rect x="27" y="2" width="3" height="16" rx="1.5" fill="#1E2A3B" />
      <path d="M30 3h13l-4 4.5 4 4.5H30z" fill="#22B573" />
    </svg>
  );
}

export function LoadingScreen() {
  const phase = useApp((s) => s.phase);
  const progress = useApp((s) => s.loadProgress);
  const loading = phase === 'loading';
  const voiceStatus = useSayName(loading);
  const [tip, setTip] = useState(0);
  const [gone, setGone] = useState(!loading);
  const [out, setOut] = useState(false);

  useEffect(() => {
    if (!loading) return;
    setGone(false);
    setOut(false);
    const id = window.setInterval(() => setTip((t) => (t + 1) % TIPS.length), TIP_MS);
    return () => window.clearInterval(id);
  }, [loading]);

  // Loading finished: the bus arrives and the robot waves, then fade out and unmount.
  useEffect(() => {
    if (loading) return;
    const t1 = window.setTimeout(() => setOut(true), 1100);
    const t2 = window.setTimeout(() => setGone(true), 1800);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [loading]);

  if (gone) return null;

  const p = loading ? Math.max(0, Math.min(1, progress)) : 1;
  const pct = Math.round(p * 100);
  const subtitle = APP_TITLE.split(' ').slice(1).join(' ');

  return (
    <div className={`ld${out ? ' is-out' : ''}${loading ? '' : ' is-done'}`} style={{ '--p': p } as CSSProperties}>
      <div className="ld-glow" aria-hidden />
      <div className="ld-dots" aria-hidden>
        {Array.from({ length: 9 }, (_, i) => (
          <i key={i} style={{ '--i': i, top: `${12 + ((i * 37) % 70)}%` } as CSSProperties} />
        ))}
      </div>
      <div className="ld-card" role="img" aria-label={APP_TITLE}>
        <div className="ld-stage">
          <Mascot done={!loading} />
          <div className="ld-shadow" aria-hidden />
        </div>
        <Logo height="clamp(64px, 14vh, 112px)" className="ld-logo" />
        <div className="ld-sub">{subtitle}</div>
      </div>
      <div className="ld-meter" aria-hidden>
        <div className="ld-bar">
          <div className="ld-fill" style={{ width: `${pct}%` }} />
          <div className="ld-bus" style={{ left: `${100 - pct}%` }}>
            <Bus />
          </div>
        </div>
        <div className="ld-flag">
          <SchoolFlag />
        </div>
      </div>
      <div className="ld-foot">
        {loading ? (
          <p key={tip} className="ld-tip">
            {TIPS[tip]}
          </p>
        ) : (
          <p className="ld-tip is-ready">هيا نبدأ!</p>
        )}
        {loading && <SpeakerHint status={voiceStatus} />}
      </div>
    </div>
  );
}
