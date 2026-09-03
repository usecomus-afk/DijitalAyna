import Foundation

/// Multimodal on-device digital phenotyping profile derived from 24-hour edge sensors
public struct DailyPhenotype: Identifiable, Codable, Equatable {
    public let id: UUID
    public let date: Date
    public let dateString: String // YYYY-MM-DD

    // 1. Physical Activity (CoreMotion / HealthKit)
    public var stepsCount: Int
    public var sedentaryMinutes: Double
    public var enmoAccelerationMg: Double // Euclidean Norm Minus One (mg)

    // 2. Sleep Architecture (HealthKit Sleep Stages)
    public var sleepOnsetLatencyMinutes: Double // SOL (Dalma süresi)
    public var totalSleepTimeMinutes: Double // TST (Toplam uyku)
    public var wakeAfterSleepOnsetMinutes: Double // WASO (Gece uyanıklığı)
    public var sleepEfficiencyPercent: Double // SE (%: TST / Süre)
    public var sleepRegularityIndex: Double // SRI (0-100 Sirkadiyen Tutarlılık)

    // 3. Geographic Mobility & Spatial Entropy (CoreLocation + DBSCAN)
    public var radiusOfGyrationKm: Double // Günlük hareketlilik yarıçapı
    public var homestayPercentage: Double // Evde geçirilen süre yüzdesi (0-100)
    public var uniqueLocationsCount: Int // Ziyaret edilen farklı anlamlı küme sayısı

    // 4. Keystroke Typing Dynamics (Edge Keystroke Telemetry)
    public var meanHoldTimeMs: Double // Tuşa basılı tutma süresi (Psikomotor hız / Sedasyon)
    public var meanFlightTimeMs: Double // İki tuş arası geçiş süresi
    public var backspaceRatePercent: Double // Silme tuşu kullanım oranı (Bilişsel dalgalanma)

    // 5. Vocal & Motor Active Tests
    public var acousticJitterPercent: Double? // Perde dalgalanması (%)
    public var acousticShimmerPercent: Double? // Genlik dalgalanması (%)
    public var tappingDysrhythmiaScore: Double? // İki parmak dokunma disritmi skoru (0-100)

    // 6. Ecological Momentary Assessment (EMA Active Surveys)
    public var moodScore: Double? // 1.0 - 10.0
    public var energyScore: Double? // 1.0 - 10.0
    public var stressScore: Double? // 1.0 - 10.0

    public init(
        id: UUID = UUID(),
        date: Date = Date(),
        stepsCount: Int = 6500,
        sedentaryMinutes: Double = 480.0,
        enmoAccelerationMg: Double = 28.5,
        sleepOnsetLatencyMinutes: Double = 22.0,
        totalSleepTimeMinutes: Double = 420.0,
        wakeAfterSleepOnsetMinutes: Double = 28.0,
        sleepEfficiencyPercent: Double = 86.5,
        sleepRegularityIndex: Double = 82.0,
        radiusOfGyrationKm: Double = 4.8,
        homestayPercentage: Double = 68.0,
        uniqueLocationsCount: Int = 3,
        meanHoldTimeMs: Double = 118.0,
        meanFlightTimeMs: Double = 185.0,
        backspaceRatePercent: Double = 4.2,
        acousticJitterPercent: Double? = 0.85,
        acousticShimmerPercent: Double? = 2.4,
        tappingDysrhythmiaScore: Double? = 12.0,
        moodScore: Double? = 7.0,
        energyScore: Double? = 6.5,
        stressScore: Double? = 4.0
    ) {
        self.id = id
        self.date = date
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.locale = Locale(identifier: "tr_TR")
        self.dateString = formatter.string(from: date)

        self.stepsCount = stepsCount
        self.sedentaryMinutes = sedentaryMinutes
        self.enmoAccelerationMg = enmoAccelerationMg

        self.sleepOnsetLatencyMinutes = sleepOnsetLatencyMinutes
        self.totalSleepTimeMinutes = totalSleepTimeMinutes
        self.wakeAfterSleepOnsetMinutes = wakeAfterSleepOnsetMinutes
        self.sleepEfficiencyPercent = sleepEfficiencyPercent
        self.sleepRegularityIndex = sleepRegularityIndex

        self.radiusOfGyrationKm = radiusOfGyrationKm
        self.homestayPercentage = homestayPercentage
        self.uniqueLocationsCount = uniqueLocationsCount

        self.meanHoldTimeMs = meanHoldTimeMs
        self.meanFlightTimeMs = meanFlightTimeMs
        self.backspaceRatePercent = backspaceRatePercent

        self.acousticJitterPercent = acousticJitterPercent
        self.acousticShimmerPercent = acousticShimmerPercent
        self.tappingDysrhythmiaScore = tappingDysrhythmiaScore

        self.moodScore = moodScore
        self.energyScore = energyScore
        self.stressScore = stressScore
    }
}
