import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

interface SplashIntroVideoProps {
  triggerKey?: string | number | boolean;
}

const MAX_VIDEO_FALLBACK_MS = 4500;
const FADE_OUT_DURATION_MS = 400;

export const SplashIntroVideo: React.FC<SplashIntroVideoProps> = () => {
  const [isRendered, setIsRendered] = useState<boolean>(true);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Play video ONLY on cold app launch (when the app is closed and opened from scratch)
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
