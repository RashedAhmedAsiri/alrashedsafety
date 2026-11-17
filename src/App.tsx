import { lazy, Suspense, type ComponentType } from 'react';

// OWNER: lead. Routes:
//   ?view=<...>   3D dev viewer (src/dev/Viewer.tsx)
//   ?dev=<Name>   any preview page src/dev/<Name>.tsx with a default export (workers add their own)
//   otherwise     the real app (src/engine/MainApp.tsx)
const devPages = import.meta.glob<{ default: ComponentType }>('./dev/*.tsx');
const Viewer = lazy(() => import('./dev/Viewer'));
const Main = lazy(() => import('./engine/MainApp'));

export function App() {
  const q = new URLSearchParams(location.search);
  const view = q.get('view');
  const dev = q.get('dev');
  if (dev && devPages[`./dev/${dev}.tsx`]) {
    const Page = lazy(devPages[`./dev/${dev}.tsx`]);
    return (
      <Suspense fallback={null}>
        <Page />
      </Suspense>
    );
  }
  return <Suspense fallback={null}>{view ? <Viewer /> : <Main />}</Suspense>;
}
