'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      if (isLogin) {
        // 登录
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        // 保存用户信息到 localStorage（兼容旧代码）
        localStorage.setItem('user', JSON.stringify({
          id: data.user.id,
          email: data.user.email,
          createdAt: data.user.created_at,
        }));

      } else {
        // 注册
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        if (data.user) {
          localStorage.setItem('user', JSON.stringify({
            id: data.user.id,
            email: data.user.email,
            createdAt: data.user.created_at,
          }));
        }
      }

      // 跳转到首页
      router.push('/');
    } catch (err: any) {
      setError(err.message || '操作失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* 返回按钮 */}
        <Link href="/" className="flex items-center gap-2 text-[#64748b] hover:text-[#0f172a] mb-8">
          <ArrowLeft size={20} /> 返回首页
        </Link>

        {/* 登录/注册卡片 */}
        <div className="card p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#0ea5e9] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-3xl">📔</span>
            </div>
            <h1 className="text-2xl font-semibold text-[#0f172a]">
              {isLogin ? '欢迎回来' : '创建账号'}
            </h1>
            <p className="text-[#64748b] mt-2">
              {isLogin ? '登录后同步你的记录' : '注册后即可云端同步'}
            </p>
          </div>

          <form onSubmit={handleAuth}>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-[#0f172a] mb-2">
                  邮箱
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 border border-[#e2e8f0] rounded-xl focus:outline-none focus:border-[#0ea5e9]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0f172a] mb-2">
                  密码
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="至少6位字符"
                  className="w-full px-4 py-3 border border-[#e2e8f0] rounded-xl focus:outline-none focus:border-[#0ea5e9]"
                  required
                  minLength={6}
                />
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!email.trim() || !password.trim() || isLoading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '处理中...' : isLogin ? '登录' : '注册'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="text-sm text-[#0ea5e9] hover:underline"
            >
              {isLogin ? '没有账号？点击注册' : '已有账号？点击登录'}
            </button>
          </div>

          <div className="mt-4 text-center text-xs text-[#94a3b8]">
            数据将安全存储在 Supabase 云端
          </div>
        </div>
      </div>
    </div>
  );
}
