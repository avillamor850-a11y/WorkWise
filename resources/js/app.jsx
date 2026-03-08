import '../css/app.css';
import './bootstrap';

import React, { useState, useEffect, useRef } from 'react';
import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import LoadingOverlay from './Components/LoadingOverlay';
import { ThemeProvider } from './Contexts/ThemeContext';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

// Paths that show the custom loading overlay (for testing: auth pages only)
const LOADING_OVERLAY_PATHS = ['/register', '/login', '/role-selection'];

function shouldShowOverlayForUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    // Handle relative paths (e.g. "/register") and full URLs
    const path = url.startsWith('http')
      ? new URL(url).pathname
      : url.split('?')[0].replace(/\/$/, '') || '/';
    return LOADING_OVERLAY_PATHS.some((p) => path === p || path === p + '/');
  } catch {
    return false;
  }
}

// Set to true to show overlay for ALL navigations (after testing)
const SHOW_OVERLAY_FOR_ALL = true;

router.on('invalid', (event) => {
  if (event.detail.response.status === 419) {
    event.preventDefault();
    console.warn('CSRF token expired (419). Reloading the page...');
    window.location.reload();
  }
});

createInertiaApp({
  title: (title) => `${title} - ${appName}`,
  resolve: (name) =>
    resolvePageComponent(
      `./Pages/${name}.jsx`,
      import.meta.glob('./Pages/**/*.jsx'),
    ),
  progress: false,
  setup({ el, App, props }) {
    const root = createRoot(el);

    function AppWithProgress({ AppComponent, initialProps }) {
      const [showOverlay, setShowOverlay] = useState(false);
      const timeoutRef = useRef(null);

      useEffect(() => {
        function onStart(event) {
          const url = event.detail?.visit?.url ?? '';
          const show = SHOW_OVERLAY_FOR_ALL || shouldShowOverlayForUrl(url);
          if (!show) return;
          timeoutRef.current = setTimeout(() => setShowOverlay(true), 150);
        }

        function onFinish(event) {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          const visit = event.detail?.visit;
          if (visit?.completed || visit?.cancelled || visit?.interrupted) {
            setShowOverlay(false);
          }
        }

        router.on('start', onStart);
        router.on('finish', onFinish);
        return () => {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
      }, []);

      return (
        <>
          <LoadingOverlay visible={showOverlay} />
          <ThemeProvider>
            <AppComponent {...initialProps} />
          </ThemeProvider>
        </>
      );
    }

    root.render(
      <AppWithProgress AppComponent={App} initialProps={props} />
    );
  },
});
