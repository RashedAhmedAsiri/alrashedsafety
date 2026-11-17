import { useApp } from '../core/store';
import type { Quality } from '../core/types';

/**
 * Graphics quality: auto-picked once on the very first launch on a device from device hints, then
 * the student/teacher choice in settings wins (persisted by the store).
 */

const PICKED_KEY = 'alrashed.qualityPicked.v1';
const SETTINGS_KEY = 'alrashed.settings.v1';

function rendererName(): string {
  try {
    const c = document.createElement('canvas');
    const gl = (c.getContext('webgl2') || c.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) return 'none';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return name;
  } catch {
    return '';
  }
}

export function guessQuality(): Quality {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const ua = nav.userAgent || '';
  const touchMac = /Macintosh/.test(ua) && (nav.maxTouchPoints ?? 0) > 1;
  const iPad = /iPad/.test(ua) || touchMac;
  const phone = /iPhone|iPod|Android.*Mobile|Mobile.*Android/.test(ua);
  const cores = nav.hardwareConcurrency || 4;
  const mem = nav.deviceMemory ?? 8;
  const gpu = rendererName();
  if (gpu === 'none' || /swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic/i.test(gpu)) return 'low';
  if (phone) return 'low';
  if (iPad || /Android/.test(ua)) return mem <= 3 ? 'low' : 'medium';
  if (cores <= 2 || mem <= 2) return 'low';
  const strongGpu = /nvidia|geforce|rtx|gtx|radeon|apple m\d|apple gpu|iris xe|arc\b/i.test(gpu);
  if (cores >= 8 && mem >= 8 && strongGpu) return 'high';
  return 'medium';
}

/** On the very first launch (no saved choice), pick a quality from the device and save it. */
export function autoPickQuality() {
  // Dev/screenshot override: ?quality=low|medium|high (not saved).
  try {
    const q = new URLSearchParams(location.search).get('quality');
    if (q === 'low' || q === 'medium' || q === 'high') {
      useApp.setState({ settings: { ...useApp.getState().settings, quality: q } });
      return;
    }
  } catch {
    /* ignore */
  }
  let picked: string | null = null;
  let saved: string | null = null;
  try {
    picked = localStorage.getItem(PICKED_KEY);
    saved = localStorage.getItem(SETTINGS_KEY);
  } catch {
    return; // storage blocked: keep the default
  }
  if (picked) return;
  if (saved && /"quality"/.test(saved)) {
    try {
      localStorage.setItem(PICKED_KEY, 'saved');
    } catch {
      /* ignore */
    }
    return;
  }
  const q = guessQuality();
  useApp.getState().setSettings({ quality: q });
  try {
    localStorage.setItem(PICKED_KEY, q);
  } catch {
    /* ignore */
  }
}

/** Device pixel ratio for a quality level. */
export function dprFor(q: Quality): number {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  if (q === 'low') return 1;
  if (q === 'medium') return Math.min(dpr, 1.5);
  return Math.min(dpr, 2);
}
