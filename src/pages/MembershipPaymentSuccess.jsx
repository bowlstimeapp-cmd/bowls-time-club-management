import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useSearchParams, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MembershipPaymentSuccess() {
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get('paymentId');
  const clubId = searchParams.get('clubId');
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    if (!paymentId) { setStatus('error'); return; }
    const confirm = async () => {
      const res = await base44.functions.invoke('confirmMembershipPayment', { paymentId });
      setStatus(res.data?.status === 'paid' ? 'paid' : 'pending');
    };
    confirm();
  }, [paymentId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800">Confirming your payment...</h2>
          </>
        )}
        {status === 'paid' && (
          <>
            <CheckCircle className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
            <p className="text-gray-500 mb-6">Your membership payment has been received. Thank you!</p>
            <Link to={createPageUrl('Profile') + (clubId ? `?clubId=${clubId}` : '')}>
              <Button className="bg-emerald-600 hover:bg-emerald-700">View My Profile</Button>
            </Link>
          </>
        )}
        {(status === 'pending' || status === 'error') && (
          <>
            <XCircle className="w-14 h-14 text-amber-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Processing</h2>
            <p className="text-gray-500 mb-6">Your payment is being processed. It may take a moment to confirm. Check your profile for the updated status.</p>
            <Link to={createPageUrl('Profile') + (clubId ? `?clubId=${clubId}` : '')}>
              <Button className="bg-emerald-600 hover:bg-emerald-700">Go to My Profile</Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}