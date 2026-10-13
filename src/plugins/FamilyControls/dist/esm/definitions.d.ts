export interface FamilyControlsPlugin {
    requestAuthorization(): Promise<{
        granted: boolean;
        fallback?: boolean;
        reason?: string;
    }>;
    selectApps(): Promise<{
        success: boolean;
        fallback?: boolean;
        selectedCount?: number;
    }>;
    setShield(): Promise<{
        success: boolean;
        fallback?: boolean;
        selectedCount?: number;
    }>;
    clearShield(): Promise<{
        success: boolean;
        fallback?: boolean;
    }>;
    getStatus(): Promise<{
        authorized: boolean;
        fallback: boolean;
        selectedCount: number;
    }>;
}
