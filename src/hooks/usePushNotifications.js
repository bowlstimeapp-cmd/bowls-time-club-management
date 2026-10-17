import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

const icon = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6995ed6ffddbd0f64bc9d1e8/61b3b45da_BTZoomed.png';
const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

async function registration() {
  await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
  return navigator.serviceWorker.ready;
}

async function deliveryStatus(reg) {
  if (!reg.active) return null;
  return new Promise(resolve => {
    const channel = new MessageChannel();
    const finish = value => { clearTimeout(timeout); channel.port1.close(); resolve(value); };
    const timeout = setTimeout(() => finish(null), 2000);
    channel.port1.onmessage = event => finish(event.data);
    reg.active.postMessage({ type: 'GET_PUSH_STATUS' }, [channel.port2]);
  });
}

export default function usePushNotifications() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [localResult, setLocalResult] = useState('');
  const [status, setStatus] = useState(null);
  const isSupported = supported();

  useEffect(() => {
    if (!isSupported) { setLoading(false); return; }
    let mounted = true;
    const refresh = async () => {
      try {
        const reg = await registration();
        const [sub, lastStatus] = await Promise.all([reg.pushManager.getSubscription(), deliveryStatus(reg)]);
        if (mounted) { setEnabled(!!sub && Notification.permission === 'granted'); setStatus(lastStatus); }
      } catch (err) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    const onMessage = event => { if (event.data?.type === 'PUSH_STATUS') setStatus(event.data.status); };
    refresh();
    window.addEventListener('focus', refresh);
    navigator.serviceWorker.addEventListener('message', onMessage);
    navigator.serviceWorker.addEventListener('controllerchange', refresh);
    return () => {
      mounted = false;
      window.removeEventListener('focus', refresh);
      navigator.serviceWorker.removeEventListener('message', onMessage);
      navigator.serviceWorker.removeEventListener('controllerchange', refresh);
    };
  }, [isSupported]);

  const toggle = async checked => {
    setLoading(true); setError(''); setLocalResult('');
    try {
      // Request permission directly from the tap, before any network await.
      if (checked && await Notification.requestPermission() !== 'granted') {
        throw new Error('Allow notifications for Bowls Time in this device’s notification settings.');
      }
      const reg = await registration();
      let sub = await reg.pushManager.getSubscription();
      if (!checked) {
        if (sub && !await sub.unsubscribe()) throw new Error('Could not disable notifications. Please try again.');
        setEnabled(false);
        return;
      }
      const keyRes = await base44.functions.invoke('getVapidPublicKey', {});
      const publicKey = keyRes.data?.publicKey?.trim();
      if (!publicKey) throw new Error('Could not retrieve the notification key.');
      const raw = publicKey.replace(/-/g, '+').replace(/_/g, '/');
      const key = Uint8Array.from(atob(raw.padEnd(raw.length + (4 - raw.length % 4) % 4, '=')), c => c.charCodeAt(0));
      const previous = sub?.options.applicationServerKey;
      if (sub && (!previous || key.some((value, i) => value !== new Uint8Array(previous)[i]) || previous.byteLength !== key.length)) {
        if (!await sub.unsubscribe()) throw new Error('Could not replace the old notification subscription.');
        sub = null;
      }
      sub = sub || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      const json = sub.toJSON();
      const saved = await base44.functions.invoke('savePushSubscription', { endpoint: json.endpoint, keys: json.keys });
      if (!saved.data?.success) throw new Error(saved.data?.error || 'Could not save the notification subscription.');
      setEnabled(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const testDevice = async () => {
    setLoading(true); setError(''); setLocalResult('');
    try {
      if (Notification.permission !== 'granted') throw new Error('Allow notifications in this device’s settings first.');
      const reg = await registration();
      await reg.showNotification('Bowls Time device test', { body: 'This checks notification display on this device, without the push service.', icon });
      setLocalResult('Device display request accepted. If no alert appears, check Bowls Time in device Settings → Notifications, including banners, and check Focus / Do Not Disturb.');
    } catch (err) {
      setError('Device notification failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return { enabled, loading, error, localResult, status, supported: isSupported, toggle, testDevice };
}