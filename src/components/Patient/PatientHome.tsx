import { Link, navigate } from "raviger";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import ConfirmDialog from "@/components/Common/ConfirmDialog";
import UserAutocomplete from "@/components/Common/UserAutocompleteFormField";

import useAuthUser from "@/hooks/useAuthUser";

import {
  DISCHARGE_REASONS,
  GENDER_TYPES,
  OCCUPATION_TYPES,
  SAMPLE_TEST_STATUS,
} from "@/common/constants";

import dayjs from "@/Utils/dayjs";
import routes from "@/Utils/request/api";

import Chip from "../../CAREUI/display/Chip";
import CareIcon from "../../CAREUI/icons/CareIcon";
import { triggerGoal } from "../../Integrations/Plausible";
import { NonReadOnlyUsers } from "../../Utils/AuthorizeFor";
import * as Notification from "../../Utils/Notifications";
import request from "../../Utils/request/request";
import useQuery from "../../Utils/request/useQuery";
import {
  formatDateTime,
  formatName,
  formatPatientAge,
  humanizeStrings,
  isAntenatal,
  isPostPartum,
  relativeDate,
} from "../../Utils/utils";
import { Avatar } from "../Common/Avatar";
import ButtonV2 from "../Common/ButtonV2";
import Loading from "../Common/Loading";
import Page from "../Common/Page";
import { SkillModel } from "../Users/models";
import { patientTabs } from "./PatientDetailsTab";
import { isPatientMandatoryDataFilled } from "./Utils";
import { PatientModel } from "./models";

export const parseOccupation = (occupation: string | undefined) => {
  return OCCUPATION_TYPES.find((i) => i.value === occupation)?.text;
};

export const PatientHome = (props: {
  facilityId?: string;
  id: string;
  page: (typeof patientTabs)[0]["route"];
}) => {
  const { facilityId, id, page } = props;
  const [patientData, setPatientData] = useState<PatientModel>({});
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

    if (skills.length === 0) {
      return "";
    }

    if (skills.length <= 3) {
      return humanizeStrings(skills);
    }

    const [first, second, ...rest] = skills;
    return `${first}, ${second} and ${rest.length} other skills...`;
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

  const handlePatientTransfer = async (value: boolean) => {
    await request(routes.patchPatient, {
      pathParams: {
        id: patientData.id as string,
      },
      body: { allow_transfer: value },
      onResponse: ({ res }) => {
        if (res?.status === 200) {
          setPatientData((prev) => ({
            ...prev,
            allow_transfer: value,
          }));
          Notification.Success({
            msg: "Transfer status updated.",
          });
        }
      },
    });
  };

  const Tab = patientTabs.find((t) => t.route === page)?.component;

  return (
    <Page
      title={t("patient_details")}
      crumbsReplacements={{
        [facilityId || ""]: { name: patientData?.facility_object?.name },
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

      <div className="mt-3">
        <div className="px-3 md:px-0">
          <div className="rounded-md bg-white p-3 shadow-sm">
            <div>
              <div className="flex flex-col justify-between gap-4 gap-y-2 md:flex-row">
                <div className="flex flex-col gap-4 md:flex-row">
                  <div className="flex flex-row gap-x-4">
                    <div className="h-10 w-10 flex-shrink-0 md:h-14 md:w-14">
                      <Avatar
                        className="size-10 font-semibold text-secondary-800 md:size-auto"
                        name={patientData.name || "-"}
                      />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold capitalize text-gray-950">
                        {patientData.name}
                      </h1>
                      <h3 className="text-sm font-medium text-gray-600">
                        {formatPatientAge(patientData, true)},{"  "}
                        {patientGender},{"  "} {patientData.blood_group || "-"}
                      </h3>
                    </div>
                  </div>
                </div>
                <div className="h-full space-y-2">
                  <div className="space-y-3 border-b border-dashed text-left text-lg font-semibold text-secondary-900">
                    <div>
                      {patientData?.is_active &&
                        (!patientData?.last_consultation ||
                          patientData?.last_consultation?.discharge_date) && (
                          <div>
                            <ButtonV2
                              className="w-full"
                              size="default"
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
                  </div>
                </div>
              </div>

              <div>
                <div className="ml-auto mt-4 flex flex-wrap gap-3">
                  {isPatientMandatoryDataFilled(patientData) &&
                    (!patientData.last_consultation ||
                      patientData.last_consultation?.facility !==
                        patientData.facility ||
                      (patientData.last_consultation?.discharge_date &&
                        patientData.is_active)) && (
                      <span className="relative inline-flex">
                        <Chip
                          size="small"
                          variant="danger"
                          startIcon="l-notes"
                          text="No Consultation Filed"
                        />
                        <span className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center">
                          <span className="center absolute inline-flex h-4 w-4 animate-ping rounded-full bg-red-400"></span>
                          <span className="relative inline-flex h-3 w-3 rounded-full bg-red-600"></span>
                        </span>
                      </span>
                    )}
                  {patientData.is_vaccinated && (
                    <Chip
                      variant="custom"
                      size="small"
                      className="bg-blue-100 text-blue-800"
                      startIcon="l-syringe"
                      text="Vaccinated"
                    />
                  )}
                  {patientData.allow_transfer ? (
                    <Chip
                      variant="warning"
                      size="small"
                      startIcon="l-unlock"
                      text="Transfer Allowed"
                    />
                  ) : (
                    <Chip
                      startIcon="l-lock"
                      size="small"
                      text="Transfer Blocked"
                    />
                  )}

                  {patientData.gender === 2 && (
                    <>
                      {patientData.is_antenatal &&
                        isAntenatal(
                          patientData.last_menstruation_start_date,
                        ) && (
                          <Chip
                            variant="custom"
                            size="small"
                            className="border-pink-300 bg-pink-100 text-pink-600"
                            startIcon="l-baby-carriage"
                            text="Antenatal"
                          />
                        )}
                      {isPostPartum(patientData.date_of_delivery) && (
                        <Chip
                          variant="custom"
                          size="small"
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
                      size="small"
                      startIcon="l-phone"
                      text="Telemedicine"
                    />
                  )}
                  {patientData.allergies && (
                    <Chip
                      variant="danger"
                      size="small"
                      text={`Allergies ${patientData.allergies.length}`}
                    />
                  )}
                </div>
              </div>

              <div className="mt-4 flex gap-4">
                <div>
                  <p className="text-xs font-normal leading-tight text-gray-600">
                    Facility:
                  </p>
                  <p className="mt-1 flex text-sm font-semibold leading-tight text-gray-900">
                    {patientData.facility_object?.name || "-"}
                  </p>
                </div>

                {patientData?.last_consultation?.treating_physician_object && (
                  <div>
                    <h4 className="text-xs font-normal leading-tight text-gray-600">
                      Treating Doctor:
                    </h4>
                    <div className="mt-1 flex space-x-2">
                      <p className="flex text-sm font-semibold leading-tight text-gray-900">
                        {formatName(
                          patientData.last_consultation
                            .treating_physician_object,
                        )}
                      </p>
                      <p className="flex items-end text-xs font-normal leading-tight">
                        {!!skillsQuery.data?.results?.length &&
                          formatSkills(skillsQuery.data?.results)}
                      </p>
                    </div>
                  </div>
                )}
                {patientData?.last_consultation?.assigned_to_object && (
                  <div>
                    <p className="text-xs font-normal leading-tight text-gray-600">
                      Assigned Doctor:
                    </p>
                    <div className="mt-1 flex space-x-2 text-sm font-semibold leading-tight text-gray-900">
                      <p>
                        {formatName(
                          patientData.last_consultation.assigned_to_object,
                        )}
                      </p>
                      {patientData?.last_consultation?.assigned_to_object
                        .alt_phone_number && (
                        <a
                          href={`https://wa.me/${patientData.last_consultation.assigned_to_object.alt_phone_number.replace(/\D+/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center space-x-1 text-xs text-green-500"
                        >
                          <CareIcon icon="l-whatsapp" /> <span>Video Call</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {patientData.assigned_to_object && (
                  <div>
                    <p className="text-xs font-normal leading-tight text-gray-600">
                      Assigned Volunteer:
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-tight text-gray-900">
                      {formatName(patientData.assigned_to_object)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="sticky top-0 z-10 mt-4 w-full overflow-x-auto border-b bg-gray-50">
          <div className="flex flex-row">
            {patientTabs.map((tab) => (
              <Link
                key={tab.route}
                href={`/facility/${facilityId}/patient/${id}/${tab.route}`}
                className={`whitespace-nowrap px-4 py-2 text-sm font-medium ${
                  page === tab.route
                    ? "border-b-4 border-green-800 text-green-800 md:border-b-2"
                    : "rounded-t-lg text-gray-600 hover:bg-gray-100"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="h-full lg:flex">
          <div className="h-full lg:mr-7 lg:basis-5/6">
            {Tab && (
              <Tab
                facilityId={facilityId || ""}
                id={id}
                patientData={patientData}
              />
            )}
          </div>
          <div className="sticky top-20 mt-8 h-full lg:basis-1/6">
            <section className="mb-4 space-y-2 md:flex">
              <div className="mx-3 w-full lg:mx-0">
                <div className="font-semibold text-secondary-900">Actions</div>
                <div className="mt-2 h-full space-y-2">
                  <div className="space-y-3 border-b border-dashed text-left text-lg font-semibold text-secondary-900">
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

                    {NonReadOnlyUsers && (
                      <div>
                        <ButtonV2
                          id="assign-volunteer"
                          onClick={() => setOpenAssignVolunteerDialog(true)}
                          disabled={false}
                          authorizeFor={NonReadOnlyUsers}
                          className="w-full bg-white font-semibold text-green-800 hover:bg-secondary-200"
                          size="large"
                        >
                          <span className="flex w-full items-center justify-start gap-2">
                            <CareIcon icon="l-users-alt" className="text-lg" />{" "}
                            Assign to a Volunteer
                          </span>
                        </ButtonV2>
                      </div>
                    )}

                    <div>
                      <ButtonV2
                        id="patient-allow-transfer"
                        className="flex w-full flex-row bg-white font-semibold text-green-800 hover:bg-secondary-200"
                        size="large"
                        disabled={
                          !patientData.last_consultation?.id ||
                          !patientData.is_active
                        }
                        onClick={() =>
                          handlePatientTransfer(!patientData.allow_transfer)
                        }
                        authorizeFor={NonReadOnlyUsers}
                      >
                        <span className="flex w-full items-center justify-start gap-2">
                          <CareIcon
                            icon={
                              patientData.allow_transfer ? "l-lock" : "l-unlock"
                            }
                            className="text-lg"
                          />
                          {patientData.allow_transfer
                            ? "Disable Transfer"
                            : "Allow Transfer"}
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
              </div>
            </div>
          </div>
        </div>
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
