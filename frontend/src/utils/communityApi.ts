// Safe structural index fallback using Next.js build-time inlining
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

/**
 * Helper to fetch local storage session auth headers uniformly 
 * matching existing project api patterns.
 */
export function getAuthHeaders(): Record<string, string> {
  // SSR safety check for Next.js environments
  if (typeof window === 'undefined') return {};
  
  // Checking your project's native supabase auth localStorage key schema
  const supabaseSessionKey = Object.keys(localStorage).find(key => 
    key.startsWith('sb-') && key.endsWith('-auth-token')
  ) || Object.keys(localStorage).find(key => key.startsWith('sb-'));

  // 1. Initialize the correct base headers object literal structure
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  // 2. Safely parse and attach the token if a session exists inside try/catch guard
  if (supabaseSessionKey) {
    let token: string | undefined;
    try {
      const sessionData = JSON.parse(localStorage.getItem(supabaseSessionKey) || '{}');
      token = sessionData?.access_token;
    } catch (e) {
      console.error("Failed to parse auth token from localStorage:", e);
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  // 3. Return the fully formed object cleanly
  return headers;
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