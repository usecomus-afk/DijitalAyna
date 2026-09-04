import SwiftUI

/// Aesthetic SwiftUI Card presenting explainable clinical foresight alerts derived from digital phenotyping
/// Designed according to digital health ethics, with transparent evidence bullets and clinician report integration
public struct InsightCardView: View {
    public let alert: InsightAlert
    public let onAddToReport: ((InsightAlert) -> Void)?
    public let onShareWithDoctor: ((InsightAlert) -> Void)?

    @State private var isAdded: Bool

    public init(
        alert: InsightAlert,
        onAddToReport: ((InsightAlert) -> Void)? = nil,
        onShareWithDoctor: ((InsightAlert) -> Void)? = nil
    ) {
        self.alert = alert
        self.onAddToReport = onAddToReport
        self.onShareWithDoctor = onShareWithDoctor
        self._isAdded = State(initialValue: alert.isAddedToDoctorReport)
    }

    private var themeColor: Color {
        Color(hex: alert.insightType.accentColorHex)
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            // Header: Category Badge & Status
            HStack(spacing: 8) {
                ZStack {
                    RoundedRectangle(cornerRadius: 10)
                        .fill(themeColor.opacity(0.15))
                        .frame(width: 32, height: 32)

                    Image(systemName: alert.insightType.iconName)
                        .foregroundColor(themeColor)
                        .font(.system(size: 15, weight: .semibold))
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(alert.title)
                        .font(.system(size: 15, weight: .bold, design: .serif))
                        .foregroundColor(Color(red: 0.12, green: 0.23, blue: 0.37))

                    Text(alert.insightType.primaryBiomarkersDescription)
                        .font(.system(size: 10.5))
                        .foregroundColor(Color.gray)
                        .lineLimit(1)
                }

                Spacer()

                // Severity Pill
                Text(alert.severity.rawValue)
                    .font(.system(size: 10, weight: .bold))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3.5)
                    .background(themeColor.opacity(0.12))
                    .foregroundColor(themeColor)
                    .cornerRadius(8)
            }

            // Personalized Non-Diagnostic Deviation Headline
            Text(alert.personalizedDeviationStatement)
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(Color(red: 0.12, green: 0.23, blue: 0.37).opacity(0.9))
                .lineSpacing(2.5)

            // Transparent Telemetry Evidences Box
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 5) {
                    Image(systemName: "chart.bar.xaxis")
                        .foregroundColor(themeColor)
                        .font(.system(size: 11, weight: .bold))

                    Text("Şeffaf Biyobelirteç Dayanakları:")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(Color(red: 0.12, green: 0.23, blue: 0.37))
                }

                ForEach(alert.explainableEvidences, id: \.self) { evidence in
                    HStack(alignment: .top, spacing: 7) {
                        Circle()
                            .fill(themeColor)
                            .frame(width: 4.5, height: 4.5)
                            .padding(.top, 5)

                        Text(evidence)
                            .font(.system(size: 11.5))
                            .foregroundColor(Color(red: 0.12, green: 0.23, blue: 0.37).opacity(0.85))
                            .lineSpacing(2)
                    }
                }
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(red: 0.97, green: 0.96, blue: 0.95))
            .cornerRadius(14)
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(Color.black.opacity(0.04), lineWidth: 1)
            )

            // Supportive Action Advice
            HStack(alignment: .top, spacing: 7) {
                Image(systemName: "lightbulb.fill")
                    .foregroundColor(Color(red: 0.85, green: 0.50, blue: 0.20))
                    .font(.system(size: 12))
                    .padding(.top, 1.5)

                Text(alert.insightType.actionableAdvice)
                    .font(.system(size: 11.5))
                    .foregroundColor(Color(red: 0.20, green: 0.25, blue: 0.35))
                    .lineSpacing(2)
            }
            .padding(10)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(red: 0.98, green: 0.97, blue: 0.94))
            .cornerRadius(12)

            // Medical Ethical Non-Diagnostic Guardrail
            HStack(alignment: .top, spacing: 6) {
                Image(systemName: "checkmark.shield.fill")
                    .foregroundColor(.green)
                    .font(.system(size: 12))
                    .padding(.top, 1.5)

                Text(alert.ethicalDisclaimer)
                    .font(.system(size: 10.5))
                    .foregroundColor(Color.gray)
                    .lineSpacing(2)
            }

            // Action Buttons: Hekim Raporuna Ekle & Paylaş
            HStack(spacing: 10) {
                Button(action: {
                    withAnimation(.spring(response: 0.35, dampingFraction: 0.7)) {
                        isAdded.toggle()
                    }
                    var updated = alert
                    updated.isAddedToDoctorReport = isAdded
                    onAddToReport?(updated)
                }) {
                    HStack(spacing: 6) {
                        Image(systemName: isAdded ? "checkmark.circle.fill" : "plus.circle")
                            .font(.system(size: 13, weight: .semibold))
                        Text(isAdded ? "Hekim Raporuna Eklendi" : "Hekim Raporuna Ekle")
                            .font(.system(size: 12, weight: .semibold))
                    }
                    .foregroundColor(isAdded ? .white : Color(red: 0.12, green: 0.23, blue: 0.37))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(isAdded ? Color.emeraldGreen : Color.white)
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(isAdded ? Color.clear : Color(red: 0.12, green: 0.23, blue: 0.37).opacity(0.2), lineWidth: 1)
                    )
                }

                if let onShare = onShareWithDoctor {
                    Button(action: { onShare(alert) }) {
                        HStack(spacing: 5) {
                            Image(systemName: "square.and.arrow.up")
                                .font(.system(size: 12, weight: .semibold))
                            Text("Paylaş")
                                .font(.system(size: 12, weight: .semibold))
                        }
                        .foregroundColor(themeColor)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .background(themeColor.opacity(0.10))
                        .cornerRadius(12)
                    }
                }
            }
            .padding(.top, 2)
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(20)
        .shadow(color: Color.black.opacity(0.04), radius: 10, x: 0, y: 3)
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .stroke(Color(red: 0.90, green: 0.88, blue: 0.84), lineWidth: 1)
        )
    }
}

private extension Color {
    static let emeraldGreen = Color(red: 0.06, green: 0.60, blue: 0.42)

    init(hex: String) {
        let cleanHex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: cleanHex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch cleanHex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
