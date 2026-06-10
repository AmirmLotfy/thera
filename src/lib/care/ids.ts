export function careThreadId(patientUid: string, therapistId: string): string {
  return `${patientUid}_${therapistId}`;
}
