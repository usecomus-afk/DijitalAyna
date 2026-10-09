#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(FamilyControlsPlugin, "FamilyControls",
    CAP_PLUGIN_METHOD(requestAuthorization, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(selectApps, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(setShield, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(clearShield, CAPPluginReturnPromise);
)
