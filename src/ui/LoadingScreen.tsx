// OWNER: ui worker. Paper loading screen: the title bounces in word by word (looping), and a yellow
// school bus drives right → left along a little road with useApp.loadProgress. When loading ends the bus
// reaches the school, the title does a final bounce and the screen fades out over the fly-in.
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useApp } from '../core/store';
import { APP_TITLE } from './labels';
import { Logo } from './Logo';
import { NAME_CLIP } from '../content/voiceLines';
import { getVoiceStatus, isVoiceLocked, onVoiceStatus, speak, whenVoiceUnlocked, type VoiceStatus } from '../voice/speech';

const CYCLE_MS = 4300;

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
      <svg className="ld-speaker" viewBox="0 0 24 24" width={44} height={44} role="status" aria-label="net">
        <path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor" />
        <path d="M16 9a4 4 0 0 1 0 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
        <circle cx="20" cy="5" r="2.5" fill="currentColor" />
      </svg>
    );
  }
  const muted = status !== 'locked';
  return (
    <svg className={`ld-speaker${muted ? ' is-muted' : ' is-pulse'}`} viewBox="0 0 24 24" width={44} height={44} role="status" aria-label={status}>
      <path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor" />
      {muted ? (
        <path d="M16 8l6 8M22 8l-6 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      )}
    </svg>
  );
}

function Bus() {
  // Side view, front to the LEFT (it drives leftwards). 96 x 58.
  return (
    <svg viewBox="0 0 96 58" width={96} height={58} aria-hidden>
      <rect x="4" y="6" width="88" height="40" rx="10" fill="#E8A400" />
      <rect x="4" y="2" width="88" height="40" rx="10" fill="#FFC62B" />
      <path d="M4 26h88v8a8 8 0 0 1-8 8H12a8 8 0 0 1-8-8z" fill="#F2B21B" />
      <rect x="4" y="27" width="88" height="4" fill="#1E2A3B" opacity="0.85" />
      {/* windscreen + windows */}
      <rect x="9" y="8" width="13" height="14" rx="4" fill="#BFE6FF" />
      {[27, 43, 59, 75].map((x) => (
        <rect key={x} x={x} y="8" width="12" height="12" rx="3.5" fill="#BFE6FF" />
      ))}
      <rect x="11" y="10" width="4" height="9" rx="2" fill="#FFFFFF" opacity="0.7" />
      {/* door */}
      <rect x="25" y="23" width="0" height="0" />
      {/* lights */}
      <rect x="3" y="33" width="6" height="5" rx="2.5" fill="#FFF3C4" />
      <rect x="88" y="33" width="5" height="5" rx="2.5" fill="#F0476B" />
      {/* wheels */}
      {[22, 72].map((x) => (
        <g key={x}>
          <circle cx={x} cy="45" r="10" fill="#1E2A3B" />
          <circle cx={x} cy="45" r="4.2" fill="#D9DEE6" />
        </g>
      ))}
    </svg>
  );
}

function School() {
  return (
    <svg viewBox="0 0 56 64" width={56} height={64} aria-hidden>
      <rect x="27" y="2" width="3" height="22" rx="1.5" fill="#1E2A3B" />
      <path d="M30 4h14l-4 5 4 5H30z" fill="#22B573" />
      <path d="M6 30 28 16l22 14z" fill="#F0476B" />
      <rect x="9" y="28" width="38" height="30" rx="4" fill="#FFFFFF" />
      <rect x="9" y="52" width="38" height="6" rx="3" fill="#EADBC2" />
      <rect x="23" y="40" width="10" height="18" rx="3" fill="#2D8CFF" />
      <rect x="13" y="34" width="7" height="7" rx="2" fill="#BFE6FF" />
      <rect x="36" y="34" width="7" height="7" rx="2" fill="#BFE6FF" />
    </svg>
  );
}

function Home() {
  return (
    <svg viewBox="0 0 48 52" width={48} height={52} aria-hidden>
      <rect x="6" y="18" width="36" height="30" rx="4" fill="#F4E1BE" />
      <rect x="4" y="12" width="40" height="8" rx="3" fill="#E7C998" />
      <rect x="19" y="30" width="10" height="18" rx="3" fill="#8A5A3C" />
      <rect x="10" y="24" width="7" height="7" rx="2" fill="#BFE6FF" />
      <rect x="31" y="24" width="7" height="7" rx="2" fill="#BFE6FF" />
      <rect x="4" y="44" width="40" height="5" rx="2.5" fill="#E2CBA4" />
    </svg>
  );
}

export function LoadingScreen() {
  const phase = useApp((s) => s.phase);
  const progress = useApp((s) => s.loadProgress);
  const loading = phase === 'loading';
  const voiceStatus = useSayName(loading);
  const [cycle, setCycle] = useState(0);
  const [gone, setGone] = useState(!loading);
  const [out, setOut] = useState(false);
  const roadRef = useRef<HTMLDivElement>(null);
  const [roadW, setRoadW] = useState(560);

  // Restart the word animation every cycle while loading.
  useEffect(() => {
    if (!loading) return;
    setGone(false);
    setOut(false);
    const id = window.setInterval(() => setCycle((c) => c + 1), CYCLE_MS);
    return () => window.clearInterval(id);
  }, [loading]);

  // Loading finished: final bounce, then fade out and unmount.
  useEffect(() => {
    if (loading) return;
    const t1 = window.setTimeout(() => setOut(true), 900);
    const t2 = window.setTimeout(() => setGone(true), 1600);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [loading]);

  useEffect(() => {
    const el = roadRef.current;
    if (!el) return;
    const measure = () => setRoadW(el.clientWidth - 112);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [gone]);

  if (gone) return null;

  const p = loading ? Math.max(0, Math.min(1, progress)) : 1;
  const travel = Math.max(0, roadW - 96);
  // RTL: starts at the right end, drives to the left.
  const busX = travel * (1 - p);
  const words = APP_TITLE.split(' ');
  const logoH = 'clamp(84px, 17vh, 150px)';

  return (
    <div className={`ld${out ? ' is-out' : ''}${loading ? '' : ' is-done'}`} style={{ '--logo-h': logoH } as CSSProperties}>
      <div key={loading ? cycle : 'final'} className={`ld-title${loading ? '' : ' is-final'}`} aria-label={APP_TITLE} role="img">
        <span className="ld-w" style={{ '--i': 0 } as CSSProperties}>
          <Logo height={logoH} className="ld-logo" />
        </span>
        <div className="ld-line">
          {words.slice(1).map((w, i) => (
            <span key={i} className="ld-w" style={{ '--i': i + 1 } as CSSProperties}>
              {w}
            </span>
          ))}
        </div>
      </div>
      {loading && <SpeakerHint status={voiceStatus} />}
      <div className="road" ref={roadRef} aria-hidden>
        <div className="road-end road-end--school">
          <School />
        </div>
        <div className="road-end road-end--home">
          <Home />
        </div>
        <div className="road-strip">
          <div className="road-done" style={{ width: `${p * 100}%` }} />
        </div>
        <div className="bus" style={{ transform: `translateX(${busX}px)` }}>
          <Bus />
        </div>
      </div>
    </div>
  );
}
