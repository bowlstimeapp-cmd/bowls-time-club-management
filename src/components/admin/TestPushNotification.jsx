import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bell, Loader2, CheckCircle, XCircle, Shield } from 'lucide-react';

export default function TestPushNotification() {
  const [email, setEmail] = useState('bowlstimeapp@gmail.com');
  const [title, setTitle] = useState('🎯 BowlsTime Test');
  const [message, setMessage] = useState('Push notifications are working!');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const [badgeSupport, setBadgeSupport] = useState(null);
  const [badgeResult, setBadgeResult] = useState(null);

  // Detect badge API support on mount
  useEffect(() => {
    const supported = 'setAppBadge' in navigator;
    setBadgeSupport({
      supported,
      ua: navigator.userAgent,
    });
  }, []);

  const handleSend = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('sendPushNotification', {
        userEmail: email,
        title,
        message,
        url: '/',
        unreadCount: 5,
      });
      const data = res.data;
      const sent = data?.results?.filter(r => r.status === 'sent').length || 0;
      if (sent > 0) {
        setResult({ success: true, message: `Sent to ${sent} device(s)` });
      } else {
        setResult({ success: false, message: data?.reason || 'No active subscriptions found for this email' });
      }
    } catch (err) {
      setResult({ success: false, message: err.message });
    }
    setLoading(false);
  };

  const handleTestBadge = async () => {
    setBadgeResult(null);
    try {
      if (!('setAppBadge' in navigator)) {
        setBadgeResult({ success: false, message: 'setAppBadge not available in navigator on this browser/OS' });
        return;
      }
      await navigator.setAppBadge(5);
      setBadgeResult({ success: true, message: 'navigator.setAppBadge(5) called — check your app icon!' });
    } catch (err) {
      setBadgeResult({ success: false, message: 'Error: ' + err.message });
    }
  };

  const handleClearBadge = async () => {
    setBadgeResult(null);
    try {
      if (!('clearAppBadge' in navigator)) {
        setBadgeResult({ success: false, message: 'clearAppBadge not available' });
        return;
      }
      await navigator.clearAppBadge();
      setBadgeResult({ success: true, message: 'Badge cleared' });
    } catch (err) {
      setBadgeResult({ success: false, message: 'Error: ' + err.message });
    }
  };

  return (
    <div className="space-y-4">
      {/* Push Notification Test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="w-4 h-4 text-emerald-600" />
            Test Push Notification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label>Email</Label>
              <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="user@example.com" />
            </div>
            <div>
              <Label>Title</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div>
              <Label>Message</Label>
              <Input value={message} onChange={e => setMessage(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-gray-500">Will also send <code className="bg-gray-100 px-1 rounded">unreadCount: 5</code> in payload to test badge via push.</p>
          <div className="flex items-center gap-4">
            <Button onClick={handleSend} disabled={loading || !email} className="bg-emerald-600 hover:bg-emerald-700">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : <><Bell className="w-4 h-4 mr-2" />Send Test</>}
            </Button>
            {result && (
              <div className={`flex items-center gap-2 text-sm font-medium ${result.success ? 'text-emerald-600' : 'text-red-600'}`}>
                {result.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {result.message}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Badge API Test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="w-4 h-4 text-emerald-600" />
            Test App Badge API (this browser)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {badgeSupport && (
            <div className={`rounded-lg p-3 text-sm ${badgeSupport.supported ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
              <div className="flex items-center gap-2 font-medium mb-1">
                {badgeSupport.supported
                  ? <><CheckCircle className="w-4 h-4 text-emerald-600" /><span className="text-emerald-700">setAppBadge available in navigator ✓</span></>
                  : <><XCircle className="w-4 h-4 text-amber-600" /><span className="text-amber-700">setAppBadge NOT available in this browser</span></>
                }
              </div>
              <p className="text-xs text-gray-500 break-all">{badgeSupport.ua}</p>
              {!badgeSupport.supported && (
                <p className="text-xs text-amber-700 mt-2">
                  <strong>Note:</strong> Badging API requires: Android Chrome/Edge (installed PWA), or iOS 16.4+ Safari (installed to Home Screen). It is NOT available in a regular browser tab.
                </p>
              )}
            </div>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            <Button onClick={handleTestBadge} variant="outline" className="border-emerald-300 text-emerald-700 hover:bg-emerald-50">
              Set Badge to 5
            </Button>
            <Button onClick={handleClearBadge} variant="outline" className="border-gray-300 text-gray-700">
              Clear Badge
            </Button>
            {badgeResult && (
              <div className={`flex items-center gap-2 text-sm font-medium ${badgeResult.success ? 'text-emerald-600' : 'text-red-600'}`}>
                {badgeResult.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {badgeResult.message}
              </div>
            )}
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-1">
            <p><strong>How to verify badge via service worker logs:</strong></p>
            <p>Android Chrome: DevTools → Application → Service Workers → push event logs</p>
            <p>iOS Safari: Settings → Safari → Advanced → Web Inspector, connect to Mac</p>
            <p>The SW logs <code className="bg-gray-200 px-1 rounded">[SW] setAppBadge available on self: true/false</code> on every push</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}