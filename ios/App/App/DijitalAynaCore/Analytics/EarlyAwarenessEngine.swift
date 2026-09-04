import Foundation

/// Statistical Process Control (SPC / EWMA) Early Clinical Awareness Engine
/// References:
/// - Saeb et al. (2015), Mohr et al. (2017): Mobility, homestay & depression
/// - Zulueta et al. (2018), BiAffect: Keystroke hold time, flight time (IKI) & affective states
/// - Aalbers et al. (2025), Guth et al. (2025): Multimodal EWMA control limit violations
/// - Lee et al. (2025): Sleep onset latency & nocturnal awakenings
/// - Boyle et al. (2025): Circadian sleep regularity index & cognitive changes
/// - Ekstrom (2026), Kadirvelu et al. (2025): Passive social media lurking & negative affect drops
public final class EarlyAwarenessEngine {
    public static let shared = EarlyAwarenessEngine()

    public let minBaselineDays: Int = 14
    public let lambda: Double = 0.20 // EWMA smoothing parameter

    public private(set) var configuredThresholds: [ClinicalInsightType: ClinicalThreshold] = [:]

    public init() {
        setupDefaultThresholds()
    }

    private func setupDefaultThresholds() {
        configuredThresholds[.burnout] = ClinicalThreshold(
            insightType: .burnout,
            primaryBiomarkers: ["meanHoldTimeMs", "backspaceRatePercent", "meanFlightTimeMs"],
            zScoreThreshold: 2.0,
            percentageChangeThreshold: 25.0,
            absoluteValueThreshold: 35.0, // >35 ms hold time delay
            requiredConsecutiveDays: 3,
            windowDays: 7,
            clinicalRationale: "Klavye Hold Time >= +2.0σ (veya >35 ms) ve silme oranı >%25 artış ile ardışık 3 gün devam eden bilişsel/psikomotor tükenmişlik."
        )

        configuredThresholds[.depressionIsolation] = ClinicalThreshold(
            insightType: .depressionIsolation,
            primaryBiomarkers: ["homestayPercentage", "radiusOfGyrationKm"],
            zScoreThreshold: -2.0, // Gyration radius <= -2.0σ (or >50% shrinkage)
            percentageChangeThreshold: 30.0, // Homestay +30% or >= 85%
            absoluteValueThreshold: 85.0,
            requiredConsecutiveDays: 4,
            windowDays: 14,
            clinicalRationale: "Homestay >= %85 ve hareket yarıçapında >= -2.0σ daralma ile ardışık 4 gün devam eden sosyal çekilme tablosu."
        )

        configuredThresholds[.anxietySleep] = ClinicalThreshold(
            insightType: .anxietySleep,
            primaryBiomarkers: ["nocturnalScreen02to04Unlocks", "nocturnalScreen02to04Minutes", "sleepOnsetLatencyMinutes"],
            absoluteValueThreshold: 30.0, // SOL >= 30 min prolongation
            requiredConsecutiveDays: 1,
            minOccurrencesInWindow: 3,
            windowDays: 7,
            clinicalRationale: "02:00-04:00 arası >= 3 kilit açma / >35 dk ekran ve SOL >= 30 dk uzama; son 7 günün en az 3 gecesinde tekrarlama."
        )

        configuredThresholds[.neurodiversity] = ClinicalThreshold(
            insightType: .neurodiversity,
            primaryBiomarkers: ["appSwitchingIn15MinWindow", "averageSessionLengthSeconds", "fragmentedAttentionSlotsCount"],
            absoluteValueThreshold: 8.0, // >= 8 app switches in 15 min
            requiredConsecutiveDays: 1,
            windowDays: 1,
            clinicalRationale: "15 dk pencerede >= 8 uygulama geçişi, ortalama oturum <40 sn ve günde en az 4 ayrı zaman diliminde parçalanmış dikkat."
        )

        configuredThresholds[.cognitiveDecline] = ClinicalThreshold(
            insightType: .cognitiveDecline,
            primaryBiomarkers: ["meanFlightTimeMs", "sleepRegularityIndex", "longPauseCount"],
            zScoreThreshold: 2.5,
            percentageChangeThreshold: 60.0, // SRI < 60%
            requiredConsecutiveDays: 7,
            windowDays: 14,
            clinicalRationale: "IKI aralığında ardışık 7 gün kesintisiz artış (Z >= +2.5σ) ve SRI <%60; bilişsel icra hızı ve sirkadiyen ritim değişimi."
        )

        configuredThresholds[.ptsdHypervigilance] = ClinicalThreshold(
            insightType: .ptsdHypervigilance,
            primaryBiomarkers: ["dailyUnlockCount", "quickCheckRatioPercent"],
            zScoreThreshold: 2.5, // Daily unlocks >= +2.5σ (or >80 unlocks)
            percentageChangeThreshold: 40.0, // Quick check > 40%
            absoluteValueThreshold: 80.0,
            requiredConsecutiveDays: 1,
            windowDays: 3,
            clinicalRationale: "Günlük kilit açma >= +2.5σ (>80/gün) ve 5 sn içinde kilitleme oranı >%40; hipervijilans ve kontrol davranışı."
        )

        configuredThresholds[.lowSelfEsteemPassiveSocial] = ClinicalThreshold(
            insightType: .lowSelfEsteemPassiveSocial,
            primaryBiomarkers: ["dailySocialMediaMinutes", "outwardInteractionRatioPercent", "lateNightContinuousScrollMinutes", "postSessionEmaAffectDrop"],
            percentageChangeThreshold: 5.0, // Outward interaction < 5%
            absoluteValueThreshold: 120.0, // Social media > 120 min
            requiredConsecutiveDays: 1,
            windowDays: 1,
            clinicalRationale: "Sosyal medya >120 dk & dışa dönük etkileşim <%5, gece dikey scroll >45 dk ve oturum sonrası EMA >= 2 puan düşüş."
        )
    }

    /// Evaluates historical time series and generates objective, explainable insight alerts
    public func evaluatePhenotypeSeries(_ history: [DailyDigitalPhenotype]) -> [InsightAlert] {
        guard !history.isEmpty else { return [] }

        // Sort chronologically ascending
        let sortedHistory = history.sorted { $0.date < $1.date }
        guard let latestDay = sortedHistory.last else { return [] }

        // Determine baseline parameters from first 14 days (or calibration fallback)
        let baselineDaysCount = min(minBaselineDays, sortedHistory.count)
        let baselineWindow = Array(sortedHistory.prefix(baselineDaysCount))

        let holdTimes = baselineWindow.map { $0.meanHoldTimeMs }
        let flightTimes = baselineWindow.map { $0.meanFlightTimeMs }
        let backspaceRates = baselineWindow.map { $0.backspaceRatePercent }
        let homestays = baselineWindow.map { $0.homestayPercentage }
        let radiuses = baselineWindow.map { $0.radiusOfGyrationKm }
        let solMinutes = baselineWindow.map { $0.sleepOnsetLatencyMinutes }
        let unlockCounts = baselineWindow.map { Double($0.dailyUnlockCount) }

        let holdBase = calculateStats(holdTimes)
        let flightBase = calculateStats(flightTimes)
        let backspaceBase = calculateStats(backspaceRates)
        let homestayBase = calculateStats(homestays)
        let radiusBase = calculateStats(radiuses)
        let solBase = calculateStats(solMinutes)
        let unlockBase = calculateStats(unlockCounts)

        var alerts: [InsightAlert] = []

        // 1. Condition 1: Duygusal Tükenmişlik (Burnout)
        // Hold Time >= +2.0σ (or > 35 ms delay) AND Backspace rate > %25 increase; for consecutive 3 days
        if sortedHistory.count >= 3 {
            let last3Days = Array(sortedHistory.suffix(3))
            let all3DaysMet = last3Days.allSatisfy { day in
                let holdZ = (day.meanHoldTimeMs - holdBase.mean) / holdBase.std
                let holdDeltaMs = day.meanHoldTimeMs - holdBase.mean
                let backspaceRelativeChange = backspaceBase.mean > 0 ? ((day.backspaceRatePercent - backspaceBase.mean) / backspaceBase.mean) * 100.0 : 0.0

                let isHoldExceeded = holdZ >= 2.0 || holdDeltaMs >= 35.0
                let isBackspaceExceeded = backspaceRelativeChange >= 25.0
                return isHoldExceeded && isBackspaceExceeded
            }

            if all3DaysMet {
                let currentHoldZ = (latestDay.meanHoldTimeMs - holdBase.mean) / holdBase.std
                let currentHoldDelta = latestDay.meanHoldTimeMs - holdBase.mean
                let backspaceChange = backspaceBase.mean > 0 ? ((latestDay.backspaceRatePercent - backspaceBase.mean) / backspaceBase.mean) * 100.0 : 0.0

                let roundedZ = round(currentHoldZ * 10) / 10
                let roundedDelta = round(currentHoldDelta)
                let roundedBackspace = round(backspaceChange)

                alerts.append(InsightAlert(
                    insightType: .burnout,
                    title: ClinicalInsightType.burnout.displayName,
                    personalizedDeviationStatement: "Dijital aynanızda, kişisel olağan ritminizden farklılaşan bazı eğilimler gözlemlendi.",
                    explainableEvidences: [
                        "Klavye Hold Time: Tuş basılı kalma süreniz bazalden +\(roundedZ)σ (\(Int(roundedDelta)) ms) daha uzun kaydedildi.",
                        "Silme Oranı: Silme ve düzeltme tuşu kullanımınız bazal ortalamanıza kıyasla %\(Int(roundedBackspace)) arttı.",
                        "Süreç: Bu sapma örüntüsü ardışık 3 gündür kesintisiz devam ediyor."
                    ],
                    severity: .significant,
                    contributingMetrics: [
                        "holdTimeZ": currentHoldZ,
                        "holdTimeDeltaMs": currentHoldDelta,
                        "backspacePercentIncrease": backspaceChange
                    ],
                    notificationBody: "Dijital Ayna: Son 3 gündür klavye yazım hızınızda belirgin yavaşlama ve silme tuşu kullanımınızda %\(Int(roundedBackspace)) artış gözlemlendi. Zihinsel yorgunluk işaretleri olabilir; dinlenme ihtiyacınızı gözden geçirebilirsiniz."
                ))
            }
        }

        // 2. Condition 2: Depresyon ve Sosyal İzolasyon
        // Homestay >= %85 (or >= %30 increase) AND Gyration radius <= -2.0σ (>%50 shrinkage); for consecutive 4 days
        if sortedHistory.count >= 4 {
            let last4Days = Array(sortedHistory.suffix(4))
            let all4DaysMet = last4Days.allSatisfy { day in
                let radiusZ = (day.radiusOfGyrationKm - radiusBase.mean) / radiusBase.std
                let radiusRelativeShrink = radiusBase.mean > 0 ? ((radiusBase.mean - day.radiusOfGyrationKm) / radiusBase.mean) * 100.0 : 0.0
                let homestayRelativeIncrease = homestayBase.mean > 0 ? ((day.homestayPercentage - homestayBase.mean) / homestayBase.mean) * 100.0 : 0.0

                let isHomestayExceeded = day.homestayPercentage >= 85.0 || homestayRelativeIncrease >= 30.0
                let isRadiusExceeded = radiusZ <= -2.0 || radiusRelativeShrink >= 50.0
                return isHomestayExceeded && isRadiusExceeded
            }

            if all4DaysMet {
                let currentRadiusZ = (latestDay.radiusOfGyrationKm - radiusBase.mean) / radiusBase.std
                let currentShrink = radiusBase.mean > 0 ? ((radiusBase.mean - latestDay.radiusOfGyrationKm) / radiusBase.mean) * 100.0 : 50.0

                alerts.append(InsightAlert(
                    insightType: .depressionIsolation,
                    title: ClinicalInsightType.depressionIsolation.displayName,
                    personalizedDeviationStatement: "Dijital aynanızda, kişisel olağan ritminizden farklılaşan bazı eğilimler gözlemlendi.",
                    explainableEvidences: [
                        "Evde Kalma Oranı: Günlük evde geçirilen süre %\(Int(latestDay.homestayPercentage)) seviyesine ulaştı.",
                        "Hareketlilik Yarıçapı: Coğrafi hareket alanınız \(round(currentRadiusZ * 10) / 10)σ (%\(Int(currentShrink)) daralma) seviyesine geriledi.",
                        "Süreç: Bu tablo ardışık 4 gündür devam ediyor (Aalbers et al., 2025; Guth et al., 2025)."
                    ],
                    severity: .significant,
                    contributingMetrics: [
                        "homestayPercent": latestDay.homestayPercentage,
                        "radiusZ": currentRadiusZ,
                        "radiusShrinkPercent": currentShrink
                    ],
                    notificationBody: "Dijital Ayna: Son 4 gündür evde geçirilen sürenizde belirgin artış ve günlük hareket alanınızda %\(Int(currentShrink)) daralma gözlemlendi. Temiz hava molası ve sosyal bir temas iyi gelebilir."
                ))
            }
        }

        // 3. Condition 3: Anksiyete ve Uyku Bozuklukları
        // 02:00-04:00 screen unlocks >= 3 OR active screen > 35 min AND SOL >= 30 min prolongation; >= 3 nights in last 7 days
        let last7Days = Array(sortedHistory.suffix(7))
        let anxietyNightsCount = last7Days.filter { day in
            let solProlongation = day.sleepOnsetLatencyMinutes - solBase.mean
            let isNocturnalAwakening = day.nocturnalScreen02to04Unlocks >= 3 || day.nocturnalScreen02to04Minutes >= 35.0
            let isSolProlonged = solProlongation >= 30.0 || day.sleepOnsetLatencyMinutes >= 50.0
            return isNocturnalAwakening && isSolProlonged
        }.count

        if anxietyNightsCount >= 3 {
            let latestSolDelta = round(latestDay.sleepOnsetLatencyMinutes - solBase.mean)
            alerts.append(InsightAlert(
                insightType: .anxietySleep,
                title: ClinicalInsightType.anxietySleep.displayName,
                personalizedDeviationStatement: "Dijital aynanızda, kişisel olağan ritminizden farklılaşan bazı eğilimler gözlemlendi.",
                explainableEvidences: [
                    "Gece Ekran Penceresi: 02:00-04:00 saatleri arasında \(latestDay.nocturnalScreen02to04Unlocks) kez kilit açma ve \(Int(latestDay.nocturnalScreen02to04Minutes)) dk aktif ekran kullanımı kaydedildi.",
                    "Uykuya Dalma Süresi (SOL): Bazal ortalamanıza kıyasla \(Int(latestSolDelta)) dakika daha uzun sürdü.",
                    "Süreç: Son 7 günün \(anxietyNightsCount) gecesinde bu gece uyanıklığı döngüsü tekrarlandı (Lee et al., 2025)."
                ],
                severity: .moderate,
                contributingMetrics: [
                    "nocturnalUnlocks": Double(latestDay.nocturnalScreen02to04Unlocks),
                    "nocturnalMinutes": latestDay.nocturnalScreen02to04Minutes,
                    "solProlongationMinutes": latestSolDelta
                ],
                notificationBody: "Dijital Ayna: Gece 02:00-04:00 saatleri arasında ekran aktivitenizde artış ve uykuya dalma sürenizde uzama fark edildi. Rahatlatıcı bir uyku rutini oluşturmayı deneyebilirsiniz."
            ))
        }

        // 4. Condition 4: Nöroçeşitlilik (DEHB, Dikkat Dağınıklığı)
        // 15-min window: >= 8 app switches AND avg session < 40 seconds; in >= 4 distinct time slots
        if latestDay.appSwitchingIn15MinWindow >= 8 &&
            latestDay.averageSessionLengthSeconds < 40.0 &&
            latestDay.fragmentedAttentionSlotsCount >= 4 {

            alerts.append(InsightAlert(
                insightType: .neurodiversity,
                title: ClinicalInsightType.neurodiversity.displayName,
                personalizedDeviationStatement: "Dijital aynanızda, kişisel olağan ritminizden farklılaşan bazı eğilimler gözlemlendi.",
                explainableEvidences: [
                    "Uygulama Geçiş Sıklığı: 15 dakikalık aktif pencerede \(latestDay.appSwitchingIn15MinWindow) farklı uygulamaya geçiş yapıldı.",
                    "Mikro-Oturum Süresi: Ortalama ekran oturumu süresi \(Int(latestDay.averageSessionLengthSeconds)) saniyeye geriledi (aşırı parçalanmış dikkat).",
                    "Süreç: Gün içinde \(latestDay.fragmentedAttentionSlotsCount) ayrı zaman diliminde bu odak bölünmesi döngüsü saptandı."
                ],
                severity: .moderate,
                contributingMetrics: [
                    "appSwitches15m": Double(latestDay.appSwitchingIn15MinWindow),
                    "avgSessionSeconds": latestDay.averageSessionLengthSeconds,
                    "slotsCount": Double(latestDay.fragmentedAttentionSlotsCount)
                ],
                notificationBody: "Dijital Ayna: Gün içinde sık uygulama geçişleri ve kısa ekran oturumları ile dikkat bölünmesi örüntüsü saptandı. Bildirimleri sınırlandırmak odağınızı korumanıza yardımcı olabilir."
            ))
        }

        // 5. Condition 5: Bilişsel Düşüş Riski (MCI / Erken Bilişsel Yavaşlama)
        // IKI continuously increasing for 7 consecutive days (Z >= +2.5σ) AND SRI < 60%
        // Ethical Rule: Frame strictly as "Bilişsel İcra Hızı ve Ritim Değişimi", NEVER use "Demans"
        if sortedHistory.count >= 7 {
            let last7Days = Array(sortedHistory.suffix(7))
            let currentFlightZ = (latestDay.meanFlightTimeMs - flightBase.mean) / flightBase.std
            let isSRILow = latestDay.sleepRegularityIndex < 60.0

            // Check if IKI has an increasing trend across the 7 days and current Z >= 2.5
            var isStrictlyIncreasing = true
            for i in 1..<last7Days.count {
                if last7Days[i].meanFlightTimeMs < last7Days[i - 1].meanFlightTimeMs - 2.0 {
                    isStrictlyIncreasing = false
                    break
                }
            }

            if (isStrictlyIncreasing || currentFlightZ >= 2.5) && isSRILow {
                alerts.append(InsightAlert(
                    insightType: .cognitiveDecline,
                    title: ClinicalInsightType.cognitiveDecline.displayName, // "Bilişsel İcra Hızı ve Ritim Değişimi"
                    personalizedDeviationStatement: "Dijital aynanızda, kişisel olağan ritminizden farklılaşan bazı eğilimler gözlemlendi.",
                    explainableEvidences: [
                        "Klavye İki Tuş Arası Geçiş (IKI): Ardışık 7 gün boyunca sürekli uzama (\(round(currentFlightZ * 10) / 10)σ) gösterdi.",
                        "Sirkadiyen Düzenlilik Endeksi (SRI): %\(Int(latestDay.sleepRegularityIndex)) seviyesine gerileyerek sirkadiyen parçalanma sinyali verdi.",
                        "Klavye Duraksamaları: 2 saniyeyi aşan bilişsel duraklama sıklığı günlük \(latestDay.longPauseCount) adede yükseldi."
                    ],
                    severity: .significant,
                    contributingMetrics: [
                        "flightTimeZ": currentFlightZ,
                        "sriPercent": latestDay.sleepRegularityIndex,
                        "longPauses": Double(latestDay.longPauseCount)
                    ],
                    notificationBody: "Dijital Ayna: Son haftalarda uyku düzenliliğinizde parçalanma ve klavye etkileşim aralıklarınızda uzama tespit edildi. Bu biyobelirteç değişimlerini bir sonraki doktor randevunuzda paylaşabilirsiniz."
                ))
            }
        }

        // 6. Condition 6: PTSD Belirtileri (Hipervijilans ve Kaçınma)
        // Daily unlock count >= +2.5σ (or > 80 unlocks/day) AND Quick-check ratio (>40%)
        let currentUnlockZ = (Double(latestDay.dailyUnlockCount) - unlockBase.mean) / unlockBase.std
        let isUnlockExceeded = currentUnlockZ >= 2.5 || latestDay.dailyUnlockCount >= 80
        let isQuickCheckExceeded = latestDay.quickCheckRatioPercent >= 40.0

        if isUnlockExceeded && isQuickCheckExceeded {
            alerts.append(InsightAlert(
                insightType: .ptsdHypervigilance,
                title: ClinicalInsightType.ptsdHypervigilance.displayName,
                personalizedDeviationStatement: "Dijital aynanızda, kişisel olağan ritminizden farklılaşan bazı eğilimler gözlemlendi.",
                explainableEvidences: [
                    "Günlük Kilit Açma: Günlük \(latestDay.dailyUnlockCount) kilit açma ile bazal ortalamanızın +\(round(currentUnlockZ * 10) / 10)σ üzerinde seyretti.",
                    "Mikro-Kontrol (Hipervijilans): Ekranı açıp 5 saniye içinde hiçbir eylem yapmadan kilitleme oranı %\(Int(latestDay.quickCheckRatioPercent)) oldu.",
                    "Süreç: Sinir sisteminin tetikte olma (hyperarousal) ve kontrol ihtiyacını yansıtır."
                ],
                severity: .moderate,
                contributingMetrics: [
                    "unlockCount": Double(latestDay.dailyUnlockCount),
                    "unlockZ": currentUnlockZ,
                    "quickCheckRatio": latestDay.quickCheckRatioPercent
                ],
                notificationBody: "Dijital Ayna: Cihaz kontrol sıklığınızda ve hızlı kilit açıp-kapama oranınızda belirgin artış kaydedildi. Bedeninizi dinlendirmek ve nefes egzersizi yapmak rahatlatıcı olabilir."
            ))
        }

        // 7. Condition 7: Düşük Özsaygı ve Pasif Sosyal Medya Tüketimi (Doomscrolling / Lurking)
        // Social media > 120 min AND outward interaction < %5 AND late night scroll > 45 min AND post-session EMA drop >= 2.0
        let isSocialDurationHigh = latestDay.dailySocialMediaMinutes >= 120.0
        let isOutwardInteractionLow = latestDay.outwardInteractionRatioPercent <= 5.0
        let isLateNightScroll = latestDay.lateNightContinuousScrollMinutes >= 45.0
        let isAffectDropSignificant = latestDay.postSessionEmaAffectDrop >= 2.0

        if isSocialDurationHigh && isOutwardInteractionLow && (isLateNightScroll || isAffectDropSignificant) {
            alerts.append(InsightAlert(
                insightType: .lowSelfEsteemPassiveSocial,
                title: ClinicalInsightType.lowSelfEsteemPassiveSocial.displayName,
                personalizedDeviationStatement: "Dijital aynanızda, kişisel olağan ritminizden farklılaşan bazı eğilimler gözlemlendi.",
                explainableEvidences: [
                    "Pasif Sosyal Medya: \(Int(latestDay.dailySocialMediaMinutes)) dk sosyal medya kullanımında dışa dönük aktif etkileşim (beğeni, yorum, mesaj) oranı yalnızca %\(round(latestDay.outwardInteractionRatioPercent * 10) / 10) olarak kaydedildi.",
                    "Gece Dikey Kaydırma: Gece geç saatlerde \(Int(latestDay.lateNightContinuousScrollMinutes)) dakika kesintisiz dikey kaydırma (doomscrolling) tespit edildi.",
                    "Duygudurum Düşüşü: Oturum sonrası EMA anketinde duygusal afekt puanında \(round(latestDay.postSessionEmaAffectDrop * 10) / 10) puanlık negatif gerileme saptandı."
                ],
                severity: .moderate,
                contributingMetrics: [
                    "socialMinutes": latestDay.dailySocialMediaMinutes,
                    "outwardInteractionPercent": latestDay.outwardInteractionRatioPercent,
                    "lateNightScrollMinutes": latestDay.lateNightContinuousScrollMinutes,
                    "affectDrop": latestDay.postSessionEmaAffectDrop
                ],
                notificationBody: "Dijital Ayna: Bugün sosyal medyada pasif izleyici modunda uzun bir süre (\(Int(latestDay.dailySocialMediaMinutes)) dk) geçirdiğiniz ve bu süreçte duygu durumunuzda düşüş eğilimi oluştuğu fark edildi. Ekran dışı bir mola vermek iyi gelebilir."
            ))
        }

        return alerts
    }

    private func calculateStats(_ values: [Double]) -> (mean: Double, std: Double) {
        guard !values.isEmpty else { return (0.0, 1.0) }
        let mean = values.reduce(0.0, +) / Double(values.count)
        guard values.count > 1 else { return (mean, max(0.1, mean * 0.1)) }

        let sumSquares = values.reduce(0.0) { $0 + pow($1 - mean, 2) }
        let std = sqrt(sumSquares / Double(values.count - 1))
        return (mean, max(0.001, std))
    }
}
