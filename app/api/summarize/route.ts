import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { activities, timeRange } = await request.json();

    if (!activities || activities.length === 0) {
      return NextResponse.json(
        { error: '没有活动记录可供分析' },
        { status: 400 }
      );
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'DeepSeek API Key 未配置' },
        { status: 500 }
      );
    }

    // 构建提示词
    const prompt = `你是一个专业的时间管理助手。请根据以下活动记录，生成一份简洁的中文总结报告。

时间范围：${timeRange}

活动记录：
${activities.map((a: any) => `- ${a.date}：${a.name} ${Math.floor(a.duration / 60)}小时${a.duration % 60}分钟`).join('\n')}

请按以下格式输出（使用Markdown格式）：

## 📊 时间投入总览
（简要说明总时长和主要活动）

## 🔍 详细分析
（每项活动的时长、占比、简单评价）

## 💡 建议与洞察
（2-3条实用建议）

要求：语言自然、数据准确、建议具体。`;

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的时间管理助手，擅长分析用户的时间分配并给出实用建议。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('DeepSeek API Error:', errorData);
      return NextResponse.json(
        { error: 'AI服务暂时不可用，请稍后重试' },
        { status: 500 }
      );
    }

    const data = await response.json();
    const summary = data.choices[0]?.message?.content || '生成失败，请重试';

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Summarize API Error:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
