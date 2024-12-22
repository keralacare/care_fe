import { Period } from "@/types/questionnaire/base";
import { Code } from "@/types/questionnaire/code";

export const MEDICATION_STATEMENT_INFORMATION_SOURCE_TYPE = [
  "patient",
  "user",
  "related_person",
] as const;

export type MedicationStatementInformationSourceType =
  (typeof MEDICATION_STATEMENT_INFORMATION_SOURCE_TYPE)[number];

export type MedicationStatementInformationSource = {
  type: MedicationStatementInformationSourceType;
  id?: string; // UUID
  display?: string;
  relationship?: string;
};

export const MEDICATION_STATEMENT_STATUS = [
  "active",
  "on_hold",
  "completed",
  "stopped",
  "unknown",
  "entered_in_error",
  "not_taken",
  "intended",
] as const;

export type MedicationStatementStatus =
  (typeof MEDICATION_STATEMENT_STATUS)[number];

export type MedicationStatement = {
  readonly id: string;
  status: MedicationStatementStatus;
  reason?: string;

  medication: Code;
  dosage?: string;
  effective_period?: Period;

  patient: string; // UUID
  encounter: string; // UUID

  information_source?: MedicationStatementInformationSourceType;

  note?: string;
};
