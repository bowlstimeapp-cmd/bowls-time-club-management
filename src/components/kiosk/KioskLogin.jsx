import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2 } from 'lucide-react';

export default function KioskLogin({ club, members, onLogin }) {
  const [memberId, setMemberId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!memberId.trim()) return;
    setLoading(true);
    setError('');

    const match = members.find(
      (m) => m.member_id === memberId.trim() && m.status === 'approved'
    );

    if (!match) {
      setError('Member ID not recognised — please try again');
      setMemberId('');
      setLoading(false);
      return;
    }

    const displayName = match.first_name && match.surname
      ? `${match.first_name} ${match.surname}`
      : match.user_name || match.user_email;

    onLogin({ user_email: match.user_email, name: displayName, membershipId: match.id });
    setLoading(false);
  };

  const handleKeypadPress = (val) => {
    if (val === 'del') {
      setMemberId(prev => prev.slice(0, -1));
    } else if (memberId.length < 5) {
      setMemberId(prev => prev + val);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-emerald-700 to-emerald-900 flex flex-col items-center justify-center p-6">
      {/* Club logo / name */}
      <div className="mb-10 text-center">
        {club?.logo_url ? (
          <img src={club.logo_url} alt={club.name} className="h-20 mx-auto mb-4 object-contain" />
        ) : null}
        <h1 className="text-4xl font-bold text-white">{club?.name}</h1>
      </div>

      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-2">Member Login</h2>
        <p className="text-gray-500 text-center mb-6 text-lg">Enter your Member ID</p>

        <form onSubmit={handleSubmit}>
          {/* ID display */}
          <div className="bg-gray-100 rounded-2xl h-20 flex items-center justify-center mb-6">
            <span className="text-5xl font-mono font-bold tracking-widest text-gray-900">
              {memberId ? memberId.padEnd(5, '·') : '·····'}
            </span>
          </div>

          {/* Numeric keypad */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {['1','2','3','4','5','6','7','8','9','del','0','✓'].map((key) => (
              <button
                key={key}
                type={key === '✓' ? 'submit' : 'button'}
                onClick={key !== '✓' ? () => handleKeypadPress(key) : undefined}
                className={`h-16 rounded-2xl text-2xl font-bold transition-all active:scale-95 ${
                  key === '✓'
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : key === 'del'
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
                disabled={loading}
              >
                {loading && key === '✓' ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : key}
              </button>
            ))}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-center text-sm font-medium">
              {error}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}