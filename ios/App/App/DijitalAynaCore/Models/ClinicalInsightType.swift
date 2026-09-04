import Foundation

/// 7 Clinical Insight Patterns identified via digital phenotyping and EWMA statistical process control
public enum ClinicalInsightType: String, Codable, CaseIterable {
    case burnout = "burnout"
    case depressionIsolation = "depressionIsolation"
    case anxietySleep = "anxietySleep"
    case neurodiversity = "neurodiversity"
    case cognitiveDecline = "cognitiveDecline"
    case ptsdHypervigilance = "ptsdHypervigilance"
    case lowSelfEsteemPassiveSocial = "lowSelfEsteemPassiveSocial"

    /// User-facing clinical title adhering strictly to non-diagnostic medical ethics
    public var displayName: String {
        switch self {
        case .burnout:
            return "Duygusal Tükenmişlik (Burnout)"
        case .depressionIsolation:
            return "Depresyon ve Sosyal İzolasyon"
        case .anxietySleep:
            return "Anksiyete ve Uyku Bozuklukları"
        case .neurodiversity:
            return "Nöroçeşitlilik (DEHB, Dikkat Dağınıklığı)"
        case .cognitiveDecline:
            // Ethical guideline: Never use 'Demans' directly; frame as cognitive speed & rhythm change
            return "Bilişsel İcra Hızı ve Ritim Değişimi"
        case .ptsdHypervigilance:
            return "PTSD Belirtileri (Hipervijilans ve Kaçınma)"
        case .lowSelfEsteemPassiveSocial:
            return "Düşük Özsaygı ve Pasif Sosyal Medya Tüketimi"
        }
    }

    /// Primary passive biomarkers measured for this clinical pattern
    public var primaryBiomarkersDescription: String {
        switch self {
        case .burnout:
            return "Klavye Hold Time (tuşa basılı tutma), IKI (uçuş süresi) ve Silme (Backspace) oranı"
        case .depressionIsolation:
            return "GPS Homestay (evde kalma %), Radius of Gyration (hareketlilik yarıçapı) ve sosyal etkileşim"
        case .anxietySleep:
            return "Gece ekran penceresi (02:00-04:00), Uykuya Dalma Süresi (SOL) ve Gece Uyanıklığı (WASO)"
        case .neurodiversity:
            return "Uygulama geçiş sıklığı (App-Switching) ve mikro-oturum süreleri (Session Length)"
        case .cognitiveDecline:
            return "Klavye duraksama süresi (>2000 ms), IKI uzaması ve Sirkadiyen Düzenlilik Endeksi (SRI)"
        case .ptsdHypervigilance:
            return "Günlük kilit açma sıklığı (Screen Unlocks) ve mikro-kontrol davranışı (<5 sn kilitleme)"
        case .lowSelfEsteemPassiveSocial:
            return "Sosyal medya süresi, pasif kaydırma oranı, gece dikey scroll ve oturum sonrası EMA düşüşü"
        }
    }

    /// Recommended supportive action/reflection
    public var actionableAdvice: String {
        switch self {
        case .burnout:
            return "Zihinsel yorgunluk ve karar yükünüz artmış görünüyor. Gün içinde 15 dakikalık ekransız dinlenme blokları planlayabilirsiniz."
        case .depressionIsolation:
            return "Fiziksel hareketlilik alanınız daralmış durumda. Gün ışığında kısa bir yürüyüş ve yakın bir dostla iletişim iyi gelebilir."
        case .anxietySleep:
            return "Gece saatlerinde uyku bölünmeleri tespit edildi. Yatmadan 60 dakika önce mavi ışık maruziyetini sınırlamayı deneyebilirsiniz."
        case .neurodiversity:
            return "Aşırı parçalanmış dikkat döngüleri gözlendi. Bildirimleri sessize alarak tek bir göreve 20 dakikalık Pomodoro odağı ayırabilirsiniz."
        case .cognitiveDecline:
            return "Yazım ritmi ve sirkadiyen düzende dalgalanmalar kaydedildi. Bu nesnel verileri düzenli doktor randevunuzda hekiminize sunabilirsiniz."
        case .ptsdHypervigilance:
            return "Sık ve hızlı cihaz kontrolü sinir sisteminin tetikte olduğunu gösteriyor. Diyafram nefesi ve 5-4-3-2-1 topraklama egzersizi önerilir."
        case .lowSelfEsteemPassiveSocial:
            return "Sosyal medyada uzun süreli pasif tüketim duygu durumunuzu etkiliyor olabilir. Cihaz dışı yaratıcı bir aktiviteye yönelmeyi deneyin."
        }
    }

    /// Hex color code for thematic visual presentation
    public var accentColorHex: String {
        switch self {
        case .burnout: return "#D97706" // Amber
        case .depressionIsolation: return "#E11D48" // Rose
        case .anxietySleep: return "#4F46E5" // Indigo
        case .neurodiversity: return "#0D9488" // Teal
        case .cognitiveDecline: return "#475569" // Slate
        case .ptsdHypervigilance: return "#7C3AED" // Purple
        case .lowSelfEsteemPassiveSocial: return "#C2410C" // Orange/Copper
        }
    }

    /// SF Symbol icon name
    public var iconName: String {
        switch self {
        case .burnout: return "flame.fill"
        case .depressionIsolation: return "location.slash.fill"
        case .anxietySleep: return "moon.stars.fill"
        case .neurodiversity: return "arrow.triangle.branch"
        case .cognitiveDecline: return "brain.head.profile"
        case .ptsdHypervigilance: return "bell.badge.waveform.fill"
        case .lowSelfEsteemPassiveSocial: return "eye.slash.fill"
        }
    }
}

/// Threshold specifications for early clinical awareness rules
public struct ClinicalThreshold: Codable, Equatable {
    public let insightType: ClinicalInsightType
    public let primaryBiomarkers: [String]
    public let zScoreThreshold: Double?
    public let percentageChangeThreshold: Double?
    public let absoluteValueThreshold: Double?
    public let requiredConsecutiveDays: Int
    public let minOccurrencesInWindow: Int?
    public let windowDays: Int
    public let clinicalRationale: String

    public init(
        insightType: ClinicalInsightType,
        primaryBiomarkers: [String],
        zScoreThreshold: Double? = nil,
        percentageChangeThreshold: Double? = nil,
        absoluteValueThreshold: Double? = nil,
        requiredConsecutiveDays: Int = 1,
        minOccurrencesInWindow: Int? = nil,
        windowDays: Int = 7,
        clinicalRationale: String
    ) {
        self.insightType = insightType
        self.primaryBiomarkers = primaryBiomarkers
        self.zScoreThreshold = zScoreThreshold
        self.percentageChangeThreshold = percentageChangeThreshold
        self.absoluteValueThreshold = absoluteValueThreshold
        self.requiredConsecutiveDays = requiredConsecutiveDays
        self.minOccurrencesInWindow = minOccurrencesInWindow
        self.windowDays = windowDays
        self.clinicalRationale = clinicalRationale
    }
}

public enum InsightAlertSeverity: String, Codable {
    case mild = "Düşük"
    case moderate = "Orta"
    case significant = "Öncelikli"
}

/// Actionable, explainable insight alert generated by EarlyAwarenessEngine
public struct InsightAlert: Identifiable, Codable, Equatable {
    public let id: UUID
    public let insightType: ClinicalInsightType
    public let title: String
    public let personalizedDeviationStatement: String
    public let explainableEvidences: [String] // 2-3 specific objective metric evidence statements
    public let ethicalDisclaimer: String
    public let severity: InsightAlertSeverity
    public let timestamp: Date
    public let contributingMetrics: [String: Double]
    public let notificationBody: String
    public var isAddedToDoctorReport: Bool

    public init(
        id: UUID = UUID(),
        insightType: ClinicalInsightType,
        title: String,
        personalizedDeviationStatement: String = "Dijital aynanızda, kişisel olağan ritminizden farklılaşan bazı eğilimler gözlemlendi.",
        explainableEvidences: [String],
        ethicalDisclaimer: String = "Bu bir tıbbi teşhis değildir. Bu nesnel verileri hekiminizle veya psikiyatristinizle değerlendirmeniz önerilir.",
        severity: InsightAlertSeverity = .moderate,
        timestamp: Date = Date(),
        contributingMetrics: [String: Double] = [:],
        notificationBody: String,
        isAddedToDoctorReport: Bool = false
    ) {
        self.id = id
        self.insightType = insightType
        self.title = title
        self.personalizedDeviationStatement = personalizedDeviationStatement
        self.explainableEvidences = explainableEvidences
        self.ethicalDisclaimer = ethicalDisclaimer
        self.severity = severity
        self.timestamp = timestamp
        self.contributingMetrics = contributingMetrics
        self.notificationBody = notificationBody
        self.isAddedToDoctorReport = isAddedToDoctorReport
    }
}
