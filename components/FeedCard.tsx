'use client';

import { useEffect, useRef, useState } from 'react';
import type { FeedItem } from '@/lib/types';
import { mediaThumbUrl, mediaUrl, formatDuration } from '@/lib/photos';
import { certLabel } from '@/lib/certs';
import { activityOf } from '@/lib/activities';

type Props = {
  item: FeedItem;
  index: number;
  active: boolean; // this card is the one on screen
  near: boolean; // this card is the one on screen or right next to it (video is loaded)
  muted: boolean;
  canInteract: boolean; // logged in + verified
  canDelete: boolean;
  isOwn: boolean;
  onVisible: (index: number) => void;
  onToggleMute: () => void;
  onLike: () => void;
  onReport: () => void;
  onDelete: () => void;
  onOpenSpot: () => void;
  onViewed: () => void;
};

const railButton =
  'flex h-11 w-11 items-center justify-center rounded-full bg-black/45 text-xl text-white backdrop-blur hover:bg-black/65 disabled:opacity-60';

export default function FeedCard({
  item,
  index,
  active,
  near,
  muted,
  canInteract,
  canDelete,
  isOwn,
  onVisible,
  onToggleMute,
  onLike,
  onReport,
  onDelete,
  onOpenSpot,
  onViewed,
}: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [burst, setBurst] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const isVideo = item.type === 'video';

  // tell the feed when this card is mostly visible
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting && e.intersectionRatio >= 0.6)) onVisible(index);
      },
      { threshold: [0.6] }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [index, onVisible]);

  // play only the video that is on screen
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (active && !paused) {
      v.play().catch(() => {
        // the browser may block playback, then a tap on the picture starts it
      });
    } else {
      v.pause();
    }
    if (!active) {
      v.currentTime = 0;
      setPaused(false);
      setProgress(0);
    }
  }, [active, paused, near]);

  // the "muted" attribute of <video> is unreliable in React, so set it directly
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted, near]);

  // count a view after the post was on screen for 2 seconds
  useEffect(() => {
    if (!active) return;
    const t = window.setTimeout(onViewed, 2000);
    return () => window.clearTimeout(t);
  }, [active, onViewed]);

  function handleDoubleClick() {
    if (!canInteract) return;
    if (!item.liked) onLike();
    setBurst(true);
    window.setTimeout(() => setBurst(false), 700);
  }

  const poster = mediaThumbUrl(item) ?? undefined;

  return (
    <section ref={rootRef} className="relative h-dvh w-full snap-start snap-always overflow-hidden bg-black">
      {/* ---------- the picture / video ---------- */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        onClick={() => isVideo && setPaused((p) => !p)}
        onDoubleClick={handleDoubleClick}
      >
        {isVideo ? (
          near ? (
            videoFailed ? (
              <p className="px-6 text-center text-sm text-gray-300">This video can not be played in your browser.</p>
            ) : (
              <video
                ref={videoRef}
                src={mediaUrl(item)}
                poster={poster}
                loop
                playsInline
                muted
                preload={active ? 'auto' : 'metadata'}
                className="h-full w-full object-contain"
                onTimeUpdate={(e) => {
                  const v = e.currentTarget;
                  if (v.duration) setProgress(v.currentTime / v.duration);
                }}
                onError={() => setVideoFailed(true)}
              />
            )
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            poster && <img src={poster} alt="" className="h-full w-full object-contain" />
          )
        ) : near ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediaUrl(item)}
            alt={item.caption ?? 'Dive photo'}
            draggable={false}
            className="h-full w-full object-contain"
          />
        ) : null}
      </div>

      {/* pause symbol */}
      {isVideo && paused && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-black/50 text-4xl text-white">▶</div>
        </div>
      )}

      {/* heart when double-clicking */}
      {burst && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-8xl text-red-500 drop-shadow-lg">
          ♥
        </div>
      )}

      {/* shade behind the text */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/75 to-transparent" />

      {/* ---------- right side buttons ---------- */}
      <div className="absolute bottom-24 right-3 z-10 flex flex-col items-center gap-3">
        <div className="flex flex-col items-center">
          <button
            onClick={onLike}
            disabled={!canInteract}
            title={canInteract ? (item.liked ? 'Remove like' : 'Like') : 'Log in and confirm your email to like'}
            aria-pressed={item.liked}
            className={`${railButton} ${item.liked ? '!bg-red-500' : ''}`}
          >
            {item.liked ? '♥' : '♡'}
          </button>
          <span className="mt-0.5 text-xs font-medium text-white drop-shadow">{item.like_count}</span>
        </div>

        <button onClick={onOpenSpot} title="Show this spot on the map" className={railButton}>
          📍
        </button>

        {isVideo && (
          <button onClick={onToggleMute} title={muted ? 'Sound on' : 'Sound off'} className={railButton}>
            {muted ? '🔇' : '🔊'}
          </button>
        )}

        {canInteract && !isOwn && (
          <button onClick={onReport} title="Report" className={`${railButton} text-base`}>
            ⚑
          </button>
        )}

        {canDelete && (
          <button onClick={onDelete} title="Delete" className={`${railButton} text-base`}>
            🗑
          </button>
        )}
      </div>

      {/* ---------- text at the bottom ---------- */}
      <div className="absolute bottom-6 left-4 right-20 z-10 text-white">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold drop-shadow">@{item.username ?? 'unknown'}</span>
          {item.cert_level && (
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] backdrop-blur">
              {certLabel(item.cert_level)}
            </span>
          )}
          {isVideo && item.duration_s ? (
            <span className="text-[11px] text-gray-200">{formatDuration(item.duration_s)}</span>
          ) : null}
        </div>
        {item.caption && <p className="mt-1 line-clamp-3 text-sm drop-shadow">{item.caption}</p>}
        {item.spot_name && (
          <button onClick={onOpenSpot} className="mt-1.5 text-sm font-medium text-sky-200 hover:underline">
            {activityOf(item.spot_activity).emoji} {item.spot_name}
          </button>
        )}
      </div>

      {/* ---------- video progress ---------- */}
      {isVideo && (
        <div className="absolute inset-x-0 bottom-0 z-10 h-1 bg-white/25">
          <div className="h-full bg-white" style={{ width: `${progress * 100}%` }} />
        </div>
      )}
    </section>
  );
}
