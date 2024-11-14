import { Field, Label, MenuItem, Switch } from "@headlessui/react";
import { Link, navigate } from "raviger";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import Chip, { ChipProps } from "@/CAREUI/display/Chip";
import CareIcon from "@/CAREUI/icons/CareIcon";
import { AuthorizedForConsultationRelatedActions } from "@/CAREUI/misc/AuthorizedChild";

import ButtonV2 from "@/components/Common/ButtonV2";
import DialogModal from "@/components/Common/Dialog";
import DropdownMenu from "@/components/Common/Menu";
import Beds from "@/components/Facility/Consultations/Beds";
import { Mews } from "@/components/Facility/Consultations/Mews";
import DischargeModal from "@/components/Facility/DischargeModal";
import DischargeSummaryModal from "@/components/Facility/DischargeSummaryModal";
import {
  ConsultationModel,
  PatientCategory,
} from "@/components/Facility/models";
import { PatientModel } from "@/components/Patient/models";

import useAuthUser from "@/hooks/useAuthUser";

import {
  CONSULTATION_SUGGESTION,
  DISCHARGE_REASONS,
  PATIENT_CATEGORIES,
  RESPIRATORY_SUPPORT,
  TELEMEDICINE_ACTIONS,
} from "@/common/constants";

import { triggerGoal } from "@/Integrations/Plausible";
import { PLUGIN_Component } from "@/PluginEngine";
import * as Notification from "@/Utils/Notifications";
import dayjs from "@/Utils/dayjs";
import routes from "@/Utils/request/api";
import request from "@/Utils/request/request";
import { classNames, formatDateTime, formatPatientAge } from "@/Utils/utils";

import FacilityBlock from "../Facility/FacilityBlock";

export interface PatientInfoCardProps {
  patient: PatientModel;
  consultation?: ConsultationModel;
  fetchPatientData?: (state: { aborted: boolean }) => void;
  activeShiftingData: any;
  consultationId: string;
}

export default function PatientInfoCard(props: PatientInfoCardProps) {
  const authUser = useAuthUser();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [openDischargeSummaryDialog, setOpenDischargeSummaryDialog] =
    useState(false);
  const [openDischargeDialog, setOpenDischargeDialog] = useState(false);

  const patient = props.patient;
  const consultation = props.consultation;
  const activeShiftingData = props.activeShiftingData;

  const [medicoLegalCase, setMedicoLegalCase] = useState(
    consultation?.medico_legal_case ?? false,
  );

  const category: PatientCategory | undefined =
    consultation?.last_daily_round?.patient_category ?? consultation?.category;
  const categoryClass = category
    ? PATIENT_CATEGORIES.find((c) => c.text === category)?.twClass
    : "patient-unknown";

  const bedDialogTitle = consultation?.discharge_date
    ? "Bed History"
    : !consultation?.current_bed
      ? "Assign Bed"
      : "Switch Bed";

  const switchMedicoLegalCase = async (value: boolean) => {
    if (!consultation?.id || value === medicoLegalCase) return;
    const { res, data } = await request(routes.partialUpdateConsultation, {
      pathParams: { id: consultation?.id },
      body: { medico_legal_case: value },
    });

    if (res?.status !== 200 || !data) {
      Notification.Error({
        msg: t("failed_to_update_medicolegal"),
      });
      setMedicoLegalCase(!value);
    } else {
      Notification.Success({
        msg: t("updated_medicolegal"),
      });
    }
  };

  const hasActiveShiftingRequest = () => {
    if (activeShiftingData.length > 0) {
      return [
        "PENDING",
        "APPROVED",
        "DESTINATION APPROVED",
        "PATIENT TO BE PICKED UP",
      ].includes(activeShiftingData[activeShiftingData.length - 1].status);
    }

    return false;
  };

  const chips: (Omit<ChipProps, "size"> & { show: boolean })[] = [
    {
      variant: "primary",
      text: `${consultation?.suggestion === "A" ? "IP" : "OP"}: ${
        consultation?.patient_no
      }`,
      show: !!consultation?.patient_no,
    },
    {
      variant: "alert",
      text:
        TELEMEDICINE_ACTIONS.find((i) => i.id === patient.action)?.desc || "",
      show: !!patient.action && patient.action != 10,
    },
    {
      text: `${t("blood_group")}: ${patient.blood_group}`,
      variant: "secondary",
      show: !!patient.blood_group,
    },
    {
      text: t("medico_legal"),
      show: medicoLegalCase,
      variant: "danger",
    },
    {
      text: `${
        dayjs().isBefore(patient.review_time)
          ? t("review_before")
          : t("review_missed")
      }: ${formatDateTime(patient.review_time)}`,
      variant: dayjs().isBefore(patient.review_time) ? "secondary" : "priority",
      startIcon: "l-clock",
      show:
        !!patient.review_time &&
        !consultation?.discharge_date &&
        Number(consultation?.review_interval) > 0,
    },
    {
      text: t("consent__missing"),
      variant: "priority",
      show: !consultation?.has_consents?.length,
    },
    {
      text: t("domiciliary_care"),
      show: consultation?.suggestion === "DC",
      variant: "secondary",
    },
    {
      text: t("discharged_from_care"),
      show: !!consultation?.discharge_date,
      variant: "danger",
    },
    ...[
      [
        "Respiratory Support",
        RESPIRATORY_SUPPORT.find(
          (resp) =>
            resp.value === consultation?.last_daily_round?.ventilator_interface,
        )?.id ?? "UNKNOWN",
        consultation?.last_daily_round?.ventilator_interface,
      ],
    ].map((stat) => ({
      variant: "danger" as ChipProps["variant"],
      text: `${stat[0]} : ${stat[1]}`,
      show: !!stat[2] && stat[1] !== "NONE",
    })),
    {
      variant: "alert",
      text: `${
        CONSULTATION_SUGGESTION.find(
          (suggestion) => suggestion.id === consultation?.suggestion,
        )?.text
      } on ${formatDateTime(consultation?.encounter_date)}, ${
        consultation?.new_discharge_reason === 3
          ? `${t("expired_on", { death_date: consultation?.death_datetime })}`
          : `${t("discharged_on", { discharge_date: formatDateTime(consultation?.discharge_date) })}
                            `
      }`,
      show: !!consultation?.discharge_date,
    },
    {
      variant: "secondary",
      text: `
        ${
          consultation?.encounter_date &&
          t(consultation.suggestion === "DC" ? "commenced_on" : "admitted_on", {
            date: formatDateTime(consultation?.encounter_date),
          })
        }
        ${
          consultation?.icu_admission_date
            ? `, ${t("icu_admission_on", {
                date: formatDateTime(consultation?.icu_admission_date),
              })}`
            : ""
        }
      `,
      show: !consultation?.discharge_date,
    },
  ];

  const noUpdateFiled =
    consultation?.facility === patient.facility &&
    !(consultation?.discharge_date ?? !patient.is_active) &&
    dayjs(consultation?.modified_date).isBefore(dayjs().subtract(1, "day"));

  return (
    <>
      <DialogModal
        title={bedDialogTitle}
        show={open}
        onClose={() => setOpen(false)}
        className="md:max-w-3xl"
      >
        {patient?.facility && patient?.id && consultation?.id ? (
          <Beds
            facilityId={patient?.facility}
            discharged={!!consultation?.discharge_date}
            consultationId={consultation?.id ?? ""}
            setState={setOpen}
            fetchPatientData={props.fetchPatientData}
            smallLoader
            hideTitle
          />
        ) : (
          <div>Invalid Patient Data</div>
        )}
      </DialogModal>

      {consultation && (
        <>
          <DischargeSummaryModal
            consultation={consultation}
            show={openDischargeSummaryDialog}
            onClose={() => setOpenDischargeSummaryDialog(false)}
          />
          <DischargeModal
            show={openDischargeDialog}
            onClose={() => {
              setOpenDischargeDialog(false);
            }}
            afterSubmit={() => {
              setOpenDischargeDialog(false);
              props.fetchPatientData?.({ aborted: false });
            }}
            consultationData={consultation}
          />
        </>
      )}

      <section className="flex flex-col lg:flex-row">
        <div
          className="flex w-full flex-col lg:flex-row"
          id="patient-infobadges"
        >
          {/* Can support for patient picture in the future */}
          <div className="flex justify-evenly lg:justify-normal">
            <div className="flex flex-col items-start lg:items-center">
              <div
                className={`w-24 min-w-20 bg-secondary-200 ${categoryClass}-profile h-24`}
              >
                {consultation?.current_bed &&
                consultation?.discharge_date === null ? (
                  <div className="tooltip flex h-full flex-col items-center justify-center">
                    <p className="w-full truncate px-2 text-center text-sm text-secondary-900">
                      {
                        consultation?.current_bed?.bed_object?.location_object
                          ?.name
                      }
                    </p>
                    <p className="w-full truncate px-2 text-center text-base font-bold">
                      {consultation?.current_bed?.bed_object.name}
                    </p>
                    <div className="tooltip-text tooltip-right flex -translate-x-1/3 translate-y-1/2 flex-col items-center justify-center text-sm">
                      <span>
                        {
                          consultation?.current_bed?.bed_object?.location_object
                            ?.name
                        }
                      </span>
                      <span>{consultation?.current_bed?.bed_object.name}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <CareIcon
                      icon="l-user-injured"
                      className="text-3xl text-secondary-500"
                    />
                  </div>
                )}
              </div>
              {category && (
                <div
                  className={`w-24 rounded-b py-1 text-center text-xs font-bold ${categoryClass}`}
                >
                  {category.toUpperCase()}
                </div>
              )}
              {consultation?.admitted && (
                <ButtonV2
                  id="switch-bed"
                  ghost
                  onClick={() => setOpen(true)}
                  className="mt-1 px-[10px] py-1"
                >
                  {bedDialogTitle}
                </ButtonV2>
              )}
            </div>
            <div className="flex items-center justify-center">
              <div
                className="mb-2 flex flex-col justify-center text-xl font-semibold capitalize lg:hidden"
                id="patient-name-consultation"
              >
                {patient.name}
                <div className="ml-3 mr-2 mt-[6px] text-sm font-semibold text-secondary-600">
                  {formatPatientAge(patient, true)} • {patient.gender}
                </div>
                <div className="mr-3 flex flex-col items-center">
                  <Link
                    href={`/facility/${consultation?.facility}`}
                    className="mt-2 items-center justify-center text-sm font-semibold text-black hover:text-primary-600 lg:hidden"
                  >
                    <CareIcon
                      icon="l-hospital"
                      className="mr-1 text-lg text-primary-400"
                      aria-hidden="true"
                    />
                    {consultation?.facility_name}
                  </Link>
                </div>
              </div>
            </div>
          </div>
          <div className="flex w-full flex-col items-center gap-4 lg:items-start lg:gap-0 lg:pl-4">
            <div className="flex flex-col flex-wrap items-center justify-center lg:items-start lg:justify-normal">
              {patient.facility_object && (
                <div>
                  <FacilityBlock mini facility={patient.facility_object} />
                </div>
              )}
              <div
                className="hidden flex-row text-2xl font-bold capitalize lg:flex"
                id="patient-name-consultation"
              >
                {patient.name}
              </div>
              <div className="text-sm font-semibold text-secondary-600 mb-1">
                {formatPatientAge(patient, true)} • {patient.gender}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm sm:flex-row mt-1">
                <div
                  className="flex w-full flex-wrap items-center justify-center gap-2 text-sm text-secondary-900 sm:flex-row sm:text-sm md:pr-10 lg:justify-normal"
                  id="patient-consultationbadges"
                >
                  {chips
                    .filter((c) => c.show)
                    .map((chip, i) => (
                      <Chip key={i} size="small" {...chip} />
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div
          className="flex flex-col lg:flex-row items-center justify-end gap-4 2xl:flex-row"
          id="consultation-buttons"
        >
          <div className="flex flex-row lg:flex-col gap-4 mt-2 lg:mt-0 lg:w-14 justify-center">
            {consultation?.suggestion === "A" && (
              <div className="flex flex-col items-center gap-1">
                <div className="h-7 aspect-square flex items-center justify-center text-sm font-semibold border-2 rounded-full">
                  {dayjs(consultation.discharge_date || undefined).diff(
                    consultation.encounter_date,
                    "day",
                  ) + 1}
                </div>
                <span className="text-xs font-medium text-secondary-700">
                  {t("ip_day_no")}
                </span>
              </div>
            )}
            {consultation?.last_daily_round && (
              <div className="flex justify-center lg:flex-row">
                <Mews dailyRound={consultation?.last_daily_round} />
              </div>
            )}
          </div>
          {!!consultation?.discharge_date && (
            <div className="flex min-w-max flex-col items-center justify-center">
              <div className="text-sm font-normal leading-5 text-secondary-500">
                {t("discharge_reason")}
              </div>
              <div className="mt-[6px] text-xl font-semibold leading-5 text-secondary-900">
                {!consultation?.new_discharge_reason ? (
                  <span className="text-secondary-800">
                    {consultation.suggestion === "OP"
                      ? t("op_file_closed")
                      : t("unknown")}
                  </span>
                ) : consultation?.new_discharge_reason ===
                  DISCHARGE_REASONS.find((i) => i.text == "Expired")?.id ? (
                  <span className="text-red-600">{t("expired")}</span>
                ) : (
                  DISCHARGE_REASONS.find(
                    (reason) =>
                      reason.id === consultation?.new_discharge_reason,
                  )?.text
                )}
              </div>
            </div>
          )}
          <div className="flex w-full flex-col lg:w-auto">
            <AuthorizedForConsultationRelatedActions>
              {patient.is_active &&
                consultation?.id &&
                !consultation?.discharge_date && (
                  <div
                    className="h-12 min-h-[40px] w-full min-w-[170px] lg:w-auto"
                    id="log-update"
                  >
                    <ButtonV2
                      variant={noUpdateFiled ? "danger" : "primary"}
                      href={
                        consultation?.admitted && !consultation?.current_bed
                          ? undefined
                          : `/facility/${patient.facility}/patient/${patient.id}/consultation/${consultation?.id}/daily-rounds`
                      }
                      onClick={() => {
                        if (
                          consultation?.admitted &&
                          !consultation?.current_bed
                        ) {
                          Notification.Error({
                            msg: t("please_assign_bed"),
                          });
                          setOpen(true);
                        }
                      }}
                      className="w-full justify-left"
                    >
                      <CareIcon icon="l-plus" className="text-xl" />
                      <span className="font-semibold">
                        {authUser.user_type === "Doctor"
                          ? t("file_note")
                          : t("log_update")}
                      </span>
                    </ButtonV2>
                    {noUpdateFiled && (
                      <>
                        <p className="mt-0.5 text-xs text-red-500">
                          <div className="text-center">
                            <CareIcon icon="l-exclamation-triangle" />{" "}
                            {t("no_update_filed")}
                          </div>
                        </p>
                      </>
                    )}
                  </div>
                )}
            </AuthorizedForConsultationRelatedActions>
            <DropdownMenu
              id="show-more"
              itemClassName="min-w-0 sm:min-w-[225px]"
              title="Manage Patient"
              icon={<CareIcon icon="l-setting" className="text-xl" />}
              className="xl:justify-center"
              containerClassName="w-full lg:w-auto mt-2 2xl:mt-0 flex justify-center z-20"
            >
              <div>
                {[
                  [
                    `/facility/${patient.facility}/patient/${patient.id}/consultation/${consultation?.id}/update`,
                    "Edit Consultation Details",
                    "l-pen",
                    patient.is_active &&
                      consultation?.id &&
                      !consultation?.discharge_date,
                  ],
                  [
                    `/facility/${patient.facility}/patient/${patient.id}/consultation/${consultation?.id}/consent-records`,
                    "Consent Records",
                    "l-file-medical",
                    patient.is_active,
                  ],
                  [
                    `/patient/${patient.id}/investigation_reports`,
                    "Investigation Summary",
                    "l-align-alt",
                    true,
                  ],
                  [
                    `/facility/${patient.facility}/patient/${patient.id}/consultation/${consultation?.id}/treatment-summary`,
                    "Treatment Summary",
                    "l-file-medical",
                    consultation?.id,
                  ],
                ].map(
                  (action: any, i) =>
                    action[3] && (
                      <div key={i}>
                        <Link
                          key={i}
                          className="dropdown-item-primary pointer-events-auto m-2 flex cursor-pointer items-center justify-start gap-2 rounded border-0 p-2 text-sm font-normal transition-all duration-200 ease-in-out"
                          href={
                            !["Treatment Summary", "Consent Records"].includes(
                              action[1],
                            ) &&
                            consultation?.admitted &&
                            !consultation?.current_bed &&
                            i === 1
                              ? ""
                              : `${action[0]}`
                          }
                          onClick={() => {
                            if (
                              ![
                                "Treatment Summary",
                                "Consent Records",
                              ].includes(action[1]) &&
                              consultation?.admitted &&
                              !consultation?.current_bed &&
                              i === 1
                            ) {
                              Notification.Error({
                                msg: "Please assign a bed to the patient",
                              });
                              setOpen(true);
                            }
                            triggerGoal("Patient Card Button Clicked", {
                              buttonName: action[1],
                              consultationId: consultation?.id,
                              userId: authUser?.id,
                            });
                          }}
                        >
                          <CareIcon
                            icon={action[2]}
                            className="text-lg text-primary-500"
                          />
                          <span>{action[1]}</span>
                        </Link>
                        {action?.[4]?.[0] && (
                          <>
                            <p className="mt-1 text-xs text-red-500">
                              {action[4][1]}
                            </p>
                          </>
                        )}
                      </div>
                    ),
                )}
              </div>

              <div>
                {!consultation?.discharge_date && (
                  <MenuItem>
                    {({ close }) => (
                      <>
                        {hasActiveShiftingRequest() ? (
                          <div
                            className="dropdown-item-primary pointer-events-auto m-2 flex cursor-pointer items-center justify-start gap-2 rounded border-0 p-2 text-sm font-normal transition-all duration-200 ease-in-out"
                            onClick={() => {
                              close();
                              navigate(
                                `/shifting/${
                                  activeShiftingData[
                                    activeShiftingData.length - 1
                                  ].id
                                }`,
                              );
                            }}
                          >
                            <span className="flex w-full items-center justify-start gap-2">
                              <CareIcon
                                icon="l-ambulance"
                                className="text-lg text-primary-500"
                              />
                              <p>Track Shifting</p>
                            </span>
                          </div>
                        ) : (
                          <div
                            className="dropdown-item-primary pointer-events-auto m-2 flex cursor-pointer items-center justify-start gap-2 rounded border-0 p-2 text-sm font-normal transition-all duration-200 ease-in-out"
                            onClick={() => {
                              close();
                              navigate(
                                `/facility/${patient.facility}/patient/${patient.id}/shift/new`,
                              );
                            }}
                          >
                            <span className="flex w-full items-center justify-start gap-2">
                              <CareIcon
                                icon="l-ambulance"
                                className="text-lg text-primary-500"
                              />
                              <p>Shift Patient</p>
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </MenuItem>
                )}
                <MenuItem>
                  {({ close }) => (
                    <div
                      className="dropdown-item-primary pointer-events-auto m-2 flex cursor-pointer items-center justify-start gap-2 rounded border-0 p-2 text-sm font-normal transition-all duration-200 ease-in-out"
                      onClick={() => {
                        close();
                        setOpenDischargeSummaryDialog(true);
                      }}
                    >
                      <span className="flex w-full items-center justify-start gap-2">
                        <CareIcon
                          icon="l-clipboard-notes"
                          className="text-lg text-primary-500"
                        />
                        <p>{t("discharge_summary")}</p>
                      </span>
                    </div>
                  )}
                </MenuItem>
                <MenuItem>
                  {({ close }) => (
                    <div
                      className={`dropdown-item-primary pointer-events-auto ${
                        consultation?.discharge_date &&
                        "text-secondary-500 accent-secondary-500 hover:bg-white"
                      } m-2 flex cursor-pointer items-center justify-start gap-2 rounded border-0 p-2 text-sm font-normal transition-all duration-200 ease-in-out`}
                      onClick={() => {
                        if (!consultation?.discharge_date) {
                          close();
                          setOpenDischargeDialog(true);
                        }
                      }}
                    >
                      <span className="flex w-full items-center justify-start gap-2">
                        <CareIcon
                          icon="l-hospital"
                          className={`text-lg ${
                            consultation?.discharge_date
                              ? "text-secondary-500"
                              : "text-primary-500"
                          }`}
                        />
                        <p>{t("discharge_from_care")}</p>
                      </span>
                    </div>
                  )}
                </MenuItem>
              </div>

              <PLUGIN_Component
                __name="ManagePatientOptions"
                patient={patient}
                consultation={consultation}
              />

              <div className="px-4 py-2">
                <Field as="div" className="flex items-center">
                  <Switch
                    checked={medicoLegalCase}
                    onChange={(checked) => {
                      triggerGoal("Patient Card Button Clicked", {
                        buttonName: "Medico Legal Case",
                        consultationId: consultation?.id,
                        userId: authUser?.id,
                      });
                      setMedicoLegalCase(checked);
                      switchMedicoLegalCase(checked);
                    }}
                    className={classNames(
                      medicoLegalCase ? "bg-primary" : "bg-secondary-200",
                      "relative inline-flex h-4 w-8 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={classNames(
                        medicoLegalCase ? "translate-x-4" : "translate-x-0",
                        "pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                      )}
                    />
                  </Switch>
                  <Label as="span" className="ml-3 text-sm">
                    <span className="font-medium text-secondary-900">
                      Medico-Legal Case
                    </span>{" "}
                  </Label>
                </Field>
              </div>
            </DropdownMenu>
          </div>
        </div>
      </section>

      <PLUGIN_Component __name="ExtendPatientInfoCard" {...props} />
    </>
  );
}
