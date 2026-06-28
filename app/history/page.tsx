'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Calendar } from 'lucide-react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Activity {
  id: string;
  name: string;
  duration: number;
  date: string;
}

const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function HistoryPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'chart'>('chart');

  useEffect(() => {
    // 从 localStorage 读取（演示用）
    // 实际项目中应从 Supabase 读取
    const saved = localStorage.getItem('activities');
    if (saved) {
      setActivities(JSON.parse(saved));
    } else {
      // 演示数据
      setActivities([
        { id: '1', name: '学习', duration: 120, date: '2026-06-28' },
        { id: '2', name: '运动', duration: 45, date: '2026-06-28' },
        { id: '3', name: '阅读', duration: 30, date: '2026-06-28' },
        { id: '4', name: '学习', duration: 90, date: '2026-06-27' },
        { id: '5', name: '工作', duration: 180, date: '2026-06-27' },
        { id: '6', name: '运动', duration: 60, date: '2026-06-26' },
      ]);
    }
  }, []);

  // 按日期分组
  const groupedByDate = activities.reduce((acc, act) => {
    if (!acc[act.date]) acc[act.date] = [];
    acc[act.date].push(act);
    return acc;
  }, {} as Record<string, Activity[]>);

  const sortedDates = Object.keys(groupedByDate).sort().reverse();

  // 统计每项活动的总时长（用于饼图）
  const activityStats = activities.reduce((acc, act) => {
    if (!acc[act.name]) acc[act.name] = 0;
    acc[act.name] += act.duration;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(activityStats).map(([name, value]) => ({ name, value }));

  // 每日总时长（用于柱状图）
  const dailyData = sortedDates.map(date => ({
    date: date.slice(5), // 只显示月-日
    total: groupedByDate[date].reduce((sum, a) => sum + a.duration, 0),
  }));

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}h${mins > 0 ? mins + 'm' : ''}`;
    return `${mins}m`;
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
          <h1 className="text-xl font-semibold text-[#0f172a]">历史统计</h1>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Tab 切换 */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setViewMode('chart')}
            className={`px-6 py-2 rounded-xl font-medium transition-colors ${
              viewMode === 'chart' ? 'bg-[#0ea5e9] text-white' : 'bg-white border border-[#e2e8f0]'
            }`}
          >
            图表统计
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-6 py-2 rounded-xl font-medium transition-colors ${
              viewMode === 'list' ? 'bg-[#0ea5e9] text-white' : 'bg-white border border-[#e2e8f0]'
            }`}
          >
            详细记录
          </button>
        </div>

        {activities.length === 0 ? (
          <div className="card p-12 text-center">
            <Calendar className="mx-auto text-[#cbd5e1] mb-4" size={48} />
            <p className="text-[#64748b]">还没有任何历史记录</p>
            <p className="text-sm text-[#94a3b8] mt-1">去首页记录一些活动吧</p>
          </div>
        ) : viewMode === 'chart' ? (
          <div className="space-y-8">
            {/* 每日投入柱状图 */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold mb-4">每日时间投入</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value} 分钟`, '总时长']} />
                    <Bar dataKey="total" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 活动占比饼图 */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold mb-4">活动时间占比</h2>
              <div className="h-80 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={140}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} 分钟`, '时长']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (
          /* 详细记录列表 */
          <div className="space-y-6">
            {sortedDates.map((date) => (
              <div key={date} className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">{date}</h3>
                  <span className="text-sm text-[#64748b]">
                    共 {groupedByDate[date].length} 项 ·{' '}
                    {formatDuration(groupedByDate[date].reduce((sum, a) => sum + a.duration, 0))}
                  </span>
                </div>
                <div className="space-y-3">
                  {groupedByDate[date].map((act) => (
                    <div key={act.id} className="flex items-center justify-between p-4 bg-[#f8fafc] rounded-xl">
                      <span className="font-medium">{act.name}</span>
                      <span className="text-[#64748b]">{formatDuration(act.duration)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
