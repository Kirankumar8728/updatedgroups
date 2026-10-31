'use client';
import React, { useState, useEffect } from 'react';
import { 
  Megaphone, 
  Search, 
  CheckCircle2, 
  Clock, 
  ExternalLink, 
  MessageSquare, 
  Trash2, 
  RefreshCw, 
  Check, 
  X, 
  AlertCircle, 
  Zap, 
  Pin, 
  Calendar, 
  User, 
  CreditCard,
  Flame,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { ManualPromotionRequest, Group } from '../types';
import { getAdminAuthHeaders } from '../utils/adminAuth';

interface AdminPromotionsManagerProps {
  onGroupUpdated?: (updatedGroup: Group) => void;
}

export const AdminPromotionsManager: React.FC<AdminPromotionsManagerProps> = ({
  onGroupUpdated
}) => {
  const [promotions, setPromotions] = useState<ManualPromotionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'active' | 'rejected'>('all');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null);

  const fetchPromotions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/promotions', {
        headers: getAdminAuthHeaders(),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.promotions)) {
        setPromotions(data.promotions);
      }
    } catch (err) {
      console.error('Failed to load promotions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, []);

  const handleApproveAndActivate = async (promo: ManualPromotionRequest) => {
    setIsProcessingId(promo.id);
    setActionMessage(null);

    try {
      const res = await fetch('/api/admin/promotions', {
        method: 'POST',
        headers: getAdminAuthHeaders(),
        body: JSON.stringify({
          action: 'approve_activate',
          promoId: promo.id,
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to approve and activate promotion');
      }

      setActionMessage({
        type: 'success',
        text: `Successfully boosted "${promo.groupTitle}" for ${promo.promotedTimePeriod}! The group is now pinned #1.`
      });

      // Update local promotions state
      setPromotions(prev => prev.map(p => p.id === promo.id ? { ...p, status: 'active', stickyUntil: data.group?.stickyUntil } : p));

      if (onGroupUpdated && data.group) {
        onGroupUpdated(data.group);
      }
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || 'Error activating promotion'
      });
    } finally {
      setIsProcessingId(null);
    }
  };

  const handleUpdateStatus = async (promoId: string, status: 'pending' | 'approved' | 'active' | 'rejected') => {
    setIsProcessingId(promoId);
    try {
      const res = await fetch('/api/admin/promotions', {
        method: 'POST',
        headers: getAdminAuthHeaders(),
        body: JSON.stringify({
          action: 'update_status',
          promoId,
          status,
        })
      });
      const data = await res.json();
      if (data.success) {
        setPromotions(prev => prev.map(p => p.id === promoId ? { ...p, status } : p));
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setIsProcessingId(null);
    }
  };

  const handleDelete = async (promoId: string) => {
    if (!confirm('Are you sure you want to remove this promotion record?')) return;
    setIsProcessingId(promoId);
    try {
      const res = await fetch(`/api/admin/promotions?promoId=${promoId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setPromotions(prev => prev.filter(p => p.id !== promoId));
      }
    } catch (err) {
      console.error('Failed to delete promotion:', err);
    } finally {
      setIsProcessingId(null);
    }
  };

  const filteredPromotions = promotions.filter(p => {
    const matchesSearch = 
      (p.groupTitle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.personName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.utrNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.id || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = promotions.filter(p => p.status === 'pending').length;
  const activeCount = promotions.filter(p => p.status === 'active').length;

  return (
    <div className="space-y-6">
      
      {/* Top Banner / Summary */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-rose-500/15 border border-amber-500/30">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-neutral-900 dark:text-white">
                Promoted Groups & Manual Payments
              </h3>
              {pendingCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white animate-pulse">
                  {pendingCount} Pending Approval
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Manage user promotion requests via UPI (<strong>872808728@ybl</strong>) and WhatsApp (<strong>+918328208263</strong>).
            </p>
          </div>
        </div>

        <button
          onClick={fetchPromotions}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors shadow-xs cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {actionMessage && (
        <div className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between gap-2 animate-in fade-in ${
          actionMessage.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200' 
            : 'bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 text-rose-500" />}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="p-1 hover:opacity-75 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, group, UTR..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            All ({promotions.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
              statusFilter === 'active'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Active Pin ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter('rejected')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
              statusFilter === 'rejected'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Rejected
          </button>
        </div>
      </div>

      {/* Promotions List / Cards */}
      {isLoading ? (
        <div className="p-12 text-center text-neutral-400 space-y-2">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs">Loading manual promotions...</p>
        </div>
      ) : filteredPromotions.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto">
            <Megaphone className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-sm text-neutral-900 dark:text-white">
            No Promoted Group Requests Found
          </h4>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            When users promote their community via the Boost button, their payment submissions, chosen period, and name will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredPromotions.map((promo) => {
            const isProcessing = isProcessingId === promo.id;
            const formattedSubmittedTime = new Date(promo.submittedAt).toLocaleString('en-IN', {
              timeZone: 'Asia/Kolkata',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            });

            // Pre-filled WhatsApp message for Admin replying to customer
            const adminReplyText = encodeURIComponent(
              `Hi ${promo.personName}! Regarding your promotion of "${promo.groupTitle}" for ${promo.promotedTimePeriod} (₹${promo.amount}): `
            );
            const waChatUrl = promo.customerPhone 
              ? `https://wa.me/${promo.customerPhone.replace(/[^0-9]/g, '')}?text=${adminReplyText}`
              : `https://wa.me/918328208263?text=${adminReplyText}`;

            return (
              <div
                key={promo.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all text-neutral-900 dark:text-neutral-100 ${
                  promo.status === 'active'
                    ? 'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/20 dark:bg-emerald-950/20'
                    : promo.status === 'pending'
                    ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50/20 dark:bg-amber-950/20 shadow-sm'
                    : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  
                  {/* Left Column: Group & Person Info */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        promo.status === 'active'
                          ? 'bg-emerald-500 text-white'
                          : promo.status === 'pending'
                          ? 'bg-amber-500 text-white'
                          : 'bg-rose-500 text-white'
                      }`}>
                        {promo.status === 'active' ? '● Active Sticky Pin' : promo.status === 'pending' ? '⏳ Pending Verification' : 'Rejected'}
                      </span>

                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                        {promo.promotedTimePeriod} Duration
                      </span>

                      <span className="text-[11px] text-neutral-400 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        <span>Submitted: {formattedSubmittedTime}</span>
                      </span>
                    </div>

                    {/* Group Title and Link */}
                    <div>
                      <h4 className="text-base font-black text-neutral-900 dark:text-white flex items-center gap-2">
                        <span>{promo.groupTitle}</span>
                        {promo.groupUrl && (
                          <a
                            href={promo.groupUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 dark:text-indigo-400 hover:opacity-80 p-0.5"
                            title="Open group link"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </h4>
                    </div>

                    {/* Details Grid: Person Name, Amount, UTR, Contact */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
                      <div className="p-2 rounded-xl bg-neutral-100/80 dark:bg-neutral-800/80 border border-neutral-200/50 dark:border-neutral-700/50">
                        <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block font-medium">Person Name</span>
                        <strong className="text-neutral-900 dark:text-white truncate block">{promo.personName}</strong>
                      </div>

                      <div className="p-2 rounded-xl bg-neutral-100/80 dark:bg-neutral-800/80 border border-neutral-200/50 dark:border-neutral-700/50">
                        <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block font-medium">Payment Amount</span>
                        <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-sm block">₹{promo.amount}</strong>
                      </div>

                      <div className="p-2 rounded-xl bg-neutral-100/80 dark:bg-neutral-800/80 border border-neutral-200/50 dark:border-neutral-700/50">
                        <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block font-medium">UTR / Ref No.</span>
                        <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200 block truncate">
                          {promo.utrNumber || 'Not provided'}
                        </span>
                      </div>

                      <div className="p-2 rounded-xl bg-neutral-100/80 dark:bg-neutral-800/80 border border-neutral-200/50 dark:border-neutral-700/50">
                        <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block font-medium">Paid Via UPI</span>
                        <span className="font-mono text-neutral-800 dark:text-neutral-200 block truncate font-bold">
                          {promo.upiId}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Action Buttons */}
                  <div className="flex flex-row lg:flex-col items-center lg:items-end justify-end gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-neutral-200 dark:border-neutral-800">
                    
                    {/* Approve & Boost Pin Action */}
                    {promo.status !== 'active' ? (
                      <button
                        onClick={() => handleApproveAndActivate(promo)}
                        disabled={isProcessing}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all hover:scale-105 cursor-pointer disabled:opacity-50"
                      >
                        <Zap className="w-3.5 h-3.5 fill-white" />
                        <span>Approve & Boost Group</span>
                      </button>
                    ) : (
                      <div className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Active Top Sticky</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5">
                      {/* WhatsApp Chat Button */}
                      <a
                        href={waChatUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer"
                        title="Chat on WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                        <span>WhatsApp</span>
                      </a>

                      {/* Reject or Delete */}
                      {promo.status !== 'rejected' && (
                        <button
                          onClick={() => handleUpdateStatus(promo.id, 'rejected')}
                          disabled={isProcessing}
                          className="p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/50 text-neutral-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Reject"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(promo.id)}
                        disabled={isProcessing}
                        className="p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/50 text-neutral-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Delete Record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
