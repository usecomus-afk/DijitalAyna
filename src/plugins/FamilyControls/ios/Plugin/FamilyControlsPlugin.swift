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
        CAPPluginMethod(name: "clearShield", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getStatus", returnType: CAPPluginReturnPromise)
    ]
    
    private let selectionStorageKey = "comus_family_activity_selection"
    private var selection = FamilyActivitySelection()
    private let store = ManagedSettingsStore()

    override public func load() {
        super.load()
        loadSavedSelection()
    }

    private func loadSavedSelection() {
        if #available(iOS 16.0, *) {
            guard let data = UserDefaults.standard.data(forKey: selectionStorageKey) else { return }
            if let decoded = try? PropertyListDecoder().decode(FamilyActivitySelection.self, from: data) {
                self.selection = decoded
            }
        }
    }

    private func saveSelection() {
        if #available(iOS 16.0, *) {
            if let data = try? PropertyListEncoder().encode(self.selection) {
                UserDefaults.standard.set(data, forKey: selectionStorageKey)
            }
        }
    }

    private func totalSelectedCount() -> Int {
        if #available(iOS 16.0, *) {
            return selection.applicationTokens.count + selection.categoryTokens.count + selection.webDomainTokens.count
        }
        return 0
    }

    @objc func getStatus(_ call: CAPPluginCall) {
        if #available(iOS 16.0, *) {
            loadSavedSelection()
            let approved = AuthorizationCenter.shared.authorizationStatus == .approved
            call.resolve([
                "authorized": approved,
                "fallback": !approved,
                "selectedCount": totalSelectedCount()
            ])
        } else {
            call.resolve([
                "authorized": false,
                "fallback": true,
                "selectedCount": 0
            ])
        }
    }

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        if #available(iOS 16.0, *) {
            Task {
                do {
                    try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
                    let approved = AuthorizationCenter.shared.authorizationStatus == .approved
                    call.resolve([ "granted": approved, "fallback": !approved ])
                } catch {
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
            loadSavedSelection()
            guard AuthorizationCenter.shared.authorizationStatus == .approved else {
                call.resolve([ "success": false, "fallback": true, "selectedCount": 0 ])
                return
            }
            DispatchQueue.main.async {
                let binding = Binding(
                    get: { self.selection },
                    set: {
                        self.selection = $0
                        self.saveSelection()
                    }
                )
                let hostingController = UIHostingController(
                    rootView: PickerView(
                        selection: binding,
                        onDone: {
                            self.saveSelection()
                            call.resolve([
                                "success": true,
                                "fallback": false,
                                "selectedCount": self.totalSelectedCount()
                            ])
                        }
                    )
                )
                hostingController.modalPresentationStyle = .pageSheet
                self.bridge?.viewController?.present(hostingController, animated: true, completion: nil)
            }
        } else {
            call.resolve([ "success": false, "fallback": true, "selectedCount": 0 ])
        }
    }

    @objc func setShield(_ call: CAPPluginCall) {
        if #available(iOS 16.0, *) {
            loadSavedSelection()
            guard AuthorizationCenter.shared.authorizationStatus == .approved else {
                call.resolve(["success": true, "fallback": true, "selectedCount": 0])
                return
            }
            let count = totalSelectedCount()
            store.shield.applications = selection.applicationTokens.isEmpty ? nil : selection.applicationTokens
            store.shield.applicationCategories = selection.categoryTokens.isEmpty
                ? nil
                : ShieldSettings.ActivityCategoryPolicy.specific(selection.categoryTokens)
            store.shield.webDomains = selection.webDomainTokens.isEmpty ? nil : selection.webDomainTokens
            store.shield.webDomainCategories = selection.categoryTokens.isEmpty
                ? nil
                : ShieldSettings.ActivityCategoryPolicy.specific(selection.categoryTokens)
            call.resolve([
                "success": count > 0,
                "fallback": false,
                "selectedCount": count
            ])
        } else {
            call.resolve(["success": true, "fallback": true, "selectedCount": 0])
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
            store.shield.webDomains = nil
            store.shield.webDomainCategories = nil
            store.clearAllSettings()
            call.resolve(["success": true, "fallback": false])
        } else {
            call.resolve(["success": true, "fallback": true])
        }
    }
}

@available(iOS 16.0, *)
struct PickerView: View {
    @Binding var selection: FamilyActivitySelection
    var onDone: () -> Void
    @Environment(\.presentationMode) var presentationMode

    var body: some View {
        NavigationView {
            FamilyActivityPicker(selection: $selection)
                .navigationTitle("Uygulamaları Seç")
                .navigationBarItems(trailing: Button("Bitti") {
                    onDone()
                    presentationMode.wrappedValue.dismiss()
                })
        }
    }
}

