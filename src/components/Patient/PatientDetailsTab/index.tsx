import { Demography } from "./Demography";
import EncounterHistory from "./EncounterHistory";
import { HealthProfileSummary } from "./HealthProfileSummary";
import { ImmunisationRecords } from "./ImmunisationRecords";
import { SampleTestHistory } from "./SampleTestHistory";
import ShiftingHistory from "./ShiftingHistory";

export const patientTabs = [
  {
    label: "Demography",
    route: "demography",
    component: Demography,
  },
  {
    label: "Encounter History",
    route: "encounters",
    component: EncounterHistory,
  },
  {
    label: "Health Profile Summary",
    route: "health_profile",
    component: HealthProfileSummary,
  },
  {
    label: "Immunisation Records",
    route: "immunisation_records",
    component: ImmunisationRecords,
  },
  {
    label: "Shift Patient",
    route: "shift_patient",
    component: ShiftingHistory,
  },
  {
    label: "Request Sample Test",
    route: "request_sample_test",
    component: SampleTestHistory,
  },
];
