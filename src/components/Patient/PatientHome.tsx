import { Link, navigate } from "raviger";
import { useEffect, useState } from "react";
import * as Notification from "../../Utils/Notifications";
import {
  DISCHARGE_REASONS,
  GENDER_TYPES,
  OCCUPATION_TYPES,
  SAMPLE_TEST_STATUS,
} from "@/common/constants";
import { PatientModel } from "./models";
import {
  formatDateTime,
  formatName,
  formatPatientAge,
  humanizeStrings,
  isAntenatal,
  isPostPartum,
  relativeDate,
} from "../../Utils/utils";
import ButtonV2 from "@/components/Common/components/ButtonV2";

import CareIcon from "../../CAREUI/icons/CareIcon";
import Chip from "../../CAREUI/display/Chip";
import ConfirmDialog from "@/components/Common/ConfirmDialog";
import { NonReadOnlyUsers } from "../../Utils/AuthorizeFor";
import Page from "@/components/Common/components/Page";
import UserAutocomplete from "@/components/Common/UserAutocompleteFormField";
import dayjs from "../../Utils/dayjs";
import { triggerGoal } from "../../Integrations/Plausible";
import useAuthUser from "@/common/hooks/useAuthUser";
import useQuery from "../../Utils/request/useQuery";
import routes from "../../Redux/api";
import { InsuranceDetialsCard } from "./InsuranceDetailsCard";
import request from "../../Utils/request/request";
import { useTranslation } from "react-i18next";
import { Avatar } from "../Common/Avatar";
import { SkillModel } from "../Users/models";
import DropdownMenu, { DropdownItem } from "../Common/components/Menu";
import Loading from "../Common/Loading";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Button } from "@/components/ui/button";
import { patientTabs } from "./PatientDetailsTab";

export const parseOccupation = (occupation: string | undefined) => {
  return OCCUPATION_TYPES.find((i) => i.value === occupation)?.text;
};

export interface PatientTabProps {
  id: string;
  facilityId: string;
  patientData: PatientModel;
  authUser: any;
}

export const PatientHome = (props: any) => {
  const { facilityId, id, tab } = props;
  console.log("tab", tab);
  const [patientData, setPatientData] = useState<PatientModel>({});
  console.log("patientData", patientData);
  const [assignedVolunteerObject, setAssignedVolunteerObject] =
    useState<any>(null);
  const authUser = useAuthUser();
  const { t } = useTranslation();
  const [selectedStatus, _setSelectedStatus] = useState<{
    status: number;
    sample: any;
  }>({ status: 0, sample: null });
  const [showAlertMessage, setShowAlertMessage] = useState(false);

  const [openAssignVolunteerDialog, setOpenAssignVolunteerDialog] =
    useState(false);

  const initErr: any = {};
  const errors = initErr;

  useEffect(() => {
    setAssignedVolunteerObject(patientData.assigned_to_object);
  }, [patientData.assigned_to_object]);

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

  const consultation = patientData?.last_consultation;
  const skillsQuery = useQuery(routes.userListSkill, {
    pathParams: {
      username: consultation?.treating_physician_object?.username ?? "",
    },
    prefetch: !!consultation?.treating_physician_object?.username,
  });
  const formatSkills = (arr: SkillModel[]) => {
    const skills = arr.map((skill) => skill.skill_object.name);

    if (skills.length <= 3) {
      return humanizeStrings(skills);
    }

    return `${skills[0]}, ${skills[1]} and ${skills.length - 2} other skills...`;
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

  const isPatientInactive = (patientData: PatientModel, facilityId: string) => {
    return (
      !patientData.is_active ||
      !(patientData?.last_consultation?.facility === facilityId)
    );
  };

  const scrollToSection = (sectionId: string) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  };

  const ActiveTabComponent = patientTabs.find(
    (t) => t.route === tab,
  )?.component;

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
          <div className="mx-auto w-full py-3">
            <div className="flex flex-col gap-x-2 space-y-2 md:flex-row md:space-x-4 md:space-y-0">
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
                <p className="flex flex-1 justify-center gap-2 rounded-lg bg-green-200 p-3 text-center font-bold text-green-800 shadow">
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

        <div className="rounded-md bg-white p-5 shadow-sm">
          <div>
            <div className="flex flex-col justify-between gap-4 gap-y-2 md:flex-row">
              <div className="flex flex-col gap-4 md:flex-row">
                <div className="flex flex-row gap-x-2">
                  <div className="h-10 w-10 flex-shrink-0 md:h-14 md:w-14">
                    <Avatar
                      className="size-10 font-bold text-secondary-800 md:size-auto"
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
                      {patientGender},{"  "} {patientData.blood_group || "-"}
                    </h3>
                  </div>
                </div>

                <div>
                  <h1 className="text-sm text-secondary-700">UHID</h1>
                  <h1 className="text-sm text-secondary-900">
                    T105690908240017
                  </h1>
                </div>

                {patientData?.last_consultation?.treating_physician_object && (
                  <div>
                    <h1 className="text-sm text-secondary-700">
                      Treating Doctor:
                    </h1>
                    <h1 className="text-sm font-semibold text-secondary-900">
                      {formatName(
                        patientData.last_consultation.treating_physician_object,
                      )}
                    </h1>
                    <h1 className="text-sm font-normal">
                      {!!skillsQuery.data?.results?.length &&
                        formatSkills(skillsQuery.data?.results)}
                    </h1>
                  </div>
                )}
              </div>
              <div className="h-full space-y-2">
                <div className="space-y-3 border-b border-dashed text-left text-lg font-semibold text-secondary-900">
                  <DropdownMenu
                    id="patient-actions-dropdown"
                    title="Patient Actions"
                    icon={<CareIcon icon="l-user-md" className="text-lg" />}
                  >
                    {patientData?.is_active &&
                      (!patientData?.last_consultation ||
                        patientData?.last_consultation?.discharge_date) && (
                        <DropdownItem
                          id="add-consultation"
                          onClick={() =>
                            navigate(
                              `/facility/${patientData?.facility}/patient/${id}/consultation`,
                            )
                          }
                          icon={
                            <CareIcon
                              icon="l-chat-bubble-user"
                              className="text-lg"
                            />
                          }
                        >
                          Add Consultation
                        </DropdownItem>
                      )}

                    {patientData?.facility && (
                      <>
                        <DropdownItem
                          id="investigations-summary"
                          onClick={() =>
                            navigate(`/patient/${id}/investigation_reports`)
                          }
                          icon={
                            <CareIcon
                              icon="l-file-search-alt"
                              className="text-lg"
                            />
                          }
                        >
                          Investigations Summary
                        </DropdownItem>

                        <DropdownItem
                          id="upload-patient-files"
                          onClick={() =>
                            navigate(
                              `/facility/${patientData?.facility}/patient/${id}/files`,
                            )
                          }
                          icon={
                            <CareIcon
                              icon="l-file-upload"
                              className="text-lg"
                            />
                          }
                        >
                          View/Upload Patient Files
                        </DropdownItem>

                        {isPatientInactive(patientData, facilityId) &&
                          NonReadOnlyUsers && (
                            <DropdownItem
                              id="shift-patient"
                              onClick={() =>
                                navigate(
                                  `/facility/${facilityId}/patient/${id}/shift/new`,
                                )
                              }
                              disabled={isPatientInactive(
                                patientData,
                                facilityId,
                              )}
                              authorizeFor={NonReadOnlyUsers}
                              icon={
                                <CareIcon
                                  icon="l-ambulance"
                                  className="text-lg"
                                />
                              }
                            >
                              Shift Patient
                            </DropdownItem>
                          )}
                        {isPatientInactive(patientData, facilityId) &&
                          NonReadOnlyUsers && (
                            <DropdownItem
                              id="request-sample-test"
                              onClick={() =>
                                navigate(
                                  `/facility/${patientData?.facility}/patient/${id}/sample-test`,
                                )
                              }
                              disabled={isPatientInactive(
                                patientData,
                                facilityId,
                              )}
                              authorizeFor={NonReadOnlyUsers}
                              icon={
                                <CareIcon icon="l-medkit" className="text-lg" />
                              }
                            >
                              Request Sample Test
                            </DropdownItem>
                          )}

                        <DropdownItem
                          id="view-patient-notes"
                          onClick={() =>
                            navigate(
                              `/facility/${patientData?.facility}/patient/${id}/notes`,
                            )
                          }
                          icon={
                            <CareIcon
                              icon="l-clipboard-notes"
                              className="text-lg"
                            />
                          }
                        >
                          View Patient Notes
                        </DropdownItem>

                        {NonReadOnlyUsers && (
                          <DropdownItem
                            id="assign-volunteer"
                            onClick={() => setOpenAssignVolunteerDialog(true)}
                            disabled={false}
                            authorizeFor={NonReadOnlyUsers}
                            icon={
                              <CareIcon
                                icon="l-users-alt"
                                className="text-lg"
                              />
                            }
                          >
                            Assign to a Volunteer
                          </DropdownItem>
                        )}
                      </>
                    )}
                  </DropdownMenu>
                </div>
              </div>
            </div>

            <div>
              <div className="ml-auto mt-7 flex flex-wrap gap-3">
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
          </div>
        </div>

        <div className="my-2 mt-4 w-full border-b">
          <div className="no-scrollbar flex flex-row overflow-x-auto">
            <Link
              href={`/facility/${facilityId}/patient/${id}/tab/demography`}
              className={`px-4 py-2 ${
                !tab || tab === "demography"
                  ? "border-b-2 border-green-600 font-semibold text-green-700"
                  : "rounded-lg text-secondary-900 hover:bg-gray-100"
              }`}
            >
              Demography
            </Link>

            {patientTabs.map(({ label, route }) => (
              <Link
                key={route}
                href={`/facility/${facilityId}/patient/${id}/tab/${route}`}
                className={`px-4 py-2 ${
                  tab === route || (!tab && route === "demography")
                    ? "border-b-2 border-green-600 font-semibold text-green-700"
                    : "rounded-lg text-secondary-900 hover:bg-gray-100"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        {/* {tab === "demography" && (
          <Demography
            id={id}
            facilityId={facilityId}
            patientData={patientData}
            insuranceDetials={insuranceDetials}
            authUser={authUser}
          />
        )} */}

        <div>
          {ActiveTabComponent && (
            <ActiveTabComponent
              patientData={patientData}
              id={id}
              facilityId={facilityId}
              authUser={authUser}
            />
          )}
        </div>

        {(!tab || tab === "demography") && (
          <div>
            <section className="w-full lg:flex" data-testid="patient-dashboard">
              <div className="mr-2 hidden font-medium text-secondary-800 lg:flex lg:flex-[2] lg:flex-col">
                <div
                  className="mb-4 cursor-pointer rounded-lg p-3 transition-colors duration-300 hover:bg-gray-200 hover:text-green-800"
                  onClick={() => scrollToSection("general-info")}
                >
                  General Info
                </div>
                <div
                  className="mb-4 cursor-pointer rounded-lg p-3 transition-colors duration-300 hover:bg-gray-200 hover:text-green-800"
                  onClick={() => scrollToSection("social-profile")}
                >
                  Social Profile
                </div>
                <div
                  className="mb-4 cursor-pointer rounded-lg p-3 transition-colors duration-300 hover:bg-gray-200 hover:text-green-800"
                  onClick={() => scrollToSection("volunteer-contact")}
                >
                  Volunteer Contact
                </div>
                <div
                  className="mb-4 cursor-pointer rounded-lg p-3 transition-colors duration-300 hover:bg-gray-200 hover:text-green-800"
                  onClick={() => scrollToSection("insurance-details")}
                >
                  Insurance Details
                </div>
              </div>

              <div className="lg:flex-[7]">
                <div className="mb-2 flex flex-row justify-between">
                  <div className="w-1/2">
                    <div className="text-sm font-normal leading-5 text-secondary-700">
                      Patient Status
                    </div>
                    <div className="mt-1 text-xl font-semibold leading-5 text-secondary-900">
                      <Chip
                        size="large"
                        variant="custom"
                        className={
                          patientData.is_active
                            ? "bg-blue-100 text-blue-800"
                            : "bg-red-100 text-red-800"
                        }
                        text={patientData.is_active ? "LIVE" : "DISCHARGED"}
                      />
                    </div>
                  </div>
                  <div>
                    <ButtonV2
                      className="mt-4 w-full border border-secondary-400 bg-white font-semibold text-green-800 hover:bg-secondary-200"
                      disabled={!patientData.is_active}
                      authorizeFor={NonReadOnlyUsers}
                      onClick={() => {
                        const showAllFacilityUsers = [
                          "DistrictAdmin",
                          "StateAdmin",
                        ];
                        if (
                          !showAllFacilityUsers.includes(authUser.user_type) &&
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
                      Edit Profile
                    </ButtonV2>
                  </div>
                </div>
                <div className="my-2 rounded-md border border-blue-400 bg-blue-50 p-5">
                  <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-2 md:gap-y-8 lg:grid-cols-2">
                    <div className="sm:col-span-1">
                      <div>ABHA Number:</div>
                      <div>-</div>
                    </div>
                    <div className="sm:col-span-1">
                      <div>ABHA Address:</div>
                      <div>-</div>
                    </div>
                  </div>
                </div>
                <div className="flex h-full flex-col">
                  <div
                    id="general-info"
                    className="my-2 rounded-md bg-white pb-2 pl-5 pt-5 shadow-md"
                  >
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
                              {t("phone_number")}
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
                              {patientData?.state_object?.name}
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
                  </div>

                  <div
                    id="social-profile"
                    className="my-2 rounded-md bg-white p-5 shadow-md"
                  >
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

                  {patientData.assigned_to_object && (
                    <div
                      id="volunteer-contact"
                      className="my-2 rounded-md bg-white pb-2 pl-5 pt-5 shadow-md"
                    >
                      <hr className="mb-1 mr-5 h-1 w-5 border-0 bg-blue-500" />
                      <div className="w-full">
                        <div className="flex justify-between">
                          <h1 className="mr-4 w-full pb-2 text-xl">
                            {t("volunteer_contact")}
                          </h1>
                        </div>
                        <div className="mb-5 mt-2 grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-2 md:gap-y-8 lg:grid-cols-2">
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
                  <div
                    id="insurance-details"
                    className="my-2 rounded-md bg-white pb-5 pl-5 pt-2 shadow-md"
                  >
                    <hr className="my-2 mr-5 h-1 w-5 border-0 bg-blue-500" />
                    <InsuranceDetialsCard
                      data={insuranceDetials?.results[0]}
                      showViewAllDetails={
                        insuranceDetials?.count !== undefined &&
                        insuranceDetials?.count > 1
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="h-full lg:ml-9 lg:flex-[3]">
                <section className="mb-4 space-y-2 md:flex">
                  <div className="w-full">
                    <div className="mb-2 font-semibold text-secondary-900">
                      Quick Links
                    </div>
                    <div className="h-full space-y-2">
                      <div className="space-y-3 border-b border-dashed text-left text-lg font-semibold text-secondary-900">
                        <div>
                          {patientData?.is_active &&
                            (!patientData?.last_consultation ||
                              patientData?.last_consultation
                                ?.discharge_date) && (
                              <div>
                                <ButtonV2
                                  className="w-full border border-secondary-400 bg-white font-semibold text-green-800 hover:bg-secondary-200"
                                  size="large"
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
                            )}
                        </div>
                        <div>
                          <ButtonV2
                            className="w-full bg-white font-semibold text-green-800 hover:bg-secondary-200"
                            size="large"
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
                            className="w-full bg-white font-semibold text-green-800 hover:bg-secondary-200"
                            id="upload-patient-files"
                            size="large"
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
                            className="w-full bg-white font-semibold text-green-800 hover:bg-secondary-200"
                            disabled={isPatientInactive(
                              patientData,
                              facilityId,
                            )}
                            size="large"
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
                            className="w-full bg-white font-semibold text-green-800 hover:bg-secondary-200"
                            disabled={isPatientInactive(
                              patientData,
                              facilityId,
                            )}
                            size="large"
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
                            className="w-full bg-white font-semibold text-green-800 hover:bg-secondary-200"
                            size="large"
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
                            className="w-full bg-white font-semibold text-green-800 hover:bg-secondary-200"
                            onClick={() => setOpenAssignVolunteerDialog(true)}
                            disabled={false}
                            size="large"
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
                <hr />
                <div
                  id="actions"
                  className="my-2 flex h-full flex-col justify-between space-y-2"
                >
                  <div>
                    {patientData.review_time &&
                      !patientData.last_consultation?.discharge_date &&
                      Number(patientData.last_consultation?.review_interval) >
                        0 && (
                        <div
                          className={
                            "my-2 inline-flex w-full items-center justify-center rounded-md border p-3 text-xs font-semibold leading-4 shadow-sm lg:mt-0" +
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

                    <div className="rounded-sm px-2">
                      <div className="my-1 flex justify-between">
                        <div>
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
                    <div className="my-1 rounded-sm p-2">
                      <div>
                        <div className="text-sm font-normal leading-5 text-secondary-500">
                          Last Updated by{" "}
                          <span className="font-semibold text-secondary-800">
                            {patientData.last_edited?.first_name}{" "}
                            {patientData.last_edited?.last_name}
                          </span>
                        </div>
                        <div className="mt-1 whitespace-normal text-sm font-semibold leading-5 text-secondary-900">
                          <div className="tooltip">
                            <span className={`tooltip-text tooltip`}>
                              {patientData.modified_date
                                ? formatDateTime(patientData.modified_date)
                                : "--:--"}
                            </span>
                            {patientData.modified_date
                              ? relativeDate(patientData.modified_date)
                              : "--:--"}
                          </div>
                        </div>
                      </div>
                      <div className="my-2 pr-2">
                        <div className="text-sm font-normal leading-5 text-secondary-500">
                          Patient profile created by{" "}
                          <span className="font-semibold text-secondary-800">
                            {patientData.created_by?.first_name}{" "}
                            {patientData.created_by?.last_name}
                          </span>
                        </div>
                        <div className="mt-1 whitespace-normal text-sm font-semibold leading-5 text-secondary-900">
                          <div className="tooltip">
                            <span className={`tooltip-text tooltip`}>
                              {patientData.created_date
                                ? formatDateTime(patientData.created_date)
                                : "--:--"}
                            </span>
                            {patientData.modified_date
                              ? relativeDate(patientData.created_date)
                              : "--:--"}
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
                          className="my-2 w-full"
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
                        id="patient-allow-transfer"
                        className="my-2 w-full"
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
              </div>
            </section>
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
    </Page>
  );
};
