'use client';

import { useState, useEffect } from 'react';
import { Plus, Clock, Calendar, Sparkles, Settings, User, Download, X } from 'lucide-react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Activity {
  id: string;
  name: string;
  duration: number;
  date: string;
}

// 初始预设活动
const INITIAL_DEFAULT_ACTIVITIES = [
  { id: 'eat', name: '吃饭' },
  { id: 'sleep', name: '睡觉' },
  { id: 'study', name: '学习' },
  { id: 'work', name: '工作' },
  { id: 'exercise', name: '运动' },
  { id: 'read', name: '阅读' },
];

export default function HabitDiary() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<{ id: string; name: string } | null>(null);
  const [duration, setDuration] = useState('');

  // 当前登录用户
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; username?: string } | null>(null);

  // 背景设置
  const [background, setBackground] = useState<string>('linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)');

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setCurrentUser(user);

      // 用户登录后，从 Supabase 加载活动记录
      loadActivitiesFromSupabase(user.id);
    }

    // 读取背景设置
    const savedBg = localStorage.getItem('background');
    if (savedBg) {
      setBackground(savedBg);
    }

    // 监听恢复默认活动的指令和用户更新
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'restoreDefaultActivities') {
        setDefaultActivities(INITIAL_DEFAULT_ACTIVITIES);
        localStorage.removeItem('restoreDefaultActivities');
        alert('已恢复默认活动项目');
      }
      if (e.key === 'background') {
        setBackground(e.newValue || 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)');
      }
      if (e.key === 'user' && e.newValue) {
        setCurrentUser(JSON.parse(e.newValue));
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // 从 Supabase 加载活动记录
  const loadActivitiesFromSupabase = async (userId: string) => {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('加载活动失败:', error);
      return;
    }

    if (data) {
      // 转换字段名（snake_case -> camelCase）
      const formatted = data.map((item: any) => ({
        id: item.id,
        name: item.name,
        duration: item.duration,
        date: item.date,
      }));
      setActivities(formatted);
    }
  };

  // 活动列表（可编辑）
  const [defaultActivities, setDefaultActivities] = useState(INITIAL_DEFAULT_ACTIVITIES);
  const [customActivities, setCustomActivities] = useState<{ id: string; name: string }[]>([]);
  const [newCustomActivity, setNewCustomActivity] = useState('');

  const todayActivities = activities.filter(a => a.date === selectedDate);
  const totalMinutes = todayActivities.reduce((sum, a) => sum + a.duration, 0);

  // 计算连续打卡天数
  const calculateStreak = () => {
    if (activities.length === 0) return 0;

    const uniqueDates = [...new Set(activities.map(a => a.date))].sort().reverse();
    let streak = 0;
    let currentDate = new Date();

    for (let i = 0; i < 365; i++) {
      const dateStr = currentDate.toISOString().split('T')[0];
      if (uniqueDates.includes(dateStr)) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  };

  const streakDays = calculateStreak();

  const handleActivityClick = (activity: { id: string; name: string }) => {
    setSelectedActivity(activity);
    setDuration('');
    setShowDurationModal(true);
  };

  const handleSaveDuration = async () => {
    if (!selectedActivity || !duration || !currentUser) {
      if (!currentUser) {
        alert('请先登录后再记录活动');
        setShowDurationModal(false);
      }
      return;
    }

    const minutes = parseInt(duration);

    // 验证：时长必须大于 0
    if (minutes <= 0) {
      alert('时长必须大于 0 分钟，请重新输入');
      return;
    }

    // 先插入到 Supabase
    const { data, error } = await supabase
      .from('activities')
      .insert({
        user_id: currentUser.id,
        name: selectedActivity.name,
        duration: minutes,
        date: selectedDate,
      })
      .select()
      .single();

    if (error) {
      alert('保存失败，请重试');
      console.error(error);
      return;
    }

    // 成功后更新本地状态
    const newActivity: Activity = {
      id: data.id,
      name: data.name,
      duration: data.duration,
      date: data.date,
    };

    setActivities([...activities, newActivity]);
    setShowDurationModal(false);
    setSelectedActivity(null);
    setDuration('');
  };

  const handleDeleteActivity = async (id: string) => {
    // 从 Supabase 删除
    const { error } = await supabase.from('activities').delete().eq('id', id);

    if (error) {
      alert('删除失败，请重试');
      console.error(error);
      return;
    }

    // 成功后更新本地状态
    setActivities(activities.filter(a => a.id !== id));
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}小时${mins > 0 ? mins + '分钟' : ''}`;
    }
    return `${mins}分钟`;
  };

  // AI总结功能
  const handleAISummarize = async () => {
    if (activities.length === 0) {
      alert('还没有任何记录，快去记录一些活动吧！');
      return;
    }

    setIsGenerating(true);
    setTimeRange('今日');
    setShowAISummaryModal(true);

    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activities: todayActivities.length > 0 ? todayActivities : activities,
          timeRange: '今日',
        }),
      });

      const data = await response.json();

      if (data.error) {
        alert(data.error);
        setShowAISummaryModal(false);
      } else {
        setAiSummary(data.summary);
      }
    } catch (error) {
      alert('生成失败，请检查网络或稍后重试');
      setShowAISummaryModal(false);
    } finally {
      setIsGenerating(false);
    }
  };

  // 导出PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFont('helvetica');
    doc.text('Habit Diary - AI Summary', 20, 20);
    doc.text(`Generated: ${new Date().toLocaleDateString('zh-CN')}`, 20, 30);

    const lines = aiSummary.split('\n');
    let y = 45;
    lines.forEach((line) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, 20, y);
      y += 8;
    });

    doc.save(`habit-diary-summary-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // 导出Excel
  const exportToExcel = () => {
    const data = activities.map((a) => ({
      日期: a.date,
      活动: a.name,
      时长_分钟: a.duration,
      时长_格式化: formatDuration(a.duration),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '活动记录');
    XLSX.writeFile(wb, `habit-diary-export-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // 添加自定义活动
  const handleAddCustomActivity = () => {
    const trimmed = newCustomActivity.trim();
    if (!trimmed) return;

    // 检查是否已存在
    const exists = [...defaultActivities, ...customActivities].some(
      (a) => a.name === trimmed
    );
    if (exists) {
      alert('该活动已存在！');
      return;
    }

    setCustomActivities([
      ...customActivities,
      { id: `custom-${Date.now()}`, name: trimmed },
    ]);
    setNewCustomActivity('');
  };

  // 删除活动项目（支持删除预设和自定义）
  const handleDeleteActivityItem = (id: string) => {
    if (!confirm('确定要删除这个活动项目吗？')) return;

    // 从默认活动列表中删除
    if (defaultActivities.some((a) => a.id === id)) {
      setDefaultActivities(defaultActivities.filter((a) => a.id !== id));
    }
    // 从自定义活动列表中删除
    else if (customActivities.some((a) => a.id === id)) {
      setCustomActivities(customActivities.filter((a) => a.id !== id));
    }
  };

  // 合并所有活动
  const allActivities = [...defaultActivities, ...customActivities];

  return (
    <div className="min-h-screen" style={{ background }}>
      {/* 背景遮罩，让内容更清晰 */}
      <div className="min-h-screen bg-white/40 backdrop-blur-[1px]">
      {/* 顶部导航 */}
      <nav className="bg-white border-b border-[#e2e8f0]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#0ea5e9] rounded-xl flex items-center justify-center">
              <span className="text-white text-xl">📔</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-[#0f172a]">习惯日记</h1>
              <p className="text-xs text-[#64748b]">记录每一天的美好</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {currentUser ? (
              <Link href="/settings" className="flex items-center gap-2 px-4 py-2 text-[#64748b] hover:text-[#0f172a] transition-colors">
                <User size={18} /> {currentUser.username}
              </Link>
            ) : (
              <Link href="/login" className="flex items-center gap-2 px-4 py-2 text-[#64748b] hover:text-[#0f172a] transition-colors">
                <User size={18} /> 登录
              </Link>
            )}
            <Link href="/settings" className="flex items-center gap-2 px-4 py-2 text-[#64748b] hover:text-[#0f172a] transition-colors">
              <Settings size={18} />
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* 欢迎语 + 日期 */}
        <div className="mb-8">
          <h2 className="text-3xl font-semibold text-[#0f172a] mb-2">
            你好，{currentUser?.username || currentUser?.email?.split('@')[0] || '朋友'}！今天是 {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}
          </h2>
          <p className="text-[#64748b]">点击活动标签，记录你今天的时间投入吧</p>
        </div>

        {/* 今日统计 + 连续打卡 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#64748b] mb-1">今日总投入</p>
                <p className="text-4xl font-semibold text-[#0f172a]">{formatDuration(totalMinutes)}</p>
              </div>
              <div className="w-16 h-16 bg-[#f0f9ff] rounded-2xl flex items-center justify-center">
                <Clock className="text-[#0ea5e9]" size={32} />
              </div>
            </div>
          </div>

          <div className="card p-6 bg-gradient-to-br from-[#0ea5e9] to-[#0284c7] text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/80 mb-1">连续打卡</p>
                <p className="text-4xl font-semibold">{streakDays} 天</p>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <span className="text-3xl">🔥</span>
              </div>
            </div>
          </div>
        </div>

        {/* 活动标签 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-[#0f172a]">快速记录</h3>
          </div>

          {/* 活动卡片网格 */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
            {allActivities.map((activity) => (
              <div
                key={activity.id}
                onClick={() => handleActivityClick(activity)}
                className="activity-card card p-8 flex items-center justify-center text-center hover:border-[#0ea5e9] relative group"
              >
                <p className="font-medium text-lg text-[#0f172a]">{activity.name}</p>
                {/* 所有活动均可删除（鼠标悬停显示） */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteActivityItem(activity.id);
                  }}
                  className="absolute top-2 right-2 text-[#94a3b8] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="删除此活动"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* 添加自定义活动 */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newCustomActivity}
              onChange={(e) => setNewCustomActivity(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCustomActivity()}
              placeholder="输入自定义活动名称，如：冥想、写作..."
              className="flex-1 px-4 py-3 border border-[#e2e8f0] rounded-xl focus:outline-none focus:border-[#0ea5e9] text-sm"
            />
            <button
              onClick={handleAddCustomActivity}
              disabled={!newCustomActivity.trim()}
              className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={18} /> 添加
            </button>
          </div>
        </div>

        {/* 今日记录列表 */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-[#0f172a]">今日记录</h3>
            <span className="text-sm text-[#64748b]">{todayActivities.length} 项活动</span>
          </div>

          {todayActivities.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="mx-auto text-[#cbd5e1] mb-4" size={48} />
              <p className="text-[#64748b]">今天还没有记录哦</p>
              <p className="text-sm text-[#94a3b8] mt-1">点击上方活动标签开始记录吧</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayActivities.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-4 bg-[#f8fafc] rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-[#e2e8f0]">
                      <Clock size={18} className="text-[#64748b]" />
                    </div>
                    <div>
                      <p className="font-medium text-[#0f172a]">{activity.name}</p>
                      <p className="text-sm text-[#64748b]">{formatDuration(activity.duration)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteActivity(activity.id)}
                    className="text-[#94a3b8] hover:text-red-500 transition-colors px-3 py-1"
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部操作栏 */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <Link href="/ai" className="flex-1 btn-primary flex items-center justify-center gap-2">
            <Sparkles size={18} /> AI 智能总结
          </Link>
          <Link href="/history" className="flex-1 px-6 py-3 border border-[#e2e8f0] rounded-xl text-[#0f172a] font-medium hover:bg-white transition-colors flex items-center justify-center gap-2">
            <Calendar size={18} /> 查看历史
          </Link>
        </div>
      </div>

      {/* 时长输入弹窗 */}
      {showDurationModal && selectedActivity && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="modal card w-full max-w-md p-6">
            <h3 className="text-xl font-semibold mb-2">记录「{selectedActivity.name}」</h3>
            <p className="text-[#64748b] mb-6">输入今天投入的时间（分钟）</p>

            <input
              type="number"
              min="1"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="例如：60"
              className="w-full px-4 py-3 text-lg border border-[#e2e8f0] rounded-xl focus:outline-none focus:border-[#0ea5e9]"
            />

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowDurationModal(false)}
                className="flex-1 py-3 border border-[#e2e8f0] rounded-xl font-medium"
              >
                取消
              </button>
              <button
                onClick={handleSaveDuration}
                disabled={!duration}
                className="flex-1 py-3 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                保存记录
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
