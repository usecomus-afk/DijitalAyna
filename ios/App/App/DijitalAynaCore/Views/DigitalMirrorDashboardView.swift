import SwiftUI
import PDFKit

/// Native SwiftUI representation of PDFDocument viewer
public struct PDFKitView: UIViewRepresentable {
    public let data: Data

    public init(data: Data) {
        self.data = data
    }

    public func makeUIView(context: Context) -> PDFView {
        let pdfView = PDFView()
        pdfView.autoScales = true
        pdfView.document = PDFDocument(data: data)
        return pdfView
    }

    public func updateUIView(_ uiView: PDFView, context: Context) {
        uiView.document = PDFDocument(data: data)
    }
}

/// Primary Native iOS "Dijital Ayna" Dashboard View
public struct DigitalMirrorDashboardView: View {
    @State private var showingPDFSheet = false
    @State private var pdfData: Data?

    // Sample initial state for native preview & interaction
    @State private var sampleMedications: [Medication] = [
        Medication(
            name: "Sertralin",
            category: .ssri,
            dosageMg: 50,
            frequency: "Günde 1x",
            scheduledTimeSlots: ["09:00"],
            instructions: "Kahvaltı sonrası, bol su ile",
            startDate: Calendar.current.date(byAdding: .day, value: -14, to: Date())!
        )
    ]

    @State private var sampleDeviations: [SPCDeviation] = [
        SPCDeviation(
            metricKey: "sleep_sol",
            metricTitle: "Uykuya Dalma Süresi (SOL)",
            domain: .sleep,
            currentValue: 48.0,
            baselineMean: 22.0,
            baselineStd: 5.0,
            ewmaSmoothedValue: 44.0,
            ucl: 34.5,
            lcl: 9.5,
            zScore: 5.2,
            consecutiveDaysCount: 3,
            direction: .elevated,
            explainableInsight: "Uykuya dalma süreniz kişisel ortalamanızdan 26 dakika daha uzun sürdü.",
            clinicalSignificance: "Ardışık 3 gündür EWMA UCL limitinin üzerinde."
        ),
        SPCDeviation(
            metricKey: "mobility_rg",
            metricTitle: "Günlük Hareket Alanı Yarıçapı",
            domain: .mobility,
            currentValue: 2.1,
            baselineMean: 6.5,
            baselineStd: 1.2,
            ewmaSmoothedValue: 2.8,
            ucl: 9.5,
            lcl: 3.5,
            zScore: -3.6,
            consecutiveDaysCount: 2,
            direction: .depressed,
            explainableInsight: "Günlük hareketlilik yarıçapınız %35 daraldı ve evde kalış süreniz arttı.",
            clinicalSignificance: "Ardışık 2 gündür EWMA LCL limitinin altında."
        )
    ]

    public init() {}

    public var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 18) {
                    // 1. Digital Twin Header
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("DİJİTAL AYNA")
                                    .font(.system(size: 11, weight: .bold, design: .serif))
                                    .foregroundColor(Color(red: 0.75, green: 0.40, blue: 0.31))
                                    .tracking(1.5)

                                Text("Kişisel Biyobelirteç İkizi")
                                    .font(.system(size: 22, weight: .bold, design: .serif))
                                    .foregroundColor(Color(red: 0.12, green: 0.23, blue: 0.37))
                            }

                            Spacer()

                            Circle()
                                .fill(Color(red: 0.12, green: 0.55, blue: 0.50).opacity(0.15))
                                .frame(width: 44, height: 44)
                                .overlay(
                                    Image(systemName: "person.crop.circle")
                                        .foregroundColor(Color(red: 0.12, green: 0.55, blue: 0.50))
                                        .font(.system(size: 22))
                                )
                        }

                        Text("Cihaz içi sensörlerden toplanan nesnel telemetri ve 14 günlük bireysel baz hattı analizi.")
                            .font(.system(size: 12))
                            .foregroundColor(Color.gray)
                    }
                    .padding(.horizontal, 4)

                    // 2. Explainable Foresight Card (Strict adherence to section 6 format)
                    ExplainableForesightCard(
                        deviations: sampleDeviations,
                        onGeneratePDF: {
                            generateClinicianReport()
                        },
                        onShareWithDoctor: {
                            generateClinicianReport()
                        }
                    )

                    // 3. Domain Biomarker Gauges Grid
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                        BiomarkerDomainCard(
                            domainTitle: "Uyku Mimarisi",
                            primaryMetric: "86%",
                            metricLabel: "Uyku Etkinliği (SE)",
                            statusText: "Hafif Bölünmeler",
                            statusColor: .orange,
                            iconName: "moon.fill"
                        )

                        BiomarkerDomainCard(
                            domainTitle: "Mobilite & Entropi",
                            primaryMetric: "3.2 km",
                            metricLabel: "Hareket Yarıçapı (Rg)",
                            statusText: "Evde Kalış %76",
                            statusColor: .teal,
                            iconName: "location.circle.fill"
                        )

                        BiomarkerDomainCard(
                            domainTitle: "Yazım Hızı",
                            primaryMetric: "118 ms",
                            metricLabel: "Tuş Tutma (Hold Time)",
                            statusText: "Psikomotor Stabil",
                            statusColor: .green,
                            iconName: "keyboard.fill"
                        )

                        BiomarkerDomainCard(
                            domainTitle: "Aktif Duygudurum",
                            primaryMetric: "7.0 / 10",
                            metricLabel: "EMA Öz-Bildirim",
                            statusText: "Stabil Ritim",
                            statusColor: .blue,
                            iconName: "heart.text.square.fill"
                        )
                    }

                    // 4. Medication Tracker & T0 Intervention Widget
                    MedicationTrackerView(
                        medications: sampleMedications,
                        logs: [],
                        onLogAction: { medId, status in
                            print("[Medication] Logged \(status.rawValue) for \(medId)")
                        }
                    )

                    // 5. Non-Diagnostic Legal Disclaimer Banner
                    HStack(spacing: 8) {
                        Image(systemName: "info.circle")
                            .foregroundColor(Color.gray)
                        Text("Dijital Ayna tıbbi teşhis koymaz. Yalnızca istatistiksel bazal sapmaları hekiminizle paylaşmanız için raporlar.")
                            .font(.system(size: 10.5))
                            .foregroundColor(Color.gray)
                            .lineSpacing(2)
                    }
                    .padding(12)
                    .frame(maxWidth: .infinity)
                    .background(Color(white: 0.96))
                    .cornerRadius(12)
                }
                .padding(16)
            }
            .background(Color(red: 0.95, green: 0.94, blue: 0.92).ignoresSafeArea())
            .navigationBarHidden(true)
            .sheet(isPresented: $showingPDFSheet) {
                if let data = pdfData {
                    NavigationView {
                        PDFKitView(data: data)
                            .navigationTitle("Hekim Klinik Raporu (A4)")
                            .navigationBarTitleDisplayMode(.inline)
                            .toolbar {
                                ToolbarItem(placement: .confirmationAction) {
                                    Button("Kapat") {
                                        showingPDFSheet = false
                                    }
                                }
                            }
                    }
                }
            }
        }
    }

    private func generateClinicianReport() {
        let samplePhenotypes = (0..<28).map { dayOffset -> DailyPhenotype in
            let date = Calendar.current.date(byAdding: .day, value: -dayOffset, to: Date())!
            return DailyPhenotype(
                date: date,
                stepsCount: 6500 + Int.random(in: -800...800),
                sleepOnsetLatencyMinutes: dayOffset > 14 ? 22.0 : 42.0,
                totalSleepTimeMinutes: 420.0,
                wakeAfterSleepOnsetMinutes: 30.0,
                sleepEfficiencyPercent: dayOffset > 14 ? 88.0 : 81.0,
                radiusOfGyrationKm: dayOffset > 14 ? 6.5 : 3.8,
                homestayPercentage: dayOffset > 14 ? 62.0 : 78.0,
                meanHoldTimeMs: dayOffset > 14 ? 112.0 : 138.0
            )
        }

        if let med = sampleMedications.first {
            let reportData = MedicationImpactAnalyzer.shared.analyzeImpact(
                medication: med,
                logs: [],
                phenotypes: samplePhenotypes,
                patientName: "Kullanıcı"
            )

            let generated = ClinicianReportGenerator.shared.generatePDF(reportData: reportData)
            self.pdfData = generated
            self.showingPDFSheet = true
        }
    }
}

struct BiomarkerDomainCard: View {
    let domainTitle: String
    let primaryMetric: String
    let metricLabel: String
    let statusText: String
    let statusColor: Color
    let iconName: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(domainTitle)
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(.gray)
                Spacer()
                Image(systemName: iconName)
                    .font(.system(size: 12))
                    .foregroundColor(statusColor)
            }

            Text(primaryMetric)
                .font(.system(size: 18, weight: .bold, design: .serif))
                .foregroundColor(Color(red: 0.12, green: 0.23, blue: 0.37))

            Text(metricLabel)
                .font(.system(size: 10))
                .foregroundColor(.gray)

            Text(statusText)
                .font(.system(size: 9.5, weight: .semibold))
                .padding(.horizontal, 6)
                .padding(.vertical, 2)
                .background(statusColor.opacity(0.12))
                .foregroundColor(statusColor)
                .cornerRadius(6)
        }
        .padding(12)
        .background(Color.white)
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.03), radius: 6, x: 0, y: 3)
    }
}
