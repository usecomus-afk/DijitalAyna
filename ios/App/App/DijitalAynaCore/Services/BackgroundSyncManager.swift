import Foundation
import BackgroundTasks
import UserNotifications

/// Manages background task scheduling, nightly aggregation, and low-energy edge computation
public final class BackgroundSyncManager {
    public static let shared = BackgroundSyncManager()
    public static let taskIdentifier = "com.dijitalayna.app.analytics"

    private init() {}

    /// Registers the background app refresh task with iOS system scheduler
    public func registerBackgroundTask() {
        BGTaskScheduler.shared.register(forTaskWithIdentifier: BackgroundSyncManager.taskIdentifier, using: nil) { task in
            guard let appRefreshTask = task as? BGAppRefreshTask else { return }
            self.handleAppRefresh(task: appRefreshTask)
        }
    }

    /// Schedules the next nightly analysis task (ideally around 02:30 AM when device is charging)
    public func scheduleNextNightlyProcessing() {
        let request = BGAppRefreshTaskRequest(identifier: BackgroundSyncManager.taskIdentifier)

        let calendar = Calendar.current
        var components = calendar.dateComponents([.year, .month, .day], from: Date())
        components.hour = 2
        components.minute = 30

        var scheduledDate = calendar.date(from: components) ?? Date().addingTimeInterval(3600 * 4)
        if scheduledDate <= Date() {
            scheduledDate = calendar.date(byAdding: .day, value: 1, to: scheduledDate)!
        }

        request.earliestBeginDate = scheduledDate

        do {
            try BGTaskScheduler.shared.submit(request)
            print("[BackgroundSync] Nightly analytics scheduled for \(scheduledDate)")
        } catch {
            print("[BackgroundSync] Failed to submit BGAppRefreshTaskRequest: \(error.localizedDescription)")
        }
    }

    private func handleAppRefresh(task: BGAppRefreshTask) {
        // Enforce strict battery & memory constraint: timeout handler
        task.expirationHandler = {
            print("[BackgroundSync] Execution time expired by iOS system watchdog. Canceling.")
        }

        // Schedule next execution window
        scheduleNextNightlyProcessing()

        DispatchQueue.global(qos: .utility).async {
            // 1. Fetch HealthKit metrics
            HealthKitService.shared.fetchDailySteps(for: Date()) { steps in
                HealthKitService.shared.fetchSleepMetrics(for: Date()) { sol, tst, waso, se, sri in
                    let mobility = CoreLocationClusterer.shared.computeMobilityMetrics(for: Date())

                    // 2. Synthesize daily phenotype
                    let todayPhenotype = DailyPhenotype(
                        date: Date(),
                        stepsCount: steps,
                        sleepOnsetLatencyMinutes: sol,
                        totalSleepTimeMinutes: tst,
                        wakeAfterSleepOnsetMinutes: waso,
                        sleepEfficiencyPercent: se,
                        sleepRegularityIndex: sri,
                        radiusOfGyrationKm: mobility.radiusOfGyrationKm,
                        homestayPercentage: mobility.homestayPercentage,
                        uniqueLocationsCount: mobility.uniqueLocationsCount
                    )

                    print("[BackgroundSync] Successfully extracted daily phenotype at: \(todayPhenotype.dateString)")
                    task.setTaskCompleted(success: true)
                }
            }
        }
    }
}
