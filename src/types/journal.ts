export interface JournalEntry {
  id?: number; // Auto-increment ID
  date: string; // 'YYYY-MM-DD'
  createdAt: number; // Unix timestamp
  updatedAt: number; // Unix timestamp
  notes: string;
  dreamNotes?: string;
  imageUrls?: string[]; // Array of base64 strings or file paths
  reportedMetrics?: {
    screenTimeMinutes?: number;
    gameSessionMinutes?: number;
    // can add other manual metrics here
  };
}
