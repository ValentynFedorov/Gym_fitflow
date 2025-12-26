export interface CheckInCompletedEvent {
  type: 'CHECK_IN_COMPLETED';
  visitId: string;
  userId: string;
  zoneId: string;
  occurredAt: Date;
}

export interface CheckOutCompletedEvent {
  type: 'CHECK_OUT_COMPLETED';
  visitId: string;
  userId: string;
  zoneId: string;
  occurredAt: Date;
}

export type AttendanceDomainEvent =
  | CheckInCompletedEvent
  | CheckOutCompletedEvent;
