export interface ComusSleepPlugin {
    requestAuthorization(): Promise<{
        granted: boolean;
    }>;
    getSleepData(options: {
        startDate: string;
        endDate: string;
    }): Promise<{
        samples: {
            value: number;
            startDate: string;
            endDate: string;
            source: string;
        }[];
    }>;
}
declare const ComusSleep: ComusSleepPlugin;
export { ComusSleep };
