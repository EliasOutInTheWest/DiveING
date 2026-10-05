'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { useDirtyFlag } from '@/components/DirtyContext';
import { certLabel } from '@/lib/certs';
import type { RatingInfo } from '@/lib/types';
import Stars from '@/components/Stars';

type Author = { username: string; cert_level: string | null };

type Row = {
  id: string;
  user_id: string;
  rating: number;
  body: string | null;
  created_at: string;
  profiles: Author | Author[] | null;
};

type Review = Omit<Row, 'profiles'> & { username: string | null; cert: string | null };

type Props = {
  kind: 'spot' | 'school';
  targetId: string;
  info?: RatingInfo;
  onChanged: () => void; // tells the map to refresh the average rating
};

export default function ReviewsSection({ kind, targetId, info, onChanged }: Props) {
  const { user, isAdmin, isVerified, schoolIds } = useAuth();
  const column = kind === 'spot' ? 'spot_id' : 'school_id';

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const mine = reviews.find((r) => r.user_id === user?.id);
  const isOwnSchoolStaff = kind === 'school' && schoolIds.includes(targetId);
  const canReview = isVerified && !isOwnSchoolStaff;

  useDirtyFlag(
    'review',
    showForm && (rating !== (mine?.rating ?? 0) || body !== (mine?.body ?? ''))
  );

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('reviews')
      .select('id,user_id,rating,body,created_at,profiles(username,cert_level)')
      .eq(column, targetId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (err) {
      console.error('reviews error:', err.message);
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as unknown as Row[];
    setReviews(
      rows.map((r) => {
        const author = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
        return {
          id: r.id,
          user_id: r.user_id,
          rating: r.rating,
          body: r.body,
          created_at: r.created_at,
          username: author?.username ?? null,
          cert: author?.cert_level ?? null,
        };
      })
    );
    setLoading(false);
  }, [column, targetId]);

  useEffect(() => {
    load();
  }, [load]);

  function openForm() {
    setRating(mine?.rating ?? 0);
    setBody(mine?.body ?? '');
    setError('');
    setShowForm(true);
  }

  async function submit() {
    if (rating < 1) {
      setError('Please choose 1 to 5 stars.');
      return;
    }
    setSaving(true);
    setError('');
    const payload = { rating, body: body.trim() || null };
    const { error: err } = mine
      ? await supabase.from('reviews').update(payload).eq('id', mine.id)
      : await supabase.from('reviews').insert({ ...payload, [column]: targetId });
    setSaving(false);
    if (err) {
      console.error('review error:', err.message);
      setError(
        err.code === '42501'
          ? 'You are not allowed to review this.'
          : err.code === '23505'
            ? 'You already reviewed this.'
            : err.message
      );
      return;
    }
    setShowForm(false);
    await load();
    onChanged();
  }

  async function remove(r: Review) {
    if (!window.confirm('Delete this review?')) return;
    const { error: err } = await supabase.from('reviews').delete().eq('id', r.id);
    if (err) {
      setError(err.message);
      return;
    }
    await load();
    onChanged();
  }

  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Reviews</div>

      {info && info.count > 0 ? (
        <div className="mt-1 flex items-center gap-2 text-sm">
          <Stars value={info.avg} />
          <span className="font-medium">{info.avg.toFixed(1)}</span>
          <span className="text-gray-500">
            · {info.count} review{info.count === 1 ? '' : 's'}
          </span>
        </div>
      ) : (
        <p className="mt-1 text-sm text-gray-400">No reviews yet.</p>
      )}

      {canReview ? (
        showForm ? (
          <div className="mt-3 space-y-2 rounded bg-gray-50 p-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-700">Your rating</span>
              <Stars value={rating} onChange={setRating} size="text-2xl" />
            </div>
            <textarea
              rows={4}
              maxLength={1000}
              placeholder="What was it like? (optional)"
              className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <p className="text-xs text-gray-500">Be fair and helpful. Reviews are public.</p>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={submit}
                disabled={saving}
                className="rounded bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : mine ? 'Save changes' : 'Post review'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                disabled={saving}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-white disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={openForm}
            className="mt-3 rounded border border-sky-600 px-3 py-1.5 text-sm font-medium text-sky-700 hover:bg-sky-50"
          >
            {mine ? 'Edit your review' : '+ Write a review'}
          </button>
        )
      ) : (
        <p className="mt-2 text-xs text-gray-400">
          {!user
            ? 'Log in to write a review.'
            : isOwnSchoolStaff
              ? 'Staff cannot review their own school.'
              : 'Please confirm your email to write a review.'}
        </p>
      )}

      {!showForm && error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {loading ? (
        <p className="mt-3 text-sm text-gray-400">Loading…</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="border-t border-gray-100 pt-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <Stars value={r.rating} />{' '}
                  <span className="font-medium">{r.username ?? 'unknown'}</span>
                  {r.cert && <span className="text-xs text-gray-500"> · {certLabel(r.cert)}</span>}
                </div>
                <span className="shrink-0 text-xs text-gray-400">
                  {new Date(r.created_at).toLocaleDateString()}
                </span>
              </div>
              {r.body && <p className="mt-1 whitespace-pre-wrap text-gray-700">{r.body}</p>}
              {(r.user_id === user?.id || isAdmin) && (
                <button onClick={() => remove(r)} className="mt-1 text-xs text-red-600 hover:underline">
                  Delete
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
