import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UtensilsCrossed, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please provide both email and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await authService.login(email.trim(), password);
      const accessToken = data.accessToken || data.tokens?.accessToken || '';
      const refreshToken = data.refreshToken || data.tokens?.refreshToken || '';
      setAuth(data.user, accessToken, refreshToken);
      navigate('/orders');
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err?.message || 'Login failed. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (roleEmail: string, rolePassword = 'Password@123') => {
    setEmail(roleEmail);
    setPassword(rolePassword);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand Card Header */}
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-brand-500 items-center justify-center text-white shadow-xl shadow-brand-500/25 mb-4">
            <UtensilsCrossed className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Feast<span className="text-brand-500">Flow</span> Merchant Portal
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-1.5">
            Real-time kitchen display, order dispatch, and menu control
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl p-8 shadow-xl shadow-gray-200/50 border border-gray-100">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Merchant Email
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@restaurant.com"
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full mt-2"
              isLoading={loading}
            >
              Sign In to Terminal <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          {/* Quick Demo Logins */}
          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider text-center mb-3">
              One-Click Demo Credentials
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleFillDemo('bistro.owner@feastflow.com', 'Password@123')}
                className="p-2.5 rounded-xl border border-gray-200 text-left hover:border-brand-500 hover:bg-brand-50/50 transition-all text-xs"
              >
                <span className="font-bold text-gray-900 block truncate">Burger Bistro</span>
                <span className="text-gray-500 text-[11px] block truncate">Restaurant Owner</span>
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo('admin@feastflow.com', 'Password@123')}
                className="p-2.5 rounded-xl border border-gray-200 text-left hover:border-brand-500 hover:bg-brand-50/50 transition-all text-xs"
              >
                <span className="font-bold text-gray-900 block truncate">Platform Admin</span>
                <span className="text-gray-500 text-[11px] block truncate">Super Admin</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
