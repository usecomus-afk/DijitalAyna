import Foundation
import Capacitor
import FamilyControls
import ManagedSettings
import SwiftUI

@objc(FamilyControlsPlugin)
public class FamilyControlsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "FamilyControlsPlugin"
    public let jsName = "FamilyControls"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "selectApps", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setShield", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearShield", returnType: CAPPluginReturnPromise)
    ]
    
    private var selection = FamilyActivitySelection()
    private let store = ManagedSettingsStore()

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        if #available(iOS 16.0, *) {
            Task {
                do {
                    try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
                    call.resolve([ "granted": true, "fallback": false ])
                } catch {
                    // When the restricted com.apple.developer.family-controls distribution entitlement
                    // is not active in the provisioning profile, resolve gracefully so the app uses its
                    // built-in Comus Impulse Shield selector instead of showing a system daemon error.
                    call.resolve([
                        "granted": false,
                        "fallback": true,
                        "reason": error.localizedDescription
                    ])
                }
            }
        } else {
            call.resolve([ "granted": false, "fallback": true ])
        }
    }

    @objc func selectApps(_ call: CAPPluginCall) {
        if #available(iOS 16.0, *) {
            guard AuthorizationCenter.shared.authorizationStatus == .approved else {
                call.resolve([ "success": false, "fallback": true ])
                return
            }
            DispatchQueue.main.async {
                let binding = Binding(
                    get: { self.selection },
                    set: { self.selection = $0 }
                )
                let hostingController = UIHostingController(rootView: PickerView(selection: binding, call: call))
                hostingController.modalPresentationStyle = .pageSheet
                self.bridge?.viewController?.present(hostingController, animated: true, completion: nil)
            }
        } else {
            call.resolve([ "success": false, "fallback": true ])
        }
    }

    @objc func setShield(_ call: CAPPluginCall) {
        if #available(iOS 16.0, *) {
            guard AuthorizationCenter.shared.authorizationStatus == .approved else {
                call.resolve(["success": true, "fallback": true])
                return
            }
            store.shield.applications = selection.applicationTokens.isEmpty ? nil : selection.applicationTokens
            store.shield.applicationCategories = selection.categoryTokens.isEmpty ? nil : ShieldSettings.ActivityCategoryPolicy.specific(selection.categoryTokens)
            call.resolve(["success": true, "fallback": false])
        } else {
            call.resolve(["success": true, "fallback": true])
        }
    }

    @objc func clearShield(_ call: CAPPluginCall) {
        if #available(iOS 16.0, *) {
            guard AuthorizationCenter.shared.authorizationStatus == .approved else {
                call.resolve(["success": true, "fallback": true])
                return
            }
            store.shield.applications = nil
            store.shield.applicationCategories = nil
            call.resolve(["success": true, "fallback": false])
        } else {
            call.resolve(["success": true, "fallback": true])
        }
    }
}

@available(iOS 16.0, *)
struct PickerView: View {
    @Binding var selection: FamilyActivitySelection
    var call: CAPPluginCall
    @Environment(\.presentationMode) var presentationMode

    var body: some View {
        NavigationView {
            FamilyActivityPicker(selection: $selection)
                .navigationTitle("Uygulamaları Seç")
                .navigationBarItems(trailing: Button("Bitti") {
                    call.resolve(["success": true])
                    presentationMode.wrappedValue.dismiss()
                })
        }
    }
}
