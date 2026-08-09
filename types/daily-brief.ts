export type DailyBriefActivity = {
  replies: number;
  comments: number;
  post_upvotes: number;
  comment_upvotes: number;
  reposts: number;
  quotes: number;
  followers: number;
  follow_requests: number;
  unread_dms: number;
};

export type DailyBrief = {
  id: string;
  brief_date: string;
  timezone: string;
  window_start: string;
  window_end: string;
  generated_at: string;
  seen_at: string | null;
  stories: {
    id: string;
    title: string;
    short_summary?: string | null;
    outlet_count: number;
    article_count: number;
    media?: string | null;
  }[];
  posts: {
    id: string;
    user_id: string;
    username: string;
    avatar_url?: string | null;
    is_demo?: boolean;
    content: string;
    media_url?: string | null;
    position?: number | null;
    upvotes: number;
    commentcount: number;
  }[];
  floor: {
    id: string;
    title: string;
    kind: string;
    total_votes: number;
    comment_count: number;
  }[];
  floor_recap: {
    id: string;
    title: string;
    total_votes: number;
    comment_count: number;
    median?: number | null;
  }[];
  activity: DailyBriefActivity;
};
