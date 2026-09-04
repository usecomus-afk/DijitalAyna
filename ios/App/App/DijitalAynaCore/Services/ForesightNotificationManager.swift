import Foundation
import UserNotifications

/// Manager responsible for scheduling and delivering explainable clinical foresight notifications
/// Adheres to digital phenotyping ethical communication guidelines (non-alarmist, objective, explainable)
public final class ForesightNotificationManager: NSObject, UNUserNotificationCenterDelegate {
    public static let shared = ForesightNotificationManager()

    public static let categoryIdentifier = "CLINICAL_INSIGHT_ALERT"
    public static let actionAddToReport = "ADD_TO_REPORT_ACTION"
    public static let actionViewMirror = "VIEW_MIRROR_ACTION"

    private let notificationCenter = UNUserNotificationCenter.current()
    private let userDefaults = UserDefaults.standard
    private let lastNotificationDatePrefix = "ForesightNotificationManager.lastDate."

    private override init() {
        super.init()
        notificationCenter.delegate = self
        setupNotificationCategories()
    }

    /// Sets up notification action buttons and categories
    public func setupNotificationCategories() {
        let addToReportAction = UNNotificationAction(
            identifier: Self.actionAddToReport,
            title: "Hekim Raporuna Ekle",
            options: [.foreground]
        )

        let viewMirrorAction = UNNotificationAction(
            identifier: Self.actionViewMirror,
            title: "Aynada Görüntüle",
            options: [.foreground]
        )

        let category = UNNotificationCategory(
            identifier: Self.categoryIdentifier,
            actions: [addToReportAction, viewMirrorAction],
            intentIdentifiers: [],
            options: [.customDismissAction]
        )

        notificationCenter.setNotificationCategories([category])
    }

    /// Requests user authorization for local notifications
    @discardableResult
    public func requestAuthorization() async -> Bool {
        do {
            let granted = try await notificationCenter.requestAuthorization(options: [.alert, .sound, .badge])
            return granted
        } catch {
            print("[ForesightNotificationManager] Authorization request failed: \(error.localizedDescription)")
            return false
        }
    }

    /// Checks if a notification for this clinical condition is currently under 24-hour cooldown
    public func isUnderCooldown(for insightType: ClinicalInsightType) -> Bool {
        let key = lastNotificationDatePrefix + insightType.rawValue
        guard let lastTimestamp = userDefaults.object(forKey: key) as? Date else {
            return false
        }
        // Cooldown: 24 hours between notifications of the same clinical type to prevent alert fatigue
        let elapsedHours = Date().timeIntervalSince(lastTimestamp) / 3600.0
        return elapsedHours < 24.0
    }

    /// Schedules an explainable early awareness notification if not under cooldown
    @discardableResult
    public func scheduleInsightNotification(alert: InsightAlert, delaySeconds: TimeInterval = 2.0) async -> Bool {
        guard !isUnderCooldown(for: alert.insightType) else {
            print("[ForesightNotificationManager] Skipped notification for \(alert.insightType.rawValue): Under 24h cooldown.")
            return false
        }

        let content = UNMutableNotificationContent()
        content.title = "Duty-Comus: Erken Farkındalık Gözlemi"
        content.subtitle = alert.title
        content.body = alert.notificationBody
        content.sound = .default
        content.categoryIdentifier = Self.categoryIdentifier
        content.userInfo = [
            "insightId": alert.id.uuidString,
            "insightType": alert.insightType.rawValue,
            "title": alert.title,
            "notificationBody": alert.notificationBody
        ]

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: max(1.0, delaySeconds), repeats: false)
        let requestIdentifier = "duty_comus_insight_\(alert.insightType.rawValue)_\(UUID().uuidString.prefix(8))"
        let request = UNNotificationRequest(identifier: requestIdentifier, content: content, trigger: trigger)

        do {
            try await notificationCenter.add(request)
            // Record last notification timestamp
            let key = lastNotificationDatePrefix + alert.insightType.rawValue
            userDefaults.set(Date(), forKey: key)
            print("[ForesightNotificationManager] Successfully scheduled notification for \(alert.title)")
            return true
        } catch {
            print("[ForesightNotificationManager] Failed to schedule notification: \(error.localizedDescription)")
            return false
        }
    }

    /// Delegate callback when notification is delivered in foreground
    public func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        // Show banner and sound even if app is in foreground
        completionHandler([.banner, .sound, .list])
    }

    /// Delegate callback when user interacts with notification or action buttons
    public func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo
        let actionIdentifier = response.actionIdentifier
        let insightTypeRaw = userInfo["insightType"] as? String ?? ""

        switch actionIdentifier {
        case Self.actionAddToReport:
            print("[ForesightNotificationManager] User clicked 'Hekim Raporuna Ekle' for \(insightTypeRaw)")
            NotificationCenter.default.post(
                name: NSNotification.Name("AddInsightToClinicianReport"),
                object: nil,
                userInfo: userInfo
            )
        case Self.actionViewMirror:
            print("[ForesightNotificationManager] User clicked 'Aynada Görüntüle' for \(insightTypeRaw)")
            NotificationCenter.default.post(
                name: NSNotification.Name("NavigateToInsightsView"),
                object: nil,
                userInfo: userInfo
            )
        default:
            print("[ForesightNotificationManager] User opened app from notification: \(insightTypeRaw)")
        }

        completionHandler()
    }
}
