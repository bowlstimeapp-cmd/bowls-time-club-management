import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Lock, Send, Loader2, CheckCircle } from 'lucide-react';
import { toast } from "sonner";

export default function ModuleLockedNotice({ moduleKey, moduleName, description, clubId }) {
  const [user, setUser] = useState(null);
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const handleEnquire = () => {
    setEnquiryOpen(true);
    setSubmitted(false);
    setMessage('');
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      await base44.entities.Feedback.create({
        user_email: user.email,
        user_name: user.full_name || user.email,
        category: 'paid_enquiry',
        title: `Paid tier enquiry — ${moduleName}`,
        description: message.trim() || 'I would like to enquire about upgrading my club to the standard tier.',
        related_club_id: clubId,
        related_module: moduleKey,
      });
      setSubmitted(true);
      toast.success('Enquiry submitted — our team will be in touch.');
    } catch (err) {
      toast.error('Failed to submit enquiry: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-amber-100 flex items-center justify-center">
            <Lock className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            This feature is not available on the free tier of Bowls Time
          </h2>
          <p className="text-gray-600 text-sm mb-1">
            {moduleName}
          </p>
          {description && (
            <p className="text-gray-500 text-sm mb-6">
              {description}
            </p>
          )}
          <Button onClick={handleEnquire} className="bg-emerald-600 hover:bg-emerald-700">
            Enquire about upgrading
          </Button>
        </CardContent>
      </Card>

      <Dialog open={enquiryOpen} onOpenChange={setEnquiryOpen}>
        <DialogContent className="max-w-md mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle>Enquire about upgrading — {moduleName}</DialogTitle>
          </DialogHeader>
          {submitted ? (
            <div className="py-6 text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-emerald-600" />
              </div>
              <p className="text-gray-700 font-medium mb-1">Enquiry sent!</p>
              <p className="text-sm text-gray-500">Our team will get back to you about upgrading your club.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-3">
                Tell us a bit about what you're looking for and we'll get back to you with upgrade options.
              </p>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="I'd like to upgrade my club to access this feature..."
                className="h-28 resize-none"
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setEnquiryOpen(false)}>Cancel</Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  Send Enquiry
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}