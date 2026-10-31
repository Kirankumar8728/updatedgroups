'use client';
import React, { useState, useEffect } from 'react';
import { 
  Star, 
  MessageSquare, 
  Send, 
  ShieldCheck, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Lock, 
  User, 
  Mail, 
  Loader2,
  ShieldAlert,
  Sparkles,
  Coins
} from 'lucide-react';
import { Group, GroupComment } from '../types';
import { maskEmail, checkIsRestrictedText } from '../utils/moderation';
import { checkAdminSession } from '../utils/adminAuth';
import { fireConfetti } from '../utils/confetti';
import { getStoredSessionToken } from '../utils/userAuth';

interface GroupReviewsAndCommentsProps {
  group: Group;
  isAdminLoggedIn?: boolean;
  onUpdateGroup?: (updated: Group) => void;
}

export const GroupReviewsAndComments: React.FC<GroupReviewsAndCommentsProps> = ({
  group,
  isAdminLoggedIn: initialAdminStatus,
  onUpdateGroup
}) => {
  // Comments state
  const [comments, setComments] = useState<GroupComment[]>(group.comments || []);
  const [commentText, setCommentText] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [commentSuccess, setCommentSuccess] = useState(false);

  // Rating state
  const [currentRating, setCurrentRating] = useState<number>(group.rating !== undefined ? group.rating : 4.8);
  const [ratingCount, setRatingCount] = useState<number>(group.ratingCount !== undefined ? group.ratingCount : 24);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [userSubmittedRating, setUserSubmittedRating] = useState<number | null>(null);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [ratingNotice, setRatingNotice] = useState<string | null>(null);

  // Admin status check
  const [isAdmin, setIsAdmin] = useState<boolean>(initialAdminStatus || false);

  useEffect(() => {
    try {
      setIsAdmin(initialAdminStatus || checkAdminSession());
      // Check if user already rated this group locally
      const storedRating = localStorage.getItem(`rated_group_${group.id}`);
      if (storedRating) {
        setUserSubmittedRating(Number(storedRating));
      }
    } catch {
      // ignore
    }
  }, [group.id, initialAdminStatus]);

  // Sync when group prop changes
  useEffect(() => {
    if (group.comments) setComments(group.comments);
    if (group.rating !== undefined) setCurrentRating(group.rating);
    if (group.ratingCount !== undefined) setRatingCount(group.ratingCount);
  }, [group.comments, group.rating, group.ratingCount]);

  // Live Restricted check on comment input
  const liveRestricted = checkIsRestrictedText(`${name} ${commentText} ${email}`);

  // Handle User Rating
  const handleRate = async (star: number) => {
    if (isSubmittingRating) return;
    setIsSubmittingRating(true);
    setRatingNotice(null);

    // Mini confetti
    try {
      fireConfetti({
        particleCount: 30,
        spread: 50,
        origin: { y: 0.7 }
      });
    } catch {}

    try {
      const token = getStoredSessionToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/groups/${group.id}/rate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ rating: star })
      });

      const data = await res.json();
      if (data.success) {
        setCurrentRating(data.rating);
        setRatingCount(data.ratingCount);
        setUserSubmittedRating(star);
        const rewardText = data.rewardAwarded ? ' (🪙 +1 Promotion Credit earned!)' : '';
        setRatingNotice(`Thank you! You rated this community ${star} out of 5 stars.${rewardText}`);
        try {
          localStorage.setItem(`rated_group_${group.id}`, star.toString());
        } catch {}

        if (onUpdateGroup) {
          onUpdateGroup({
            ...group,
            rating: data.rating,
            ratingCount: data.ratingCount
          });
        }
      } else {
        setRatingNotice(data.error || 'Failed to record rating');
      }
    } catch (err: any) {
      setRatingNotice('Failed to submit rating. Please try again.');
    } finally {
      setIsSubmittingRating(false);
      setTimeout(() => setRatingNotice(null), 4500);
    }
  };

  // Handle Comment Submission (3 boxes: comment, name, email)
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    setCommentError(null);
    setCommentSuccess(false);

    if (!commentText.trim()) {
      setCommentError('Please enter your comment in box 1.');
      return;
    }
    if (!name.trim()) {
      setCommentError('Please enter your name in box 2.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setCommentError('Please enter a valid email address in box 3.');
      return;
    }

    // Zero-tolerance check on client
    const combined = `${name} ${commentText} ${email}`;
    const restricted = checkIsRestrictedText(combined);
    if (restricted.isRestricted) {
      setCommentError(`🚫 Comment Blocked: Your text contains strictly prohibited/restricted term "${restricted.matchedKeyword}". We enforce zero tolerance against illegal or harmful content.`);
      return;
    }

    setIsSubmittingComment(true);

    try {
      const token = getStoredSessionToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/groups/${group.id}/comments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          comment: commentText.trim(),
          name: name.trim(),
          email: email.trim()
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to post comment');
      }

      setComments(data.comments || [data.comment, ...comments]);
      setCommentText('');
      setCommentSuccess(true);

      if (onUpdateGroup) {
        onUpdateGroup({
          ...group,
          comments: data.comments || [data.comment, ...comments]
        });
      }

      setTimeout(() => setCommentSuccess(false), 4000);
    } catch (err: any) {
      setCommentError(err.message || 'An error occurred while posting your comment.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [confirmDeleteCommentId, setConfirmDeleteCommentId] = useState<string | null>(null);

  // Handle Admin Delete Comment
  const handleDeleteComment = async (commentId: string) => {
    setConfirmDeleteCommentId(null);
    setDeletingCommentId(commentId);
    
    // Save previous for rollback
    const previous = [...comments];
    const remaining = comments.filter(c => c.id !== commentId);
    setComments(remaining);

    try {
      const res = await fetch(`/api/groups/${encodeURIComponent(group.id || group.slug)}/comments?commentId=${encodeURIComponent(commentId)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, groupId: group.id })
      });

      const data = await res.json();
      if (data.success) {
        const finalComments = Array.isArray(data.comments) ? data.comments : remaining;
        setComments(finalComments);
        if (onUpdateGroup) {
          onUpdateGroup({
            ...group,
            comments: finalComments
          });
        }
      } else {
        setComments(previous);
        setCommentError(data.error || 'Failed to delete comment.');
        setTimeout(() => setCommentError(null), 3000);
      }
    } catch (err) {
      setComments(previous);
      setCommentError('Network error while deleting comment.');
      setTimeout(() => setCommentError(null), 3000);
    } finally {
      setDeletingCommentId(null);
    }
  };

  const previewMaskedEmail = email && email.includes('@') ? maskEmail(email) : 'arjxxxx12@gmail.com';

  return (
    <div className="space-y-8 pt-2">
      {/* 1. RATING & REVIEWS SECTION */}
      <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <h3 className="text-base font-extrabold text-neutral-900 dark:text-white flex items-center gap-2">
              <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
              <span>Community Rating & Reviews</span>
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Verified community satisfaction rating by active group members
            </p>
          </div>

          {/* Average Rating Score Display */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-2xl font-black text-neutral-900 dark:text-white leading-tight">
                {currentRating.toFixed(1)} <span className="text-xs font-normal text-neutral-400">/ 5.0</span>
              </div>
              <div className="text-[11px] text-neutral-500 font-medium">
                {ratingCount} {ratingCount === 1 ? 'rating' : 'ratings'}
              </div>
            </div>
            <div className="flex items-center gap-0.5 text-amber-400">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${
                    star <= Math.round(currentRating)
                      ? 'fill-amber-400 text-amber-500'
                      : 'text-neutral-200 dark:text-neutral-700'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Interactive Rating Box */}
        <div className="mt-5 p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <div className="text-xs font-bold text-amber-950 dark:text-amber-200">
              {userSubmittedRating ? 'Your Submitted Rating:' : 'Rate this community:'}
            </div>
            <div className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
              Click a star to give your feedback (1 to 5 stars)
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((star) => {
              const active = hoverRating ? star <= hoverRating : (userSubmittedRating ? star <= userSubmittedRating : false);
              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleRate(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  disabled={isSubmittingRating}
                  aria-label={`Rate ${star} star`}
                  className="p-1 rounded-lg hover:scale-125 transition-transform cursor-pointer focus:outline-none"
                >
                  <Star
                    className={`w-7 h-7 transition-colors ${
                      active
                        ? 'fill-amber-400 text-amber-500 drop-shadow-xs'
                        : 'text-neutral-300 dark:text-neutral-600 hover:text-amber-400'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {ratingNotice && (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{ratingNotice}</span>
          </div>
        )}
      </div>

      {/* 2. COMMENTS SECTION WITH 3 BOXES */}
      <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <h3 className="text-base font-extrabold text-neutral-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Community Comments ({comments.length})</span>
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Share your experience, ask questions, or review this community.
            </p>
          </div>
        </div>

        {/* 3-Box Comment Form */}
        <form onSubmit={handleSubmitComment} className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-700/60 space-y-4">
          <div className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center justify-between">
            <span>Leave a Comment / Review</span>
            <span className="text-[11px] font-normal text-neutral-500">3 simple fields</span>
          </div>

          {/* BOX 1: Comment Box */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
              1. Comment Box <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write your review, question, or comment about this group..."
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          {/* BOX 2 & BOX 3 in Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* BOX 2: Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-neutral-400" />
                <span>2. Name</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Arjun Kumar"
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            {/* BOX 3: Mail (Hidden / Masked) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-neutral-400" />
                  <span>3. Mail</span>
                  <span className="text-rose-500">*</span>
                </span>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-0.5">
                  <Lock className="w-3 h-3" />
                  Hidden / Masked
                </span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. yourname@gmail.com"
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
          </div>

          {/* Privacy Preview Badge */}
          <div className="p-2.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/50 dark:border-indigo-800/40 text-[11px] text-indigo-900 dark:text-indigo-300 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>Public Privacy: Your email will be displayed securely as:</span>
            </span>
            <code className="px-2 py-0.5 rounded bg-white dark:bg-neutral-900 border border-indigo-200 dark:border-indigo-800 font-mono font-bold text-[11px] text-indigo-700 dark:text-indigo-300">
              {previewMaskedEmail}
            </code>
          </div>

          {/* Live Prohibited Warning if zero-tolerance keywords typed */}
          {liveRestricted.isRestricted && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border-2 border-rose-500 text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                <strong>Warning:</strong> Contains prohibited restricted keyword ("{liveRestricted.matchedKeyword}"). Comment cannot be posted.
              </span>
            </div>
          )}

          {commentError && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{commentError}</span>
            </div>
          )}

          {commentSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Comment published successfully!</span>
            </div>
          )}

          <div className="flex items-center justify-end pt-1">
            <button
              type="submit"
              disabled={isSubmittingComment || !commentText.trim() || !name.trim() || !email.trim() || liveRestricted.isRestricted}
              className="px-5 py-2 text-xs font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              {isSubmittingComment ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Posting Comment...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Comment</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Render Existing Comments */}
        <div className="space-y-3 pt-2">
          {comments.length === 0 ? (
            <div className="text-center py-8 text-neutral-400 text-xs">
              No comments yet. Be the first to leave a review!
            </div>
          ) : (
            comments.map((c) => {
              const displayDate = c.createdAt
                ? new Date(c.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })
                : 'Recent';

              return (
                <div
                  key={c.id}
                  className="p-4 rounded-2xl bg-white dark:bg-neutral-800/30 border border-neutral-200/70 dark:border-neutral-800 hover:border-neutral-300 transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                        {(c.name || 'User').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-neutral-900 dark:text-white">
                            {c.name}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5 text-neutral-400" />
                            {c.maskedEmail || maskEmail(c.email)}
                          </span>
                        </div>
                        <div className="text-[10px] text-neutral-400">
                          {displayDate}
                        </div>
                      </div>
                    </div>

                    {/* Admin Delete Action */}
                    {isAdmin && (
                      confirmDeleteCommentId === c.id ? (
                        <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150">
                          <button
                            type="button"
                            disabled={deletingCommentId === c.id}
                            onClick={() => handleDeleteComment(c.id)}
                            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            {deletingCommentId === c.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                            <span>Confirm</span>
                          </button>
                          <button
                            type="button"
                            disabled={deletingCommentId === c.id}
                            onClick={() => setConfirmDeleteCommentId(null)}
                            className="px-2 py-1 rounded-lg bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-[11px] font-semibold cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={deletingCommentId === c.id}
                          onClick={() => setConfirmDeleteCommentId(c.id)}
                          title="Delete comment (Admin)"
                          className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 text-[11px] font-bold border border-rose-200 dark:border-rose-800 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {deletingCommentId === c.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                          <span>Delete</span>
                        </button>
                      )
                    )}
                  </div>

                  <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed pl-10">
                    {typeof c.comment === 'string' ? c.comment : (typeof c === 'string' ? c : '')}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
