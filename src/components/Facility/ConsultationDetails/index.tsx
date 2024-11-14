import { Link, navigate } from "raviger";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import Card from "@/CAREUI/display/Card";
import Chip from "@/CAREUI/display/Chip";

import ButtonV2 from "@/components/Common/ButtonV2";
import Loading from "@/components/Common/Loading";
import Page from "@/components/Common/Page";
import RelativeDateUserMention from "@/components/Common/RelativeDateUserMention";
import DiagnosesGrid from "@/components/Diagnosis/DiagnosesGrid";
import Error404 from "@/components/ErrorPages/404";
import { ConsultationABGTab } from "@/components/Facility/ConsultationDetails/ConsultationABGTab";
import { ConsultationDialysisTab } from "@/components/Facility/ConsultationDetails/ConsultationDialysisTab";
import { ConsultationFeedTab } from "@/components/Facility/ConsultationDetails/ConsultationFeedTab";
import { ConsultationFilesTab } from "@/components/Facility/ConsultationDetails/ConsultationFilesTab";
import { ConsultationInvestigationsTab } from "@/components/Facility/ConsultationDetails/ConsultationInvestigationsTab";
import { ConsultationMedicinesTab } from "@/components/Facility/ConsultationDetails/ConsultationMedicinesTab";
import { ConsultationNeurologicalMonitoringTab } from "@/components/Facility/ConsultationDetails/ConsultationNeurologicalMonitoringTab";
import ConsultationNursingTab from "@/components/Facility/ConsultationDetails/ConsultationNursingTab";
import { ConsultationNutritionTab } from "@/components/Facility/ConsultationDetails/ConsultationNutritionTab";
import { ConsultationPressureSoreTab } from "@/components/Facility/ConsultationDetails/ConsultationPressureSoreTab";
import { ConsultationSummaryTab } from "@/components/Facility/ConsultationDetails/ConsultationSummaryTab";
import { ConsultationUpdatesTab } from "@/components/Facility/ConsultationDetails/ConsultationUpdatesTab";
import { ConsultationVentilatorTab } from "@/components/Facility/ConsultationDetails/ConsultationVentilatorTab";
import DoctorVideoSlideover from "@/components/Facility/DoctorVideoSlideover";
import PatientNotesSlideover from "@/components/Facility/PatientNotesSlideover";
import { ConsultationModel } from "@/components/Facility/models";
import PatientInfoCard from "@/components/Patient/PatientInfoCard";
import { PatientModel } from "@/components/Patient/models";
import UserBlock from "@/components/Users/UserBlock";

import useAuthUser from "@/hooks/useAuthUser";
import { useCareAppConsultationTabs } from "@/hooks/useCareApps";

import { GENDER_TYPES } from "@/common/constants";

import { triggerGoal } from "@/Integrations/Plausible";
import { CameraFeedPermittedUserTypes } from "@/Utils/permissions";
import routes from "@/Utils/request/api";
import request from "@/Utils/request/request";
import useQuery from "@/Utils/request/useQuery";
import {
  formatDateTime,
  humanizeStrings,
  keysOf,
  relativeTime,
} from "@/Utils/utils";

import { ConsultationProvider } from "./ConsultationContext";

export interface ConsultationTabProps {
  consultationId: string;
  facilityId: string;
  patientId: string;
  consultationData: ConsultationModel;
  patientData: PatientModel;
}

const defaultTabs = {
  UPDATES: ConsultationUpdatesTab,
  FEED: ConsultationFeedTab,
  SUMMARY: ConsultationSummaryTab,
  MEDICINES: ConsultationMedicinesTab,
  FILES: ConsultationFilesTab,
  INVESTIGATIONS: ConsultationInvestigationsTab,
  ABG: ConsultationABGTab,
  NURSING: ConsultationNursingTab,
  NEUROLOGICAL_MONITORING: ConsultationNeurologicalMonitoringTab,
  VENTILATOR: ConsultationVentilatorTab,
  NUTRITION: ConsultationNutritionTab,
  PRESSURE_SORE: ConsultationPressureSoreTab,
  DIALYSIS: ConsultationDialysisTab,
} as Record<string, React.FC<ConsultationTabProps>>;

export const ConsultationDetails = (props: any) => {
  const { facilityId, patientId, consultationId } = props;
  const { t } = useTranslation();
  const pluginTabs = useCareAppConsultationTabs();

  const tabs: Record<string, React.FC<ConsultationTabProps>> = {
    ...defaultTabs,
    ...pluginTabs,
  };

  let tab = undefined;
  if (Object.keys(tabs).includes(props.tab.toUpperCase())) {
    tab = props.tab.toUpperCase();
  }
  const [showDoctors, setShowDoctors] = useState(false);
  const [patientData, setPatientData] = useState<PatientModel>();
  const [activeShiftingData, setActiveShiftingData] = useState<Array<any>>([]);

  const getPatientGender = (patientData: any) =>
    GENDER_TYPES.find((i) => i.id === patientData.gender)?.text;

  const getPatientAddress = (patientData: any) =>
    `${patientData.address},\n${patientData.ward_object?.name},\n${patientData.local_body_object?.name},\n${patientData.district_object?.name},\n${patientData.state_object?.name}`;

  const getPatientComorbidities = (patientData: any) => {
    if (patientData?.medical_history?.length) {
      return humanizeStrings(
        patientData.medical_history.map((item: any) => item.disease),
      );
    } else {
      return "None";
    }
  };
  const [showPatientNotesPopup, setShowPatientNotesPopup] = useState(false);

  const authUser = useAuthUser();

  const consultationQuery = useQuery(routes.getConsultation, {
    pathParams: { id: consultationId },
    onResponse: ({ data }) => {
      if (!data) {
        navigate("/not-found");
        return;
      }
      if (facilityId != data.facility || patientId != data.patient) {
        navigate(
          `/facility/${data.facility}/patient/${data.patient}/consultation/${data?.id}`,
        );
      }
    },
  });

  const consultationData = consultationQuery.data;
  const bedId = consultationData?.current_bed?.bed_object?.id;

  const isCameraAttached = useQuery(routes.listAssetBeds, {
    prefetch: !!bedId,
    query: { bed: bedId },
  }).data?.results.some((a) => a.asset_object.asset_class === "ONVIF");

  const patientDataQuery = useQuery(routes.getPatient, {
    pathParams: { id: consultationQuery.data?.patient ?? "" },
    prefetch: !!consultationQuery.data?.patient,
    onResponse: ({ data }) => {
      if (!data) {
        return;
      }
      setPatientData({
        ...data,
        gender: getPatientGender(data),
        address: getPatientAddress(data),
        comorbidities: getPatientComorbidities(data),
        is_declared_positive: data.is_declared_positive ? "Yes" : "No",
        is_vaccinated: patientData?.is_vaccinated ? "Yes" : "No",
      } as any);
    },
  });

  const fetchData = useCallback(
    async (id: string) => {
      // Get shifting data
      const shiftRequestsQuery = await request(routes.listShiftRequests, {
        query: { patient: id },
      });
      if (shiftRequestsQuery.data?.results) {
        setActiveShiftingData(shiftRequestsQuery.data.results);
      }
    },
    [consultationId, patientData?.is_vaccinated],
  );

  useEffect(() => {
    const id = patientDataQuery.data?.id;
    if (!id) {
      return;
    }
    fetchData(id);
    triggerGoal("Patient Consultation Viewed", {
      facilityId: facilityId,
      consultationId: consultationId,
      userId: authUser.id,
    });
  }, [patientDataQuery.data?.id]);

  if (!patientData || !consultationData || patientDataQuery.loading) {
    return <Loading />;
  }

  const consultationTabProps: ConsultationTabProps = {
    consultationId,
    consultationData,
    patientId: consultationData.patient,
    facilityId: consultationData.facility,
    patientData,
  };

  if (!tab) {
    return <Error404 />;
  }

  const SelectedTab = tabs[tab];

  const tabButtonClasses = (selected: boolean) =>
    `capitalize min-w-max-content cursor-pointer font-bold whitespace-nowrap ${
      selected === true
        ? "border-primary-500 hover:border-secondary-300 text-primary-600 border-b-2"
        : "text-secondary-700 hover:text-secondary-700"
    }`;

  const principalDiagnosis = consultationData.diagnoses?.find(
    (diagnosis) => diagnosis.is_principal,
  );

  return (
    <ConsultationProvider
      initialContext={{
        consultation: consultationData,
        patient: patientData,
      }}
    >
      <Page
        title={t("patient_dashboard")}
        className="sm:m-0 sm:p-0"
        crumbsReplacements={{
          [facilityId]: { name: patientData?.facility_object?.name },
          [patientId]: { name: patientData?.name },
          [consultationId]: {
            name:
              consultationData.suggestion === "A"
                ? `Admitted on ${formatDateTime(
                    consultationData.encounter_date!,
                  )}`
                : consultationData.suggestion_text,
          },
        }}
        breadcrumbs={true}
        backUrl="/patients"
        options={
          <div
            className="flex md:grid md:grid-cols-2 gap-1 lg:flex w-full flex-col md:flex-row items-center md:max-w-[300px] lg:max-w-[550px]"
            id="consultationpage-header"
          >
            {!consultationData.discharge_date && (
              <>
                <ButtonV2
                  id="doctor-connect-button"
                  onClick={() => {
                    triggerGoal("Doctor Connect Clicked", {
                      consultationId,
                      facilityId: patientData.facility,
                      userId: authUser.id,
                      page: "ConsultationDetails",
                    });
                    setShowDoctors(true);
                  }}
                  className="w-full hover:text-white"
                >
                  {t("doctor_connect")}
                </ButtonV2>
                {patientData.last_consultation?.id &&
                  isCameraAttached &&
                  CameraFeedPermittedUserTypes.includes(authUser.user_type) && (
                    <Link
                      href={`/facility/${patientData.facility}/patient/${patientData.id}/consultation/${patientData.last_consultation?.id}/feed`}
                      className="btn btn-primary w-full hover:text-white"
                    >
                      {t("camera_feed")}
                    </Link>
                  )}
              </>
            )}
            <Link
              href={`/facility/${patientData.facility}/patient/${patientData.id}`}
              className="btn btn-primary w-full hover:text-white"
              id="patient-details"
            >
              {t("patient_details")}
            </Link>
            <ButtonV2
              id="patient_discussion_notes"
              onClick={() =>
                showPatientNotesPopup
                  ? navigate(
                      `/facility/${facilityId}/patient/${patientId}/consultation/${consultationId}/notes`,
                    )
                  : setShowPatientNotesPopup(true)
              }
              className="w-full hover:text-white"
            >
              {t("discussion_notes")}
            </ButtonV2>
          </div>
        }
      >
        <div className="mt-8 flex w-full flex-col md:flex-row ">
          <div className="size-full text-black">
            <PatientInfoCard
              patient={patientData}
              consultation={consultationData}
              fetchPatientData={() => {
                consultationQuery.refetch();
                patientDataQuery.refetch();
              }}
              consultationId={consultationId}
              activeShiftingData={activeShiftingData}
            />

            <div className="flex flex-col justify-between px-4 md:flex-row">
              {consultationData.admitted_to && (
                <div className="mt-2 rounded-lg border bg-secondary-100 p-2 md:mt-0">
                  <div className="border-b-2 py-1">
                    Patient
                    {consultationData.discharge_date
                      ? " Discharged from"
                      : " Admitted to"}
                    <span className="badge badge-pill badge-warning ml-2 font-bold">
                      {consultationData.admitted_to}
                    </span>
                  </div>
                  {(consultationData.discharge_date ??
                    consultationData.encounter_date) && (
                    <div className="text-3xl font-bold">
                      {relativeTime(
                        consultationData.discharge_date
                          ? consultationData.discharge_date
                          : consultationData.encounter_date,
                      )}
                    </div>
                  )}
                  <div className="-mt-2 text-xs">
                    {consultationData.encounter_date &&
                      formatDateTime(consultationData.encounter_date)}
                    {consultationData.discharge_date &&
                      ` - ${formatDateTime(consultationData.discharge_date)}`}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col-reverse lg:flex-row-reverse flex-wrap gap-2 mt-4 relative">
          <div className="text-[10px] text-gray-500 mt-1 md:absolute md:right-0 md:-top-6 flex flex-col md:flex-row items-center gap-1 md:gap-3">
            <div className="flex items-center gap-1">
              <i className="text-gray-400">{t("created")}</i>
              <RelativeDateUserMention
                actionDate={consultationData?.created_date}
                user={consultationData?.created_by}
                tooltipPosition="left"
                withoutSuffix={true}
              />
            </div>
            <div className="flex items-center gap-1">
              <i className="text-gray-400">{t("last_modified")}</i>
              <RelativeDateUserMention
                actionDate={consultationData?.modified_date}
                user={consultationData?.last_edited_by}
                tooltipPosition="left"
                withoutSuffix={true}
              />
            </div>
          </div>
          {!!consultationData.diagnoses?.length && (
            <div className="flex-1 ">
              <DiagnosesGrid diagnoses={consultationData.diagnoses ?? []} />
            </div>
          )}
          <div className="min-w-[300px] flex flex-col gap-2 lg:max-w-[400px]">
            {principalDiagnosis && (
              <Card
                data-test-id="principal-diagnosis"
                className="bg-primary-100/50 border border-primary-200"
                title={t("principal_diagnosis")}
                tight
                titleRight={
                  <Chip
                    size="small"
                    className="capitalize"
                    variant="secondary"
                    text={principalDiagnosis.verification_status}
                  />
                }
              >
                <div className="font-bold text-lg">
                  {principalDiagnosis.diagnosis_object?.label ?? "-"}{" "}
                </div>
              </Card>
            )}
            {(consultationData.treating_physician_object ||
              consultationData.deprecated_verified_by) && (
              <Card title={t("treating_doctor")} tight titleVariant="small">
                {consultationData.treating_physician_object ? (
                  <UserBlock
                    user={consultationData.treating_physician_object}
                  />
                ) : (
                  consultationData.deprecated_verified_by
                )}
              </Card>
            )}
          </div>
        </div>

        <div className="mt-4 w-full border-b-2 border-secondary-200">
          <div className="overflow-x-auto sm:flex sm:items-baseline">
            <div className="mt-4 sm:mt-0">
              <nav
                className="flex space-x-6 overflow-x-auto pb-2"
                id="consultation_tab_nav"
              >
                {keysOf(tabs).map((p) => {
                  if (p === "FEED") {
                    if (
                      isCameraAttached === false || // No camera attached
                      consultationData?.discharge_date || // Discharged
                      !consultationData?.current_bed?.bed_object?.id || // Not admitted to bed
                      !CameraFeedPermittedUserTypes.includes(authUser.user_type)
                    )
                      return null; // Hide feed tab
                  }

                  return (
                    <Link
                      key={p}
                      className={tabButtonClasses(tab === p)}
                      href={`/facility/${facilityId}/patient/${patientId}/consultation/${consultationId}/${p.toLocaleLowerCase()}`}
                    >
                      {t(`CONSULTATION_TAB__${p}`)}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
        <SelectedTab {...consultationTabProps} />

        <DoctorVideoSlideover
          facilityId={facilityId}
          show={showDoctors}
          setShow={setShowDoctors}
        />

        {showPatientNotesPopup && (
          <PatientNotesSlideover
            patientId={patientId}
            facilityId={facilityId}
            consultationId={consultationId}
            setShowPatientNotesPopup={setShowPatientNotesPopup}
          />
        )}
      </Page>
    </ConsultationProvider>
  );
};
