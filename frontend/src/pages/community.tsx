import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { communityApi, Post } from '../utils/communityApi';

export default function CommunityPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchFeed();
  }, []);

  const fetchFeed = async () => {
    try {
      setLoading(true);
      const data = await communityApi.getFeed();
      setPosts(data);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load community feed');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    try {
      await communityApi.createPost(title, content, imageUrl);
      setTitle('');
      setContent('');
      setImageUrl('');
      fetchFeed();
    } catch (err: any) {
      alert(err.message || 'Error creating post');
    }
  };

  const handleCreateComment = async (postId: string) => {
    const text = commentInputs[postId];
    if (!text || !text.trim()) return;

    try {
      await communityApi.createComment(postId, text);
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
      fetchFeed();
    } catch (err: any) {
      alert(err.message || 'Error submitting comment');
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem', fontFamily: 'system-ui, sans-serif' }}>
      <Head>
        <title>AgroNavis - Community Feed</title>
      </Head>

      <h1 style={{ color: '#16a34a', marginBottom: '1.5rem' }}>🌾 Farmer Community Board</h1>
      <p style={{ color: '#4b5563', marginBottom: '2rem' }}>Share updates, ask crop health questions, and connect with other farmers.</p>
      
      {/* CREATE NEW POST FORM */}
      <form onSubmit={handleCreatePost} style={{ background: '#f3f4f6', padding: '1.5rem', borderRadius: '8px', marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#1f2937' }}>Create a New Post</h2>
        <div style={{ marginBottom: '1rem' }}>
          <input
            type="text"
            placeholder="Post Title (e.g., Early Blight Warning)"
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
            required
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <textarea
            placeholder="What's happening on your farm?"
            value={content}
            onChange={e => setContent(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', minHeight: '100px' }}
            required
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <input
            type="url"
            placeholder="Image URL (Optional)"
            value={imageUrl}
            onChange={e => setImageUrl(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
          />
        </div>
        <button type="submit" style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          Publish Post
        </button>
      </form>

      {/* FEED STATUS */}
      {loading && <p style={{ textAlign: 'center', color: '#6b7280' }}>Loading community updates...</p>}
      {error && <p style={{ color: '#dc2626', textAlign: 'center' }}>{error}</p>}
      {!loading && posts.length === 0 && (
        <p style={{ textAlign: 'center', color: '#6b7280' }}>No posts available. Be the first to share something!</p>
      )}

      {/* RENDER FEED POSTS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {posts.map((post) => (
          <div key={post.id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: '1.5rem', margin: '0 0 0.5rem 0', color: '#111827' }}>{post.title}</h3>
            <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '1rem' }}>Posted on {new Date(post.created_at).toLocaleDateString()}</p>
            <p style={{ color: '#374151', lineHeight: '1.6', marginBottom: '1rem', whiteSpace: 'pre-wrap' }}>{post.content}</p>
            
            {post.image_url && (
              <img src={post.image_url} alt={post.title} style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '6px', marginBottom: '1rem', objectFit: 'cover' }} />
            )}

            <hr style={{ border: '0', borderTop: '1px solid #f3f4f6', margin: '1.5rem 0' }} />

            {/* COMMENTS LOOP */}
            <h4 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: '#374151' }}>Comments ({post.comments?.length || 0})</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
              {post.comments?.map((comment) => (
                <div key={comment.id} style={{ background: '#f9fafb', padding: '0.75rem', borderRadius: '6px', fontSize: '0.925rem' }}>
                  <p style={{ margin: 0, color: '#4b5563' }}>{comment.content}</p>
                  <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{new Date(comment.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>

            {/* COMMENT INPUT CONTROLS */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="Write a reply..."
                value={commentInputs[post.id] || ''}
                onChange={e => {
                  const val = e.target.value;
                  setCommentInputs(prev => ({ ...prev, [post.id]: val }));
                }}
                style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.925rem' }}
              />
              <button 
                onClick={() => handleCreateComment(post.id)} 
                style={{ background: '#4b5563', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.925rem' }}
              >
                Reply
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}