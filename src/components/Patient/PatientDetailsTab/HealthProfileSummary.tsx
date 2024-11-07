import { useTranslation } from "react-i18next";
import useAuthUser from "@/common/hooks/useAuthUser";
import { PatientProps } from ".";
import CareIcon from "@/CAREUI/icons/CareIcon";
import { navigate } from "raviger";
import * as Notification from "../../../Utils/Notifications";

export const HealthProfileSummary = (props: PatientProps) => {
  const { patientData, facilityId, id } = props;

  const authUser = useAuthUser();
  const { t } = useTranslation();

  const handleEditClick = (sectionId: any) => {
    navigate(
      `/facility/${facilityId}/patient/${id}/update?section=${sectionId}`,
    );
  };

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

  return (
    <div className="mt-4 px-4 md:px-0">
      <div className="group my-2 w-full rounded bg-white p-4 shadow lg:w-1/2">
        <hr className="mb-1 mr-5 h-1 w-5 border-0 bg-blue-500" />
        <div className="h-full space-y-2">
          <div className="flex flex-row">
            <div className="mr-4 text-xl font-bold text-secondary-900">
              {t("medical")}
            </div>
            <button
              className="flexrounded flex border border-secondary-400 bg-white px-1 py-1 text-sm font-semibold text-green-800 hover:bg-secondary-200"
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
                  handleEditClick("medical-history");
                }
              }}
            >
              <CareIcon icon="l-edit-alt" className="text-md mr-1 mt-1" />
              Edit
            </button>
          </div>

          <div className="mt-2 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 md:gap-y-8">
            <div className="sm:col-span-1">
              <div className="text-sm font-semibold leading-5 text-zinc-400">
                {t("present_health")}
              </div>
              <div
                data-testid="patient-present-health"
                className="mt-1 overflow-x-scroll whitespace-normal break-words text-sm font-medium leading-5"
              >
                {patientData.present_health || "-"}
              </div>
            </div>

            <div className="sm:col-span-1">
              <div className="text-sm font-semibold leading-5 text-zinc-400">
                {t("ongoing_medications")}
              </div>
              <div
                data-testid="patient-ongoing-medication"
                className="mt-1 overflow-x-scroll whitespace-normal break-words text-sm font-medium leading-5"
              >
                {patientData.ongoing_medication || "-"}
              </div>
            </div>

            <div className="sm:col-span-1">
              <div className="text-sm font-semibold leading-5 text-zinc-400">
                {t("allergies")}
              </div>
              <div
                data-testid="patient-allergies"
                className="mt-1 overflow-x-scroll whitespace-normal break-words text-sm font-medium leading-5"
              >
                {patientData.allergies || "-"}
              </div>
            </div>

            {patientData.gender === 2 && patientData.is_antenatal && (
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
  );
};
