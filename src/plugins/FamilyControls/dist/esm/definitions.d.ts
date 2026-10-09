export interface FamilyControlsPlugin {
    requestAuthorization(): Promise<{
        granted: boolean;
    }>;
    selectApps(): Promise<{
        success: boolean;
    }>;
    setShield(): Promise<{
        success: boolean;
    }>;
    clearShield(): Promise<{
        success: boolean;
    }>;
}
