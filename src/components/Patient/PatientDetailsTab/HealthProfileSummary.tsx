import React from "react";
import { useTranslation } from "react-i18next";
import { PatientModel } from "../models";

interface MedicalHistoryTabProps {
  patientData: PatientModel;
}

const HealthProfileSummaryTab = (props: MedicalHistoryTabProps) => {
  const { t } = useTranslation();

  let patientMedHis: any[] = [];
  if (
    props.patientData &&
    props.patientData.medical_history &&
    props.patientData.medical_history.length
  ) {
    const medHis = props.patientData.medical_history;
    patientMedHis = medHis
      .filter((item) => item.disease !== "NO")
      .map((item, idx) => (
        <div className="sm:col-span-1" key={`med_his_${idx}`}>
          <div className="break-words text-sm font-semibold leading-5 text-zinc-400">
            {item.disease}
          </div>
          <div className="mt-1 whitespace-normal break-words text-sm font-medium leading-5">
            {item.details}
          </div>
        </div>
      ));
  }

  const hasNoMedicalHistory =
    !props.patientData.present_health &&
    !props.patientData.allergies &&
    !props.patientData.ongoing_medication &&
    !(props.patientData.gender === 2 && props.patientData.is_antenatal) &&
    !props.patientData.medical_history?.some(
      (history) => history.disease !== "NO",
    );

  return (
    <div className="my-2 w-full rounded-md bg-white pb-5 pl-5 pt-5 shadow-md lg:w-1/2">
      <hr className="mb-1 mr-5 h-1 w-5 border-0 bg-blue-500" />
      <div className="h-full space-y-2">
        <div className="mr-4 pb-2 text-xl font-bold text-secondary-900">
          {t("medical")}
        </div>

        {hasNoMedicalHistory && (
          <div className="flex w-full items-center justify-center text-xl font-bold text-secondary-500">
            {t("no_medical_history_available")}
          </div>
        )}

        <div className="mt-2 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 md:gap-y-8">
          {props.patientData.present_health && (
            <div className="sm:col-span-1">
              <div className="text-sm font-semibold leading-5 text-zinc-400">
                {t("present_health")}
              </div>
              <div
                data-testid="patient-present-health"
                className="mt-1 overflow-x-scroll whitespace-normal break-words text-sm font-medium leading-5"
              >
                {props.patientData.present_health}
              </div>
            </div>
          )}

          {props.patientData.ongoing_medication && (
            <div className="sm:col-span-1">
              <div className="text-sm font-semibold leading-5 text-zinc-400">
                {t("ongoing_medications")}
              </div>
              <div
                data-testid="patient-ongoing-medication"
                className="mt-1 overflow-x-scroll whitespace-normal break-words text-sm font-medium leading-5"
              >
                {props.patientData.ongoing_medication}
              </div>
            </div>
          )}

          {props.patientData.allergies && (
            <div className="sm:col-span-1">
              <div className="text-sm font-semibold leading-5 text-zinc-400">
                {t("allergies")}
              </div>
              <div
                data-testid="patient-allergies"
                className="mt-1 overflow-x-scroll whitespace-normal break-words text-sm font-medium leading-5"
              >
                {props.patientData.allergies}
              </div>
            </div>
          )}

          {props.patientData.gender === 2 && props.patientData.is_antenatal && (
            <div className="sm:col-span-1">
              <div className="text-sm font-semibold leading-5 text-zinc-400">
                {t("is_pregnant")}
              </div>
              <div className="mt-1 whitespace-normal break-words text-sm font-medium leading-5">
                Yes
              </div>
            </div>
          )}
          {patientMedHis}
        </div>
      </div>
    </div>
  );
};

export default HealthProfileSummaryTab;
