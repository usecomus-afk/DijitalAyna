import { LocationEvent } from '../types/phenotyping';

/**
 * Mobility Feature Extractor (Northwestern Purple Robot / Harvard Beiwe)
 * Saeb et al. (2015), Mohr et al. (2017), Onnela & Rauch (2016).
 */
export class LocationFeatureExtractor {
  private static readonly EARTH_RADIUS_METERS = 6371000;

  /**
   * Calculates Haversine great-circle distance between two coordinates in meters
   */
  static haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return LocationFeatureExtractor.EARTH_RADIUS_METERS * c;
  }

  /**
   * Computes Radius of Gyration ($r_g$) in meters:
   * $$r_g = \sqrt{\frac{1}{N} \sum_{i=1}^N (\mathbf{r}_i - \mathbf{r}_{center})^2}$$
   */
  static radiusOfGyration(locations: LocationEvent[]): number {
    if (locations.length <= 1) return 0;

    // Filter by acceptable accuracy (e.g. <= 100 meters)
    const valid = locations.filter((l) => l.accuracy <= 150);
    if (valid.length <= 1) return 0;

    // Center of mass (Mean latitude & longitude)
    const centerLat = valid.reduce((acc, l) => acc + l.latitude, 0) / valid.length;
    const centerLon = valid.reduce((acc, l) => acc + l.longitude, 0) / valid.length;

    let sumSquaredDistances = 0;
    for (const loc of valid) {
      const dist = LocationFeatureExtractor.haversineDistance(
        loc.latitude,
        loc.longitude,
        centerLat,
        centerLon
      );
      sumSquaredDistances += dist * dist;
    }

    const rg = Math.sqrt(sumSquaredDistances / valid.length);
    return Math.round(rg * 10) / 10;
  }

  /**
   * Spatial clustering using greedy radius-based stationary location discovery
   */
  static clusterLocations(
    locations: LocationEvent[],
    clusterRadiusMeters = 80
  ): Array<{ center: { latitude: number; longitude: number }; pointsCount: number; durationMs: number }> {
    const valid = locations.filter((l) => l.accuracy <= 150);
    if (valid.length === 0) return [];

    const clusters: Array<{
      center: { latitude: number; longitude: number };
      points: LocationEvent[];
      pointsCount: number;
      durationMs: number;
    }> = [];

    // Sort by timestamp
    const sorted = [...valid].sort((a, b) => a.timestamp - b.timestamp);

    for (let i = 0; i < sorted.length; i++) {
      const loc = sorted[i];
      let assignedCluster = false;

      for (const cluster of clusters) {
        const dist = LocationFeatureExtractor.haversineDistance(
          loc.latitude,
          loc.longitude,
          cluster.center.latitude,
          cluster.center.longitude
        );

        if (dist <= clusterRadiusMeters) {
          cluster.points.push(loc);
          cluster.pointsCount++;
          // Update centroid
          cluster.center.latitude =
            cluster.points.reduce((acc, p) => acc + p.latitude, 0) / cluster.points.length;
          cluster.center.longitude =
            cluster.points.reduce((acc, p) => acc + p.longitude, 0) / cluster.points.length;
          assignedCluster = true;
          break;
        }
      }

      if (!assignedCluster) {
        clusters.push({
          center: { latitude: loc.latitude, longitude: loc.longitude },
          points: [loc],
          pointsCount: 1,
          durationMs: 0,
        });
      }
    }

    // Estimate dwell duration per cluster
    for (const cluster of clusters) {
      if (cluster.points.length >= 2) {
        const sortedPts = cluster.points.sort((a, b) => a.timestamp - b.timestamp);
        cluster.durationMs = sortedPts[sortedPts.length - 1].timestamp - sortedPts[0].timestamp;
      } else {
        cluster.durationMs = 60000; // minimum 1 min dwell proxy
      }
    }

    return clusters;
  }

  /**
   * Computes Location Entropy ($H$) and Normalized Location Entropy ($H_{norm}$):
   * $$H = -\sum_{k=1}^K p_k \log p_k \quad \text{and} \quad H_{norm} = \frac{H}{\log K}$$
   */
  static locationEntropy(
    locations: LocationEvent[],
    clusterRadiusMeters = 80
  ): { entropy: number; normalizedEntropy: number; clusterCount: number } {
    const clusters = LocationFeatureExtractor.clusterLocations(locations, clusterRadiusMeters);
    const K = clusters.length;

    if (K <= 1) {
      return { entropy: 0, normalizedEntropy: 0, clusterCount: K };
    }

    const totalDwellTime = clusters.reduce((acc, c) => acc + Math.max(1, c.durationMs), 0);
    let entropy = 0;

    for (const c of clusters) {
      const p_k = Math.max(0.0001, c.durationMs / totalDwellTime);
      entropy -= p_k * Math.log(p_k);
    }

    const maxEntropy = Math.log(K);
    const normalizedEntropy = maxEntropy > 0 ? Math.min(1.0, entropy / maxEntropy) : 0;

    return {
      entropy: Math.round(entropy * 1000) / 1000,
      normalizedEntropy: Math.round(normalizedEntropy * 1000) / 1000,
      clusterCount: K,
    };
  }

  /**
   * Computes Homestay Ratio (Percentage of time spent at the primary/home cluster)
   * Saeb et al. (2015): High homestay ratio (>80%) significantly correlates with depressive episode.
   */
  static homestayRatio(
    locations: LocationEvent[],
    homeCluster?: { latitude: number; longitude: number },
    homeRadiusMeters = 100
  ): number {
    const valid = locations.filter((l) => l.accuracy <= 150);
    if (valid.length === 0) return 0.5;

    const clusters = LocationFeatureExtractor.clusterLocations(valid, homeRadiusMeters);
    if (clusters.length === 0) return 0.5;

    // If homeCluster is not explicitly specified, assume the cluster with highest dwell time / nocturnal presence is home
    let targetHome = homeCluster;
    if (!targetHome) {
      const sortedByDwell = [...clusters].sort((a, b) => b.durationMs - a.durationMs);
      targetHome = sortedByDwell[0].center;
    }

    let homePointsCount = 0;
    for (const loc of valid) {
      const dist = LocationFeatureExtractor.haversineDistance(
        loc.latitude,
        loc.longitude,
        targetHome.latitude,
        targetHome.longitude
      );
      if (dist <= homeRadiusMeters) {
        homePointsCount++;
      }
    }

    const ratio = homePointsCount / valid.length;
    return Math.round(ratio * 1000) / 1000;
  }

  /**
   * Calculates total cumulative path distance in meters
   */
  static totalDistanceTraveled(locations: LocationEvent[]): number {
    const valid = locations.filter((l) => l.accuracy <= 150);
    if (valid.length <= 1) return 0;

    const sorted = [...valid].sort((a, b) => a.timestamp - b.timestamp);
    let totalMeters = 0;

    for (let i = 1; i < sorted.length; i++) {
      const d = LocationFeatureExtractor.haversineDistance(
        sorted[i - 1].latitude,
        sorted[i - 1].longitude,
        sorted[i].latitude,
        sorted[i].longitude
      );
      // Filter out impossible GPS jumps (> 150 km/h = 42 m/s)
      const dtSec = Math.max(1, (sorted[i].timestamp - sorted[i - 1].timestamp) / 1000);
      if (d / dtSec < 45) {
        totalMeters += d;
      }
    }

    return Math.round(totalMeters);
  }
}
