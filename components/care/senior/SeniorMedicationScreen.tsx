'use client';

export interface MedicationRecord {
  medication: {
    id: string;
    name: string;
    dosage: string | null;
  };
  scheduled_at: string;
  status: string;
}

interface SeniorMedicationScreenProps {
  medications: MedicationRecord[];
  onAction: (medicationId: string, scheduledAt: string, status: 'taken' | 'snoozed') => void;
  loading?: boolean;
}

export function SeniorMedicationScreen({
  medications,
  onAction,
  loading = false,
}: SeniorMedicationScreenProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="text-center">
          <div className="mb-4 inline-block h-16 w-16 animate-spin rounded-full border-4 border-gray-300 border-t-black"></div>
          <p className="text-2xl font-bold text-black">Wird geladen...</p>
        </div>
      </div>
    );
  }

  if (medications.length === 0) {
    return (
      <div className="flex items-center justify-center p-6">
        <p className="text-3xl font-bold text-black">Keine Medikamente</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      {medications.map((record) => {
        const isTaken = record.status === 'taken';
        const isSnoozed = record.status === 'snoozed';
        const scheduledTime = new Date(record.scheduled_at).toLocaleTimeString('de-DE', {
          hour: '2-digit',
          minute: '2-digit',
        });

        return (
          <div
            key={`${record.medication.id}-${record.scheduled_at}`}
            className="space-y-4 rounded-2xl border-2 border-gray-300 p-6"
          >
            {/* Medication Name */}
            <h2 className="text-2xl font-bold text-black">
              {record.medication.name}
            </h2>

            {/* Dosage */}
            {record.medication.dosage && (
              <p className="text-xl text-gray-700">
                {record.medication.dosage}
              </p>
            )}

            {/* Scheduled Time */}
            <p className="text-lg font-semibold text-gray-800">
              Zeitpunkt: {scheduledTime} Uhr
            </p>

            {/* Status Display or Action Buttons */}
            {isTaken ? (
              <div className="flex items-center justify-center rounded-lg bg-green-600 px-4 py-6 text-center">
                <p className="text-2xl font-bold text-white">
                  ✓ Eingenommen
                </p>
              </div>
            ) : isSnoozed ? (
              <div className="flex items-center justify-center rounded-lg bg-amber-500 px-4 py-6 text-center">
                <p className="text-2xl font-bold text-white">
                  ⏰ Verschoben
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {/* "Genommen" Button */}
                <button
                  onClick={() =>
                    onAction(
                      record.medication.id,
                      record.scheduled_at,
                      'taken'
                    )
                  }
                  className="rounded-2xl bg-green-600 px-4 py-6 text-xl font-bold text-white active:bg-green-700 disabled:opacity-50"
                  style={{
                    minHeight: '80px',
                    touchAction: 'manipulation',
                  }}
                  aria-label={`${record.medication.name} als genommen markieren`}
                >
                  Genommen
                </button>

                {/* "Spaeter" Button */}
                <button
                  onClick={() =>
                    onAction(
                      record.medication.id,
                      record.scheduled_at,
                      'snoozed'
                    )
                  }
                  className="rounded-2xl bg-amber-500 px-4 py-6 text-xl font-bold text-white active:bg-amber-600 disabled:opacity-50"
                  style={{
                    minHeight: '80px',
                    touchAction: 'manipulation',
                  }}
                  aria-label={`${record.medication.name} später erinnern`}
                >
                  Später
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
