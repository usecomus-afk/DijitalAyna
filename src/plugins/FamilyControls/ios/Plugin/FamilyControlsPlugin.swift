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
        if #available(iOS 15.0, *) {
            Task {
                do {
                    try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
                    call.resolve([ "granted": true ])
                } catch {
                    call.reject("Authorization failed: \(error.localizedDescription)")
                }
            }
        } else {
            call.reject("Family Controls requires iOS 15.0+")
        }
    }

    @objc func selectApps(_ call: CAPPluginCall) {
        if #available(iOS 15.0, *) {
            DispatchQueue.main.async {
                let picker = FamilyActivityPicker(selection: self.$selection)
                let hostingController = UIHostingController(rootView: PickerView(selection: self.$selection, call: call))
                hostingController.modalPresentationStyle = .pageSheet
                self.bridge?.viewController?.present(hostingController, animated: true, completion: nil)
            }
        } else {
            call.reject("Family Controls requires iOS 15.0+")
        }
    }

    @objc func setShield(_ call: CAPPluginCall) {
        if #available(iOS 15.0, *) {
            store.shield.applications = selection.applicationTokens.isEmpty ? nil : selection.applicationTokens
            store.shield.applicationCategories = selection.categoryTokens.isEmpty ? nil : ShieldSettings.ActivityCategoryPolicy.specific(Array(selection.categoryTokens))
            call.resolve(["success": true])
        } else {
            call.reject("Family Controls requires iOS 15.0+")
        }
    }

    @objc func clearShield(_ call: CAPPluginCall) {
        if #available(iOS 15.0, *) {
            store.shield.applications = nil
            store.shield.applicationCategories = nil
            call.resolve(["success": true])
        } else {
            call.reject("Family Controls requires iOS 15.0+")
        }
    }
}

@available(iOS 15.0, *)
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
