// src/lib/recruit-bookmarks.ts
// 연결하기(채용/공모전) 찜(북마크) 기능
//
// 필요 테이블 (Supabase SQL Editor에서 실행):
// CREATE TABLE recruit_bookmark (
//   id SERIAL PRIMARY KEY,
//   user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
//   recruit_item_id INT REFERENCES recruit_items(id) ON DELETE CASCADE,
//   created_at TIMESTAMPTZ DEFAULT NOW(),
//   UNIQUE(user_id, recruit_item_id)
// );
// ALTER TABLE recruit_bookmark ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "Users can manage own bookmarks" ON recruit_bookmark
//   FOR ALL USING (auth.uid() = user_id);

import { supabase } from "./supabase/client";

async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getUserRecruitBookmarks(userId: string): Promise<number[]> {
  const { data, error } = await supabase
    .from("recruit_bookmark")
    .select("recruit_item_id")
    .eq("user_id", userId);
  if (error) {
    console.error("Error fetching recruit bookmarks:", error);
    return [];
  }
  return (data || []).map((row: any) => row.recruit_item_id);
}

export async function toggleRecruitBookmark(itemId: number): Promise<boolean> {
  const user = await getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("recruit_bookmark")
    .select("id")
    .eq("user_id", user.id)
    .eq("recruit_item_id", itemId)
    .single();

  if (data) {
    await supabase
      .from("recruit_bookmark")
      .delete()
      .eq("user_id", user.id)
      .eq("recruit_item_id", itemId);
    return false;
  } else {
    await supabase
      .from("recruit_bookmark")
      .insert({ user_id: user.id, recruit_item_id: itemId });
    return true;
  }
}
