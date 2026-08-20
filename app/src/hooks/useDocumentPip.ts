import { useCallback, useEffect, useState } from 'react';

function copyStylesToPipWindow(pipWin: Window) {
  // Copy all stylesheets and inline styles from main document to PiP window
  const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
  styles.forEach((el) => {
    pipWin.document.head.appendChild(el.cloneNode(true));
  });

  // Copy html classes and dataset theme
  pipWin.document.documentElement.className = document.documentElement.className;
  pipWin.document.documentElement.dataset.theme = document.documentElement.dataset.theme || '';
  
  // Set title and body styling
  pipWin.document.title = 'Focus Timer - Study Schedule';
  pipWin.document.body.style.margin = '0';
  pipWin.document.body.style.padding = '0';
  pipWin.document.body.style.overflow = 'hidden';
  pipWin.document.body.style.background = 'rgb(var(--bg))';
  pipWin.document.body.style.color = 'rgb(var(--ink))';
  pipWin.document.body.style.fontFamily = 'Inter, ui-sans-serif, system-ui, sans-serif';
}

export function useDocumentPip() {
  const [pipWindow, setPipWindow] = useState<Window | null>(null);

  const isPipSupported =
    typeof window !== 'undefined' && 'documentPictureInPicture' in window;

  const closePip = useCallback(() => {
    if (pipWindow && !pipWindow.closed) {
      pipWindow.close();
    }
    setPipWindow(null);
  }, [pipWindow]);

  const openPip = useCallback(
    async (options?: { width?: number; height?: number }): Promise<Window | null> => {
      if (!isPipSupported || !window.documentPictureInPicture) {
        return null;
      }

      try {
        // If an existing window is open, close it first
        if (pipWindow && !pipWindow.closed) {
          pipWindow.close();
        }

        const width = options?.width ?? 340;
        const height = options?.height ?? 260;

        const pipWin = await window.documentPictureInPicture.requestWindow({
          width,
          height,
        });

        copyStylesToPipWindow(pipWin);

        // Listen for close from user interaction on the OS PiP window
        pipWin.addEventListener('pagehide', () => {
          setPipWindow(null);
        });

        setPipWindow(pipWin);
        return pipWin;
      } catch {
        setPipWindow(null);
        return null;
      }
    },
    [isPipSupported, pipWindow],
  );

  // Sync theme changes to PiP window if open
  useEffect(() => {
    if (!pipWindow || pipWindow.closed) return;

    const observer = new MutationObserver(() => {
      if (pipWindow && !pipWindow.closed) {
        pipWindow.document.documentElement.className = document.documentElement.className;
        pipWindow.document.documentElement.dataset.theme = document.documentElement.dataset.theme || '';
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });

    return () => observer.disconnect();
  }, [pipWindow]);

  // Clean up PiP window when unmounting
  useEffect(() => {
    return () => {
      if (pipWindow && !pipWindow.closed) {
        pipWindow.close();
      }
    };
  }, [pipWindow]);

  return {
    isPipSupported,
    isPipOpen: Boolean(pipWindow && !pipWindow.closed),
    pipWindow,
    openPip,
    closePip,
  };
}
