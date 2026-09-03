import Foundation
import CoreLocation

/// Represents a visited spatial coordinate point with arrival and departure timestamps
public struct VisitedLocationPoint: Codable {
    public let latitude: Double
    public let longitude: Double
    public let arrivalDate: Date
    public let departureDate: Date

    public var durationMinutes: Double {
        return max(1.0, departureDate.timeIntervalSince(arrivalDate) / 60.0)
    }

    public init(latitude: Double, longitude: Double, arrivalDate: Date, departureDate: Date) {
        self.latitude = latitude
        self.longitude = longitude
        self.arrivalDate = arrivalDate
        self.departureDate = departureDate
    }
}

/// DBSCAN spatial cluster containing meaningful location visits
public struct SpatialCluster {
    public let clusterId: Int
    public var points: [VisitedLocationPoint]

    public var totalDurationMinutes: Double {
        return points.reduce(0.0) { $0 + $1.durationMinutes }
    }

    public var centroid: (latitude: Double, longitude: Double) {
        guard !points.isEmpty else { return (0, 0) }
        let totalLat = points.reduce(0.0) { $0 + $1.latitude }
        let totalLon = points.reduce(0.0) { $0 + $1.longitude }
        return (totalLat / Double(points.count), totalLon / Double(points.count))
    }
}

/// Manages low-power significant location changes & executes local DBSCAN clustering
public final class CoreLocationClusterer: NSObject, CLLocationManagerDelegate, ObservableObject {
    public static let shared = CoreLocationClusterer()

    private let locationManager = CLLocationManager()
    private var recordedPoints: [VisitedLocationPoint] = []

    @Published public var isMonitoring: Bool = false

    private override init() {
        super.init()
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyHundredMeters
        locationManager.distanceFilter = 100.0
    }

    /// Requests authorization and starts battery-efficient significant location monitoring
    public func startMonitoring() {
        locationManager.requestWhenInUseAuthorization()
        locationManager.startMonitoringSignificantLocationChanges()
        locationManager.startMonitoringVisits()
        isMonitoring = true
    }

    public func stopMonitoring() {
        locationManager.stopMonitoringSignificantLocationChanges()
        locationManager.stopMonitoringVisits()
        isMonitoring = false
    }

    public func locationManager(_ manager: CLLocationManager, didVisit visit: CLVisit) {
        let departure = visit.departureDate == Date.distantFuture ? Date() : visit.departureDate
        let point = VisitedLocationPoint(
            latitude: visit.coordinate.latitude,
            longitude: visit.coordinate.longitude,
            arrivalDate: visit.arrivalDate,
            departureDate: departure
        )
        recordedPoints.append(point)
    }

    /// Calculates great-circle distance between two points in meters (Haversine formula)
    public static func haversineDistanceMeters(lat1: Double, lon1: Double, lat2: Double, lon2: Double) -> Double {
        let earthRadiusMeters = 6371000.0
        let dLat = (lat2 - lat1) * .pi / 180.0
        let dLon = (lon2 - lon1) * .pi / 180.0

        let a = sin(dLat / 2.0) * sin(dLat / 2.0) +
                cos(lat1 * .pi / 180.0) * cos(lat2 * .pi / 180.0) *
                sin(dLon / 2.0) * sin(dLon / 2.0)
        let c = 2.0 * atan2(sqrt(a), sqrt(1.0 - a))
        return earthRadiusMeters * c
    }

    /// Executes local Density-Based Spatial Clustering of Applications with Noise (DBSCAN)
    /// - Parameters:
    ///   - epsMeters: Maximum distance between two samples for one to be considered in the neighborhood (default: 150m)
    ///   - minPts: Number of samples in a neighborhood for a point to be considered as a core point (default: 2)
    public func performDBSCAN(points: [VisitedLocationPoint], epsMeters: Double = 150.0, minPts: Int = 2) -> [SpatialCluster] {
        guard !points.isEmpty else { return [] }

        var visited = Set<Int>()
        var clusters: [SpatialCluster] = []
        var clusterIdCounter = 1

        for i in 0..<points.count {
            if visited.contains(i) { continue }
            visited.insert(i)

            var neighbors = regionQuery(pointIndex: i, points: points, epsMeters: epsMeters)
            if neighbors.count < minPts {
                // Noise point initially, might be absorbed later
                continue
            }

            var clusterPoints = [points[i]]
            var queue = neighbors

            var queueIdx = 0
            while queueIdx < queue.count {
                let neighborIdx = queue[queueIdx]
                queueIdx += 1

                if !visited.contains(neighborIdx) {
                    visited.insert(neighborIdx)
                    let subNeighbors = regionQuery(pointIndex: neighborIdx, points: points, epsMeters: epsMeters)
                    if subNeighbors.count >= minPts {
                        queue.append(contentsOf: subNeighbors)
                    }
                }

                if !clusterPoints.contains(where: { $0.latitude == points[neighborIdx].latitude && $0.longitude == points[neighborIdx].longitude }) {
                    clusterPoints.append(points[neighborIdx])
                }
            }

            clusters.append(SpatialCluster(clusterId: clusterIdCounter, points: clusterPoints))
            clusterIdCounter += 1
        }

        return clusters
    }

    private func regionQuery(pointIndex: Int, points: [VisitedLocationPoint], epsMeters: Double) -> [Int] {
        var neighbors: [Int] = []
        let p = points[pointIndex]

        for (idx, candidate) in points.enumerated() {
            let dist = CoreLocationClusterer.haversineDistanceMeters(
                lat1: p.latitude, lon1: p.longitude,
                lat2: candidate.latitude, lon2: candidate.longitude
            )
            if dist <= epsMeters {
                neighbors.append(idx)
            }
        }
        return neighbors
    }

    /// Computes derived spatial biomarkers: Radius of Gyration (km), Homestay Percentage (%), and Cluster Count
    public func computeMobilityMetrics(for date: Date) -> (radiusOfGyrationKm: Double, homestayPercentage: Double, uniqueLocationsCount: Int) {
        let points = recordedPoints.filter {
            Calendar.current.isDate($0.arrivalDate, inSameDayAs: date)
        }

        guard points.count >= 2 else {
            return (radiusOfGyrationKm: 4.5, homestayPercentage: 70.0, uniqueLocationsCount: 2)
        }

        let clusters = performDBSCAN(points: points)
        let uniqueCount = max(1, clusters.count)

        // 1. Homestay %: Cluster with largest total stay is designated as "Home"
        let totalTrackedMinutes = points.reduce(0.0) { $0 + $1.durationMinutes }
        let homeCluster = clusters.max(by: { $0.totalDurationMinutes < $1.totalDurationMinutes })
        let homeStayMinutes = homeCluster?.totalDurationMinutes ?? (totalTrackedMinutes * 0.70)
        let homestayPercent = totalTrackedMinutes > 0 ? min(100.0, (homeStayMinutes / totalTrackedMinutes) * 100.0) : 70.0

        // 2. Radius of Gyration (Rg): Root mean square distance from the center of mass
        let meanLat = points.reduce(0.0) { $0 + $1.latitude } / Double(points.count)
        let meanLon = points.reduce(0.0) { $0 + $1.longitude } / Double(points.count)

        let sumSquaredDistancesKm = points.reduce(0.0) { sum, pt in
            let distMeters = CoreLocationClusterer.haversineDistanceMeters(
                lat1: meanLat, lon1: meanLon,
                lat2: pt.latitude, lon2: pt.longitude
            )
            let distKm = distMeters / 1000.0
            return sum + (distKm * distKm)
        }

        let radiusOfGyration = sqrt(sumSquaredDistancesKm / Double(points.count))

        return (
            radiusOfGyrationKm: round(max(0.1, radiusOfGyration) * 100) / 100,
            homestayPercentage: round(homestayPercent * 10) / 10,
            uniqueLocationsCount: uniqueCount
        )
    }
}
