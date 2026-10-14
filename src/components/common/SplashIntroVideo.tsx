import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

interface SplashIntroVideoProps {
  /** Optional trigger key (e.g. when user logs in) to replay the intro video */
  triggerKey?: string | number | boolean;
}

const MIN_REPLAY_COOLDOWN_MS = 5000;
const MIN_BACKGROUND_DURATION_MS = 5000;
const MAX_VIDEO_FALLBACK_MS = 4500;
const FADE_OUT_DURATION_MS = 400;

export const SplashIntroVideo: React.FC<SplashIntroVideoProps> = ({ triggerKey }) => {
  const [isRendered, setIsRendered] = useState<boolean>(true);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastPlayedAtRef = useRef<number>(Date.now());
  const backgroundedAtRef = useRef<number | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevTriggerKeyRef = useRef(triggerKey);

  const clearTimers = useCallback(() => {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    if (fadeTimerRef.current) {
      clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
  }, []);

  const restoreStatusBar = useCallback(() => {
    if (Capacitor.isNativePlatform()) {
      StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      StatusBar.show().catch(() => {});
    }
  }, []);

  const finishSplash = useCallback(() => {
    clearTimers();
    setIsFadingOut(true);
    restoreStatusBar();
    fadeTimerRef.current = setTimeout(() => {
      setIsRendered(false);
      setIsFadingOut(false);
    }, FADE_OUT_DURATION_MS);
  }, [clearTimers, restoreStatusBar]);

  const startSplash = useCallback(() => {
    clearTimers();
    lastPlayedAtRef.current = Date.now();
    setIsFadingOut(false);
    setIsRendered(true);

    if (Capacitor.isNativePlatform()) {
      StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
      StatusBar.hide().catch(() => {});
    }

    fallbackTimerRef.current = setTimeout(() => {
      finishSplash();
    }, MAX_VIDEO_FALLBACK_MS);
  }, [clearTimers, finishSplash]);

  // Play video whenever overlay is rendered
  useEffect(() => {
    if (!isRendered) return;

    if (Capacitor.isNativePlatform()) {
      StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
      StatusBar.hide().catch(() => {});
    }

    const video = videoRef.current;
    if (video) {
      video.muted = true;
      video.defaultMuted = true;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      try {
        video.currentTime = 0;
      } catch (_) {}

      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // If autoplay is blocked, fallback timer will still dismiss gracefully
        });
      }
    }

    if (!fallbackTimerRef.current) {
      fallbackTimerRef.current = setTimeout(() => {
        finishSplash();
      }, MAX_VIDEO_FALLBACK_MS);
    }

    return () => {
      clearTimers();
    };
  }, [isRendered, finishSplash, clearTimers]);

  // Replay when user logs in / authenticates (if not already played in the last 5 seconds)
  useEffect(() => {
    const prev = prevTriggerKeyRef.current;
    prevTriggerKeyRef.current = triggerKey;

    if (!prev && triggerKey) {
      const elapsed = Date.now() - lastPlayedAtRef.current;
      if (elapsed >= MIN_REPLAY_COOLDOWN_MS) {
        startSplash();
      }
    }
  }, [triggerKey, startSplash]);

  // Replay on app foreground entry after being closed/backgrounded on mobile
  useEffect(() => {
    const subPromise = CapApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) {
        backgroundedAtRef.current = Date.now();
        return;
      }

      if (backgroundedAtRef.current !== null) {
        const bgDuration = Date.now() - backgroundedAtRef.current;
        backgroundedAtRef.current = null;
        const sinceLastPlay = Date.now() - lastPlayedAtRef.current;

        if (bgDuration >= MIN_BACKGROUND_DURATION_MS && sinceLastPlay >= MIN_REPLAY_COOLDOWN_MS) {
          startSplash();
        }
      }
    });

    return () => {
      subPromise.then((h) => h.remove()).catch(() => {});
    };
  }, [startSplash]);

  const handleVideoReady = () => {
    if (Capacitor.isNativePlatform()) {
      SplashScreen.hide().catch(() => {});
    }
  };

  if (!isRendered) return null;

  return (
    <div
      data-testid="splash-intro-video-overlay"
      className={`fixed inset-0 z-[999999] bg-[#F5F2EA] flex items-center justify-center overflow-hidden select-none transition-opacity duration-400 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100dvh',
        minHeight: '-webkit-fill-available',
        margin: 0,
        padding: 0,
      }}
    >
      <video
        ref={videoRef}
        src="/Ad.mp4"
        autoPlay
        muted
        playsInline
        preload="auto"
        controls={false}
        disablePictureInPicture
        onLoadedData={handleVideoReady}
        onPlay={handleVideoReady}
        onEnded={finishSplash}
        onError={finishSplash}
        className="pointer-events-none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center center',
        }}
      />
    </div>
  );
};
