'use client';

import { useEffect, useState } from 'react';

export function PwaUpdater() {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    const hadController = Boolean(navigator.serviceWorker.controller);
    const onControllerChange = () => {
      if (hadController) setUpdateReady(true);
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    void navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => registration.update())
      .catch(() => undefined);
    return () => navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
  }, []);

  if (!updateReady) return null;
  return (
    <output className="pwa-update-notice">
      <span>Zihin Atölyesi’nin yeni sürümü hazır.</span>
      <button type="button" onClick={() => window.location.reload()}>Şimdi yenile</button>
    </output>
  );
}
