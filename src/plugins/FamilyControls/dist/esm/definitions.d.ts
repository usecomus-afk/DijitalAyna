export interface FamilyControlsPlugin {
    requestAuthorization(): Promise<{
        granted: boolean;
        fallback?: boolean;
        reason?: string;
    }>;
    selectApps(): Promise<{
        success: boolean;
        fallback?: boolean;
    }>;
    setShield(): Promise<{
        success: boolean;
        fallback?: boolean;
    }>;
    clearShield(): Promise<{
        success: boolean;
        fallback?: boolean;
    }>;
}
