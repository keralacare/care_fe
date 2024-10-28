import ConsultationHistoryTab from "./ConsultationHistoryTab";
import HealthProfileSummaryTab from "./HealthProfileSummary";
import ImmunisationRecordsTab from "./ImmunisationDetailsTab";
import TestSampleHistoryTab from "./SampleTestTab";
import ShiftingHistoryTab from "./ShiftingHistoryTab";

export const patientTabs = [
  //   {
  //     label: "Demography",
  //     route: "demography",
  //     component: DemographyTab,
  //   },
  {
    label: "Consultation History",
    route: "consultation-history",
    component: ConsultationHistoryTab,
  },
  {
    label: "Health Profile Summary",
    route: "medical-history",
    component: HealthProfileSummaryTab,
  },
  {
    label: "Immunisation Records",
    route: "immunisation-records",
    component: ImmunisationRecordsTab,
  },
  {
    label: "Shift Patient",
    route: "shifting-history",
    component: ShiftingHistoryTab,
  },
  {
    label: "Request Sample Test",
    route: "test-sample-history",
    component: TestSampleHistoryTab,
  },
];
