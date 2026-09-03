import Foundation
import UIKit
import PDFKit

/// Generates professional, publication-grade 1-page A4 PDF Clinician Reports
public final class ClinicianReportGenerator {
    public static let shared = ClinicianReportGenerator()

    private init() {}

    /// Renders a ClinicianReportData instance into standard A4 PDF document data
    public func generatePDF(reportData: ClinicianReportData) -> Data {
        // Standard A4 dimensions at 72 dpi: 595.2 x 841.8 points
        let pageWidth: CGFloat = 595.2
        let pageHeight: CGFloat = 841.8
        let pageRect = CGRect(x: 0, y: 0, width: pageWidth, height: pageHeight)

        let renderer = UIGraphicsPDFRenderer(bounds: pageRect)

        let data = renderer.pdfData { context in
            context.beginPage()

            let margin: CGFloat = 36.0
            var currentY: CGFloat = margin

            // 1. Header Bar
            let navyColor = UIColor(red: 0.12, green: 0.23, blue: 0.37, alpha: 1.0)
            let copperColor = UIColor(red: 0.75, green: 0.40, blue: 0.31, alpha: 1.0)
            let sandBgColor = UIColor(red: 0.95, green: 0.94, blue: 0.92, alpha: 1.0)

            // Brand Title
            let titleAttributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.boldSystemFont(ofSize: 18),
                .foregroundColor: navyColor
            ]
            let titleStr = "DİJİTAL AYNA — HEKİM KLİNİK BİYOBELİRTEÇ VE İLAÇ RAPORU"
            titleStr.draw(at: CGPoint(x: margin, y: currentY), withAttributes: titleAttributes)
            currentY += 24

            let subtitleAttributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 10),
                .foregroundColor: UIColor.darkGray
            ]
            let subtitleStr = "Dijital Fenotipleme (Torous et al.) & Pre-Post T0 İlaç Yanıt Analizi (Astill Wright et al., 2025)"
            subtitleStr.draw(at: CGPoint(x: margin, y: currentY), withAttributes: subtitleAttributes)
            currentY += 18

            // Top Divider
            context.cgContext.setStrokeColor(navyColor.cgColor)
            context.cgContext.setLineWidth(1.5)
            context.cgContext.move(to: CGPoint(x: margin, y: currentY))
            context.cgContext.addLine(to: CGPoint(x: pageWidth - margin, y: currentY))
            context.cgContext.strokePath()
            currentY += 12

            // 2. Patient & Medication Metadata Info Box
            let infoBoxRect = CGRect(x: margin, y: currentY, width: pageWidth - 2 * margin, height: 60)
            context.cgContext.setFillColor(sandBgColor.cgColor)
            context.cgContext.fill(infoBoxRect)

            let labelAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.boldSystemFont(ofSize: 9.5),
                .foregroundColor: navyColor
            ]
            let valueAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 9.5),
                .foregroundColor: UIColor.black
            ]

            let dateFormatter = DateFormatter()
            dateFormatter.dateFormat = "dd.MM.yyyy"
            dateFormatter.locale = Locale(identifier: "tr_TR")

            let col1X = margin + 10
            let col2X = margin + 180
            let col3X = margin + 360

            "Danışan:".draw(at: CGPoint(x: col1X, y: currentY + 8), withAttributes: labelAttrs)
            reportData.patientName.draw(at: CGPoint(x: col1X + 50, y: currentY + 8), withAttributes: valueAttrs)

            "Rapor Tarihi:".draw(at: CGPoint(x: col1X, y: currentY + 24), withAttributes: labelAttrs)
            dateFormatter.string(from: reportData.reportDate).draw(at: CGPoint(x: col1X + 65, y: currentY + 24), withAttributes: valueAttrs)

            "İlaç & Form:".draw(at: CGPoint(x: col2X, y: currentY + 8), withAttributes: labelAttrs)
            "\(reportData.medicationName) \(Int(reportData.dosageMg))mg".draw(at: CGPoint(x: col2X + 60, y: currentY + 8), withAttributes: valueAttrs)

            "T0 Müdahale:".draw(at: CGPoint(x: col2X, y: currentY + 24), withAttributes: labelAttrs)
            dateFormatter.string(from: reportData.t0Date).draw(at: CGPoint(x: col2X + 65, y: currentY + 24), withAttributes: valueAttrs)

            "İlaç Uyumu:".draw(at: CGPoint(x: col3X, y: currentY + 8), withAttributes: labelAttrs)
            "%\(reportData.adherenceRatePercent)".draw(at: CGPoint(x: col3X + 60, y: currentY + 8), withAttributes: [
                .font: UIFont.boldSystemFont(ofSize: 10),
                .foregroundColor: reportData.adherenceRatePercent >= 80.0 ? UIColor(red: 0.1, green: 0.6, blue: 0.3, alpha: 1.0) : copperColor
            ])

            "Pencere:".draw(at: CGPoint(x: col3X, y: currentY + 24), withAttributes: labelAttrs)
            "\(reportData.preT0DaysCount) Gün Önce / \(reportData.postT0DaysCount) Gün Sonra".draw(at: CGPoint(x: col3X + 50, y: currentY + 24), withAttributes: valueAttrs)

            currentY += 75

            // 3. Section: Pre-Post T0 Comparative Table
            let sectionTitleAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.boldSystemFont(ofSize: 11),
                .foregroundColor: navyColor
            ]
            "1. BİYOBELİRTEÇ PRE-POST T0 DEĞİŞİM TABLOSU".draw(at: CGPoint(x: margin, y: currentY), withAttributes: sectionTitleAttrs)
            currentY += 16

            // Table Header
            let tableHeaderY = currentY
            let tableW = pageWidth - 2 * margin
            context.cgContext.setFillColor(navyColor.cgColor)
            context.cgContext.fill(CGRect(x: margin, y: tableHeaderY, width: tableW, height: 18))

            let thAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.boldSystemFont(ofSize: 8.5),
                .foregroundColor: UIColor.white
            ]

            "Gösterge".draw(at: CGPoint(x: margin + 6, y: tableHeaderY + 3), withAttributes: thAttrs)
            "T-14 Ort.".draw(at: CGPoint(x: margin + 175, y: tableHeaderY + 3), withAttributes: thAttrs)
            "T+14 Ort.".draw(at: CGPoint(x: margin + 230, y: tableHeaderY + 3), withAttributes: thAttrs)
            "Değişim %".draw(at: CGPoint(x: margin + 285, y: tableHeaderY + 3), withAttributes: thAttrs)
            "p-değeri".draw(at: CGPoint(x: margin + 345, y: tableHeaderY + 3), withAttributes: thAttrs)
            "Klinik Yorum".draw(at: CGPoint(x: margin + 395, y: tableHeaderY + 3), withAttributes: thAttrs)

            currentY += 18

            // Table Rows
            let rowFont = UIFont.systemFont(ofSize: 8.5)
            let cellAttrs: [NSAttributedString.Key: Any] = [.font: rowFont, .foregroundColor: UIColor.black]

            for (idx, delta) in reportData.deltas.prefix(7).enumerated() {
                let rowRect = CGRect(x: margin, y: currentY, width: tableW, height: 16)
                if idx % 2 == 1 {
                    context.cgContext.setFillColor(UIColor(white: 0.96, alpha: 1.0).cgColor)
                    context.cgContext.fill(rowRect)
                }

                delta.metricName.draw(at: CGPoint(x: margin + 6, y: currentY + 2), withAttributes: cellAttrs)
                "\(delta.preT0Mean) \(delta.unit)".draw(at: CGPoint(x: margin + 175, y: currentY + 2), withAttributes: cellAttrs)
                "\(delta.postT0Mean) \(delta.unit)".draw(at: CGPoint(x: margin + 230, y: currentY + 2), withAttributes: cellAttrs)

                let deltaColor = delta.deltaPercentage >= 0 ? navyColor : copperColor
                "\(delta.deltaPercentage > 0 ? "+" : "")\(delta.deltaPercentage)%".draw(at: CGPoint(x: margin + 285, y: currentY + 2), withAttributes: [
                    .font: UIFont.boldSystemFont(ofSize: 8.5),
                    .foregroundColor: deltaColor
                ])

                "p < \(delta.pValueApprox)".draw(at: CGPoint(x: margin + 345, y: currentY + 2), withAttributes: cellAttrs)
                delta.clinicalInterpretation.draw(at: CGPoint(x: margin + 395, y: currentY + 2), withAttributes: cellAttrs)

                currentY += 16
            }
            currentY += 16

            // 4. Section: Visual Trend Graph Mock Representation
            "2. T0 ÇAPASI ZAMAN SERİSİ VE BİYOBELİRTEÇ EĞİLİMİ".draw(at: CGPoint(x: margin, y: currentY), withAttributes: sectionTitleAttrs)
            currentY += 16

            let chartRect = CGRect(x: margin, y: currentY, width: tableW, height: 110)
            context.cgContext.setStrokeColor(UIColor.lightGray.cgColor)
            context.cgContext.setLineWidth(0.8)
            context.cgContext.stroke(chartRect)

            // Draw vertical T0 intervention line
            let t0LineX = chartRect.origin.x + (chartRect.width * 0.45)
            context.cgContext.setStrokeColor(copperColor.cgColor)
            context.cgContext.setLineWidth(2.0)
            context.cgContext.setLineDash(phase: 0, lengths: [4, 4])
            context.cgContext.move(to: CGPoint(x: t0LineX, y: chartRect.origin.y))
            context.cgContext.addLine(to: CGPoint(x: t0LineX, y: chartRect.origin.y + chartRect.height))
            context.cgContext.strokePath()
            context.cgContext.setLineDash(phase: 0, lengths: []) // Reset dash

            "T0 Müdahale (Reçete / Doz Değişimi)".draw(at: CGPoint(x: t0LineX + 5, y: chartRect.origin.y + 6), withAttributes: [
                .font: UIFont.boldSystemFont(ofSize: 8),
                .foregroundColor: copperColor
            ])

            "← T-14 Stabil Bazal Dönem".draw(at: CGPoint(x: chartRect.origin.x + 10, y: chartRect.origin.y + chartRect.height - 15), withAttributes: [
                .font: UIFont.systemFont(ofSize: 8),
                .foregroundColor: UIColor.gray
            ])

            "T+14 Tedavi İzlem Dönemi →".draw(at: CGPoint(x: t0LineX + 20, y: chartRect.origin.y + chartRect.height - 15), withAttributes: [
                .font: UIFont.systemFont(ofSize: 8),
                .foregroundColor: UIColor.gray
            ])

            currentY += 125

            // 5. Section: Clinical Observations
            "3. NESNEL GÖZLEMLER VE HEKİM DEĞERLENDİRME NOTLARI".draw(at: CGPoint(x: margin, y: currentY), withAttributes: sectionTitleAttrs)
            currentY += 16

            let obsAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 9),
                .foregroundColor: UIColor.darkGray
            ]

            for obs in reportData.summaryObservations {
                let bulletStr = "• \(obs)"
                bulletStr.draw(at: CGPoint(x: margin + 8, y: currentY), withAttributes: obsAttrs)
                currentY += 15
            }
            currentY += 15

            // 6. Section: Legal & Ethical Disclaimer Footer
            let footerY = pageHeight - margin - 50
            context.cgContext.setStrokeColor(UIColor.lightGray.cgColor)
            context.cgContext.setLineWidth(0.5)
            context.cgContext.move(to: CGPoint(x: margin, y: footerY))
            context.cgContext.addLine(to: CGPoint(x: pageWidth - margin, y: footerY))
            context.cgContext.strokePath()

            let disclaimerRect = CGRect(x: margin, y: footerY + 8, width: tableW, height: 40)
            let disclaimerAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.italicSystemFont(ofSize: 7.5),
                .foregroundColor: UIColor.gray
            ]
            let disclaimerParagraph = NSMutableParagraphStyle()
            disclaimerParagraph.lineSpacing = 2.0

            let disclaimerAttributed = NSAttributedString(
                string: "ÖNEMLİ YASAL VE TIBBİ BİLGİLENDİRME: \(reportData.nonDiagnosticDisclaimer)\nBu çıktı hekim-hasta görüşmesini ikame etmez; klinik görüşmede hatırlama yanlılığını (recall bias) aşmaya yönelik nesnel telemetri desteği sağlar.",
                attributes: [
                    .font: UIFont.italicSystemFont(ofSize: 7.5),
                    .foregroundColor: UIColor.gray,
                    .paragraphStyle: disclaimerParagraph
                ]
            )
            disclaimerAttributed.draw(in: disclaimerRect)
        }

        return data
    }
}
