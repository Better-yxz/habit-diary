'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Sparkles, MessageCircle, Download, Send, X } from 'lucide-react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Activity {
  id: string;
  name: string;
  duration: number;
  date: string;
}

export default function AIAssistant() {
  const [activeTab, setActiveTab] = useState<'summary' | 'chat'>('summary');

  // 总结模式状态
  const [activities, setActivities] = useState<Activity[]>([]);
  const [aiSummary, setAiSummary] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // 聊天模式状态
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '你好！我是习惯小助手，有什么可以帮你的吗？',
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // 从 Supabase 加载活动记录
  const loadFromSupabase = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('请先登录');
      return;
    }

    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      alert('加载失败');
      return;
    }

    if (data && data.length > 0) {
      const formatted = data.map((item: any) => ({
        id: item.id,
        name: item.name,
        duration: item.duration,
        date: item.date,
      }));
      setActivities(formatted);
      alert(`已加载 ${formatted.length} 条记录`);
    } else {
      alert('暂无记录，请先在首页添加活动');
    }
  };

  // 生成AI总结
  const handleGenerateSummary = async () => {
    if (activities.length === 0) {
      alert('请先在首页记录一些活动，或点击"加载示例数据"体验功能');
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activities,
          timeRange: '今日',
        }),
      });

      const data = await response.json();

      if (data.error) {
        alert(data.error);
      } else {
        setAiSummary(data.summary);
      }
    } catch (error) {
      alert('生成失败，请检查网络或稍后重试');
    } finally {
      setIsGenerating(false);
    }
  };

  // 导出PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
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
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '活动记录');
    XLSX.writeFile(wb, `habit-diary-export-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // 发送聊天消息
  const handleSendMessage = async () => {
    const trimmed = inputMessage.trim();
    if (!trimmed) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(newMessages);
    setInputMessage('');
    setIsSending(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await response.json();

      if (data.error) {
        alert(data.error);
      } else {
        setMessages([...newMessages, { role: 'assistant', content: data.reply }]);
      }
    } catch (error) {
      alert('发送失败，请检查网络');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* 顶部导航 */}
      <nav className="bg-white border-b border-[#e2e8f0]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-[#64748b] hover:text-[#0f172a]">
              <ArrowLeft size={20} /> 返回首页
            </Link>
            <div className="w-px h-6 bg-[#e2e8f0]" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#0ea5e9] rounded-xl flex items-center justify-center">
                <Sparkles className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-[#0f172a]">AI 智能助手</h1>
                <p className="text-xs text-[#64748b]">习惯总结 · 自由对话</p>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Tab 切换 */}
        <div className="flex gap-2 mb-8 border-b border-[#e2e8f0]">
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex items-center gap-2 px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'summary'
                ? 'border-[#0ea5e9] text-[#0ea5e9]'
                : 'border-transparent text-[#64748b] hover:text-[#0f172a]'
            }`}
          >
            <Sparkles size={18} /> 习惯总结
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'chat'
                ? 'border-[#0ea5e9] text-[#0ea5e9]'
                : 'border-transparent text-[#64748b] hover:text-[#0f172a]'
            }`}
          >
            <MessageCircle size={18} /> 自由聊天
          </button>
        </div>

        {/* 总结模式 */}
        {activeTab === 'summary' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-2">AI 习惯总结</h2>
              <p className="text-[#64748b]">让AI帮你分析时间投入，生成专业建议</p>
            </div>

            {/* 操作区 */}
            <div className="card p-6 mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <button onClick={loadFromSupabase} className="px-6 py-3 border border-[#e2e8f0] rounded-xl font-medium hover:bg-white">
                  从云端加载记录
                </button>
                <button
                  onClick={handleGenerateSummary}
                  disabled={isGenerating || activities.length === 0}
                  className="btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isGenerating ? '正在生成...' : '生成AI总结'}
                </button>
              </div>
              <p className="text-xs text-[#94a3b8] mt-3">
                提示：先在首页记录真实活动，数据会自动同步到这里（当前为演示模式）
              </p>
            </div>

            {/* 总结结果 */}
            {aiSummary && (
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">AI 分析报告</h3>
                  <div className="flex gap-2">
                    <button onClick={exportToPDF} className="flex items-center gap-1 px-4 py-2 text-sm border border-[#e2e8f0] rounded-lg hover:bg-[#f8fafc]">
                      <Download size={16} /> PDF
                    </button>
                    <button onClick={exportToExcel} className="flex items-center gap-1 px-4 py-2 text-sm border border-[#e2e8f0] rounded-lg hover:bg-[#f8fafc]">
                      <Download size={16} /> Excel
                    </button>
                  </div>
                </div>
                <div className="prose prose-slate max-w-none whitespace-pre-wrap text-[#0f172a] leading-relaxed">
                  {aiSummary}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 聊天模式 */}
        {activeTab === 'chat' && (
          <div className="card flex flex-col h-[600px]">
            <div className="p-6 border-b border-[#e2e8f0]">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <MessageCircle className="text-[#0ea5e9]" /> 习惯小助手
              </h2>
              <p className="text-sm text-[#64748b] mt-1">随时向我提问关于习惯养成、时间管理的问题</p>
            </div>

            {/* 消息列表 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-[#0ea5e9] text-white'
                        : 'bg-[#f1f5f9] text-[#0f172a]'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isSending && (
                <div className="flex justify-start">
                  <div className="bg-[#f1f5f9] px-4 py-3 rounded-2xl text-[#64748b]">
                    正在思考...
                  </div>
                </div>
              )}
            </div>

            {/* 输入框 */}
            <div className="p-6 border-t border-[#e2e8f0] flex gap-3">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="输入你的问题..."
                className="flex-1 px-4 py-3 border border-[#e2e8f0] rounded-xl focus:outline-none focus:border-[#0ea5e9]"
                disabled={isSending}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isSending}
                className="btn-primary px-6 disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
