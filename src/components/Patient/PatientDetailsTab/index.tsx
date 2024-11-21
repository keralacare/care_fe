import { PatientModel } from "../models";
import { Demography } from "./Demography";
import EncounterHistory from "./EncounterHistory";
import { HealthProfileSummary } from "./HealthProfileSummary";
import { ImmunisationRecords } from "./ImmunisationRecords";
import PatientNotes from "./Notes";
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
    route: "health-profile",
    component: HealthProfileSummary,
  },
  {
    label: "Immunisation",
    route: "immunisation-records",
    component: ImmunisationRecords,
  },
  {
    label: "Shift Patient",
    route: "shift",
    component: ShiftingHistory,
  },
  {
    label: "Request Test",
    route: "request-sample-test",
    component: SampleTestHistory,
  },
  {
    label: "Notes",
    route: "patient-notes",
    component: PatientNotes,
  },
];
