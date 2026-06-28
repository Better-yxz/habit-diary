import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 类型定义
export interface User {
  id: string;
  email: string;
  username?: string;
}

export interface Activity {
  id: string;
  user_id: string;
  name: string;
  duration: number;
  date: string;
  created_at: string;
}
