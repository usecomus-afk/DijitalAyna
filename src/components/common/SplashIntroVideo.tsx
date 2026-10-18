import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

interface SplashIntroVideoProps {
  triggerKey?: string | number | boolean;
}

const MIN_REPLAY_COOLDOWN_MS = 4500;
const MIN_BACKGROUND_DURATION_MS = 1000;
const MAX_VIDEO_FALLBACK_MS = 6500;
const PLAYBACK_FALLBACK_MS = 4500;
const FADE_OUT_DURATION_MS = 400;
const SPLASH_VIDEO_URL = '/Ad.mp4?v=3';

export const SplashIntroVideo: React.FC<SplashIntroVideoProps> = ({ triggerKey }) => {
  const [isRendered, setIsRendered] = useState<boolean>(true);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);
  const [playCount, setPlayCount] = useState<number>(0);
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
    setPlayCount((c) => c + 1);
  }, [clearTimers]);

  // Play video on launch and whenever re-triggered on reopen
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
        video.load();
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
  }, [isRendered, playCount, finishSplash, clearTimers]);

  // Replay when user logs in / authenticates (if not already played recently)
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

  // Replay on app foreground entry after being closed/backgrounded on mobile or web
  useEffect(() => {
    const handleBackground = () => {
      backgroundedAtRef.current = Date.now();
    };

    const handleForeground = () => {
      if (backgroundedAtRef.current !== null) {
        const bgDuration = Date.now() - backgroundedAtRef.current;
        backgroundedAtRef.current = null;
        const sinceLastPlay = Date.now() - lastPlayedAtRef.current;

        if (bgDuration >= MIN_BACKGROUND_DURATION_MS && sinceLastPlay >= MIN_REPLAY_COOLDOWN_MS) {
          startSplash();
        }
      }
    };

    const subPromise = CapApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) {
        handleBackground();
      } else {
        handleForeground();
      }
    });

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleBackground();
      } else if (document.visibilityState === 'visible') {
        handleForeground();
      }
    };

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        startSplash();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pageshow', onPageShow);

    return () => {
      subPromise.then((h) => h.remove()).catch(() => {});
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [startSplash]);

  const handleVideoReady = () => {
    if (Capacitor.isNativePlatform()) {
      SplashScreen.hide().catch(() => {});
    }
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
    }
    fallbackTimerRef.current = setTimeout(() => {
      finishSplash();
    }, PLAYBACK_FALLBACK_MS);
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
        key={playCount}
        ref={videoRef}
        src={SPLASH_VIDEO_URL}
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

