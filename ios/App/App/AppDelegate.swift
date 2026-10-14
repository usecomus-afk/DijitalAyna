import UIKit
import Capacitor
import FirebaseCore
import UserNotifications

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        FirebaseApp.configure()
        // Register native background sync task for night analytics
        BackgroundSyncManager.shared.registerBackgroundTask()
        BackgroundSyncManager.shared.scheduleNextNightlyProcessing()
        sanitizeScheduledNotifications()
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        sanitizeScheduledNotifications()
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
    }

    /// Ensures "Günü Geride Bırakırken 🌙" (ID 2003) and other daily notifications
    /// strictly use calendar-based triggers at their designated hours (21:30 for evening),
    /// migrating or removing any legacy repeating UNTimeIntervalNotificationTrigger requests.
    private func sanitizeScheduledNotifications() {
        let center = UNUserNotificationCenter.current()
        let currentHour = Calendar.current.component(.hour, from: Date())
        if currentHour >= 5 && currentHour < 18 {
            center.removeDeliveredNotifications(withIdentifiers: ["2003"])
        }

        center.getPendingNotificationRequests { requests in
            for req in requests {
                if req.identifier == "2003" || req.content.title.contains("Günü Geride Bırakırken") {
                    if let calTrigger = req.trigger as? UNCalendarNotificationTrigger,
                       let hour = calTrigger.dateComponents.hour,
                       hour >= 18 {
                        continue
                    }
                    // Replace legacy interval trigger with strict 21:30 evening calendar trigger
                    center.removePendingNotificationRequests(withIdentifiers: [req.identifier])
                    var eveningComponents = DateComponents()
                    eveningComponents.hour = 21
                    eveningComponents.minute = 30
                    eveningComponents.second = 0
                    let newTrigger = UNCalendarNotificationTrigger(dateMatching: eveningComponents, repeats: true)
                    let fixedReq = UNNotificationRequest(identifier: "2003", content: req.content, trigger: newTrigger)
                    center.add(fixedReq, withCompletionHandler: nil)
                } else if let intervalTrigger = req.trigger as? UNTimeIntervalNotificationTrigger, intervalTrigger.repeats {
                    // Remove any other legacy repeating time-interval triggers from older builds
                    center.removePendingNotificationRequests(withIdentifiers: [req.identifier])
                }
            }
        }
    }

    func applicationWillTerminate(_ application: UIApplication) {
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}

