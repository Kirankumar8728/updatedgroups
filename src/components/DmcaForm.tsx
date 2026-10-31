'use client';
import React, { useState } from 'react';
import { Mail, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export const DmcaForm: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [groupUrl, setGroupUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim() || !description.trim()) {
      setError('Please fill in your Name, Email address, and Takedown Details.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/dmca/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          groupUrl: groupUrl.trim(),
          imageUrl: imageUrl.trim(),
          description: description.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit DMCA request.');
      }

      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'An error occurred while submitting your DMCA notice.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="p-6 sm:p-8 rounded-2xl bg-emerald-950/40 border border-emerald-800/80 text-emerald-200 space-y-4 shadow-xl">
        <div className="w-12 h-12 rounded-full bg-emerald-900/80 text-emerald-400 flex items-center justify-center border border-emerald-700">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold text-white">DMCA Removal Request Submitted</h3>
        <p className="text-sm text-emerald-300/90 leading-relaxed">
          Thank you, <strong>{name}</strong>. Your copyright removal notice has been received and routed to our Copyright Agent. An automated confirmation notification has been dispatched to <strong>{email}</strong>.
        </p>
        <p className="text-xs text-emerald-400/80 font-mono">
          Resolution Timeline: Takedown review will be completed within 24 business hours.
        </p>
        <button
          type="button"
          onClick={() => {
            setIsSubmitted(false);
            setName('');
            setEmail('');
            setGroupUrl('');
            setImageUrl('');
            setDescription('');
          }}
          className="mt-2 px-4 py-2 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-white font-bold text-xs transition-colors cursor-pointer"
        >
          Submit Another Request
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 shadow-xl">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
        <Mail className="w-5 h-5 text-indigo-400 shrink-0" />
        <h2 className="text-xl font-bold text-slate-100">Submit DMCA Copyright Notice</h2>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-200 mb-1.5">
            Full Name / Copyright Owner <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe (or Rights Management Inc)"
            className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-200 mb-1.5">
            Email Address for Correspondence <span className="text-rose-400">*</span>
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="copyright@yourcompany.com"
            className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-200 mb-1.5">
            Infringing Group Listing URL <span className="text-slate-400 text-[10px] font-normal">(Optional)</span>
          </label>
          <input
            type="url"
            value={groupUrl}
            onChange={(e) => setGroupUrl(e.target.value)}
            placeholder="https://grouplinks.app/group/my-community"
            className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-200 mb-1.5">
            Infringing Image URL / Cloudflare CDN Link <span className="text-slate-400 text-[10px] font-normal">(Optional)</span>
          </label>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://cdn.grouplinks.app/icons/..."
            className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-200 mb-1.5">
          Detailed Description & Good Faith Declaration <span className="text-rose-400">*</span>
        </label>
        <textarea
          rows={4}
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the copyrighted asset, proof of ownership, and confirm under penalty of perjury that you are authorized to act..."
          className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/40 cursor-pointer disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Transmitting DMCA Request...</span>
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            <span>Send DMCA Removal Notice</span>
          </>
        )}
      </button>
    </form>
  );
};
