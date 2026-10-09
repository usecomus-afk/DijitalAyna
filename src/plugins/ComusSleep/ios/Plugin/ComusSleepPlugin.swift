import Foundation
import Capacitor
import HealthKit

@objc(ComusSleepPlugin)
public class ComusSleepPlugin: CAPPlugin {
    private let healthStore = HKHealthStore()

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("HealthKit is not available on this device")
            return
        }

        guard let sleepType = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) else {
            call.reject("Sleep Analysis type is not available")
            return
        }

        let typesToRead: Set<HKObjectType> = [sleepType]

        healthStore.requestAuthorization(toShare: nil, read: typesToRead) { (success, error) in
            if let error = error {
                call.reject("Authorization failed: \(error.localizedDescription)")
            } else {
                call.resolve([
                    "granted": success
                ])
            }
        }
    }

    @objc func getSleepData(_ call: CAPPluginCall) {
        guard let startDateString = call.getString("startDate"),
              let endDateString = call.getString("endDate") else {
            call.reject("Must provide startDate and endDate (ISO8601 strings)")
            return
        }

        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        
        var startDate = formatter.date(from: startDateString)
        if startDate == nil {
            let fallbackFormatter = ISO8601DateFormatter()
            startDate = fallbackFormatter.date(from: startDateString)
        }
        
        var endDate = formatter.date(from: endDateString)
        if endDate == nil {
            let fallbackFormatter = ISO8601DateFormatter()
            endDate = fallbackFormatter.date(from: endDateString)
        }

        guard let validStartDate = startDate, let validEndDate = endDate else {
            call.reject("Invalid date format. Use ISO8601 strings.")
            return
        }

        guard let sleepType = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) else {
            call.reject("Sleep Analysis type is not available")
            return
        }

        let predicate = HKQuery.predicateForSamples(withStart: validStartDate, end: validEndDate, options: .strictStartDate)
        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)

        let query = HKSampleQuery(sampleType: sleepType, predicate: predicate, limit: 100, sortDescriptors: [sortDescriptor]) { (query, samples, error) in
            if let error = error {
                call.reject("Failed to fetch sleep data: \(error.localizedDescription)")
                return
            }

            guard let sleepSamples = samples as? [HKCategorySample] else {
                call.resolve(["samples": []])
                return
            }

            var results: [[String: Any]] = []
            
            let resultFormatter = ISO8601DateFormatter()
            resultFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

            for sample in sleepSamples {
                results.append([
                    "value": sample.value, // HKCategoryValueSleepAnalysis
                    "startDate": resultFormatter.string(from: sample.startDate),
                    "endDate": resultFormatter.string(from: sample.endDate),
                    "source": sample.sourceRevision.source.name
                ])
            }

            call.resolve([
                "samples": results
            ])
        }

        healthStore.execute(query)
    }
}
