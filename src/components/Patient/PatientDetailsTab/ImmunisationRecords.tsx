import useAuthUser from "@/common/hooks/useAuthUser";
import Loading from "@/components/Common/Loading";
import { triggerGoal } from "@/Integrations/Plausible";
import routes from "@/Redux/api";
import useQuery from "@/Utils/request/useQuery";
import { formatDateTime } from "@/Utils/utils";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { PatientModel } from "../models";
import { PatientProps } from ".";
import CareIcon from "@/CAREUI/icons/CareIcon";
import { navigate } from "raviger";
import * as Notification from "../../../Utils/Notifications";

export const ImmunisationRecords = (props: PatientProps) => {
  const { facilityId, id } = props;
  const [patientData, setPatientData] = useState<PatientModel>({});

  const authUser = useAuthUser();
  const { t } = useTranslation();

  const { loading: isLoading } = useQuery(routes.getPatient, {
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

  if (isLoading) {
    return <Loading />;
  }

  const handleEditClick = (sectionId: any) => {
    navigate(
      `/facility/${facilityId}/patient/${id}/update?section=${sectionId}`,
    );
  };

  return (
    <div className="group my-2 w-full rounded-md bg-white p-5 shadow-md lg:w-1/2">
      <hr className="mb-1 mr-5 h-1 w-5 border-0 bg-blue-500" />
      <div>
        <div className="flex flex-row gap-x-4">
          <h1 className="text-xl">{t("covid_details")}</h1>
          <button
            className="hidden rounded border border-secondary-400 bg-white px-1 py-1 text-sm font-semibold text-green-800 hover:bg-secondary-200 group-hover:flex"
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
                handleEditClick("covid-details");
              }
            }}
          >
            <CareIcon icon="l-edit-alt" className="text-md mr-1 mt-1" />
            Edit
          </button>
        </div>

        <div className="mb-8 mt-2 grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-2 md:gap-y-8 lg:grid-cols-2">
          <div className="sm:col-span-1">
            <div className="text-sm font-semibold leading-5 text-zinc-400">
              {t("number_of_covid_vaccine_doses")}
            </div>
            <div className="mt-1 text-sm font-medium leading-5">
              {patientData.is_vaccinated && patientData.number_of_doses
                ? patientData.number_of_doses
                : "-"}
            </div>
          </div>

          <div className="sm:col-span-1">
            <div className="text-sm font-semibold leading-5 text-zinc-400">
              {t("vaccine_name")}
            </div>
            <div className="mt-1 text-sm font-medium leading-5">
              {patientData.is_vaccinated && patientData.vaccine_name
                ? patientData.vaccine_name
                : "-"}
            </div>
          </div>

          <div className="sm:col-span-1">
            <div className="text-sm font-semibold leading-5 text-zinc-400">
              {t("last_vaccinated_on")}
            </div>
            <div className="mt-1 text-sm font-medium leading-5">
              {patientData.is_vaccinated && patientData.last_vaccinated_date
                ? formatDateTime(patientData.last_vaccinated_date)
                : "-"}
            </div>
          </div>

          <div className="sm:col-span-1">
            <div className="text-sm font-semibold leading-5 text-zinc-400">
              {t("countries_travelled")}
            </div>
            <div className="mt-1 text-sm font-medium leading-5">
              {patientData.countries_travelled &&
              patientData.countries_travelled.length > 0
                ? patientData.countries_travelled.join(", ")
                : "-"}
            </div>
          </div>

          <div className="sm:col-span-1">
            <div className="text-sm font-semibold leading-5 text-zinc-400">
              {t("date_of_return")}
            </div>
            <div className="mt-1 text-sm font-medium leading-5">
              {patientData.date_of_return
                ? formatDateTime(patientData.date_of_return)
                : "-"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
