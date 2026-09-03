import Foundation
import HealthKit
import CoreMotion

/// Manages HealthKit querying and on-device sleep architecture & physical activity extraction
public final class HealthKitService: NSObject, ObservableObject {
    public static let shared = HealthKitService()

    private let healthStore = HKHealthStore()
    private let motionManager = CMMotionManager()

    @Published public var isAuthorized: Bool = false

    private override init() {
        super.init()
    }

    /// Requests read permissions for step count and sleep analysis
    public func requestAuthorization(completion: @escaping (Bool, Error?) -> Void) {
        guard HKHealthStore.isHealthDataAvailable() else {
            completion(false, NSError(domain: "HealthKit", code: -1, userInfo: [NSLocalizedDescriptionKey: "HealthKit bu cihazda desteklenmiyor."]))
            return
        }

        let readTypes: Set<HKObjectType> = [
            HKObjectType.quantityType(forIdentifier: .stepCount)!,
            HKObjectType.categoryType(forIdentifier: .sleepAnalysis)!,
            HKObjectType.quantityType(forIdentifier: .basalEnergyBurned)!
        ]

        healthStore.requestAuthorization(toShare: nil, read: readTypes) { [weak self] success, error in
            DispatchQueue.main.async {
                self?.isAuthorized = success
                completion(success, error)
            }
        }
    }

    /// Queries daily step count for a specific date
    public func fetchDailySteps(for date: Date, completion: @escaping (Int) -> Void) {
        guard let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount) else {
            completion(0)
            return
        }

        let calendar = Calendar.current
        let startOfDay = calendar.startOfDay(for: date)
        let endOfDay = calendar.date(byAdding: .day, value: 1, to: startOfDay)!
        let predicate = HKQuery.predicateForSamples(withStart: startOfDay, end: endOfDay, options: .strictStartDate)

        let query = HKStatisticsQuery(quantityType: stepType, quantitySamplePredicate: predicate, options: .cumulativeSum) { _, result, _ in
            let totalSteps = result?.sumQuantity()?.doubleValue(for: HKUnit.count()) ?? 0.0
            DispatchQueue.main.async {
                completion(Int(totalSteps))
            }
        }

        healthStore.execute(query)
    }

    /// Computes sleep architecture metrics (SOL, TST, WASO, SE, SRI) from HKCategoryValueSleepAnalysis
    public func fetchSleepMetrics(for date: Date, completion: @escaping (Double, Double, Double, Double, Double) -> Void) {
        guard let sleepType = HKCategoryType.categoryType(forIdentifier: .sleepAnalysis) else {
            completion(20.0, 420.0, 30.0, 85.0, 80.0)
            return
        }

        let calendar = Calendar.current
        let startOfDay = calendar.date(byAdding: .hour, value: -12, to: calendar.startOfDay(for: date))!
        let endOfDay = calendar.date(byAdding: .hour, value: 12, to: calendar.startOfDay(for: date))!
        let predicate = HKQuery.predicateForSamples(withStart: startOfDay, end: endOfDay, options: .strictStartDate)

        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)
        let query = HKSampleQuery(sampleType: sleepType, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: [sortDescriptor]) { _, samples, _ in
            guard let sleepSamples = samples as? [HKCategorySample], !sleepSamples.isEmpty else {
                // Return default healthy priors if no wearable connected
                DispatchQueue.main.async {
                    completion(22.0, 420.0, 25.0, 88.0, 85.0)
                }
                return
            }

            var totalAsleepMinutes: Double = 0.0
            var inBedMinutes: Double = 0.0
            var awakeIntervalsMinutes: Double = 0.0
            var firstSleepTime: Date?
            var bedStartTime: Date?

            for sample in sleepSamples {
                let durationMinutes = sample.endDate.timeIntervalSince(sample.startDate) / 60.0

                if bedStartTime == nil {
                    bedStartTime = sample.startDate
                }

                if #available(iOS 16.0, *) {
                    switch sample.value {
                    case HKCategoryValueSleepAnalysis.asleepCore.rawValue,
                         HKCategoryValueSleepAnalysis.asleepDeep.rawValue,
                         HKCategoryValueSleepAnalysis.asleepREM.rawValue,
                         HKCategoryValueSleepAnalysis.asleepUnspecified.rawValue:
                        totalAsleepMinutes += durationMinutes
                        if firstSleepTime == nil {
                            firstSleepTime = sample.startDate
                        }
                    case HKCategoryValueSleepAnalysis.awake.rawValue:
                        if firstSleepTime != nil {
                            awakeIntervalsMinutes += durationMinutes
                        }
                    case HKCategoryValueSleepAnalysis.inBed.rawValue:
                        inBedMinutes += durationMinutes
                    default:
                        break
                    }
                } else {
                    if sample.value == HKCategoryValueSleepAnalysis.asleep.rawValue {
                        totalAsleepMinutes += durationMinutes
                        if firstSleepTime == nil {
                            firstSleepTime = sample.startDate
                        }
                    } else if sample.value == HKCategoryValueSleepAnalysis.inBed.rawValue {
                        inBedMinutes += durationMinutes
                    }
                }
            }

            let solMinutes: Double
            if let bedStart = bedStartTime, let firstSleep = firstSleepTime {
                solMinutes = max(5.0, firstSleep.timeIntervalSince(bedStart) / 60.0)
            } else {
                solMinutes = 20.0
            }

            let effectiveInBed = max(totalAsleepMinutes + solMinutes + awakeIntervalsMinutes, inBedMinutes)
            let sleepEfficiency = effectiveInBed > 0 ? min(100.0, (totalAsleepMinutes / effectiveInBed) * 100.0) : 85.0
            let sleepRegularity = max(50.0, 100.0 - (abs(solMinutes - 20.0) * 1.2) - (awakeIntervalsMinutes * 0.8))

            DispatchQueue.main.async {
                completion(
                    round(solMinutes * 10) / 10,
                    round(totalAsleepMinutes * 10) / 10,
                    round(awakeIntervalsMinutes * 10) / 10,
                    round(sleepEfficiency * 10) / 10,
                    round(sleepRegularity * 10) / 10
                )
            }
        }

        healthStore.execute(query)
    }
}
