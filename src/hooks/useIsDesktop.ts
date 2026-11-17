import { useState, useEffect } from 'react';

/**
 * Hook to detect if running in the Electron Desktop environment.
 */
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return !!(window as any).electronAPI?.isElectron || navigator.userAgent.includes('Electron');
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isElectron = !!(window as any).electronAPI?.isElectron || navigator.userAgent.includes('Electron');
      setIsDesktop(isElectron);
    }
  }, []);

  return isDesktop;
}

export function isDesktopApp(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as any).electronAPI?.isElectron || navigator.userAgent.includes('Electron');
}
