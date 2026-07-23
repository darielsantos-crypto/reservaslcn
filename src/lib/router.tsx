/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface RouterContextValue {
  route: string;
  navigate: (to: string) => void;
  params: string[];
}

const RouterContext = createContext<RouterContextValue | undefined>(undefined);

function current(): string {
  const h = window.location.hash.replace(/^#\/?/, '');
  return h || 'home';
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<string>(current());

  useEffect(() => {
    const onHash = () => setRoute(current());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  function navigate(to: string) {
    window.location.hash = `/${to}`;
    setRoute(to);
    window.scrollTo({ top: 0 });
  }

  return (
    <RouterContext.Provider value={{ route, navigate, params: route.split('/') }}>{children}</RouterContext.Provider>
  );
}

export function useRouter(): RouterContextValue {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used within RouterProvider');
  return ctx;
}
