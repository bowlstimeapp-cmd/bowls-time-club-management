import React from 'react';
import { Smartphone, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import usePushNotifications from '@/hooks/usePushNotifications';

export default function PushNotificationsCard() {
  const push = usePushNotifications();
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Smartphone className="w-5 h-5" />Push Notifications</CardTitle>
        <CardDescription>Receive notifications on this device across all your clubs</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {!push.supported ? 'Not supported here. On iPhone or iPad, open the app from its Home Screen icon (iOS 16.4+).'
              : push.enabled ? 'This device is subscribed. Delivery still depends on device notification settings.'
                : 'Get notified on this device even when the app is closed'}
          </p>
          {push.loading ? <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
            : <Switch aria-label="Push notifications" checked={push.enabled} onCheckedChange={push.toggle} disabled={!push.supported} />}
        </div>
        {push.error && <p role="alert" className="text-sm text-destructive">{push.error}</p>}
        {push.enabled && <>
          <Button type="button" variant="outline" disabled={push.loading} onClick={push.testDevice}>Test this device</Button>
          {push.localResult && <p role="status" className="text-sm text-muted-foreground">{push.localResult}</p>}
          <p className="text-xs text-muted-foreground">
            {push.status?.receivedAt ? `Latest push received here: ${new Date(push.status.receivedAt).toLocaleString()}. ${push.status.error ? 'Display failed: ' + push.status.error : 'Display request accepted by this device.'}`
              : 'No incoming push recorded on this device since the updated handler was installed. Device tests are not incoming pushes.'}
          </p>
        </>}
      </CardContent>
    </Card>
  );
}