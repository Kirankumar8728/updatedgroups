'use client';
import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Trash2, 
  Search, 
  ExternalLink, 
  Lock, 
  Mail, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  RefreshCw,
  Calendar
} from 'lucide-react';
import { maskEmail } from '../utils/moderation';
import { getAdminAuthHeaders } from '../utils/adminAuth';

interface AdminCommentItem {
  id: string;
  groupId: string;
  groupTitle: string;
  groupPlatform: string;
  name: string;
  email: string;
  maskedEmail: string;
  comment: string;
  createdAt: string;
}

export const AdminCommentsManager: React.FC = () => {
  const [comments, setComments] = useState<AdminCommentItem[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/comments', {
        headers: getAdminAuthHeaders(),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.comments)) {
        setComments(data.comments);
      } else {
        setComments([]);
      }
    } catch (err: any) {
      setError('Failed to fetch comments list from server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, []);

  const handleDeleteComment = async (groupId: string, commentId: string) => {
    setConfirmingId(null);
    setDeletingId(commentId);
    setError(null);
    
    // Save previous state for rollback if needed
    const previousComments = [...comments];
    
    // Optimistically remove from list immediately
    setComments(prev => prev.filter(c => c.id !== commentId));

    try {
      const res = await fetch(`/api/admin/comments?groupId=${encodeURIComponent(groupId)}&commentId=${encodeURIComponent(commentId)}`, {
        method: 'DELETE',
        headers: getAdminAuthHeaders(),
        body: JSON.stringify({ groupId, commentId })
      });
      const data = await res.json();
      if (data.success) {
        if (Array.isArray(data.comments)) {
          setComments(data.comments);
        }
        setNotice('Comment removed permanently from the database.');
        setTimeout(() => setNotice(null), 3500);
      } else {
        // Rollback on server failure
        setComments(previousComments);
        setError(data.error || 'Failed to delete comment from database.');
        setTimeout(() => setError(null), 4000);
      }
    } catch (err: any) {
      setComments(previousComments);
      setError(err.message || 'Network error while deleting comment.');
      setTimeout(() => setError(null), 4000);
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = comments.filter(c => {
    if (!c) return false;
    const q = searchFilter.toLowerCase().trim();
    if (!q) return true;
    
    const commentStr = typeof c.comment === 'string' ? c.comment : (typeof (c as any).comment?.comment === 'string' ? (c as any).comment.comment : '');
    const nameStr = typeof c.name === 'string' ? c.name : (typeof (c as any).comment?.name === 'string' ? (c as any).comment.name : '');
    const emailStr = typeof c.email === 'string' ? c.email : (typeof (c as any).comment?.email === 'string' ? (c as any).comment.email : '');
    const groupTitleStr = typeof c.groupTitle === 'string' ? c.groupTitle : (typeof (c as any).group?.title === 'string' ? (c as any).group.title : '');

    return (
      commentStr.toLowerCase().includes(q) ||
      nameStr.toLowerCase().includes(q) ||
      emailStr.toLowerCase().includes(q) ||
      groupTitleStr.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 rounded-3xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-2xl bg-indigo-600 text-white shadow-md shrink-0">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-indigo-950 dark:text-indigo-100 flex items-center gap-2">
              <span>Community Comments & Feedback Moderation</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-indigo-200 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-100">
                {comments.length} Total Comments
              </span>
            </h3>
            <p className="text-xs text-indigo-800/90 dark:text-indigo-300/90 mt-1 max-w-2xl leading-relaxed">
              Review, search, and delete inappropriate user comments across all community pages. Real emails are accessible to administrators, while public viewers only see masked emails (e.g. <code>kirxxxx28@gmail.com</code>).
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchComments}
          disabled={isLoading}
          className="px-4 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 text-indigo-800 dark:text-indigo-200 text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 shadow-xs cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {notice && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs font-semibold text-red-800 dark:text-red-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search by comment text, name, email, or community title..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>

        <div className="text-xs text-neutral-500">
          Showing {filtered.length} of {comments.length} comments
        </div>
      </div>

      {/* Comments List */}
      {isLoading ? (
        <div className="p-12 text-center text-neutral-400 text-xs flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
          <span>Loading comments...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 rounded-3xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 text-center space-y-2">
          <MessageSquare className="w-8 h-8 text-neutral-300 mx-auto" />
          <div className="text-xs font-bold text-neutral-600 dark:text-neutral-400">
            No comments found.
          </div>
          <p className="text-[11px] text-neutral-400">
            When users post comments on community pages, they will appear here for admin moderation.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const dateStr = item.createdAt
              ? new Date(item.createdAt).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : 'Recent';

            return (
              <div
                key={item.id}
                className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black text-neutral-900 dark:text-white">
                      Community:
                    </span>
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      {item.groupTitle}
                    </span>
                    <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                      {item.groupPlatform}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-neutral-400">
                    <span className="flex items-center gap-1 text-[11px]">
                      <Calendar className="w-3 h-3" />
                      {dateStr}
                    </span>
                    
                    {confirmingId === item.id ? (
                      <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150">
                        <button
                          type="button"
                          disabled={deletingId === item.id}
                          onClick={() => handleDeleteComment(item.groupId, item.id)}
                          className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-xs flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                        >
                          {deletingId === item.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                          <span>Confirm Delete</span>
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === item.id}
                          onClick={() => setConfirmingId(null)}
                          className="px-2.5 py-1 rounded-lg bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 text-neutral-700 dark:text-neutral-300 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={deletingId === item.id}
                        onClick={() => setConfirmingId(item.id)}
                        className="px-3 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-xs font-bold border border-rose-200 dark:border-rose-800 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {deletingId === item.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Author Info */}
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5 text-neutral-800 dark:text-neutral-200 font-bold">
                    <User className="w-3.5 h-3.5 text-neutral-400" />
                    <span>{item.name}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
                    <Mail className="w-3.5 h-3.5 text-neutral-400" />
                    <span className="font-mono text-[11px]">{item.email}</span>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-normal">
                      (Public shows: {item.maskedEmail || maskEmail(item.email)})
                    </span>
                  </div>
                </div>

                {/* Comment Text Box */}
                <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-700/60 text-xs sm:text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed">
                  {item.comment}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
