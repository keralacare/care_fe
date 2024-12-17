import { ConsultationModel } from "../Facility/models";
import { PatientModel } from "../Patient/models";
import { UserBareMinimum } from "../Users/models";

export type Coding = {
  system: string;
  code: string;
  display?: string;
};

export type Timing = unknown; // TODO: needs to be implemented

export type Annotation = {
  authorString?: string;
  authorReference?: UserBareMinimum;
  time?: string;
  text: string;
};

export type ServiceRequest = {
  id: string;

  status?:
    | "draft"
    | "active"
    | "on-hold"
    | "revoked"
    | "completed"
    | "entered-in-error"
    | "unknown";
  intent?: "proposal" | "plan" | "directive" | "order";
  priority?: "routine" | "urgent" | "asap" | "stat";

  category?: Coding;
  code: Coding;

  do_not_perform?: boolean;

  subject: PatientModel;
  encounter: ConsultationModel;

  occurrence_datetime?: string | null;
  occurrence_timing?: Timing | null;
  as_needed?: boolean;
  as_needed_for?: Coding | null;

  authored_on: string;
  requester: UserBareMinimum;

  location: string | null;

  note: Annotation[];

  patient_instruction?: string;

  replaces?: ServiceRequest | null;
};

export type Specimen = {
  id: string;
  identifier?: string | null;
  accession_identifier?: string | null;

  status?: string | null;

  type: Coding;

  subject: PatientModel;
  request: ServiceRequest;

  collected_by?: UserBareMinimum | null;
  collected_at?: string | null;

  dispatched_by?: UserBareMinimum | null;
  dispatched_at?: string | null;

  received_by?: UserBareMinimum | null;
  received_at?: string | null;

  condition?: Coding | null;

  processing: {
    description?: string | null;
    method?: Coding | null;
    time: string;
    performer?: string | null;
  }[];

  note: Annotation[];

  parent?: Specimen | null;
};

export type CodeableConcept = {
  coding: Coding[] | null;
  text?: string | null;
};

export type Observation = {
  id: string;

  status: "final" | "amended";

  category?: Coding | null;
  main_code?: Coding | null;
  alternate_coding: CodeableConcept;

  subject_type: "patient";

  encounter: string | null;
  effective_datetime: string;

  data_entered_by_id: number;
  performer: {
    id: number;
    type: "user" | "related_person";
  };

  value: string | null;
  value_code: Coding | null;

  note: string | null;

  body_site: Coding | null;
  method: Coding | null;

  reference_range: {
    low: number | null;
    high: number | null;
    text: string | null;
    unit: string | null;
  };

  interpretation: string | null;
  parent: string | null;
  questionnaire_response: string | null;
};

export type DiagnosticReport = {
  id: string;
  status:
    | "registered"
    | "partial"
    | "preliminary"
    | "final"
    | "amended"
    | "corrected"
    | "appended"
    | "cancelled"
    | "entered-in-error"
    | "unknown";

  category?: Coding | null;
  code?: Coding;

  based_on: ServiceRequest;
  subject: PatientModel;
  encounter: ConsultationModel;

  performer?: UserBareMinimum | null;
  results_interpreter?: UserBareMinimum | null;

  issued?: string | null;
  effective_period?: string | null;

  specimen: Specimen[];
  result: Observation[];

  media: {
    comment?: string | null;
    link: string;
  }[];

  note: Annotation[];
  conclusion?: string | null;
};
