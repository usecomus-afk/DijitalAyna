import Foundation

/// Statistical Process Control (SPC) Engine based on Exponentially Weighted Moving Average (EWMA)
/// Reference: Guth et al., 2025; JMIR Digital Phenotyping
public final class SPCEngine {
    public static let shared = SPCEngine()

    public let lambda: Double = 0.20 // Smoothing parameter (Guth et al. recommendation)
    public let controlLimitMultiplierL: Double = 2.5 // 2.5 sigma boundaries
    public let minBaselineDays: Int = 14 // 14-day stable period requirement

    private init() {}

    /// Calculates baseline parameters (mean and standard deviation) from stable period
    public func calculateBaseline(values: [Double]) -> (mean: Double, std: Double) {
        guard !values.isEmpty else { return (0.0, 1.0) }
        let mean = values.reduce(0.0, +) / Double(values.count)
        guard values.count > 1 else { return (mean, max(0.1, mean * 0.1)) }

        let sumOfSquaredDifferences = values.reduce(0.0) { $0 + pow($1 - mean, 2) }
        let std = sqrt(sumOfSquaredDifferences / Double(values.count - 1))
        return (mean, max(0.001, std))
    }

    /// Evaluates time series using EWMA and dynamic UCL/LCL control limits
    public func evaluateMetric(
        metricKey: String,
        metricTitle: String,
        domain: BiomarkerDomain,
        historicalValues: [Double],
        currentValue: Double,
        unit: String
    ) -> SPCDeviation? {
        guard historicalValues.count >= minBaselineDays else {
            return nil // In learning / calibration period
        }

        let baseline = calculateBaseline(values: Array(historicalValues.prefix(minBaselineDays)))
        let mu0 = baseline.mean
        let sigma0 = baseline.std

        // Compute recursive EWMA up to current time t
        var zt = mu0
        var consecutiveDeviations = 0

        for (index, observation) in historicalValues.enumerated() {
            let t = Double(index + 1)
            zt = lambda * observation + (1.0 - lambda) * zt

            // Exact dynamic control limit variance expansion factor
            let factor = (lambda / (2.0 - lambda)) * (1.0 - pow(1.0 - lambda, 2.0 * t))
            let sigmaZt = sigma0 * sqrt(max(0.0001, factor))
            let ucl = mu0 + controlLimitMultiplierL * sigmaZt
            let lcl = mu0 - controlLimitMultiplierL * sigmaZt

            if zt > ucl || zt < lcl {
                consecutiveDeviations += 1
            } else {
                consecutiveDeviations = 0
            }
        }

        // Evaluate today's observation
        let t = Double(historicalValues.count + 1)
        zt = lambda * currentValue + (1.0 - lambda) * zt
        let factor = (lambda / (2.0 - lambda)) * (1.0 - pow(1.0 - lambda, 2.0 * t))
        let sigmaZt = sigma0 * sqrt(max(0.0001, factor))
        let ucl = mu0 + controlLimitMultiplierL * sigmaZt
        let lcl = mu0 - controlLimitMultiplierL * sigmaZt

        let isAboveUCL = zt > ucl
        let isBelowLCL = zt < lcl

        if isAboveUCL || isBelowLCL {
            consecutiveDeviations += 1
        } else {
            consecutiveDeviations = 0
        }

        // Rule: Alarm produced when out-of-control for at least 2 consecutive observations
        guard consecutiveDeviations >= 2 else { return nil }

        let direction: DeviationDirection = isAboveUCL ? .elevated : .depressed
        let zScore = (currentValue - mu0) / sigma0

        let deltaVal = abs(round((currentValue - mu0) * 10) / 10)
        let directionText = isAboveUCL ? "yüksek" : "düşük"

        let explainableInsight = "\(metricTitle): Günlük ölçümünüz (\(round(currentValue * 10) / 10) \(unit)), 14 günlük kişisel bazal ortalamanızdan (\(round(mu0 * 10) / 10) \(unit)) \(deltaVal) \(unit) daha \(directionText) seyretti."

        let clinicalSignificance = "Ardışık \(consecutiveDeviations) gün boyunca EWMA (\(round(zt * 10) / 10)) kontrol sınırını (\(isAboveUCL ? "UCL: \(round(ucl * 10) / 10)" : "LCL: \(round(lcl * 10) / 10)")) aştı. Z-skor: \(round(zScore * 100) / 100)."

        return SPCDeviation(
            metricKey: metricKey,
            metricTitle: metricTitle,
            domain: domain,
            currentValue: currentValue,
            baselineMean: mu0,
            baselineStd: sigma0,
            ewmaSmoothedValue: zt,
            ucl: ucl,
            lcl: lcl,
            zScore: zScore,
            consecutiveDaysCount: consecutiveDeviations,
            direction: direction,
            explainableInsight: explainableInsight,
            clinicalSignificance: clinicalSignificance
        )
    }
}
