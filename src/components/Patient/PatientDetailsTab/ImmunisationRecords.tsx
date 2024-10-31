import useAuthUser from "@/common/hooks/useAuthUser";
import Loading from "@/components/Common/Loading";
import { triggerGoal } from "@/Integrations/Plausible";
import routes from "@/Redux/api";
import useQuery from "@/Utils/request/useQuery";
import { formatDateTime } from "@/Utils/utils";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { PatientModel } from "../models";

export const ImmunisationRecords = (props: any) => {
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

  return (
    <div className="my-2 w-full rounded-md bg-white p-5 shadow-md lg:w-1/2">
      <hr className="mb-1 mr-5 h-1 w-5 border-0 bg-blue-500" />
      <div>
        <div className="flex justify-between">
          <h1 className="text-xl">{t("covid_details")}</h1>
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
