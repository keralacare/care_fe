import { navigate } from "raviger";
import { useEffect, useState } from "react";
import * as Notification from "../../Utils/Notifications";

import {
  DISCHARGE_REASONS,
  GENDER_TYPES,
  OCCUPATION_TYPES,
  SAMPLE_TEST_STATUS,
} from "../../Common/constants";
import { PatientModel, SampleTestModel } from "./models";
import {
  classNames,
  formatDate,
  formatDateTime,
  formatName,
  formatPatientAge,
  isAntenatal,
  isPostPartum,
} from "../../Utils/utils";
import ButtonV2 from "../Common/components/ButtonV2";

import CareIcon from "../../CAREUI/icons/CareIcon";
import Chip from "../../CAREUI/display/Chip";
import CircularProgress from "../Common/components/CircularProgress";
import ConfirmDialog from "../Common/ConfirmDialog";
import { ConsultationCard } from "../Facility/ConsultationCard";
import { ConsultationModel } from "../Facility/models";
import { NonReadOnlyUsers } from "../../Utils/AuthorizeFor";
import Page from "../Common/components/Page";
import RelativeDateUserMention from "../Common/RelativeDateUserMention";
import { SampleTestCard } from "./SampleTestCard";
import UserAutocomplete from "../Common/UserAutocompleteFormField";
import dayjs from "../../Utils/dayjs";
import { triggerGoal } from "../../Integrations/Plausible";
import useAuthUser from "../../Common/hooks/useAuthUser";
import useQuery from "../../Utils/request/useQuery";
import routes from "../../Redux/api";
import { InsuranceDetialsCard } from "./InsuranceDetailsCard";
import request from "../../Utils/request/request";
import PaginatedList from "../../CAREUI/misc/PaginatedList";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription, AlertTitle } from "@/Components/ui/alert";
import { Button } from "@/Components/ui/button";
import Loading from "@/Components/Common/Loading";
import { Avatar } from "../Common/Avatar";
export const parseOccupation = (occupation: string | undefined) => {
  return OCCUPATION_TYPES.find((i) => i.value === occupation)?.text;
};

export const PatientHome = (props: any) => {
  const { facilityId, id } = props;
  const [showShifts, setShowShifts] = useState(false);
  const [isShiftClicked, setIsShiftClicked] = useState(false);
  const [patientData, setPatientData] = useState<PatientModel>({});
  const [assignedVolunteerObject, setAssignedVolunteerObject] =
    useState<any>(null);
  const authUser = useAuthUser();
  const { t } = useTranslation();
  const [selectedStatus, setSelectedStatus] = useState<{
    status: number;
    sample: any;
  }>({ status: 0, sample: null });
  const [showAlertMessage, setShowAlertMessage] = useState(false);
  const [modalFor, setModalFor] = useState({
    externalId: undefined,
    loading: false,
  });
  const [openAssignVolunteerDialog, setOpenAssignVolunteerDialog] =
    useState(false);
  const [activeTab, setActiveTab] = useState("patient-profile");

  const initErr: any = {};
  const errors = initErr;

  useEffect(() => {
    setAssignedVolunteerObject(patientData.assigned_to_object);
  }, [patientData.assigned_to_object]);

  const handleTransferComplete = async (shift: any) => {
    setModalFor({ ...modalFor, loading: true });
    await request(routes.completeTransfer, {
      pathParams: {
        id: modalFor.externalId ?? "",
      },
    });
    navigate(
      `/facility/${shift.assigned_facility}/patient/${shift.patient}/consultation`,
    );
  };

  const { data: insuranceDetials } = useQuery(routes.hcx.policies.list, {
    query: {
      patient: id,
      limit: 1,
    },
  });

  const handlePatientTransfer = async (value: boolean) => {
    const dummyPatientData = Object.assign({}, patientData);
    dummyPatientData["allow_transfer"] = value;

    await request(routes.patchPatient, {
      pathParams: {
        id: patientData.id as string,
      },

      body: { allow_transfer: value },

      onResponse: ({ res }) => {
        if ((res || {}).status === 200) {
          const dummyPatientData = Object.assign({}, patientData);
          dummyPatientData["allow_transfer"] = value;
          setPatientData(dummyPatientData);

          Notification.Success({
            msg: "Transfer status updated.",
          });
        }
      },
    });
  };

  const handleVolunteerSelect = (volunteer: any) => {
    setAssignedVolunteerObject(volunteer.value);
  };

  const { loading: isLoading, refetch } = useQuery(routes.getPatient, {
    pathParams: {
      id,
    },
    onResponse: ({ res, data }) => {
      if (res?.ok && data) {
        setPatientData(data);
      }
      triggerGoal("Patient Profile Viewed", {
        facilityId: facilityId,
        userId: authUser.id,
      });
    },
  });

  const handleAssignedVolunteer = async () => {
    const { res, data } = await request(routes.patchPatient, {
      pathParams: {
        id: patientData.id as string,
      },
      body: {
        assigned_to: assignedVolunteerObject
          ? assignedVolunteerObject.id
          : null,
      },
    });
    if (res?.ok && data) {
      setPatientData(data);
      if (assignedVolunteerObject) {
        Notification.Success({
          msg: "Volunteer assigned successfully.",
        });
      } else {
        Notification.Success({
          msg: "Volunteer unassigned successfully.",
        });
      }
      refetch();
    }
    setOpenAssignVolunteerDialog(false);
    if (errors["assignedVolunteer"]) delete errors["assignedVolunteer"];
  };

  const { loading: isShiftDataLoading, data: activeShiftingData } = useQuery(
    routes.listShiftRequests,
    {
      query: {
        patient: id,
      },
      prefetch: isShiftClicked,
    },
  );

  const confirmApproval = (status: number, sample: any) => {
    setSelectedStatus({ status, sample });
    setShowAlertMessage(true);
  };

  const handleApproval = async () => {
    const { status, sample } = selectedStatus;
    const sampleData = {
      id: sample.id,
      status: status.toString(),
      consultation: sample.consultation,
    };
    const statusName = SAMPLE_TEST_STATUS.find((i) => i.id === status)?.desc;

    await request(routes.patchSample, {
      body: sampleData,
      pathParams: {
        id: sample.id,
      },
      onResponse: ({ res }) => {
        if (res?.ok) {
          Notification.Success({
            msg: `Request ${statusName}`,
          });
        }
        setShowAlertMessage(false);
      },
    });
  };

  if (isLoading) {
    return <Loading />;
  }

  const patientGender = GENDER_TYPES.find(
    (i) => i.id === patientData.gender,
  )?.text;

  let patientMedHis: any[] = [];
  if (
    patientData &&
    patientData.medical_history &&
    patientData.medical_history.length
  ) {
    const medHis = patientData.medical_history;
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

  const isPatientInactive = (patientData: PatientModel, facilityId: string) => {
    return (
      !patientData.is_active ||
      !(patientData?.last_consultation?.facility === facilityId)
    );
  };

  const isPatientEligibleForNewConsultation = (patientData: PatientModel) => {
    return patientData.is_active &&
      (!patientData?.last_consultation ||
        patientData?.last_consultation?.discharge_date)
      ? true
      : false;
  };

  return (
    <Page
      title={t("details_of_patient")}
      crumbsReplacements={{
        [facilityId]: { name: patientData?.facility_object?.name },
        [id]: { name: patientData?.name },
      }}
      backUrl={facilityId ? `/facility/${facilityId}/patients` : "/patients"}
    >
      <ConfirmDialog
        title="Confirm send sample to collection centre"
        description="Are you sure you want to send the sample to Collection Centre?"
        show={showAlertMessage}
        action="Approve"
        onConfirm={() => handleApproval()}
        onClose={() => setShowAlertMessage(false)}
      />

      <div>
        <div className="relative mt-2">
          <div className="mx-auto max-w-screen-xl py-3">
            <div className="md:flex">
              {patientData?.last_consultation?.assigned_to_object && (
                <p className="flex flex-1 justify-center gap-2 rounded-lg bg-green-200 p-3 text-center font-bold text-green-800 shadow">
                  <span className="inline">
                    Assigned Doctor:
                    {formatName(
                      patientData.last_consultation.assigned_to_object,
                    )}
                  </span>
                  {patientData?.last_consultation?.assigned_to_object
                    .alt_phone_number && (
                    <a
                      href={`https://wa.me/${patientData?.last_consultation?.assigned_to_object.alt_phone_number?.replace(/\D+/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <CareIcon icon="l-whatsapp" /> Video Call
                    </a>
                  )}
                </p>
              )}
              {patientData.assigned_to_object && (
                <p className="rounded-lg bg-primary-200 p-3 text-center font-bold text-primary-800 shadow">
                  <span className="inline">
                    Assigned Volunteer:
                    {formatName(patientData.assigned_to_object)}
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>
        {(patientData?.facility != patientData?.last_consultation?.facility ||
          (patientData.is_active &&
            patientData?.last_consultation?.discharge_date)) && (
          <Alert
            variant="destructive"
            className="mb-4 flex flex-col items-center justify-between gap-2 md:flex-row"
          >
            <div className="flex items-center gap-2">
              <CareIcon
                icon="l-exclamation-triangle"
                className="mr-2 hidden h-10 animate-pulse md:block"
              />
              <div>
                <AlertTitle className="flex items-center">
                  {t("consultation_not_filed")}
                </AlertTitle>
                <AlertDescription>
                  <span className="text-gray-700">
                    {t("consultation_not_filed_description")}
                  </span>
                </AlertDescription>
              </div>
            </div>
            <Button
              variant="outline_primary"
              disabled={!patientData.is_active}
              onClick={() =>
                navigate(
                  `/facility/${patientData?.facility}/patient/${id}/consultation`,
                )
              }
            >
              <CareIcon icon="l-plus" className="mr-2" />
              <span>{t("create_consultation")}</span>
            </Button>
          </Alert>
        )}

        <div>
          <div>
            <div className="flex flex-row gap-x-4">
              <div className="w-14">
                <Avatar
                  className="size-10 text-green-800 md:size-auto"
                  name={patientData.name || "Unknown"}
                  colors={["#86efac", "#14532d"]}
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold capitalize">
                  {patientData.name}
                </h1>
                <h3 className="text-sm font-medium text-gray-500">
                  {formatPatientAge(patientData, true)},{"  "}
                  {patientGender}
                </h3>
              </div>
              <div className="mx-5 mt-3">
                <h1 className="text-sm text-gray-500">UHID</h1>
                <h1 className="text-sm text-gray-900">-</h1>
              </div>
              <div className="ml-auto flex flex-wrap gap-3">
                {patientData.is_vaccinated && (
                  <Chip
                    variant="custom"
                    className="bg-blue-100 text-blue-800"
                    startIcon="l-syringe"
                    text="Vaccinated"
                  />
                )}
                {patientData.allow_transfer ? (
                  <Chip
                    variant="warning"
                    startIcon="l-unlock"
                    text="Transfer Allowed"
                  />
                ) : (
                  <Chip startIcon="l-lock" text="Transfer Blocked" />
                )}
                {patientData.gender === 2 && (
                  <>
                    {patientData.is_antenatal &&
                      isAntenatal(patientData.last_menstruation_start_date) && (
                        <Chip
                          variant="custom"
                          className="border-pink-300 bg-pink-100 text-pink-600"
                          startIcon="l-baby-carriage"
                          text="Antenatal"
                        />
                      )}
                    {isPostPartum(patientData.date_of_delivery) && (
                      <Chip
                        variant="custom"
                        className="border-pink-300 bg-pink-100 text-pink-600"
                        startIcon="l-baby-carriage"
                        text="Post-partum"
                      />
                    )}
                  </>
                )}
                {patientData.last_consultation?.is_telemedicine && (
                  <Chip
                    variant="alert"
                    startIcon="l-phone"
                    text="Telemedicine"
                  />
                )}
              </div>
            </div>

            <h3 className="mt-3 text-base font-medium">
              <CareIcon icon="l-hospital" className="mr-2 text-emerald-900" />
              {patientData.facility_object?.name || "-"}
            </h3>
            <p className="mb-7 mt-4 text-sm font-medium text-zinc-500">
              {patientGender} | {patientData.blood_group || "-"} | Born on{" "}
              {patientData.date_of_birth
                ? formatDate(patientData.date_of_birth)
                : patientData.year_of_birth}
            </p>
          </div>
        </div>

        <div className="my-2 mt-4 w-full border-b">
          <div className="no-scrollbar flex flex-row overflow-x-auto">
            <button
              className={`px-6 py-2 ${
                activeTab === "patient-profile"
                  ? "border-b-2 border-green-600 font-semibold text-green-700"
                  : "rounded-lg hover:bg-gray-100"
              }`}
              onClick={() => setActiveTab("patient-profile")}
            >
              {t("patient_profile")}
            </button>

            <button
              className={`px-6 py-2 ${
                activeTab === "consultation-history"
                  ? "border-b-2 border-green-600 font-semibold text-green-700"
                  : "rounded-lg hover:bg-gray-100"
              }`}
              onClick={() => setActiveTab("consultation-history")}
            >
              Consultation History
            </button>
            <button
              className={`px-6 py-2 ${
                activeTab === "test-sample-history"
                  ? "border-b-2 border-green-600 font-semibold text-green-700"
                  : "rounded-lg hover:bg-gray-100"
              }`}
              onClick={() => setActiveTab("test-sample-history")}
            >
              Test Sample History
            </button>
            <button
              className={`px-6 py-2 ${
                activeTab === "shifting-history"
                  ? "border-b-2 border-green-600 font-semibold text-green-700"
                  : "rounded-lg hover:bg-gray-100"
              }`}
              onClick={() => setActiveTab("shifting-history")}
            >
              Shifting History
            </button>
            <button
              className={`px-6 py-2 ${
                activeTab === "visit-history"
                  ? "border-b-2 border-green-600 font-semibold text-green-700"
                  : "rounded-lg hover:bg-gray-100"
              }`}
              onClick={() => setActiveTab("visit-history")}
            >
              Visit History
            </button>
          </div>
        </div>

        {activeTab === "patient-profile" && (
          <div>
            <section className="lg:flex" data-testid="patient-dashboard">
              <div className="lg:w-3/5">
                <div className="flex h-full flex-col justify-between">
                  <div className="pb-2 pl-5 pt-5">
                    <div>
                      <hr className="mb-1 mr-5 h-1 w-5 border-0 bg-blue-500" />
                      <div className="w-full">
                        <div className="flex justify-between">
                          <h1 className="text-xl">{t("general_info")}</h1>
                        </div>
                        <div className="mb-8 mt-2 grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-2 md:gap-y-8 lg:grid-cols-2">
                          <div className="sm:col-span-1">
                            <div className="text-sm font-semibold leading-5 text-zinc-400">
                              Full Name
                            </div>
                            <div className="mt-1 text-sm font-medium leading-5">
                              {patientData.name}
                            </div>
                          </div>
                          <div className="sm:col-span-1">
                            <div className="text-sm font-semibold leading-5 text-zinc-400">
                              {t("phone")}
                            </div>
                            <div className="mt-1 text-sm leading-5">
                              <div>
                                <a
                                  href={`tel:${patientData.phone_number}`}
                                  className="text-sm font-medium text-black hover:text-secondary-500"
                                >
                                  {patientData.phone_number || "-"}
                                </a>
                              </div>
                              <div>
                                <a
                                  href={`https://wa.me/${patientData.phone_number?.replace(/\D+/g, "")}`}
                                  target="_blank"
                                  className="text-sm font-normal text-sky-600 hover:text-sky-300"
                                  rel="noreferrer"
                                >
                                  <CareIcon icon="l-whatsapp" /> Chat on
                                  WhatsApp
                                </a>
                              </div>
                            </div>
                          </div>
                          <div className="sm:col-span-1">
                            <div className="text-sm font-semibold leading-5 text-zinc-400">
                              {t("date_of_birth")}
                            </div>
                            <div className="mt-1 text-sm font-medium leading-5">
                              {dayjs(patientData.date_of_birth).format(
                                "DD MMM YYYY",
                              )}{" "}
                              ({formatPatientAge(patientData, true)})
                            </div>
                          </div>
                          <div className="sm:col-span-1">
                            <div className="text-sm font-semibold leading-5 text-zinc-400">
                              {t("sex")}
                            </div>
                            <div className="mt-1 text-sm font-medium leading-5">
                              {patientGender}
                            </div>
                          </div>
                          <div className="sm:col-span-2">
                            <div className="mr-6 flex flex-col items-start justify-between rounded-md border border-orange-300 bg-orange-50 p-4 sm:flex-row">
                              {/* Emergency Contact Section */}
                              <div className="flex-1">
                                <div className="text-sm font-semibold leading-5 text-zinc-400">
                                  {t("emergency_contact")}
                                </div>

                                <div className="mt-1 text-sm leading-5 text-secondary-900">
                                  <div>
                                    <a
                                      href={`tel:${patientData.emergency_phone_number}`}
                                      className="text-sm font-medium text-black hover:text-secondary-500"
                                    >
                                      {patientData.emergency_phone_number ||
                                        "-"}
                                    </a>
                                  </div>
                                  {patientData.emergency_phone_number && (
                                    <div>
                                      <a
                                        href={`https://wa.me/${patientData.emergency_phone_number?.replace(
                                          /\D+/g,
                                          "",
                                        )}`}
                                        target="_blank"
                                        className="text-sm font-normal text-sky-600 hover:text-sky-300"
                                        rel="noreferrer"
                                      >
                                        <CareIcon icon="l-whatsapp" /> Chat on
                                        WhatsApp
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="ml-0 mt-4 flex-1 sm:ml-4 sm:mt-0">
                                <div className="text-sm font-semibold leading-5 text-zinc-400">
                                  {t("emergency_contact_person_name")}
                                </div>
                                <div className="mt-1 text-sm font-medium leading-5">
                                  {patientData.name || "-"}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <hr className="mb-1 mr-5 h-1 w-5 border-0 bg-blue-500" />
                      <div className="w-full">
                        <div className="flex justify-between">
                          <h1 className="text-xl">{t("covid_details")}</h1>
                        </div>

                        <div className="mb-8 mt-2 grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-2 md:gap-y-8 lg:grid-cols-2">
                          {patientData.is_vaccinated &&
                            !!patientData.number_of_doses && (
                              <div className="sm:col-span-1">
                                <div className="text-sm font-semibold leading-5 text-zinc-400">
                                  {t("number_of_covid_vaccine_doses")}
                                </div>
                                <div className="mt-1 text-sm font-medium leading-5">
                                  {patientData.number_of_doses}
                                </div>
                              </div>
                            )}
                          {patientData.is_vaccinated &&
                            patientData.vaccine_name && (
                              <div className="sm:col-span-1">
                                <div className="text-sm font-semibold leading-5 text-zinc-400">
                                  {t("vaccine_name")}
                                </div>
                                <div className="mt-1 text-sm font-medium leading-5">
                                  {patientData.vaccine_name}
                                </div>
                              </div>
                            )}
                          {patientData.is_vaccinated &&
                            patientData.last_vaccinated_date && (
                              <div className="sm:col-span-1">
                                <div className="text-sm font-semibold leading-5 text-zinc-400">
                                  {t("last_vaccinated_on")}
                                </div>
                                <div className="mt-1 text-sm font-medium leading-5">
                                  {formatDateTime(
                                    patientData.last_vaccinated_date,
                                  )}
                                </div>
                              </div>
                            )}
                          {patientData.countries_travelled &&
                            !!patientData.countries_travelled.length && (
                              <div className="sm:col-span-1">
                                <div className="text-sm font-semibold leading-5 text-zinc-400">
                                  {t("countries_travelled")}
                                </div>
                                <div className="mt-1 text-sm font-medium leading-5">
                                  {patientData.countries_travelled.join(", ")}
                                </div>
                              </div>
                            )}
                          {patientData.date_of_return && (
                            <div className="sm:col-span-1">
                              <div className="text-sm font-semibold leading-5 text-zinc-400">
                                {t("date_of_return")}
                              </div>
                              <div className="mt-1 text-sm font-medium leading-5">
                                {formatDateTime(patientData.date_of_return)}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      <hr className="mb-1 mr-5 h-1 w-5 border-0 bg-blue-500" />
                      <div className="w-full">
                        <div className="flex justify-between">
                          <h1 className="text-xl">{t("social_profile")}</h1>
                        </div>
                        {patientData.meta_info?.occupation ||
                        patientData.ration_card_category ||
                        patientData.meta_info?.socioeconomic_status ||
                        patientData.meta_info?.domestic_healthcare_support ? (
                          <div className="mb-8 mt-2 grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-2 md:gap-y-8 lg:grid-cols-2">
                            {patientData.meta_info?.occupation && (
                              <div className="sm:col-span-1">
                                <div className="text-sm font-semibold leading-5 text-zinc-400">
                                  {t("occupation")}
                                </div>
                                <div className="mt-1 text-sm font-medium leading-5">
                                  {parseOccupation(
                                    patientData.meta_info.occupation,
                                  )}
                                </div>
                              </div>
                            )}
                            {patientData.ration_card_category && (
                              <div className="sm:col-span-1">
                                <div className="text-sm font-semibold leading-5 text-zinc-400">
                                  {t("ration_card_category")}
                                </div>
                                <div className="mt-1 text-sm font-medium leading-5">
                                  {t(
                                    `ration_card__${patientData.ration_card_category}`,
                                  )}
                                </div>
                              </div>
                            )}
                            {patientData.meta_info?.socioeconomic_status && (
                              <div className="sm:col-span-1">
                                <div className="text-sm font-semibold leading-5 text-zinc-400">
                                  {t("socioeconomic_status")}
                                </div>
                                <div className="mt-1 text-sm font-medium leading-5">
                                  {t(
                                    `SOCIOECONOMIC_STATUS__${patientData.meta_info.socioeconomic_status}`,
                                  )}
                                </div>
                              </div>
                            )}
                            {patientData.meta_info
                              ?.domestic_healthcare_support && (
                              <div className="sm:col-span-1">
                                <div className="text-sm font-semibold leading-5 text-zinc-400">
                                  {t("domestic_healthcare_support")}
                                </div>
                                <div className="mt-1 text-sm font-medium leading-5">
                                  {t(
                                    `DOMESTIC_HEALTHCARE_SUPPORT__${patientData.meta_info.domestic_healthcare_support}`,
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex w-full items-center justify-center text-xl font-bold text-secondary-500">
                            {t("no_social_profile_details_available")}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pb-2 pl-5 pt-2">
                    <hr className="mb-1 mr-5 h-1 w-5 border-0 bg-blue-500" />
                    <div className="w-full">
                      <div className="flex justify-between">
                        <h1 className="mr-4 w-full text-xl">{t("location")}</h1>
                      </div>
                      <div className="mb-8 mt-2 grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-2 md:gap-y-8 lg:grid-cols-2">
                        <div className="sm:col-span-1">
                          <div className="text-sm font-semibold leading-5 text-zinc-400">
                            {t("current_address")}
                          </div>
                          <div className="mt-1 whitespace-normal break-words text-sm font-medium leading-5">
                            {patientData.address || "-"}
                          </div>
                        </div>
                        <div className="sm:col-span-1">
                          <div className="text-sm font-semibold leading-5 text-zinc-400">
                            {t("permanent_address")}
                          </div>
                          <div className="mt-1 whitespace-normal break-words text-sm font-medium leading-5">
                            {patientData.permanent_address || "-"}
                          </div>
                        </div>
                        <div className="sm:col-span-1">
                          <div className="text-sm font-semibold leading-5 text-zinc-400">
                            {t("nationality")}
                          </div>
                          <div className="mt-1 whitespace-normal break-words text-sm font-medium leading-5">
                            {patientData.nationality || "-"}
                          </div>
                        </div>
                        <div className="sm:col-span-1">
                          <div className="text-sm font-semibold leading-5 text-zinc-400">
                            {t("state")}
                          </div>
                          <div className="mt-1 whitespace-normal break-words text-sm font-medium leading-5">
                            {patientData?.state_object?.name} -{" "}
                            {patientData.pincode}
                          </div>
                        </div>
                        <div className="sm:col-span-1">
                          <div className="text-sm font-semibold leading-5 text-zinc-400">
                            {t("district")}
                          </div>
                          <div className="mt-1 whitespace-normal break-words text-sm font-medium leading-5">
                            {patientData.district_object?.name || "-"}
                          </div>
                        </div>

                        <div className="sm:col-span-1">
                          <div className="text-sm font-semibold leading-5 text-zinc-400">
                            {t("local_body")}
                          </div>
                          <div className="mt-1 whitespace-normal break-words text-sm font-medium leading-5">
                            {patientData.local_body_object?.name || "-"}
                          </div>
                        </div>

                        <div className="sm:col-span-1">
                          <div className="text-sm font-semibold leading-5 text-zinc-400">
                            {t("ward")}
                          </div>
                          <div className="mt-1 whitespace-normal break-words text-sm font-medium leading-5">
                            {(patientData.ward_object &&
                              patientData.ward_object.number +
                                ", " +
                                patientData.ward_object.name) ||
                              "-"}
                          </div>
                        </div>

                        <div className="sm:col-span-1">
                          <div className="text-sm font-semibold leading-5 text-zinc-400">
                            {t("village")}
                          </div>
                          <div className="mt-1 whitespace-normal break-words text-sm font-medium leading-5">
                            {patientData.village || "-"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {patientData.assigned_to_object && (
                    <div className="pb-5 pl-5 pt-5">
                      <hr className="mb-3 mr-5" />
                      <div className="w-full">
                        <div className="flex justify-between">
                          <h1 className="mr-4 w-full border-b border-dashed pb-2 text-xl">
                            {t("volunteer_contact")}
                          </h1>
                        </div>
                        <div className="mb-8 mt-2 grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-2 md:gap-y-8 lg:grid-cols-2">
                          <div className="sm:col-span-2">
                            <div className="mr-6 flex flex-col items-start justify-between rounded-md border border-orange-300 bg-orange-50 p-4 sm:flex-row">
                              {/* Emergency Contact Section */}
                              <div className="flex-1">
                                <div className="text-sm font-semibold leading-5 text-zinc-400">
                                  {t("emergency_contact_volunteer")}
                                </div>
                                {patientData.assigned_to_object && (
                                  <div className="mt-1 text-sm leading-5 text-secondary-900">
                                    <div>
                                      <a
                                        href={`tel:${patientData.emergency_phone_number}`}
                                        className="text-sm font-medium text-black hover:text-secondary-500"
                                      >
                                        {patientData.emergency_phone_number ||
                                          "-"}
                                      </a>
                                    </div>
                                    {patientData.emergency_phone_number && (
                                      <div>
                                        <a
                                          href={`https://wa.me/${patientData.emergency_phone_number?.replace(
                                            /\D+/g,
                                            "",
                                          )}`}
                                          target="_blank"
                                          className="text-sm font-normal text-sky-600 hover:text-sky-300"
                                          rel="noreferrer"
                                        >
                                          <CareIcon icon="l-whatsapp" /> Chat on
                                          WhatsApp
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className="ml-0 mt-4 flex-1 sm:ml-4 sm:mt-0">
                                <div className="text-sm font-semibold leading-5 text-zinc-400">
                                  {t("emergency_contact_person_name_volunteer")}
                                </div>
                                {patientData.assigned_to_object && (
                                  <div className="mt-1 text-sm font-medium leading-5">
                                    {formatName(
                                      patientData.assigned_to_object,
                                    ) || "-"}
                                    {/* {patientData.name || "-"} */}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="pb-2 pl-5 pt-2">
                    <hr className="mb-1 mr-5 h-1 w-5 border-0 bg-blue-500" />
                    <InsuranceDetialsCard
                      data={insuranceDetials?.results[0]}
                      showViewAllDetails={
                        insuranceDetials?.count !== undefined &&
                        insuranceDetials?.count > 1
                      }
                    />
                  </div>
                  <div className="w-full pb-5 pl-5 pt-5">
                    <hr className="mb-1 mr-5 h-1 w-5 border-0 bg-blue-500" />
                    <div className="h-full space-y-2">
                      <div className="mr-4 pb-2 text-xl font-bold text-secondary-900">
                        {t("medical")}
                      </div>
                      {!patientData.present_health &&
                        !patientData.allergies &&
                        !patientData.ongoing_medication &&
                        !(
                          patientData.gender === 2 && patientData.is_antenatal
                        ) &&
                        !patientData.medical_history?.some(
                          (history) => history.disease !== "NO",
                        ) && (
                          <div className="flex w-full items-center justify-center text-xl font-bold text-secondary-500">
                            {t("no_medical_history_available")}
                          </div>
                        )}
                      <div className="mt-2 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 md:gap-y-8">
                        {patientData.present_health && (
                          <div className="sm:col-span-1">
                            <div className="text-sm font-semibold leading-5 text-zinc-400">
                              {t("present_health")}
                            </div>
                            <div
                              data-testid="patient-present-health"
                              className="mt-1 overflow-x-scroll whitespace-normal break-words text-sm font-medium leading-5"
                            >
                              {patientData.present_health}
                            </div>
                          </div>
                        )}
                        {patientData.ongoing_medication && (
                          <div className="sm:col-span-1">
                            <div className="text-sm font-semibold leading-5 text-zinc-400">
                              {t("ongoing_medications")}
                            </div>
                            <div
                              data-testid="patient-ongoing-medication"
                              className="mt-1 overflow-x-scroll whitespace-normal break-words text-sm font-medium leading-5"
                            >
                              {patientData.ongoing_medication}
                            </div>
                          </div>
                        )}
                        {patientData.allergies && (
                          <div className="sm:col-span-1">
                            <div className="text-sm font-semibold leading-5 text-zinc-400">
                              {t("allergies")}
                            </div>
                            <div
                              data-testid="patient-allergies"
                              className="mt-1 overflow-x-scroll whitespace-normal break-words text-sm font-medium leading-5"
                            >
                              {patientData.allergies}
                            </div>
                          </div>
                        )}
                        {patientData.gender === 2 &&
                          patientData.is_antenatal && (
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
                </div>
              </div>
              <div className="h-full px-2 lg:w-2/5">
                <div
                  id="actions"
                  className="flex h-full flex-col justify-between space-y-2 px-2"
                >
                  <div>
                    {patientData.review_time &&
                      !patientData.last_consultation?.discharge_date &&
                      Number(patientData.last_consultation?.review_interval) >
                        0 && (
                        <div
                          className={
                            "mb-6 inline-flex w-full items-center justify-center rounded-md border p-3 text-xs font-semibold leading-4 shadow-sm lg:mt-0 " +
                            (dayjs().isBefore(patientData.review_time)
                              ? " bg-secondary-100"
                              : " bg-red-600/5 p-1 text-sm font-normal text-red-600")
                          }
                        >
                          <CareIcon icon="l-clock" className="text-md mr-2" />
                          <p className="p-1">
                            {(dayjs().isBefore(patientData.review_time)
                              ? "Review before: "
                              : "Review Missed: ") +
                              formatDateTime(patientData.review_time)}
                          </p>
                        </div>
                      )}
                    <div className="my-6 rounded-sm bg-white p-2 text-center shadow lg:my-0">
                      <div className="flex justify-between py-2">
                        <div className="w-1/2 border-r-2">
                          <div className="text-sm font-normal leading-5 text-secondary-500">
                            Status
                          </div>
                          <div className="mt-1 text-xl font-semibold leading-5 text-secondary-900">
                            {patientData.is_active ? "LIVE" : "DISCHARGED"}
                          </div>
                        </div>
                        <div className="w-1/2">
                          <div className="text-sm font-normal leading-5 text-secondary-500">
                            Last Discharged Reason
                          </div>
                          <div className="mt-1 text-xl font-semibold leading-5 text-secondary-900">
                            {patientData.is_active ? (
                              "-"
                            ) : !patientData.last_consultation
                                ?.new_discharge_reason ? (
                              <span className="text-secondary-800">
                                {patientData?.last_consultation?.suggestion ===
                                "OP"
                                  ? "OP file closed"
                                  : "UNKNOWN"}
                              </span>
                            ) : patientData.last_consultation
                                ?.new_discharge_reason ===
                              DISCHARGE_REASONS.find((i) => i.text == "Expired")
                                ?.id ? (
                              <span className="text-red-600">EXPIRED</span>
                            ) : (
                              DISCHARGE_REASONS.find(
                                (reason) =>
                                  reason.id ===
                                  patientData.last_consultation
                                    ?.new_discharge_reason,
                              )?.text
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-between rounded-sm bg-white p-2 px-4 py-2 text-center shadow">
                      <div className="w-1/2 border-r-2 pb-1 pr-2">
                        <div className="text-sm font-normal leading-5 text-secondary-500">
                          Created
                        </div>
                        <div className="mt-1 whitespace-normal text-sm font-semibold leading-5 text-secondary-900">
                          <div className="flex justify-center text-sm font-semibold">
                            <RelativeDateUserMention
                              actionDate={patientData.created_date}
                              user={patientData.created_by}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="w-1/2 pb-1 pl-2">
                        <div className="text-sm font-normal leading-5 text-secondary-500">
                          Last Edited
                        </div>
                        <div className="mt-1 whitespace-normal text-sm leading-5 text-secondary-900">
                          <div className="flex justify-center whitespace-normal text-sm font-semibold">
                            <RelativeDateUserMention
                              actionDate={patientData.modified_date}
                              user={patientData.last_edited}
                              tooltipPosition="left"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="py-2">
                    {patientData.last_consultation?.new_discharge_reason ===
                      DISCHARGE_REASONS.find((i) => i.text == "Expired")
                        ?.id && (
                      <div>
                        <ButtonV2
                          id="death-report"
                          className="mt-6 w-full"
                          name="death_report"
                          onClick={() => navigate(`/death_report/${id}`)}
                        >
                          <CareIcon
                            icon="l-file-download"
                            className="text-lg"
                          />
                          Death Report
                        </ButtonV2>
                      </div>
                    )}
                    <div>
                      <ButtonV2
                        className="mt-4 w-full"
                        disabled={!patientData.is_active}
                        authorizeFor={NonReadOnlyUsers}
                        onClick={() => {
                          const showAllFacilityUsers = [
                            "DistrictAdmin",
                            "StateAdmin",
                          ];
                          if (
                            !showAllFacilityUsers.includes(
                              authUser.user_type,
                            ) &&
                            authUser.home_facility_object?.id !==
                              patientData.facility
                          ) {
                            Notification.Error({
                              msg: "Oops! Non-Home facility users don't have permission to perform this action.",
                            });
                          } else {
                            navigate(
                              `/facility/${patientData?.facility}/patient/${id}/update`,
                            );
                          }
                        }}
                      >
                        <CareIcon icon="l-edit-alt" className="text-lg" />
                        Update Details
                      </ButtonV2>
                    </div>
                    <div>
                      <ButtonV2
                        id="patient-allow-transfer"
                        className="mt-4 w-full"
                        disabled={
                          !patientData.last_consultation?.id ||
                          !patientData.is_active
                        }
                        onClick={() =>
                          handlePatientTransfer(!patientData.allow_transfer)
                        }
                        authorizeFor={NonReadOnlyUsers}
                      >
                        <CareIcon icon="l-lock" className="text-lg" />
                        {patientData.allow_transfer
                          ? "Disable Transfer"
                          : "Allow Transfer"}
                      </ButtonV2>
                    </div>
                  </div>
                </div>
                <section className="mt-4 space-y-2 md:flex">
                  <div className="hidden lg:block">
                    <div className="mt-4 grid grid-cols-3 gap-5 lg:grid-cols-2 xl:grid-cols-3">
                      <div
                        className={classNames(
                          "w-full rounded-lg border",
                          isPatientEligibleForNewConsultation(patientData)
                            ? "cursor-pointer border-green-700 hover:bg-primary-400"
                            : "border-secondary-700 text-secondary-700 hover:cursor-not-allowed",
                        )}
                        onClick={() =>
                          isPatientEligibleForNewConsultation(patientData) &&
                          navigate(
                            `/facility/${patientData?.facility}/patient/${id}/consultation`,
                          )
                        }
                      >
                        <div
                          className={classNames(
                            "h-full space-y-2 rounded-lg bg-white p-4 shadow",
                            isPatientEligibleForNewConsultation(patientData) &&
                              "hover:bg-secondary-200",
                          )}
                        >
                          <div
                            className={classNames(
                              "text-center",
                              isPatientEligibleForNewConsultation(
                                patientData,
                              ) && "text-green-700",
                            )}
                          >
                            <span>
                              <CareIcon
                                icon="l-chat-bubble-user"
                                className="text-5xl"
                              />
                            </span>
                          </div>

                          <div>
                            <p className="text-center text-sm font-medium">
                              Add Consultation
                            </p>
                          </div>
                        </div>
                      </div>
                      <div
                        className="w-full"
                        onClick={() =>
                          navigate(`/patient/${id}/investigation_reports`)
                        }
                      >
                        <div className="h-full space-y-2 rounded-lg border border-green-700 bg-white p-4 shadow hover:cursor-pointer hover:bg-secondary-200">
                          <div className="text-center text-green-700">
                            <span>
                              <CareIcon
                                icon="l-file-search-alt"
                                className="text-5xl"
                              />
                            </span>
                          </div>
                          <div>
                            <p className="text-center text-sm font-medium">
                              Investigations Summary
                            </p>
                          </div>
                        </div>
                      </div>
                      <div
                        className="w-full"
                        onClick={() =>
                          navigate(
                            `/facility/${patientData?.facility}/patient/${id}/files/`,
                          )
                        }
                      >
                        <div className="h-full space-y-2 rounded-lg border border-green-700 bg-white p-4 shadow hover:cursor-pointer hover:bg-secondary-200">
                          <div className="text-center text-green-700">
                            <span>
                              <CareIcon
                                icon="l-file-upload"
                                className="text-5xl"
                              />
                            </span>
                          </div>
                          <div>
                            <p className="text-center text-sm font-medium">
                              View/Upload Patient Files
                            </p>
                          </div>
                        </div>
                      </div>
                      <div
                        className="w-full"
                        onClick={() => {
                          if (!isPatientInactive(patientData, facilityId)) {
                            navigate(
                              `/facility/${facilityId}/patient/${id}/shift/new`,
                            );
                          }
                        }}
                      >
                        <div
                          className={`h-full space-y-2 rounded-lg border bg-white p-4 shadow ${
                            isPatientInactive(patientData, facilityId)
                              ? "border-secondary-700 hover:cursor-not-allowed"
                              : "border-green-700 hover:cursor-pointer hover:bg-secondary-200"
                          } `}
                        >
                          <div
                            className={`${
                              isPatientInactive(patientData, facilityId)
                                ? "text-secondary-700"
                                : "text-green-700"
                            } text-center`}
                          >
                            <span>
                              <CareIcon
                                icon="l-ambulance"
                                className="text-5xl"
                              />
                            </span>
                          </div>

                          <div>
                            <p
                              className={`${
                                isPatientInactive(patientData, facilityId) &&
                                "text-secondary-700"
                              } text-center text-sm font-medium`}
                            >
                              Shift Patient
                            </p>
                          </div>
                        </div>
                      </div>
                      <div
                        className="w-full"
                        onClick={() => {
                          if (!isPatientInactive(patientData, facilityId)) {
                            navigate(
                              `/facility/${patientData?.facility}/patient/${id}/sample-test`,
                            );
                          }
                        }}
                      >
                        <div
                          className={classNames(
                            "h-full space-y-2 rounded-lg border bg-white p-4 shadow",
                            isPatientInactive(patientData, facilityId)
                              ? "border-secondary-700 hover:cursor-not-allowed"
                              : "border-green-700 hover:cursor-pointer hover:bg-secondary-200",
                          )}
                        >
                          <div
                            className={`${
                              isPatientInactive(patientData, facilityId)
                                ? "text-secondary-700"
                                : "text-green-700"
                            } text-center`}
                          >
                            <span>
                              <CareIcon icon="l-medkit" className="text-5xl" />
                            </span>
                          </div>
                          <div>
                            <p
                              className={`${
                                isPatientInactive(patientData, facilityId) &&
                                "text-secondary-700"
                              } text-center text-sm font-medium`}
                            >
                              Request Sample Test
                            </p>
                          </div>
                        </div>
                      </div>
                      <div
                        className="w-full"
                        onClick={() =>
                          navigate(
                            `/facility/${patientData?.facility}/patient/${id}/notes`,
                          )
                        }
                      >
                        <div className="h-full space-y-2 rounded-lg border border-green-700 bg-white p-4 shadow hover:cursor-pointer hover:bg-secondary-200">
                          <div className="text-center text-green-700">
                            <span>
                              <CareIcon
                                icon="l-clipboard-notes"
                                className="text-5xl"
                              />
                            </span>
                          </div>
                          <div>
                            <p className="text-center text-sm font-medium">
                              View Patient Notes
                            </p>
                          </div>
                        </div>
                      </div>
                      <div
                        className="w-full"
                        onClick={() => {
                          if (!isPatientInactive(patientData, facilityId)) {
                            setOpenAssignVolunteerDialog(true);
                          }
                        }}
                      >
                        <div
                          className={classNames(
                            "h-full space-y-2 rounded-lg border bg-white p-4 shadow",
                            isPatientInactive(patientData, facilityId)
                              ? "border-secondary-700 hover:cursor-not-allowed"
                              : "border-green-700 hover:cursor-pointer hover:bg-secondary-200",
                          )}
                        >
                          <div
                            className={classNames(
                              "text-center",
                              isPatientInactive(patientData, facilityId)
                                ? "text-secondary-700"
                                : "text-green-700",
                            )}
                          >
                            <span>
                              <CareIcon
                                icon="l-users-alt"
                                className="text-5xl"
                              />
                            </span>
                          </div>
                          <div>
                            <p
                              className={classNames(
                                "text-center text-sm font-medium",
                                isPatientInactive(patientData, facilityId)
                                  ? "text-secondary-700"
                                  : "text-black",
                              )}
                            >
                              Assign to a volunteer
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mx-2 w-full lg:hidden">
                    <div className="h-full space-y-2 rounded-lg bg-white p-4 shadow">
                      <div className="space-y-2 border-b border-dashed text-left text-lg font-semibold text-secondary-900">
                        <div>
                          <ButtonV2
                            className="w-full"
                            disabled={
                              !(
                                patientData.is_active &&
                                (!patientData?.last_consultation ||
                                  patientData?.last_consultation
                                    ?.discharge_date)
                              )
                            }
                            onClick={() =>
                              navigate(
                                `/facility/${patientData?.facility}/patient/${id}/consultation`,
                              )
                            }
                          >
                            <span className="flex w-full items-center justify-start gap-2">
                              <CareIcon
                                icon="l-chat-bubble-user"
                                className="text-xl"
                              />
                              Add Consultation
                            </span>
                          </ButtonV2>
                        </div>
                        <div>
                          <ButtonV2
                            className="w-full"
                            onClick={() =>
                              navigate(`/patient/${id}/investigation_reports`)
                            }
                          >
                            <span className="flex w-full items-center justify-start gap-2">
                              <CareIcon
                                icon="l-file-search-alt"
                                className="text-xl"
                              />
                              Investigations Summary
                            </span>
                          </ButtonV2>
                        </div>
                        <div>
                          <ButtonV2
                            className="w-full"
                            id="upload-patient-files"
                            onClick={() =>
                              navigate(
                                `/facility/${patientData?.facility}/patient/${id}/files`,
                              )
                            }
                          >
                            <span className="flex w-full items-center justify-start gap-2">
                              <CareIcon
                                icon="l-file-upload"
                                className="text-xl"
                              />
                              View/Upload Patient Files
                            </span>
                          </ButtonV2>
                        </div>
                        <div>
                          <ButtonV2
                            className="w-full"
                            disabled={isPatientInactive(
                              patientData,
                              facilityId,
                            )}
                            onClick={() =>
                              navigate(
                                `/facility/${facilityId}/patient/${id}/shift/new`,
                              )
                            }
                            authorizeFor={NonReadOnlyUsers}
                          >
                            <span className="flex w-full items-center justify-start gap-2">
                              <CareIcon
                                icon="l-ambulance"
                                className="text-xl"
                              />
                              Shift Patient
                            </span>
                          </ButtonV2>
                        </div>
                        <div>
                          <ButtonV2
                            className="w-full"
                            disabled={isPatientInactive(
                              patientData,
                              facilityId,
                            )}
                            onClick={() =>
                              navigate(
                                `/facility/${patientData?.facility}/patient/${id}/sample-test`,
                              )
                            }
                            authorizeFor={NonReadOnlyUsers}
                          >
                            <span className="flex w-full items-center justify-start gap-2">
                              <CareIcon icon="l-medkit" className="text-xl" />
                              Request Sample Test
                            </span>
                          </ButtonV2>
                        </div>
                        <div>
                          <ButtonV2
                            className="w-full"
                            onClick={() =>
                              navigate(
                                `/facility/${patientData?.facility}/patient/${id}/notes`,
                              )
                            }
                          >
                            <span className="flex w-full items-center justify-start gap-2">
                              <CareIcon
                                icon="l-clipboard-notes"
                                className="text-xl"
                              />
                              View Patient Notes
                            </span>
                          </ButtonV2>
                        </div>
                        <div>
                          <ButtonV2
                            className="w-full"
                            onClick={() => setOpenAssignVolunteerDialog(true)}
                            disabled={false}
                            authorizeFor={NonReadOnlyUsers}
                          >
                            <span className="flex w-full items-center justify-start gap-2">
                              <CareIcon
                                icon="l-users-alt"
                                className="text-xl"
                              />
                              Assign to a volunteer
                            </span>
                          </ButtonV2>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </section>
            {/* 
            <section
              className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2"
              data-testid="patient-details"
            ></section> */}
          </div>
        )}
      </div>

      <ConfirmDialog
        className="w-full justify-between"
        title={`Assign a volunteer to ${patientData.name}`}
        show={openAssignVolunteerDialog}
        onClose={() => setOpenAssignVolunteerDialog(false)}
        description={
          <div className="mt-6">
            <UserAutocomplete
              value={assignedVolunteerObject}
              onChange={handleVolunteerSelect}
              userType={"Volunteer"}
              name={"assign_volunteer"}
              error={errors.assignedVolunteer}
            />
          </div>
        }
        action="Assign"
        onConfirm={handleAssignedVolunteer}
      />

      {activeTab === "consultation-history" && (
        <div>
          <div>
            <h2 className="ml-0 mt-9 text-2xl font-semibold leading-tight">
              Consultation History
            </h2>

            <PaginatedList
              route={routes.getConsultationList}
              query={{ patient: id }}
              perPage={5}
            >
              {(_) => (
                <div>
                  <PaginatedList.WhenLoading>
                    <CircularProgress />
                  </PaginatedList.WhenLoading>
                  <PaginatedList.WhenEmpty className="py-2">
                    <div className="h-full space-y-2 rounded-lg bg-white p-7 shadow">
                      <div className="flex w-full items-center justify-center text-xl font-bold text-secondary-500">
                        No Consultation History Available
                      </div>
                    </div>
                  </PaginatedList.WhenEmpty>
                  <PaginatedList.Items<ConsultationModel>>
                    {(item) => (
                      <ConsultationCard
                        itemData={item}
                        isLastConsultation={
                          item.id == patientData.last_consultation?.id
                        }
                        refetch={refetch}
                      />
                    )}
                  </PaginatedList.Items>
                  <div className="flex w-full items-center justify-center">
                    <PaginatedList.Paginator hideIfSinglePage />
                  </div>
                </div>
              )}
            </PaginatedList>
          </div>
        </div>
      )}
      {activeTab === "test-sample-history" && (
        <div>
          <div>
            <h2 className="my-4 ml-0 text-2xl font-semibold leading-tight">
              Sample Test History
            </h2>
            <PaginatedList
              route={routes.sampleTestList}
              pathParams={{ patientId: id }}
              perPage={5}
            >
              {(_, query) => (
                <div>
                  <PaginatedList.WhenLoading>
                    <CircularProgress />
                  </PaginatedList.WhenLoading>
                  <PaginatedList.WhenEmpty className="py-2">
                    <div className="h-full space-y-2 rounded-lg bg-white p-7 shadow">
                      <div className="flex w-full items-center justify-center text-xl font-bold text-secondary-500">
                        No Sample Test History Available
                      </div>
                    </div>
                  </PaginatedList.WhenEmpty>
                  <PaginatedList.Items<SampleTestModel>>
                    {(item) => (
                      <SampleTestCard
                        refetch={query.refetch}
                        itemData={item}
                        handleApproval={confirmApproval}
                        facilityId={facilityId}
                        patientId={id}
                      />
                    )}
                  </PaginatedList.Items>
                  <div className="flex w-full items-center justify-center">
                    <PaginatedList.Paginator hideIfSinglePage />
                  </div>
                </div>
              )}
            </PaginatedList>
          </div>
        </div>
      )}
      {activeTab === "visit-history" && (
        <div>
          <div className="h-full space-y-2 rounded-lg bg-white p-7 shadow">
            <div className="flex w-full items-center justify-center text-xl font-bold text-secondary-500">
              No Visit History Available
            </div>
          </div>
        </div>
      )}
      {activeTab === "shifting-history" && (
        <section className="mt-7 h-full space-y-2 rounded-lg bg-white p-4 text-secondary-100 shadow">
          <div
            className="flex cursor-pointer justify-between border-b border-dashed pb-2 text-left text-lg font-semibold text-secondary-900"
            onClick={() => {
              setShowShifts(!showShifts);
              setIsShiftClicked(true);
            }}
          >
            <div>Shifting</div>
            {showShifts ? (
              <CareIcon icon="l-angle-up" className="text-2xl" />
            ) : (
              <CareIcon icon="l-angle-down" className="text-2xl" />
            )}
          </div>
          <div
            className={
              showShifts
                ? activeShiftingData?.count || 0
                  ? "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
                  : ""
                : "hidden"
            }
          >
            {activeShiftingData?.count ? (
              activeShiftingData.results.map((shift: any) => (
                <div key={`shift_${shift.id}`} className="mx-2">
                  <div className="h-full overflow-hidden rounded-lg bg-white shadow">
                    <div className="flex h-full flex-col justify-between p-4">
                      <div>
                        <div className="mt-1 flex justify-between">
                          <div>
                            {shift.emergency && (
                              <span className="inline-block shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium leading-4 text-red-800">
                                Emergency
                              </span>
                            )}
                          </div>
                        </div>
                        <dl className="grid grid-cols-1 gap-x-1 gap-y-2 sm:grid-cols-1">
                          <div className="sm:col-span-1">
                            <dt
                              title="Shifting status"
                              className="flex items-center text-sm font-semibold leading-5 text-zinc-400"
                            >
                              <CareIcon
                                icon="l-truck"
                                className="mr-2 text-lg"
                              />
                              <dd className="text-sm font-bold leading-5 text-secondary-900">
                                {shift.status}
                              </dd>
                            </dt>
                          </div>
                          <div className="sm:col-span-1">
                            <dt
                              title=" Origin facility"
                              className="flex items-center text-sm font-semibold leading-5 text-zinc-400"
                            >
                              <CareIcon
                                icon="l-plane-fly"
                                className="mr-2 text-lg"
                              />
                              <dd className="text-sm font-bold leading-5 text-secondary-900">
                                {(shift.origin_facility_object || {})?.name}
                              </dd>
                            </dt>
                          </div>
                          <div className="sm:col-span-1">
                            <dt
                              title="Shifting approving facility"
                              className="flex items-center text-sm font-semibold leading-5 text-zinc-400"
                            >
                              <CareIcon
                                icon="l-user-check"
                                className="mr-2 text-lg"
                              />
                              <dd className="text-sm font-bold leading-5 text-secondary-900">
                                {
                                  (
                                    shift.shifting_approving_facility_object ||
                                    {}
                                  )?.name
                                }
                              </dd>
                            </dt>
                          </div>
                          <div className="sm:col-span-1">
                            <dt
                              title=" Assigned facility"
                              className="flex items-center text-sm font-semibold leading-5 text-zinc-400"
                            >
                              <CareIcon
                                icon="l-plane-arrival"
                                className="mr-2 text-lg"
                              />
                              <dd className="text-sm font-bold leading-5 text-secondary-900">
                                {(shift.assigned_facility_object || {})?.name ||
                                  "Yet to be decided"}
                              </dd>
                            </dt>
                          </div>

                          <div className="sm:col-span-1">
                            <dt
                              title="  Last Modified"
                              className={
                                "flex items-center text-sm font-medium leading-5 " +
                                (dayjs()
                                  .subtract(2, "hours")
                                  .isBefore(shift.modified_date)
                                  ? "text-secondary-900"
                                  : "rounded p-1 font-normal text-red-600")
                              }
                            >
                              <CareIcon
                                icon="l-stopwatch"
                                className="mr-2 text-lg"
                              />
                              <dd className="text-sm font-bold leading-5">
                                {formatDateTime(shift.modified_date) || "--"}
                              </dd>
                            </dt>
                          </div>
                        </dl>
                      </div>

                      <div className="mt-2 flex">
                        <ButtonV2
                          className="mr-2 w-full bg-white hover:bg-secondary-100"
                          variant="secondary"
                          onClick={() =>
                            navigate(`/shifting/${shift.external_id}`)
                          }
                        >
                          <CareIcon icon="l-eye" className="mr-2 text-lg" />
                          All Details
                        </ButtonV2>
                      </div>
                      {shift.status === "COMPLETED" &&
                        shift.assigned_facility && (
                          <div className="mt-2">
                            <ButtonV2
                              size="small"
                              className="w-full"
                              disabled={
                                !shift.patient_object.allow_transfer ||
                                !(
                                  ["DistrictAdmin", "StateAdmin"].includes(
                                    authUser.user_type,
                                  ) ||
                                  authUser.home_facility_object?.id ===
                                    shift.assigned_facility
                                )
                              }
                              onClick={() => setModalFor(shift.external_id)}
                            >
                              {t("transfer_to_receiving_facility")}
                            </ButtonV2>
                            <ConfirmDialog
                              title="Confirm Transfer Complete"
                              description="Are you sure you want to mark this transfer as complete? The Origin facility will no longer have access to this patient"
                              show={modalFor === shift.external_id}
                              action="Confirm"
                              onClose={() =>
                                setModalFor({
                                  externalId: undefined,
                                  loading: false,
                                })
                              }
                              onConfirm={() => handleTransferComplete(shift)}
                            />
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-secondary-500">
                {isShiftDataLoading ? "Loading..." : "No Shifting Records!"}
              </div>
            )}
          </div>
        </section>
      )}
    </Page>
  );
};
