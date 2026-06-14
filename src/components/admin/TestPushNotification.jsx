import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bell, Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function TestPushNotification() {
  const [email, setEmail] = useState('bowlstimeapp@gmail.com');
  const [title, setTitle] = useState('🎯 BowlsTime Test');
  const [message, setMessage] = useState('Push notifications are working!');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSend = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('sendPushNotification', {
        userEmail: email,
        title,
        message,
        url: '/',
      });
      const data = res.data;
      const sent = data?.results?.filter(r => r.status === 'sent').length || 0;
      if (sent > 0) {
        setResult({ success: true, message: `Sent to ${sent} device(s)` });
      } else {
        setResult({ success: false, message: 'No active subscriptions found for this email' });
      }
    } catch (err) {
      setResult({ success: false, message: err.message });
    }
    setLoading(false);
  };

  return (
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
  );
}