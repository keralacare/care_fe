import CareIcon from "@/CAREUI/icons/CareIcon";
import { DISCHARGE_REASONS, GENDER_TYPES } from "@/common/constants";
import {
  formatDateTime,
  formatName,
  formatPatientAge,
  relativeDate,
} from "@/Utils/utils";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { InsuranceDetialsCard } from "../InsuranceDetailsCard";
import { PatientModel } from "../models";
import { parseOccupation } from "../PatientHome";
import Chip from "@/CAREUI/display/Chip";
import ButtonV2 from "@/components/Common/components/ButtonV2";
import { NonReadOnlyUsers } from "@/Utils/AuthorizeFor";
import { navigate } from "raviger";
import { useEffect, useState } from "react";
import routes from "@/Redux/api";
import request from "@/Utils/request/request";
import * as Notification from "../../../Utils/Notifications";
import Loading from "@/components/Common/Loading";
import useQuery from "@/Utils/request/useQuery";
import { triggerGoal } from "@/Integrations/Plausible";
import useAuthUser from "@/common/hooks/useAuthUser";
import ConfirmDialog from "@/components/Common/ConfirmDialog";
import UserAutocomplete from "@/components/Common/UserAutocompleteFormField";
import { PatientProps } from ".";

export const Demography = (props: PatientProps) => {
  const { facilityId, id } = props;
  const [patientData, setPatientData] = useState<PatientModel>({});
  const authUser = useAuthUser();
  const { t } = useTranslation();
  const [assignedVolunteerObject, setAssignedVolunteerObject] =
    useState<any>(null);
  const [openAssignVolunteerDialog, setOpenAssignVolunteerDialog] =
    useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const initErr: any = {};
  const errors = initErr;

  useEffect(() => {
    setAssignedVolunteerObject(patientData.assigned_to_object);

    const sections = document.querySelectorAll("div[id]");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        threshold: 0.6,
      },
    );

    sections.forEach((section) => observer.observe(section));

    return () => {
      sections.forEach((section) => observer.unobserve(section));
    };
  }, [patientData.assigned_to_object]);

  const handleVolunteerSelect = (volunteer: any) => {
    setAssignedVolunteerObject(volunteer.value);
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

  const handleEditClick = (sectionId: any) => {
    navigate(
      `/facility/${facilityId}/patient/${id}/update?section=${sectionId}`,
    );
  };
  return (
    <div>
      <section
        className="mt-8 w-full items-start gap-6 px-3 md:px-0 lg:flex 2xl:gap-8"
        data-testid="patient-dashboard"
      >
        <div className="sticky top-20 hidden text-sm font-medium text-gray-600 lg:flex lg:basis-1/6 lg:flex-col">
          <div
            className={`mb-3 cursor-pointer rounded-lg p-3 transition-colors duration-300 ${
              activeSection === "general-info"
                ? "bg-white text-green-800"
                : "hover:bg-white hover:text-green-800"
            }`}
            onClick={() => scrollToSection("general-info")}
          >
            General Info
          </div>
          <div
            className={`mb-3 cursor-pointer rounded-lg p-3 transition-colors duration-300 ${
              activeSection === "social-profile"
                ? "bg-white text-green-800"
                : "hover:bg-white hover:text-green-800"
            }`}
            onClick={() => scrollToSection("social-profile")}
          >
            Social Profile
          </div>
          <div
            className={`mb-3 cursor-pointer rounded-lg p-3 transition-colors duration-300 ${
              activeSection === "volunteer-contact"
                ? "bg-white text-green-800"
                : "hover:bg-white hover:text-green-800"
            }`}
            onClick={() => scrollToSection("volunteer-contact")}
          >
            Volunteer Contact
          </div>
          <div
            className={`mb-3 cursor-pointer rounded-lg p-3 transition-colors duration-300 ${
              activeSection === "insurance-details"
                ? "bg-white text-green-800"
                : "hover:bg-white hover:text-green-800"
            }`}
            onClick={() => scrollToSection("insurance-details")}
          >
            Insurance Details
          </div>
        </div>

        <div className="lg:basis-4/6">
          <div className="mb-2 flex flex-row justify-between">
            <div className="w-1/2">
              <div className="text-sm font-normal leading-5 text-secondary-700">
                Patient Status
              </div>
              <div className="mt-1 text-xl font-semibold leading-5 text-secondary-900">
                <Chip
                  size="medium"
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
                  const showAllFacilityUsers = ["DistrictAdmin", "StateAdmin"];
                  if (
                    !showAllFacilityUsers.includes(authUser.user_type) &&
                    authUser.home_facility_object?.id !== patientData.facility
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
          <div className="mt-4 rounded-md border border-blue-400 bg-blue-50 p-5">
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-2 md:gap-y-8 lg:grid-cols-2">
              <div className="sm:col-span-1">
                <p className="text-normal text-sm text-gray-600 sm:col-span-1">
                  ABHA Number:
                </p>
                <p className="text-sm font-semibold text-gray-900">-</p>
              </div>
              <div className="sm:col-span-1">
                <p className="text-normal text-sm text-gray-600 sm:col-span-1">
                  ABHA Address:
                </p>
                <p className="text-sm font-semibold text-gray-900">-</p>
              </div>
            </div>
          </div>
          <div className="flex h-full flex-col gap-y-4">
            <div
              id="general-info"
              className="group mt-4 rounded-md bg-white pb-2 pl-5 pt-5 shadow"
            >
              <div>
                <hr className="mb-1 mr-5 h-1 w-5 border-0 bg-blue-500" />
                <div className="w-full">
                  <div className="flex flex-row gap-x-4">
                    <h1 className="text-xl">General Info</h1>
                    <button
                      className="flex rounded border border-secondary-400 bg-white px-2 py-1 text-sm font-semibold text-green-800 hover:bg-secondary-200"
                      disabled={!patientData.is_active}
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
                          handleEditClick("general-info");
                        }
                      }}
                    >
                      <CareIcon
                        icon="l-edit-alt"
                        className="text-md mr-1 mt-1"
                      />
                      Edit
                    </button>
                  </div>
                  <div className="mb-8 mt-2 grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-2 md:gap-y-8 lg:grid-cols-2">
                    <div className="sm:col-span-1">
                      <div className="text-sm font-normal leading-5 text-gray-600">
                        Full Name
                      </div>
                      <div className="mt-1 text-sm font-semibold leading-5 text-gray-900">
                        {patientData.name}
                      </div>
                    </div>
                    <div className="sm:col-span-1">
                      <div className="text-sm font-normal leading-5 text-gray-600">
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
                            <CareIcon icon="l-whatsapp" /> Chat on WhatsApp
                          </a>
                        </div>
                      </div>
                    </div>
                    <div className="sm:col-span-1">
                      <div className="text-sm font-normal leading-5 text-gray-600">
                        {t("date_of_birth")}
                      </div>
                      <div className="mt-1 text-sm font-semibold leading-5 text-gray-900">
                        {dayjs(patientData.date_of_birth).format("DD MMM YYYY")}{" "}
                        ({formatPatientAge(patientData, true)})
                      </div>
                    </div>
                    <div className="sm:col-span-1">
                      <div className="text-sm font-normal leading-5 text-gray-600">
                        {t("sex")}
                      </div>
                      <div className="mt-1 text-sm font-semibold leading-5 text-gray-900">
                        {patientGender}
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <div className="mr-6 flex flex-col items-start justify-between rounded-md border border-orange-300 bg-orange-50 p-4 sm:flex-row">
                        {/* Emergency Contact Section */}
                        <div className="flex-1">
                          <div className="text-sm font-normal leading-5 text-gray-600">
                            {t("emergency_contact")}
                          </div>

                          <div className="mt-1 text-sm leading-5 text-secondary-900">
                            <div>
                              <a
                                href={`tel:${patientData.emergency_phone_number}`}
                                className="text-sm font-medium text-black hover:text-secondary-500"
                              >
                                {patientData.emergency_phone_number || "-"}
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
                          <div className="text-sm font-normal leading-5 text-gray-600">
                            {t("emergency_contact_person_name")}
                          </div>
                          <div className="mt-1 text-sm font-semibold leading-5 text-gray-900">
                            {patientData.name || "-"}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="sm:col-span-1">
                      <div className="text-sm font-normal leading-5 text-gray-600">
                        {t("current_address")}
                      </div>
                      <div className="mt-1 whitespace-normal break-words text-sm font-semibold leading-5 text-gray-900">
                        {patientData.address || "-"}
                      </div>
                    </div>
                    <div className="sm:col-span-1">
                      <div className="text-sm font-normal leading-5 text-gray-600">
                        {t("permanent_address")}
                      </div>
                      <div className="mt-1 whitespace-normal break-words text-sm font-semibold leading-5 text-gray-900">
                        {patientData.permanent_address || "-"}
                      </div>
                    </div>
                    <div className="sm:col-span-1">
                      <div className="text-sm font-normal leading-5 text-gray-600">
                        {t("nationality")}
                      </div>
                      <div className="mt-1 whitespace-normal break-words text-sm font-semibold leading-5 text-gray-900">
                        {patientData.nationality || "-"}
                      </div>
                    </div>
                    <div className="sm:col-span-1">
                      <div className="text-sm font-normal leading-5 text-gray-600">
                        {t("state")}
                      </div>
                      <div className="mt-1 whitespace-normal break-words text-sm font-semibold leading-5 text-gray-900">
                        {patientData?.state_object?.name}
                      </div>
                    </div>
                    <div className="sm:col-span-1">
                      <div className="text-sm font-normal leading-5 text-gray-600">
                        {t("district")}
                      </div>
                      <div className="mt-1 whitespace-normal break-words text-sm font-semibold leading-5 text-gray-900">
                        {patientData.district_object?.name || "-"}
                      </div>
                    </div>

                    <div className="sm:col-span-1">
                      <div className="text-sm font-normal leading-5 text-gray-600">
                        {t("local_body")}
                      </div>
                      <div className="mt-1 whitespace-normal break-words text-sm font-semibold leading-5 text-gray-900">
                        {patientData.local_body_object?.name || "-"}
                      </div>
                    </div>

                    <div className="sm:col-span-1">
                      <div className="text-sm font-normal leading-5 text-gray-600">
                        {t("ward")}
                      </div>
                      <div className="mt-1 whitespace-normal break-words text-sm font-semibold leading-5 text-gray-900">
                        {(patientData.ward_object &&
                          patientData.ward_object.number +
                            ", " +
                            patientData.ward_object.name) ||
                          "-"}
                      </div>
                    </div>

                    <div className="sm:col-span-1">
                      <div className="text-sm font-normal leading-5 text-gray-600">
                        {t("village")}
                      </div>
                      <div className="mt-1 whitespace-normal break-words text-sm font-semibold leading-5 text-gray-900">
                        {patientData.village || "-"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div
              id="social-profile"
              className="group rounded-md bg-white p-5 shadow"
            >
              <hr className="mb-1 mr-5 h-1 w-5 border-0 bg-blue-500" />
              <div className="w-full">
                <div className="flex flex-row gap-x-4">
                  <h1 className="text-xl">{t("social_profile")}</h1>
                  <button
                    className="flex rounded border border-secondary-400 bg-white px-2 py-1 text-sm font-semibold text-green-800 hover:bg-secondary-200"
                    disabled={!patientData.is_active}
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
                        handleEditClick("social-profile");
                      }
                    }}
                  >
                    <CareIcon icon="l-edit-alt" className="text-md mr-1 mt-1" />
                    Edit
                  </button>
                </div>

                {patientData.meta_info?.occupation ||
                patientData.ration_card_category ||
                patientData.meta_info?.socioeconomic_status ||
                patientData.meta_info?.domestic_healthcare_support ? (
                  <div className="mb-8 mt-2 grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-2 md:gap-y-8 lg:grid-cols-2">
                    {patientData.meta_info?.occupation && (
                      <div className="sm:col-span-1">
                        <div className="text-sm font-normal leading-5 text-gray-600">
                          {t("occupation")}
                        </div>
                        <div className="mt-1 text-sm font-semibold leading-5 text-gray-900">
                          {parseOccupation(patientData.meta_info.occupation)}
                        </div>
                      </div>
                    )}
                    {patientData.ration_card_category && (
                      <div className="sm:col-span-1">
                        <div className="text-sm font-normal leading-5 text-gray-600">
                          {t("ration_card_category")}
                        </div>
                        <div className="mt-1 text-sm font-semibold leading-5 text-gray-900">
                          {t(
                            `ration_card__${patientData.ration_card_category}`,
                          )}
                        </div>
                      </div>
                    )}
                    {patientData.meta_info?.socioeconomic_status && (
                      <div className="sm:col-span-1">
                        <div className="text-sm font-normal leading-5 text-gray-600">
                          {t("socioeconomic_status")}
                        </div>
                        <div className="mt-1 text-sm font-semibold leading-5 text-gray-900">
                          {t(
                            `SOCIOECONOMIC_STATUS__${patientData.meta_info.socioeconomic_status}`,
                          )}
                        </div>
                      </div>
                    )}
                    {patientData.meta_info?.domestic_healthcare_support && (
                      <div className="sm:col-span-1">
                        <div className="text-sm font-normal leading-5 text-gray-600">
                          {t("domestic_healthcare_support")}
                        </div>
                        <div className="mt-1 text-sm font-semibold leading-5 text-gray-900">
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
                className="rounded-md bg-white pb-2 pl-5 pt-5 shadow"
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
                          <div className="text-sm font-normal leading-5 text-gray-600">
                            {t("emergency_contact_volunteer")}
                          </div>
                          {patientData.assigned_to_object && (
                            <div className="mt-1 text-sm leading-5 text-secondary-900">
                              <div>
                                <a
                                  href={`tel:${patientData.emergency_phone_number}`}
                                  className="text-sm font-medium text-black hover:text-secondary-500"
                                >
                                  {patientData.assigned_to_object
                                    ?.alt_phone_number || "-"}
                                </a>
                              </div>
                              {patientData.assigned_to_object
                                ?.alt_phone_number && (
                                <div>
                                  <a
                                    href={`https://wa.me/${patientData.assigned_to_object?.alt_phone_number?.replace(
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
                          <div className="text-sm font-normal leading-5 text-gray-600">
                            {t("emergency_contact_person_name_volunteer")}
                          </div>
                          {patientData.assigned_to_object && (
                            <div className="mt-1 text-sm font-semibold leading-5 text-gray-900">
                              {formatName(patientData.assigned_to_object) ||
                                "-"}
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
              className="rounded-md bg-white pb-5 pl-5 pt-2 shadow"
            >
              <hr className="my-2 mr-5 h-1 w-5 border-0 bg-blue-500" />
              <InsuranceDetialsCard
                data={insuranceDetials?.results[0]}
                showViewAllDetails={
                  insuranceDetials?.count !== undefined &&
                  insuranceDetials?.count > 1
                }
              />
              <button
                className="mt-3 rounded border border-green-800 bg-white px-3 py-2 text-sm font-semibold text-green-800 hover:bg-secondary-200"
                disabled={!patientData.is_active}
                onClick={() => {
                  const showAllFacilityUsers = ["DistrictAdmin", "StateAdmin"];
                  if (
                    !showAllFacilityUsers.includes(authUser.user_type) &&
                    authUser.home_facility_object?.id !== patientData.facility
                  ) {
                    Notification.Error({
                      msg: "Oops! Non-Home facility users don't have permission to perform this action.",
                    });
                  } else {
                    handleEditClick("insurance-details");
                  }
                }}
              >
                <CareIcon icon="l-plus" className="text-md mr-1 mt-1" />
                Add Insurance Details
              </button>
            </div>
          </div>
        </div>
        <div className="sticky top-20 mt-8 h-full lg:basis-1/6">
          <section className="mb-4 space-y-2 md:flex">
            <div className="w-full">
              <div className="font-semibold text-secondary-900">
                Quick Links
              </div>
              <div className="mt-2 h-full space-y-2">
                <div className="space-y-3 border-b border-dashed text-left text-lg font-semibold text-secondary-900">
                  <div>
                    {patientData?.is_active &&
                      (!patientData?.last_consultation ||
                        patientData?.last_consultation?.discharge_date) && (
                        <div>
                          <ButtonV2
                            className="w-full bg-white font-semibold text-green-800 hover:bg-secondary-200"
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
                        <CareIcon icon="l-file-upload" className="text-xl" />
                        View/Upload Patient Files
                      </span>
                    </ButtonV2>
                  </div>
                  <div>
                    <ButtonV2
                      className="w-full bg-white font-semibold text-green-800 hover:bg-secondary-200"
                      disabled={isPatientInactive(patientData, facilityId)}
                      size="large"
                      onClick={() =>
                        navigate(
                          `/facility/${facilityId}/patient/${id}/shift/new`,
                        )
                      }
                      authorizeFor={NonReadOnlyUsers}
                    >
                      <span className="flex w-full items-center justify-start gap-2">
                        <CareIcon icon="l-ambulance" className="text-xl" />
                        Shift Patient
                      </span>
                    </ButtonV2>
                  </div>
                  <div>
                    <ButtonV2
                      className="w-full bg-white font-semibold text-green-800 hover:bg-secondary-200"
                      disabled={isPatientInactive(patientData, facilityId)}
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
                Number(patientData.last_consultation?.review_interval) > 0 && (
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
                    <div className="text-xs font-normal leading-5 text-gray-600">
                      Last Discharged Reason
                    </div>
                    <div className="text-sm font-semibold text-gray-900">
                      {patientData.is_active ? (
                        "-"
                      ) : !patientData.last_consultation
                          ?.new_discharge_reason ? (
                        <span className="text-secondary-800">
                          {patientData?.last_consultation?.suggestion === "OP"
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
                            patientData.last_consultation?.new_discharge_reason,
                        )?.text
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="my-1 rounded-sm p-2">
                <div>
                  <div className="text-xs font-normal text-gray-600">
                    Last Updated by{" "}
                    <span className="font-semibold text-gray-900">
                      {patientData.last_edited?.first_name}{" "}
                      {patientData.last_edited?.last_name}
                    </span>
                  </div>
                  <div className="whitespace-normal text-sm font-semibold text-gray-900">
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
                <div className="mt-4">
                  <div className="text-xs font-normal leading-5 text-gray-600">
                    Patient profile created by{" "}
                    <span className="font-semibold text-gray-900">
                      {patientData.created_by?.first_name}{" "}
                      {patientData.created_by?.last_name}
                    </span>
                  </div>
                  <div className="whitespace-normal text-sm font-semibold text-gray-900">
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
                DISCHARGE_REASONS.find((i) => i.text == "Expired")?.id && (
                <div>
                  <ButtonV2
                    id="death-report"
                    className="my-2 w-full"
                    name="death_report"
                    onClick={() => navigate(`/death_report/${id}`)}
                  >
                    <CareIcon icon="l-file-download" className="text-lg" />
                    Death Report
                  </ButtonV2>
                </div>
              )}

              <div>
                <ButtonV2
                  id="patient-allow-transfer"
                  className="my-2 w-full"
                  disabled={
                    !patientData.last_consultation?.id || !patientData.is_active
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
    </div>
  );
};
