import { describe, it, expect } from 'vitest';
import { LocationFeatureExtractor } from '../LocationFeatureExtractor';
import { LocationEvent } from '../../types/phenotyping';

describe('LocationFeatureExtractor - Academic Mathematical Verification', () => {
  it('should compute accurate Haversine distance between two coordinates', () => {
    // Istanbul (Taksim: 41.0370, 28.9850) to (Kadikoy: 40.9901, 29.0254) ~6.2 km
    const dist = LocationFeatureExtractor.haversineDistance(41.037, 28.985, 40.9901, 29.0254);
    expect(dist).toBeGreaterThan(5500);
    expect(dist).toBeLessThan(7000);
  });

  it('should calculate Radius of Gyration ($r_g$) correctly', () => {
    const baseTime = 1700000000000;
    // Points around a central point (~100m away)
    const locations: LocationEvent[] = [
      { latitude: 41.0, longitude: 29.0, accuracy: 10, timestamp: baseTime },
      { latitude: 41.001, longitude: 29.0, accuracy: 15, timestamp: baseTime + 10000 },
      { latitude: 40.999, longitude: 29.0, accuracy: 12, timestamp: baseTime + 20000 },
      { latitude: 41.0, longitude: 29.001, accuracy: 14, timestamp: baseTime + 30000 },
      { latitude: 41.0, longitude: 28.999, accuracy: 11, timestamp: baseTime + 40000 },
    ];

    const rg = LocationFeatureExtractor.radiusOfGyration(locations);
    expect(rg).toBeGreaterThan(50);
    expect(rg).toBeLessThan(150);
  });

  it('should return 0 for Radius of Gyration when only single point exists', () => {
    const singleLoc: LocationEvent[] = [
      { latitude: 41.0, longitude: 29.0, accuracy: 10, timestamp: 1700000000000 },
    ];
    expect(LocationFeatureExtractor.radiusOfGyration(singleLoc)).toBe(0);
  });

  it('should compute Location Entropy and Normalized Entropy ($H, H_{norm}$)', () => {
    const baseTime = 1700000000000;
    // 3 distinct clusters: Home (41.0, 29.0), Work (41.05, 29.05), Cafe (41.08, 29.08)
    const locations: LocationEvent[] = [
      // Cluster 1 (Home - 3 points, dwell ~3 mins)
      { latitude: 41.0, longitude: 29.0, accuracy: 10, timestamp: baseTime },
      { latitude: 41.0001, longitude: 29.0001, accuracy: 10, timestamp: baseTime + 60000 },
      { latitude: 41.0, longitude: 29.0002, accuracy: 10, timestamp: baseTime + 180000 },

      // Cluster 2 (Work - 2 points, dwell ~2 mins)
      { latitude: 41.05, longitude: 29.05, accuracy: 10, timestamp: baseTime + 300000 },
      { latitude: 41.0501, longitude: 29.0501, accuracy: 10, timestamp: baseTime + 420000 },

      // Cluster 3 (Cafe - 2 points, dwell ~1 min)
      { latitude: 41.08, longitude: 29.08, accuracy: 10, timestamp: baseTime + 500000 },
      { latitude: 41.0801, longitude: 29.0801, accuracy: 10, timestamp: baseTime + 560000 },
    ];

    const result = LocationFeatureExtractor.locationEntropy(locations, 100);
    expect(result.clusterCount).toBe(3);
    expect(result.entropy).toBeGreaterThan(0.5);
    expect(result.normalizedEntropy).toBeGreaterThan(0.5);
    expect(result.normalizedEntropy).toBeLessThanOrEqual(1.0);
  });

  it('should compute Homestay Ratio correctly (> 0.7 when mostly at primary cluster)', () => {
    const baseTime = 1700000000000;
    const locations: LocationEvent[] = [
      // 8 points at home
      { latitude: 41.0, longitude: 29.0, accuracy: 10, timestamp: baseTime },
      { latitude: 41.0, longitude: 29.0, accuracy: 10, timestamp: baseTime + 10000 },
      { latitude: 41.0001, longitude: 29.0, accuracy: 10, timestamp: baseTime + 20000 },
      { latitude: 41.0, longitude: 29.0001, accuracy: 10, timestamp: baseTime + 30000 },
      { latitude: 41.0, longitude: 29.0, accuracy: 10, timestamp: baseTime + 40000 },
      { latitude: 41.0002, longitude: 29.0, accuracy: 10, timestamp: baseTime + 50000 },
      { latitude: 41.0, longitude: 29.0002, accuracy: 10, timestamp: baseTime + 60000 },
      { latitude: 41.0, longitude: 29.0, accuracy: 10, timestamp: baseTime + 70000 },
      // 2 points outside
      { latitude: 41.05, longitude: 29.05, accuracy: 10, timestamp: baseTime + 80000 },
      { latitude: 41.06, longitude: 29.06, accuracy: 10, timestamp: baseTime + 90000 },
    ];

    const homestay = LocationFeatureExtractor.homestayRatio(locations);
    expect(homestay).toBe(0.8);
  });
});
