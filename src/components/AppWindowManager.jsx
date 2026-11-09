import { useEffect, useRef, useState } from 'react';
import { AppWindow, X } from 'lucide-react';
import OSWindow from './OSWindow';

const MAX_APP_WINDOWS = 8;

function titleForPath(path, fallback) {
  if (fallback) return fallback;
  const titles = [
    [/^\/materials/, 'Apps'], [/^\/docs/, 'Games & Resources'], [/^\/search/, 'Browser'],
    [/^\/settings/, 'Settings'], [/^\/recommended/, 'Recommended'], [/^\/files/, 'DogeFiler'],
    [/^\/shortcuts/, 'Keyboard Shortcuts'], [/^\/messages/, 'Doge Messages'],
    [/^\/dashboard/, 'Dashboard Studio'], [/^\/toolbox/, 'Toolbox'], [/^\/pc-center/, 'PC Center'],
    [/^\/game-library/, 'Game Library'], [/^\/student-center/, 'Student Center'],
    [/^\/social/, 'Social Center'], [/^\/remote-desktop/, 'Remote Desktop'],
    [/^\/collaboration-center/, 'Collaboration Center'], [/^\/office\/word/, 'DOGEUB Writer'],
    [/^\/office\/sheet/, 'DOGEUB Sheets'], [/^\/office\/slides/, 'DOGEUB Slides'],
    [/^\/office/, 'DOGEUB Office'], [/^\/profile/, 'Profile'],
  ];
  return titles.find(([pattern]) => pattern.test(path))?.[1] || 'DOGEUB App';
}

function makeWindowUrl(path, state) {
  const target = new URL(path, window.location.origin);
  target.searchParams.set('dogeub-window', '1');
  if (typeof state?.url === 'string' && state.url.trim()) {
    target.searchParams.set('dogeub-url', state.url.trim());
  }
  return target.pathname + target.search;
}

function makeId() {
  return globalThis.crypto?.randomUUID?.()
    || 'app-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
}

export default function AppWindowManager() {
  const [windows, setWindows] = useState([]);
  const [limitNotice, setLimitNotice] = useState('');
  const windowsRef = useRef([]);
  const nextZRef = useRef(220);

  const commitWindows = (update) => {
    const next = typeof update === 'function' ? update(windowsRef.current) : update;
    windowsRef.current = next;
    setWindows(next);
  };

  useEffect(() => {
    const openWindow = (event) => {
      const detail = event.detail || {};
      const path = typeof detail.path === 'string' ? detail.path : '';
      if (!path || path === '/') return;

      if (windowsRef.current.length >= MAX_APP_WINDOWS) {
        setLimitNotice('You already have 8 apps open. Close an app before opening another.');
        return;
      }

      const z = ++nextZRef.current;
      const item = {
        id: makeId(),
        path,
        src: makeWindowUrl(path, detail.state),
        title: titleForPath(path, detail.title),
        minimized: false,
        z,
      };
      commitWindows((current) => current.length >= MAX_APP_WINDOWS ? current : [...current, item]);
    };

    window.addEventListener('dogeub-open-window', openWindow);
    return () => window.removeEventListener('dogeub-open-window', openWindow);
  }, []);

  useEffect(() => {
    if (!limitNotice) return undefined;
    const timeout = window.setTimeout(() => setLimitNotice(''), 3000);
    return () => window.clearTimeout(timeout);
  }, [limitNotice]);

  const focusWindow = (id) => {
    const z = ++nextZRef.current;
    commitWindows((current) => current.map((item) => item.id === id
      ? { ...item, minimized: false, z }
      : item));
  };

  const minimizeWindow = (id, minimized) => {
    commitWindows((current) => current.map((item) => item.id === id
      ? { ...item, minimized }
      : item));
  };

  const closeWindow = (id) => {
    commitWindows((current) => current.filter((item) => item.id !== id));
  };

  if (!windows.length && !limitNotice) return null;

  return (
    <>
      {windows.map((item, index) => (
        <OSWindow
          key={item.id}
          titleOverride={item.title}
          zIndex={item.z}
          initialOffset={index}
          minimized={item.minimized}
          onMinimizedChange={(value) => minimizeWindow(item.id, value)}
          onClose={() => closeWindow(item.id)}
          onFocus={() => focusWindow(item.id)}
          showRestoreButton={false}
        >
          <iframe
            title={item.title}
            src={item.src}
            className="dogeub-app-window-frame"
            loading="eager"
            onFocus={() => focusWindow(item.id)}
            allow="clipboard-read; clipboard-write; fullscreen"
          />
        </OSWindow>
      ))}

      {windows.length > 0 && (
        <div
          className="fixed bottom-[64px] left-1/2 z-[11003] flex max-w-[calc(100vw-20px)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-2xl border border-white/15 bg-[#101a2a]/95 p-1.5 text-white shadow-2xl backdrop-blur-xl"
          aria-label="Open app windows"
          data-open-app-count={windows.length}
        >
          <span className="shrink-0 px-2 text-[10px] font-bold tracking-wide text-white/45">{windows.length}/8</span>
          {windows.map((item) => (
            <div key={item.id} className="flex shrink-0 items-center rounded-xl bg-white/[.06]">
              <button
                type="button"
                title={item.minimized ? 'Restore ' + item.title : 'Focus ' + item.title}
                onClick={() => focusWindow(item.id)}
                className={'flex max-w-36 items-center gap-2 rounded-l-xl px-2.5 py-2 text-[11px] hover:bg-white/10 ' + (item.minimized ? 'opacity-65' : 'text-cyan-100')}
              >
                <AppWindow size={13} className="shrink-0" />
                <span className="truncate">{item.title}</span>
              </button>
              <button
                type="button"
                aria-label={'Close ' + item.title}
                title="Close app"
                onClick={() => closeWindow(item.id)}
                className="rounded-r-xl px-2 py-2 text-white/40 hover:bg-rose-500/20 hover:text-rose-200"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {limitNotice && (
        <div role="status" aria-live="polite" className="fixed left-1/2 top-16 z-[2147483000] -translate-x-1/2 rounded-xl border border-amber-200/25 bg-slate-950/95 px-4 py-3 text-center text-xs font-semibold text-amber-100 shadow-2xl">
          {limitNotice}
        </div>
      )}
    </>
  );
}
