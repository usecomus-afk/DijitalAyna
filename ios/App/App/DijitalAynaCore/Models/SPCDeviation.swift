import Foundation

public enum BiomarkerDomain: String, Codable, CaseIterable {
    case sleep = "Uyku Mimarisi"
    case mobility = "Coğrafi Hareketlilik"
    case motorTyping = "Yazım Dinamikleri"
    case vocal = "Akustik ve Ses"
    case affect = "Duygudurum & EMA"
}

public enum DeviationDirection: String, Codable {
    case elevated = "Yükselmiş"
    case depressed = "Düşmüş"
}

/// Represents a statistically significant deviation from the individual 14-day EWMA baseline
public struct SPCDeviation: Identifiable, Codable, Equatable {
    public let id: UUID
    public let metricKey: String
    public let metricTitle: String
    public let domain: BiomarkerDomain
    public let currentValue: Double
    public let baselineMean: Double
    public let baselineStd: Double
    public let ewmaSmoothedValue: Double
    public let ucl: Double // Upper Control Limit
    public let lcl: Double // Lower Control Limit
    public let zScore: Double
    public let consecutiveDaysCount: Int
    public let direction: DeviationDirection
    public let explainableInsight: String // User-facing causal explanation
    public let clinicalSignificance: String // Clinician-facing note
    public let timestamp: Date

    public init(
        id: UUID = UUID(),
        metricKey: String,
        metricTitle: String,
        domain: BiomarkerDomain,
        currentValue: Double,
        baselineMean: Double,
        baselineStd: Double,
        ewmaSmoothedValue: Double,
        ucl: Double,
        lcl: Double,
        zScore: Double,
        consecutiveDaysCount: Int,
        direction: DeviationDirection,
        explainableInsight: String,
        clinicalSignificance: String,
        timestamp: Date = Date()
    ) {
        self.id = id
        self.metricKey = metricKey
        self.metricTitle = metricTitle
        self.domain = domain
        self.currentValue = currentValue
        self.baselineMean = baselineMean
        self.baselineStd = baselineStd
        self.ewmaSmoothedValue = ewmaSmoothedValue
        self.ucl = ucl
        self.lcl = lcl
        self.zScore = zScore
        self.consecutiveDaysCount = consecutiveDaysCount
        self.direction = direction
        self.explainableInsight = explainableInsight
        self.clinicalSignificance = clinicalSignificance
        self.timestamp = timestamp
    }
}
