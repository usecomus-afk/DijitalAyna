import Foundation

/// Defines psychiatric and somatic medication categories
public enum MedicationCategory: String, Codable, CaseIterable {
    case ssri = "SSRI (Seçici Serotonin Gerialım İnhibitörü)"
    case snri = "SNRI (Serotonin-Noradrenalin Gerialım İnhibitörü)"
    case antipsychotic = "Antipsikotik"
    case moodStabilizer = "Duygudurum Dengeleyici"
    case anxiolytic = "Anksiyolitik"
    case hypnotic = "Hipnotik / Uyku Düzenleyici"
    case other = "Diğer"
}

/// Represents a prescribed medication with dosage, titration history, and T0 intervention anchor
public struct Medication: Identifiable, Codable, Equatable {
    public let id: UUID
    public var name: String
    public var category: MedicationCategory
    public var dosageMg: Double
    public var frequency: String
    public var scheduledTimeSlots: [String]
    public var instructions: String
    public var startDate: Date // Initial T0 anchor
    public var interventionDates: [Date] // Historical dose change dates
    public var isActive: Bool
    public var createdAt: Date

    public init(
        id: UUID = UUID(),
        name: String,
        category: MedicationCategory,
        dosageMg: Double,
        frequency: String = "Günde 1x",
        scheduledTimeSlots: [String] = ["09:00"],
        instructions: String = "Tok karnına, bol su ile",
        startDate: Date = Date(),
        interventionDates: [Date] = [],
        isActive: Bool = true,
        createdAt: Date = Date()
    ) {
        self.id = id
        self.name = name
        self.category = category
        self.dosageMg = dosageMg
        self.frequency = frequency
        self.scheduledTimeSlots = scheduledTimeSlots
        self.instructions = instructions
        self.startDate = startDate
        self.interventionDates = interventionDates
        self.isActive = isActive
        self.createdAt = createdAt
    }

    /// Records a new dose adjustment / titration event as a T0 anchor
    public mutating func recordDoseAdjustment(newDosageMg: Double, effectiveDate: Date = Date()) {
        self.interventionDates.append(effectiveDate)
        self.dosageMg = newDosageMg
    }
}
