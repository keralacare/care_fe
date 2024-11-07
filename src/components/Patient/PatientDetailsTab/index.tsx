import { PatientModel } from "../models";
import { Demography } from "./Demography";
import EncounterHistory from "./EncounterHistory";
import { HealthProfileSummary } from "./HealthProfileSummary";
import { ImmunisationRecords } from "./ImmunisationRecords";
import Notes from "./Notes";
import { SampleTestHistory } from "./SampleTestHistory";
import ShiftingHistory from "./ShiftingHistory";

export interface PatientProps {
  facilityId: string;
  id: string;
  patientData: PatientModel;
}

export const patientTabs = [
  {
    label: "Demography",
    route: "demography",
    component: Demography,
  },
  {
    label: "Encounters",
    route: "encounters",
    component: EncounterHistory,
  },
  {
    label: "Health Profile",
    route: "health_profile",
    component: HealthProfileSummary,
  },
  {
    label: "Immunisation",
    route: "immunisation_records",
    component: ImmunisationRecords,
  },
  {
    label: "Shift Patient",
    route: "shift_patient",
    component: ShiftingHistory,
  },
  {
    label: "Request Test",
    route: "request_sample_test",
    component: SampleTestHistory,
  },
  {
    label: "Notes",
    route: "patient_notes",
    component: Notes,
  },
];
