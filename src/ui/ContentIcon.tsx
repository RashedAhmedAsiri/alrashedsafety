// OWNER: ui worker. Renders a lucide icon given by name in content data (e.g. Scenario.icon = 'Footprints').
import { useEffect, useState } from 'react';
import { ShieldCheck, type LucideIcon } from 'lucide-react';

type IconMap = Record<string, LucideIcon>;
let map: IconMap | null = null;
let loading: Promise<IconMap> | null = null;

/** Starts loading the icon map (call early, e.g. when the menu shows). */
export function preloadIcons(): Promise<IconMap> {
  if (map) return Promise.resolve(map);
  if (!loading)
    loading = import('./allIcons').then(
      (m) => (map = m.icons as unknown as IconMap),
      () => (map = {}),
    );
  return loading;
}

function resolve(name: string | undefined): LucideIcon | null {
  if (!map || !name) return null;
  const clean = name.trim();
  // Accept 'Footprints', 'footprints', 'foot-prints' style names.
  const pascal = clean
    .split(/[-_\s]+/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');
  return map[clean] ?? map[pascal] ?? map[pascal.replace(/Icon$/, '')] ?? null;
}

export function ContentIcon({ name, size = 28, fallback = ShieldCheck }: { name?: string; size?: number; fallback?: LucideIcon }) {
  const [, setReady] = useState(!!map);
  useEffect(() => {
    if (map) return;
    let alive = true;
    preloadIcons().then(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);
  if (!map) return <span style={{ display: 'inline-block', width: size, height: size }} />;
  const Icon = resolve(name) ?? fallback;
  return <Icon size={size} strokeWidth={2.5} />;
}
