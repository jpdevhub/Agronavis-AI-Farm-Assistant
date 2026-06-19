// Safe structural index fallback to completely bypass global compiler type limits
const globalEnv = typeof window !== 'undefined' ? (window as any) : {};
const BASE_URL = (globalEnv.process?.env?.NEXT_PUBLIC_API_URL) || 'http://localhost:8000';

/**
 * Helper to fetch local storage session auth headers uniformly 
 * matching existing project api patterns.
 */
function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  
  // Checking your project's native supabase auth localStorage key schema
  const supabaseSessionKey = Object.keys(localStorage).find(key => 
    key.startsWith('sb-') && key.endsWith('-auth-token')
  );
  
  if (supabaseSessionKey) {
    const sessionData = JSON.parse(localStorage.getItem(supabaseSessionKey) || '{}');
    const token = sessionData?.access_token;
    if (token) {
      return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
    }
  }
  return { 'Content-Type': 'application/json' };
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  title: string;
  content: string;
  image_url?: string;
  created_at: string;
  comments: Comment[];
}

export const communityApi = {
  /**
   * Fetches the entire community feed with nested comments
   */
  async getFeed(): Promise<Post[]> {
    const response = await fetch(`${BASE_URL}/api/community/posts`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch community feed');
    const result = await response.json();
    return result.data || [];
  },

  /**
   * Publishes a new post to the community feed
   */
  async createPost(title: string, content: string, imageUrl?: string): Promise<Post> {
    const response = await fetch(`${BASE_URL}/api/community/posts`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ title, content, image_url: imageUrl || null }),
    });
    if (!response.ok) throw new Error('Failed to create community post');
    const result = await response.json();
    return result.data;
  },

  /**
   * Adds a comment to an existing community post
   */
  async createComment(postId: string, content: string): Promise<Comment> {
    const response = await fetch(`${BASE_URL}/api/community/comments`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ post_id: postId, content }),
    });
    if (!response.ok) throw new Error('Failed to submit comment');
    const result = await response.json();
    return result.data;
  }
};