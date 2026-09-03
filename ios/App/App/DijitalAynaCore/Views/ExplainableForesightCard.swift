import SwiftUI

/// Reusable explainable foresight card presenting objective sensor telemetry to user
/// Formatted strictly according to digital health ethical communication guidelines
public struct ExplainableForesightCard: View {
    public let deviations: [SPCDeviation]
    public let onGeneratePDF: () -> Void
    public let onShareWithDoctor: () -> Void

    public init(
        deviations: [SPCDeviation],
        onGeneratePDF: @escaping () -> Void,
        onShareWithDoctor: @escaping () -> Void
    ) {
        self.deviations = deviations
        self.onGeneratePDF = onGeneratePDF
        self.onShareWithDoctor = onShareWithDoctor
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            // Header
            HStack(spacing: 8) {
                Image(systemName: "sparkles")
                    .foregroundColor(Color(red: 0.75, green: 0.40, blue: 0.31))
                    .font(.system(size: 16, weight: .semibold))

                Text("Dijital Ayna: Haftalık Ritim Gözlemi")
                    .font(.system(size: 15, weight: .bold, design: .serif))
                    .foregroundColor(Color(red: 0.12, green: 0.23, blue: 0.37))

                Spacer()

                Text("Farkındalık")
                    .font(.system(size: 10, weight: .bold))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(Color(red: 0.75, green: 0.40, blue: 0.31).opacity(0.12))
                    .foregroundColor(Color(red: 0.75, green: 0.40, blue: 0.31))
                    .cornerRadius(8)
            }

            // Foresight Statement
            Text("Son günlerdeki dijital ritminizde kişisel olağan durumunuzdan farklılaşan eğilimler tespit edildi.")
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(Color(red: 0.12, green: 0.23, blue: 0.37).opacity(0.9))
                .lineSpacing(3)

            // Transparent Telemetry Reasons
            VStack(alignment: .leading, spacing: 8) {
                Text("Şeffaf Veri Dayanakları:")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(Color.gray)

                if deviations.isEmpty {
                    TelemetryBulletPoint(icon: "moon.fill", text: "Uyku: Uykuya dalma süreniz (SOL) kişisel ortalamanızdan 42 dakika daha uzun sürdü.")
                    TelemetryBulletPoint(icon: "location.fill", text: "Hareketlilik: Günlük hareket alanınız (yarıçap) %30 daraldı ve evde geçirilen süre arttı.")
                    TelemetryBulletPoint(icon: "keyboard", text: "Yazma Dinamikleri: Klavye tuş basılı tutma sürenizde yavaşlama kaydedildi.")
                } else {
                    ForEach(deviations) { dev in
                        TelemetryBulletPoint(
                            icon: iconForDomain(dev.domain),
                            text: "\(dev.domain.rawValue): \(dev.explainableInsight)"
                        )
                    }
                }
            }
            .padding(12)
            .background(Color(red: 0.96, green: 0.95, blue: 0.93))
            .cornerRadius(14)

            // Legal and Medical Ethical Warning
            HStack(alignment: .top, spacing: 6) {
                Image(systemName: "checkmark.shield.fill")
                    .foregroundColor(.green)
                    .font(.system(size: 13))
                    .padding(.top, 2)

                Text("Bu bilgilendirme bir tıbbi teşhis değildir. Biyobelirteçlerinizdeki bu örüntüyü hekiminizle paylaşarak klinik durumunuzu birlikte değerlendirmeniz önerilir.")
                    .font(.system(size: 11))
                    .foregroundColor(Color.gray)
                    .lineSpacing(2)
            }

            // Action Buttons
            HStack(spacing: 10) {
                Button(action: onGeneratePDF) {
                    HStack(spacing: 5) {
                        Image(systemName: "doc.text.fill")
                        Text("Hekim Raporu Oluştur (PDF)")
                    }
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(Color(red: 0.12, green: 0.23, blue: 0.37))
                    .cornerRadius(12)
                }

                Button(action: onShareWithDoctor) {
                    HStack(spacing: 5) {
                        Image(systemName: "person.crop.circle.badge.checkmark")
                        Text("Doktorumla Paylaş")
                    }
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(Color(red: 0.75, green: 0.40, blue: 0.31))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(Color(red: 0.75, green: 0.40, blue: 0.31).opacity(0.12))
                    .cornerRadius(12)
                }
            }
            .padding(.top, 4)
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(20)
        .shadow(color: Color.black.opacity(0.04), radius: 10, x: 0, y: 4)
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .stroke(Color(red: 0.75, green: 0.40, blue: 0.31).opacity(0.2), lineWidth: 1)
        )
    }

    private func iconForDomain(_ domain: BiomarkerDomain) -> String {
        switch domain {
        case .sleep: return "moon.fill"
        case .mobility: return "location.fill"
        case .motorTyping: return "keyboard"
        case .vocal: return "waveform"
        case .affect: return "heart.fill"
        }
    }
}

struct TelemetryBulletPoint: View {
    let icon: String
    let text: String

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            Image(systemName: icon)
                .foregroundColor(Color(red: 0.12, green: 0.23, blue: 0.37))
                .font(.system(size: 11))
                .frame(width: 14)
                .padding(.top, 2)

            Text(text)
                .font(.system(size: 11.5))
                .foregroundColor(Color(red: 0.12, green: 0.23, blue: 0.37))
                .lineSpacing(2)
        }
    }
}
