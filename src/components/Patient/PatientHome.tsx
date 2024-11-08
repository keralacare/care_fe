import { Link, navigate } from "raviger";
import { useEffect, useState } from "react";
import * as Notification from "../../Utils/Notifications";
import {
  GENDER_TYPES,
  OCCUPATION_TYPES,
  SAMPLE_TEST_STATUS,
} from "@/common/constants";
import { PatientModel } from "./models";
import {
  formatName,
  formatPatientAge,
  humanizeStrings,
  isAntenatal,
  isPostPartum,
} from "../../Utils/utils";

import CareIcon from "../../CAREUI/icons/CareIcon";
import Chip from "../../CAREUI/display/Chip";
import ConfirmDialog from "@/components/Common/ConfirmDialog";
import { NonReadOnlyUsers } from "../../Utils/AuthorizeFor";
import Page from "@/components/Common/components/Page";
import UserAutocomplete from "@/components/Common/UserAutocompleteFormField";
import { triggerGoal } from "../../Integrations/Plausible";
import useAuthUser from "@/common/hooks/useAuthUser";
import useQuery from "../../Utils/request/useQuery";
import routes from "../../Redux/api";
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

export const PatientHome = (props: any) => {
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
        <div className="relative mt-2 px-3 md:px-0">
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
          <div className="px-3 md:px-0">
            <Alert
              variant="destructive"
              className="mb-4 flex flex-col justify-between gap-2 md:flex-row"
            >
              <div className="flex gap-2">
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
          </div>
        )}

        <div className="px-3 md:px-0">
          <div className="rounded-md bg-white p-3 shadow-sm">
            <div>
              <div className="flex flex-col justify-between gap-4 gap-y-2 md:flex-row">
                <div className="flex flex-col gap-4 md:flex-row">
                  <div className="flex flex-row gap-x-4">
                    <div className="h-10 w-10 flex-shrink-0 md:h-14 md:w-14">
                      <Avatar
                        className="size-10 font-semibold text-secondary-800 md:size-auto"
                        name={patientData.name || "Unknown"}
                        colors={["#86efac", "#14532d"]}
                      />
                    </div>
                    <div>
                      <h1 className="text-xl font-semibold capitalize text-gray-950">
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

                          {NonReadOnlyUsers &&
                            !isPatientInactive(patientData, facilityId) && (
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

                          {NonReadOnlyUsers &&
                            !isPatientInactive(patientData, facilityId) && (
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
                                  <CareIcon
                                    icon="l-medkit"
                                    className="text-lg"
                                  />
                                }
                              >
                                Request Sample Test
                              </DropdownItem>
                            )}

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
                <div className="ml-auto mt-4 flex flex-wrap gap-3">
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

        {patientTabs.map(
          (tab) =>
            page === tab.route && (
              <tab.component
                key={tab.route}
                patientData={patientData}
                facilityId={facilityId}
                id={id}
              />
            ),
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
