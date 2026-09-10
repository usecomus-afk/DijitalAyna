import { db } from '../db';
import { sensorCapabilities } from './capabilities';

export interface VoiceAnalysisResult {
  pitchVariance: number | null; // Perde varyansı (Hz²)
  speechRate: number | null;    // Tahmini konuşma hızı (kelime/dk)
  pauseRatio: number | null;    // Duraksama oranı (%)
  avgVolume: number | null;     // Ortalama ses seviyesi (dB/RMS)
  isMonotone: boolean | null;   // Monotonluk tespiti
  durationSeconds: number;
  source: 'web-api' | 'missing';
}

class VoiceSensor {
  private isListening = false;

  public get active(): boolean {
    return this.isListening;
  }

  /**
   * Records a short voice sample (default 4 seconds) purely in-memory using Web Audio API,
   * calculates acoustic dynamics (pitch variance, cadence, pauses), and IMMEDIATELY discards
   * raw audio. Audio content is NEVER saved or uploaded anywhere.
   *
   * ZERO MOCK POLICY: If microphone access is denied or unavailable, returns source: 'missing'
   * and NEVER writes simulated or randomized data into the database.
   */
  async analyzeSpeechSample(durationSeconds = 4): Promise<VoiceAnalysisResult> {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return {
        pitchVariance: null,
        speechRate: null,
        pauseRatio: null,
        avgVolume: null,
        isMonotone: null,
        durationSeconds,
        source: 'missing',
      };
    }

    try {
      this.isListening = true;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const pitches: number[] = [];
      let activeFrames = 0;
      let silentFrames = 0;
      let totalRms = 0;

      const startTime = Date.now();
      const targetDurationMs = durationSeconds * 1000;

      await new Promise<void>((resolve) => {
        const intervalId = setInterval(() => {
          if (Date.now() - startTime >= targetDurationMs) {
            clearInterval(intervalId);
            resolve();
            return;
          }

          analyser.getByteFrequencyData(dataArray);

          let sum = 0;
          let maxBin = 0;
          let maxValue = 0;

          for (let i = 0; i < bufferLength; i++) {
            const val = dataArray[i];
            sum += val * val;
            if (val > maxValue) {
              maxValue = val;
              maxBin = i;
            }
          }

          const rms = Math.sqrt(sum / bufferLength);
          totalRms += rms;

          if (rms > 12) {
            activeFrames++;
            const freq = (maxBin * audioCtx.sampleRate) / (analyser.fftSize * 2);
            if (freq > 70 && freq < 600) {
              pitches.push(freq);
            }
          } else {
            silentFrames++;
          }
        }, 100);
      });

      stream.getTracks().forEach((track) => track.stop());
      await audioCtx.close();
      this.isListening = false;

      if (pitches.length === 0) {
        // No discernible vocal pitch detected (e.g. ambient silence)
        return {
          pitchVariance: null,
          speechRate: null,
          pauseRatio: 100,
          avgVolume: Math.round((totalRms / (activeFrames + silentFrames || 1)) * 10) / 10,
          isMonotone: null,
          durationSeconds,
          source: 'web-api',
        };
      }

      const pitchMean = pitches.reduce((a, b) => a + b, 0) / pitches.length;
      const pitchVariance =
        pitches.length > 1
          ? pitches.reduce((acc, p) => acc + Math.pow(p - pitchMean, 2), 0) / pitches.length
          : 0;

      const totalFrames = activeFrames + silentFrames || 1;
      const pauseRatio = Math.round((silentFrames / totalFrames) * 100);
      const speechRate = Math.round(110 + (activeFrames / totalFrames) * 50);
      const isMonotone = pitchVariance < 18.0;

      const result: VoiceAnalysisResult = {
        pitchVariance: Math.round(pitchVariance * 10) / 10,
        speechRate,
        pauseRatio,
        avgVolume: Math.round((totalRms / totalFrames) * 10) / 10,
        isMonotone,
        durationSeconds,
        source: 'web-api',
      };

      await db.logSensorEvent({
        type: 'voice',
        timestamp: Date.now(),
        payload: {
          voice_pitch_variance: result.pitchVariance!,
          voice_speech_rate: result.speechRate!,
          voice_pause_ratio: result.pauseRatio!,
        },
        provenance: {
          source: 'web-api',
          confidence: Math.min(1.0, activeFrames / 15),
          timestamp: Date.now(),
        },
      });

      return result;
    } catch (err) {
      console.warn('[VoiceSensor] Microphone recording failed or access denied:', err);
      this.isListening = false;
      return {
        pitchVariance: null,
        speechRate: null,
        pauseRatio: null,
        avgVolume: null,
        isMonotone: null,
        durationSeconds,
        source: 'missing',
      };
    }
  }
}

export const voiceSensor = new VoiceSensor();
