import { useEffect } from 'react';

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} — TestForge` : 'TestForge';
    return () => { document.title = 'TestForge'; };
  }, [title]);
}
