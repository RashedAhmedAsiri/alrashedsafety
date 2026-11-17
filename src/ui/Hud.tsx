// OWNER: ui worker. In-mode buttons: mode bar, status pill (top left), back + settings (top right),
// call + mic (bottom right), scenarios (bottom left).
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { ArrowRight, AudioLines, Ear, Ellipsis, Footprints, Hand, LayoutGrid, Mic, SendHorizontal, Phone, PhoneOff, Presentation, Settings, Smile, type LucideIcon } from 'lucide-react';
import { useApp } from '../core/store';
import { COLORS, MODE_COLORS, STATUS_COLORS, STATUS_LABELS } from '../core/theme';
import type { Status } from '../core/types';
import { askByVoice, askText, backToMenu, endCall, startCall, stopAll } from '../engine/conversation';
import { ToyButton } from './ToyButton';
import { UI_TEXT } from './labels';
import { useUiLocal } from './uiStore';

export const STATUS_ICONS: Record<Status, LucideIcon> = {
  ready: Smile,
  listening: Ear,
  thinking: Ellipsis,
  speaking: AudioLines,
  explaining: Presentation,
  waving: Hand,
  walking: Footprints,
};

const CALL_RED = '#E5484D';
const SETTINGS_COLOR = '#3E4C63';

function StatusPill() {
  const status = useApp((s) => s.status);
  const Icon = STATUS_ICONS[status];
  return (
    <ToyButton color={STATUS_COLORS[status]} fg="#fff" className="status" label={UI_TEXT.stop} onPress={() => stopAll()} data={{ ui: 'status', status }}>
      <span className="status-ico">
        <Icon key={status} size={26} strokeWidth={2.5} />
      </span>
      <span className="status-label">{STATUS_LABELS[status]}</span>
    </ToyButton>
  );
}

function CallCluster() {
  const inCall = useApp((s) => s.inCall);
  const listening = useApp((s) => s.listening);
  const [ringKey, setRingKey] = useState(0);
  const prev = useRef(inCall);

  // Ring rings around the call button each time a call starts (from here or from the engine).
  useEffect(() => {
    if (inCall && !prev.current) {
      setRingKey((k) => k + 1);
      useUiLocal.getState().set({ ringAt: performance.now() });
    }
    prev.current = inCall;
  }, [inCall]);

  return (
    <div className="hud-br hud-in" style={{ '--i': 3 } as CSSProperties}>
      <div className="mic-slot">
        <div className={`mic-wrap${inCall ? ' is-up' : ''}`}>
          <div className={`rings${listening ? ' is-on' : ''}`} style={{ '--c': COLORS.inside } as CSSProperties}>
            <i />
            <i />
            <i />
          </div>
          <ToyButton
            round
            color={COLORS.inside}
            className={`mic${listening ? ' is-listening' : ''}`}
            label={UI_TEXT.mic}
            onPress={() => void askByVoice()}
            data={{ ui: 'mic' }}
          >
            <Mic size={36} strokeWidth={2.5} />
          </ToyButton>
        </div>
      </div>
      <div style={{ position: 'relative' }}>
        <div key={ringKey} className={`rings${ringKey ? ' is-once' : ''}`} style={{ '--c': COLORS.teal, bottom: 6 } as CSSProperties}>
          <i />
          <i />
          <i />
        </div>
        <ToyButton
          round
          color={inCall ? CALL_RED : COLORS.teal}
          className="call"
          label={inCall ? UI_TEXT.endCall : UI_TEXT.call}
          onPress={() => (inCall ? endCall() : startCall())}
          data={{ ui: 'call' }}
        >
          {inCall ? <PhoneOff key="off" size={38} strokeWidth={2.5} /> : <Phone key="on" size={38} strokeWidth={2.5} />}
        </ToyButton>
      </div>
    </div>
  );
}

function QuestionBox({ color }: { color: string }) {
  const [text, setText] = useState('');
  const send = (e: FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setText('');
    void askText(t);
  };
  return (
    <form className="qbox hud-in" style={{ '--i': 3, '--c': color } as CSSProperties} onSubmit={send} dir="rtl">
      <input className="qbox-in" type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder={UI_TEXT.askPlaceholder} aria-label={UI_TEXT.askPlaceholder} maxLength={200} enterKeyHint="send" autoComplete="off" />
      <ToyButton color={color} className="btn-sq qbox-send" label={UI_TEXT.send} onPress={() => send({ preventDefault() {} } as FormEvent)} data={{ ui: 'ask-send' }}>
        <SendHorizontal size={26} strokeWidth={2.5} style={{ transform: 'scaleX(-1)' }} />
      </ToyButton>
    </form>
  );
}

export function Hud() {
  const mode = useApp((s) => s.mode);
  const examRunning = useApp((s) => s.ui.examRunning);
  const setUi = useApp((s) => s.setUi);
  const color = mode ? MODE_COLORS[mode] : COLORS.teal;

  return (
    <div className="hud">
      <div key={mode ?? 'none'} className="mode-bar" style={{ '--c': color } as CSSProperties} />
      <div className="hud-tl hud-in" style={{ '--i': 0 } as CSSProperties}>
        <StatusPill />
      </div>
      <div className="hud-tr">
        <div className="hud-in" style={{ '--i': 1 } as CSSProperties}>
          <ToyButton color={color} className="btn-sq" label={UI_TEXT.back} onPress={() => backToMenu()} data={{ ui: 'back' }}>
            <ArrowRight size={32} strokeWidth={2.5} />
          </ToyButton>
        </div>
        <div className="hud-in" style={{ '--i': 2 } as CSSProperties}>
          <ToyButton
            color={SETTINGS_COLOR}
            className="btn-sq"
            label={UI_TEXT.settings}
            onPress={() => {
              setUi({ settingsOpen: true, scenariosOpen: false });
              useUiLocal.getState().set({ mapOpen: false });
            }}
            data={{ ui: 'settings' }}
          >
            <Settings size={30} strokeWidth={2.5} />
          </ToyButton>
        </div>
      </div>
      <CallCluster />
      {!examRunning && <QuestionBox color={color} />}
      <div className="hud-bl hud-in" style={{ '--i': 4 } as CSSProperties}>
        <div className={`hud-out${examRunning ? ' is-hidden' : ''}`}>
          <ToyButton
            color={color}
            className="btn-big"
            label={UI_TEXT.scenarios}
            sound="pop"
            onPress={() => {
              setUi({ scenariosOpen: true, settingsOpen: false });
              useUiLocal.getState().set({ mapOpen: false });
            }}
            data={{ ui: 'scenarios' }}
          >
            <LayoutGrid size={36} strokeWidth={2.5} />
          </ToyButton>
        </div>
      </div>
    </div>
  );
}
