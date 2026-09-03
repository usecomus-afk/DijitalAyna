import Foundation

/// Statistical comparative metric delta across pre-intervention and post-intervention windows
public struct BiomarkerComparisonDelta: Identifiable, Codable, Equatable {
    public let id: UUID
    public let metricName: String
    public let unit: String
    public let preT0Mean: Double
    public let preT0Std: Double
    public let postT0Mean: Double
    public let postT0Std: Double
    public let deltaPercentage: Double
    public let pValueApprox: Double // Welch's t-test p-value approximation
    public let cohensD: Double // Effect size
    public let clinicalInterpretation: String // E.g., "Psikomotor sedasyonda hafif düzelme"

    public init(
        id: UUID = UUID(),
        metricName: String,
        unit: String,
        preT0Mean: Double,
        preT0Std: Double,
        postT0Mean: Double,
        postT0Std: Double,
        deltaPercentage: Double,
        pValueApprox: Double,
        cohensD: Double,
        clinicalInterpretation: String
    ) {
        self.id = id
        self.metricName = metricName
        self.unit = unit
        self.preT0Mean = preT0Mean
        self.preT0Std = preT0Std
        self.postT0Mean = postT0Mean
        self.postT0Std = postT0Std
        self.deltaPercentage = deltaPercentage
        self.pValueApprox = pValueApprox
        self.cohensD = cohensD
        self.clinicalInterpretation = clinicalInterpretation
    }
}

/// Comprehensive Clinician Report package ready for 60-second review and PDFKit rendering
public struct ClinicianReportData: Identifiable, Codable, Equatable {
    public let id: UUID
    public let patientName: String
    public let reportDate: Date
    public let t0Date: Date
    public let medicationName: String
    public let medicationCategory: String
    public let dosageMg: Double
    public let adherenceRatePercent: Double
    public let preT0DaysCount: Int
    public let postT0DaysCount: Int
    public let deltas: [BiomarkerComparisonDelta]
    public let summaryObservations: [String]
    public let nonDiagnosticDisclaimer: String

    public init(
        id: UUID = UUID(),
        patientName: String,
        reportDate: Date = Date(),
        t0Date: Date,
        medicationName: String,
        medicationCategory: String,
        dosageMg: Double,
        adherenceRatePercent: Double,
        preT0DaysCount: Int = 14,
        postT0DaysCount: Int = 14,
        deltas: [BiomarkerComparisonDelta],
        summaryObservations: [String],
        nonDiagnosticDisclaimer: String = "Bu rapor bir tıbbi teşhis belgesi değildir. Cihaz içi sensörlerden ve öz-bildirimlerden elde edilen nesnel dijital biyobelirteç değişimlerini klinik değerlendirmeye destek amacıyla hekime sunar."
    ) {
        self.id = id
        self.patientName = patientName
        self.reportDate = reportDate
        self.t0Date = t0Date
        self.medicationName = medicationName
        self.medicationCategory = medicationCategory
        self.dosageMg = dosageMg
        self.adherenceRatePercent = adherenceRatePercent
        self.preT0DaysCount = preT0DaysCount
        self.postT0DaysCount = postT0DaysCount
        self.deltas = deltas
        self.summaryObservations = summaryObservations
        self.nonDiagnosticDisclaimer = nonDiagnosticDisclaimer
    }
}
