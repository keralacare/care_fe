import { LazyExoticComponent } from "react";

import { INavItem } from "@/components/Common/Sidebar/Sidebar";
import { ConsultationModel, FacilityModel } from "@/components/Facility/models";
import { UserAssignedModel } from "@/components/Users/models";

import { AppRoutes } from "./Routers/AppRouter";
import { ConsultationTabProps } from "./components/Facility/ConsultationDetails";
import { FormContextValue } from "./components/Form/FormContext";
import { PatientInfoCardProps } from "./components/Patient/PatientInfoCard";
import { PatientMeta } from "./components/Patient/models";
import { pluginMap } from "./pluginMap";
import { PatientModel } from "./types/emr/patient";

export type PatientForm = PatientModel &
  PatientMeta & { age?: number; is_postpartum?: boolean };

export type DoctorConnectButtonComponentType = React.FC<{
  user: UserAssignedModel;
}>;

export type ExtendPatientInfoCardComponentType = React.FC<PatientInfoCardProps>;

export type ManagePatientOptionsComponentType = React.FC<{
  consultation: ConsultationModel | undefined;
  patient: PatientModel;
}>;

export type AdditionalDischargeProceduresComponentType = React.FC<{
  consultation: ConsultationModel;
}>;

export type ScribeComponentType = React.FC;
export type ManageFacilityOptionsComponentType = React.FC<{
  facility?: FacilityModel;
}>;

export type ExtendFacilityConfigureComponentType = React.FC<{
  facilityId: string;
}>;

export type ExtendPatientRegisterFormComponentType = React.FC<{
  facilityId: string;
  patientId?: string;
  state: {
    form: {
      [key: string]: any;
    };
    errors: {
      [key: string]: string;
    };
  };
  dispatch: React.Dispatch<any>;
  field: FormContextValue<PatientForm>;
}>;

// Define supported plugin components
export type SupportedPluginComponents = {
  DoctorConnectButtons: DoctorConnectButtonComponentType;
  ExtendPatientInfoCard: ExtendPatientInfoCardComponentType;
  ManagePatientOptions: ManagePatientOptionsComponentType;
  AdditionalDischargeProcedures: AdditionalDischargeProceduresComponentType;
  Scribe: ScribeComponentType;
  ManageFacilityOptions: ManageFacilityOptionsComponentType;
  ConsultationContextEnabler: React.FC;
  ExtendFacilityConfigure: ExtendFacilityConfigureComponentType;
  ExtendPatientRegisterForm: ExtendPatientRegisterFormComponentType;
};

// Create a type for lazy-loaded components
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LazyComponent<T extends React.FC<any>> = LazyExoticComponent<T>;

// Define PluginComponentMap with lazy-loaded components
export type PluginComponentMap = {
  [K in keyof SupportedPluginComponents]?: LazyComponent<
    SupportedPluginComponents[K]
  >;
};

type SupportedPluginExtensions =
  | "DoctorConnectButtons"
  | "PatientExternalRegistration";

export type PluginManifest = {
  plugin: string;
  routes: AppRoutes;
  extends: SupportedPluginExtensions[];
  components: PluginComponentMap;
  navItems: INavItem[];
  consultationTabs?: Record<
    string,
    LazyComponent<React.FC<ConsultationTabProps>>
  >;
};

export { pluginMap };
