'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, User, LogOut, Trash2, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface UserInfo {
  id: string;
  email: string;
  createdAt: string;
}

export default function SettingsPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const router = useRouter();

  // 背景设置
  const [currentBackground, setCurrentBackground] = useState('linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)');

  // 用户名设置
  const [username, setUsername] = useState('');
  const [isEditingUsername, setIsEditingUsername] = useState(false);

  const presetBackgrounds = [
    { name: '柔和蓝', value: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)' },
    { name: '薄荷绿', value: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' },
    { name: '暖阳橙', value: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)' },
    { name: '薰衣草', value: 'linear-gradient(135deg, #faf5ff 0%, #e9d5ff 100%)' },
    { name: '清晨粉', value: 'linear-gradient(135deg, #fdf2f8 0%, #fecdd3 100%)' },
  ];

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const userData = JSON.parse(userStr);
      setUser(userData);
      setUsername(userData.username || '');
    }

    const savedBg = localStorage.getItem('background');
    if (savedBg) {
      setCurrentBackground(savedBg);
    }
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('user');
    router.push('/');
  };

  // 保存用户名
  const handleSaveUsername = () => {
    if (!user || !username.trim()) return;

    const updatedUser = { ...user, username: username.trim() };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
    setIsEditingUsername(false);

    // 通知首页更新
    window.dispatchEvent(new StorageEvent('storage', { key: 'user', newValue: JSON.stringify(updatedUser) }));

    alert('用户名已更新！');
  };

  const handleClearData = () => {
    if (confirm('确定要清空所有本地记录吗？此操作不可恢复。')) {
      localStorage.removeItem('activities');
      alert('已清空所有记录');
    }
  };

  // 切换背景
  const handleChangeBackground = (bg: string) => {
    setCurrentBackground(bg);
    localStorage.setItem('background', bg);
    // 通知首页更新
    window.dispatchEvent(new StorageEvent('storage', { key: 'background', newValue: bg }));
  };

  // 上传自定义背景
  const handleUploadBackground = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      handleChangeBackground(base64);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* 顶部导航 */}
      <nav className="bg-white border-b border-[#e2e8f0]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-[#64748b] hover:text-[#0f172a]">
            <ArrowLeft size={20} /> 返回首页
          </Link>
          <div className="w-px h-6 bg-[#e2e8f0]" />
          <h1 className="text-xl font-semibold text-[#0f172a]">设置</h1>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* 账号信息 */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <User className="text-[#0ea5e9]" size={24} />
            <h2 className="text-lg font-semibold">账号信息</h2>
          </div>

          {user ? (
            <div className="space-y-4">
              {/* 用户名 */}
              <div className="flex justify-between py-3 border-b border-[#f1f5f9]">
                <span className="text-[#64748b]">用户名</span>
                {isEditingUsername ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="px-3 py-1 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:border-[#0ea5e9]"
                      placeholder="输入新用户名"
                    />
                    <button
                      onClick={handleSaveUsername}
                      className="text-sm text-[#0ea5e9] hover:underline"
                    >
                      保存
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingUsername(false);
                        setUsername(user.username || '');
                      }}
                      className="text-sm text-[#94a3b8] hover:underline"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[#0f172a]">
                      {user.username || '未设置'}
                    </span>
                    <button
                      onClick={() => setIsEditingUsername(true)}
                      className="text-sm text-[#0ea5e9] hover:underline"
                    >
                      修改
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-between py-3 border-b border-[#f1f5f9]">
                <span className="text-[#64748b]">邮箱</span>
                <span className="text-[#0f172a] text-sm">{user.email}</span>
              </div>

              <div className="flex justify-between py-3 border-b border-[#f1f5f9]">
                <span className="text-[#64748b]">注册时间</span>
                <span className="text-[#0f172a]">
                  {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                </span>
              </div>

              <button
                onClick={handleLogout}
                className="w-full mt-4 flex items-center justify-center gap-2 px-6 py-3 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors"
              >
                <LogOut size={18} /> 退出登录
              </button>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-[#64748b] mb-4">你还没有登录</p>
              <Link href="/login" className="btn-primary inline-block">
                立即登录
              </Link>
            </div>
          )}
        </div>

        {/* 背景设置 */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <ImageIcon className="text-[#0ea5e9]" size={24} />
            <h2 className="text-lg font-semibold">首页背景</h2>
          </div>

          <p className="text-sm text-[#64748b] mb-4">选择预设背景或上传自定义图片</p>

          {/* 预设背景 */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
            {presetBackgrounds.map((bg, index) => (
              <button
                key={index}
                onClick={() => handleChangeBackground(bg.value)}
                className={`h-20 rounded-xl border-2 transition-all ${
                  currentBackground === bg.value ? 'border-[#0ea5e9] scale-105' : 'border-transparent hover:border-[#e2e8f0]'
                }`}
                style={{ background: bg.value }}
                title={bg.name}
              />
            ))}
          </div>

          {/* 上传自定义 */}
          <label className="flex items-center justify-center gap-2 px-6 py-3 border border-[#e2e8f0] rounded-xl cursor-pointer hover:bg-[#f8fafc] transition-colors">
            <ImageIcon size={18} />
            <span>上传自定义背景</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleUploadBackground}
              className="hidden"
            />
          </label>
          <p className="text-xs text-[#94a3b8] mt-2">支持 JPG、PNG、WebP 格式</p>
        </div>

        {/* 数据管理 */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">数据管理</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-[#f8fafc] rounded-xl">
              <div>
                <p className="font-medium text-[#0f172a]">清空所有记录</p>
                <p className="text-sm text-[#64748b]">删除本地保存的所有活动记录</p>
              </div>
              <button
                onClick={handleClearData}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 size={18} /> 清空
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-[#f8fafc] rounded-xl">
              <div>
                <p className="font-medium text-[#0f172a]">恢复默认活动</p>
                <p className="text-sm text-[#64748b]">恢复被删除的预设活动项目</p>
              </div>
              <button
                onClick={() => {
                  // 通过 localStorage 通知首页恢复默认活动
                  localStorage.setItem('restoreDefaultActivities', Date.now().toString());
                  alert('已发送恢复指令，请返回首页刷新查看');
                }}
                className="flex items-center gap-2 px-4 py-2 text-[#0ea5e9] hover:bg-[#f0f9ff] rounded-lg transition-colors"
              >
                恢复
              </button>
            </div>
          </div>
        </div>

        {/* 关于 */}
        <div className="card p-6 text-sm text-[#64748b]">
          <p>习惯日记 v0.1.0</p>
          <p className="mt-1">一个帮助你记录日常、AI智能总结的Web应用</p>
          <p className="mt-4 text-xs">后续将支持Supabase云同步、多设备访问</p>
        </div>
      </div>
    </div>
  );
}
