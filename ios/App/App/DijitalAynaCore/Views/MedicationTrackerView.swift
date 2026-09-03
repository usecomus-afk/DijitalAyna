import SwiftUI

/// SwiftUI component for viewing prescribed psychiatric medications and logging dose adherence
public struct MedicationTrackerView: View {
    @State public var medications: [Medication]
    @State public var logs: [MedicationLog]
    public let onLogAction: (UUID, MedicationLogStatus) -> Void

    public init(
        medications: [Medication] = [],
        logs: [MedicationLog] = [],
        onLogAction: @escaping (UUID, MedicationLogStatus) -> Void = { _, _ in }
    ) {
        self._medications = State(initialValue: medications)
        self._logs = State(initialValue: logs)
        self.onLogAction = onLogAction
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Image(systemName: "pills.fill")
                    .foregroundColor(Color(red: 0.12, green: 0.55, blue: 0.50))
                Text("Reçeteli İlaç & Doz İzlemi")
                    .font(.system(size: 15, weight: .bold, design: .serif))
                    .foregroundColor(Color(red: 0.12, green: 0.23, blue: 0.37))
                Spacer()
                Text("Pre-Post T0")
                    .font(.system(size: 10, weight: .bold))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(Color(red: 0.12, green: 0.55, blue: 0.50).opacity(0.12))
                    .foregroundColor(Color(red: 0.12, green: 0.55, blue: 0.50))
                    .cornerRadius(8)
            }

            if medications.isEmpty {
                HStack {
                    Spacer()
                    VStack(spacing: 6) {
                        Image(systemName: "cross.case")
                            .font(.system(size: 24))
                            .foregroundColor(.gray)
                        Text("Henüz kayıtlı psikiyatrik ilaç bulunmuyor.")
                            .font(.system(size: 12))
                            .foregroundColor(.gray)
                    }
                    .padding(.vertical, 14)
                    Spacer()
                }
            } else {
                ForEach(medications) { med in
                    HStack(spacing: 12) {
                        VStack(alignment: .leading, spacing: 3) {
                            HStack(spacing: 6) {
                                Text(med.name)
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundColor(Color(red: 0.12, green: 0.23, blue: 0.37))

                                Text("\(Int(med.dosageMg)) mg")
                                    .font(.system(size: 11, weight: .bold))
                                    .padding(.horizontal, 5)
                                    .padding(.vertical, 1)
                                    .background(Color.teal.opacity(0.15))
                                    .foregroundColor(.teal)
                                    .cornerRadius(6)
                            }

                            Text("\(med.frequency) • \(med.instructions)")
                                .font(.system(size: 11))
                                .foregroundColor(.gray)
                        }

                        Spacer()

                        // Action dose buttons
                        HStack(spacing: 6) {
                            Button(action: {
                                onLogAction(med.id, .taken)
                            }) {
                                Text("Alındı")
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 5)
                                    .background(Color(red: 0.12, green: 0.55, blue: 0.50))
                                    .cornerRadius(8)
                            }

                            Button(action: {
                                onLogAction(med.id, .skipped)
                            }) {
                                Text("Atla")
                                    .font(.system(size: 11, weight: .medium))
                                    .foregroundColor(.gray)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 5)
                                    .background(Color(white: 0.94))
                                    .cornerRadius(8)
                            }
                        }
                    }
                    .padding(10)
                    .background(Color(white: 0.98))
                    .cornerRadius(12)
                }
            }
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(20)
        .shadow(color: Color.black.opacity(0.04), radius: 10, x: 0, y: 4)
    }
}
