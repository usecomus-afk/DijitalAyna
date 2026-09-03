import Foundation

public enum MedicationLogStatus: String, Codable, CaseIterable {
    case taken = "Alındı"
    case skipped = "Atlandı"
    case delayed = "Gecikmeli Alındı"
}

/// Telemetry record for each daily medication dose
public struct MedicationLog: Identifiable, Codable, Equatable {
    public let id: UUID
    public let medicationId: UUID
    public let medicationName: String
    public let scheduledTime: Date
    public var actualTime: Date?
    public var status: MedicationLogStatus
    public var sideEffects: [String]
    public var notes: String?
    public let loggedAt: Date

    public init(
        id: UUID = UUID(),
        medicationId: UUID,
        medicationName: String,
        scheduledTime: Date,
        actualTime: Date? = nil,
        status: MedicationLogStatus = .taken,
        sideEffects: [String] = [],
        notes: String? = nil,
        loggedAt: Date = Date()
    ) {
        self.id = id
        self.medicationId = medicationId
        self.medicationName = medicationName
        self.scheduledTime = scheduledTime
        self.actualTime = actualTime ?? (status == .taken ? loggedAt : nil)
        self.status = status
        self.sideEffects = sideEffects
        self.notes = notes
        self.loggedAt = loggedAt
    }
}
