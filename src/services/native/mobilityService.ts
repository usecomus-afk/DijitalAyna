import { Capacitor } from '@capacitor/core';
import { Geolocation, Position } from '@capacitor/geolocation';
import { db } from '../../db';

export interface LocationPoint {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface MobilityMetricsResult {
  radiusOfGyrationKm: number | null;
  homestayPercentage: number | null;
  significantLocationsCount: number;
  locationEntropy: number | null;
  source: 'native-sensor' | 'missing';
  error?: string;
}

export interface LocationPermissionResult {
  granted: boolean;
  error?: string;
}

// Earth radius in kilometers for Haversine distance
const EARTH_RADIUS_KM = 6371;

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

class MobilityService {
  private recentPoints: LocationPoint[] = [];
  private watchId: string | null = null;
  private isTracking = false;

  /**
   * Request GPS / Location permissions
   */
  async requestLocationPermissions(): Promise<LocationPermissionResult> {
    try {
      if (Capacitor.isNativePlatform()) {
        const perm = await Geolocation.requestPermissions({
          permissions: ['location', 'coarseLocation'],
        });
        const granted = perm.location === 'granted' || perm.coarseLocation === 'granted';
        return {
          granted,
          error: granted ? undefined : 'iOS Konum erişim izni kullanıcı tarafından reddedildi.',
        };
      }

      if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            () => resolve({ granted: true }),
            (err) => resolve({ granted: false, error: err.message || 'Konum izni reddedildi.' }),
            { enableHighAccuracy: false, timeout: 5000 }
          );
        });
      }

      return {
        granted: false,
        error: 'Tarayıcı veya platform konum servisini desteklemiyor.',
      };
    } catch (err: any) {
      console.warn('[MobilityService] requestLocationPermissions error:', err);
      return {
        granted: false,
        error: err?.message || 'Konum izni istenirken hata oluştu.',
      };
    }
  }

  /**
   * Sample current location position once
   */
  async sampleCurrentPosition(): Promise<LocationPoint | null> {
    try {
      let pos: Position | GeolocationPosition;
      if (Capacitor.isNativePlatform()) {
        pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: false,
          timeout: 10000,
        });
      } else if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 10000,
          });
        });
      } else {
        return null;
      }

      const point: LocationPoint = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: pos.timestamp || Date.now(),
      };

      this.addPoint(point);
      return point;
    } catch (err) {
      console.warn('[MobilityService] sampleCurrentPosition failed:', err);
      return null;
    }
  }

  /**
   * Add a location point into in-memory buffer (retaining last 24-48 hours)
   */
  private addPoint(point: LocationPoint): void {
    this.recentPoints.push(point);
    const twoDaysAgo = Date.now() - 48 * 60 * 60 * 1000;
    this.recentPoints = this.recentPoints.filter((p) => p.timestamp >= twoDaysAgo);
  }

  /**
   * Simplified DBSCAN clustering algorithm to identify stay clusters and calculate
   * Radius of Gyration (Rg) and Homestay Percentage
   */
  calculateMobilityMetrics(points: LocationPoint[] = this.recentPoints): MobilityMetricsResult {
    if (points.length < 2) {
      return {
        radiusOfGyrationKm: null,
        homestayPercentage: null,
        significantLocationsCount: points.length,
        locationEntropy: null,
        source: 'missing',
        error: 'Hareketlilik hesaplamak için en az 2 konum noktası gereklidir.',
      };
    }

    // 1. Calculate Center of Mass (Mean Lat & Lon)
    const totalLat = points.reduce((acc, p) => acc + p.latitude, 0);
    const totalLon = points.reduce((acc, p) => acc + p.longitude, 0);
    const centerLat = totalLat / points.length;
    const centerLon = totalLon / points.length;

    // 2. Radius of Gyration: Rg = sqrt( (1/N) * sum( dist(p_i, center)^2 ) )
    const sumSqDist = points.reduce((acc, p) => {
      const dist = haversineDistanceKm(p.latitude, p.longitude, centerLat, centerLon);
      return acc + dist * dist;
    }, 0);
    const radiusOfGyrationKm = Math.round(Math.sqrt(sumSqDist / points.length) * 100) / 100;

    // 3. Cluster identification (DBSCAN epsilon = 0.2km / 200m)
    const EPSILON_KM = 0.2;
    const clusters: LocationPoint[][] = [];
    const visited = new Set<number>();

    for (let i = 0; i < points.length; i++) {
      if (visited.has(i)) continue;
      visited.add(i);

      const neighbors: number[] = [];
      for (let j = 0; j < points.length; j++) {
        if (haversineDistanceKm(points[i].latitude, points[i].longitude, points[j].latitude, points[j].longitude) <= EPSILON_KM) {
          neighbors.push(j);
        }
      }

      if (neighbors.length >= 2) {
        const cluster: LocationPoint[] = [points[i]];
        for (const nIdx of neighbors) {
          if (!visited.has(nIdx)) {
            visited.add(nIdx);
            cluster.push(points[nIdx]);
          }
        }
        clusters.push(cluster);
      }
    }

    // 4. Homestay calculation: largest cluster duration / total points
    let maxClusterPoints = 0;
    for (const cluster of clusters) {
      if (cluster.length > maxClusterPoints) {
        maxClusterPoints = cluster.length;
      }
    }

    const homestayPercentage = points.length > 0
      ? Math.min(100, Math.round((maxClusterPoints / points.length) * 100))
      : null;

    // 5. Normalized Location Entropy
    let entropy = 0;
    if (clusters.length > 1) {
      for (const cluster of clusters) {
        const p = cluster.length / points.length;
        if (p > 0) {
          entropy -= p * Math.log2(p);
        }
      }
      entropy = Math.round(entropy * 100) / 100;
    }

    return {
      radiusOfGyrationKm,
      homestayPercentage,
      significantLocationsCount: Math.max(1, clusters.length),
      locationEntropy: entropy > 0 ? entropy : null,
      source: 'native-sensor',
    };
  }

  /**
   * Sync mobility metrics into Dexie dailyMetrics
   */
  async syncMobilityBiomarkers(): Promise<void> {
    await this.sampleCurrentPosition();
    const metrics = this.calculateMobilityMetrics();

    if (metrics.radiusOfGyrationKm !== null && metrics.source === 'native-sensor') {
      const today = new Date().toISOString().split('T')[0];

      await db.logSensorEvent({
        type: 'motion',
        timestamp: Date.now(),
        payload: {
          radius_of_gyration_km: metrics.radiusOfGyrationKm,
          homestay_percentage: metrics.homestayPercentage ?? 0,
          location_entropy: metrics.locationEntropy ?? 0,
        },
        provenance: {
          source: 'native-sensor',
          confidence: 1.0,
          timestamp: Date.now(),
        },
      });

      // Update mobility score in dailyMetrics if present
      const existing = await db.dailyMetrics
        .where('[metricKey+date]')
        .equals(['mobility_index', today])
        .first();

      const mobilityScore = Math.min(100, Math.round((metrics.radiusOfGyrationKm * 20) + (100 - (metrics.homestayPercentage ?? 50)) * 0.5));
      if (existing && existing.id) {
        await db.dailyMetrics.update(existing.id, {
          value: Math.max(existing.value, mobilityScore),
          sampleCount: (existing.sampleCount || 1) + 1,
        });
      } else {
        await db.dailyMetrics.add({
          date: today,
          metricKey: 'mobility_index',
          value: mobilityScore,
          sampleCount: 1,
        });
      }
    }
  }

  async startTracking(): Promise<void> {
    if (this.isTracking) return;
    this.isTracking = true;
    await this.sampleCurrentPosition();

    if (Capacitor.isNativePlatform()) {
      try {
        this.watchId = await Geolocation.watchPosition(
          { enableHighAccuracy: false, timeout: 30000 },
          (position) => {
            if (position) {
              this.addPoint({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: position.timestamp || Date.now(),
              });
            }
          }
        );
      } catch (e) {
        console.warn('[MobilityService] watchPosition error:', e);
      }
    }
  }

  async stopTracking(): Promise<void> {
    if (!this.isTracking) return;
    this.isTracking = false;
    if (this.watchId) {
      await Geolocation.clearWatch({ id: this.watchId });
      this.watchId = null;
    }
  }
}

export const mobilityService = new MobilityService();
