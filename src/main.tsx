import { createRoot } from 'react-dom/client';
import '@fontsource/ibm-plex-sans-arabic/500.css';
import '@fontsource/ibm-plex-sans-arabic/700.css';
import { App } from './App';

// A stopped scenario rejects its pending waits with an AbortError. That is expected, so a stray one
// (a step nobody awaited) must not surface as an uncaught page error.
window.addEventListener('unhandledrejection', (e) => {
  if ((e.reason as { name?: unknown } | null)?.name === 'AbortError') e.preventDefault();
});

createRoot(document.getElementById('root')!).render(<App />);
