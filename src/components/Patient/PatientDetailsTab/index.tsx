import { Demography } from "./Demography";
import EncounterHistory from "./EncounterHistory";
import { HealthProfileSummary } from "./HealthProfileSummary";
import { ImmunisationRecords } from "./ImmunisationRecords";
import { SampleTestHistory } from "./SampleTestHistory";
import ShiftingHistory from "./ShiftingHistory";

export interface PatientProps {
  facilityId: string;
  id: string;
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
];
