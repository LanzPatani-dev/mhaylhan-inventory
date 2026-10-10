'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

type SignupRequest = {
  id: string;
  full_name: string;
  username: string;
  email: string;
  status: string;
  requested_at: string;
};

export default function StaffSignupApprovals({ active = true }: { active?: boolean }) {
  const [requests, setRequests] = useState<SignupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/staff-signup-requests');
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not load signup requests.');
      setRequests(result.requests || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load signup requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (active) void loadRequests(); }, [active, loadRequests]);

  if (!active) return null;

  const reviewRequest = async (request: SignupRequest, decision: 'approve' | 'reject') => {
    setBusyId(request.id);
    try {
      const response = await fetch('/api/admin/staff-signup-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: request.id, decision }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not review signup request.');
      toast.success(decision === 'approve' ? `Invitation sent to ${request.email}.` : 'Signup request rejected.');
      await loadRequests();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not review signup request.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground">Staff Signup Requests</h2>
          <p className="text-xs text-muted-foreground mt-1">Approve requests to email a secure account-setup invitation.</p>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-warning/10 text-warning text-xs font-bold">{requests.length} pending</span>
      </div>
      {loading ? (
        <p className="p-8 text-center text-sm text-muted-foreground">Loading requests…</p>
      ) : requests.length === 0 ? (
        <p className="p-8 text-center text-sm text-muted-foreground">No staff signup requests are waiting for approval.</p>
      ) : (
        <div className="divide-y divide-border">
          {requests.map((request) => (
            <div key={request.id} className="px-5 py-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-foreground">{request.full_name}</p>
                <p className="text-sm text-muted-foreground">{request.email} · @{request.username}</p>
                <p className="text-xs text-muted-foreground mt-1">Requested {new Date(request.requested_at).toLocaleString()}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busyId === request.id}
                  onClick={() => void reviewRequest(request, 'reject')}
                  className="px-3 py-2 rounded-lg border border-danger/30 text-danger text-sm font-semibold hover:bg-danger/5 disabled:opacity-50"
                >Reject</button>
                <button
                  type="button"
                  disabled={busyId === request.id}
                  onClick={() => void reviewRequest(request, 'approve')}
                  className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
                >{busyId === request.id ? 'Processing…' : 'Approve & Invite'}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
