import CircularProgress from "@/components/Common/components/CircularProgress";
import { ConsultationCard } from "@/components/Facility/ConsultationCard";
import { ConsultationModel } from "@/components/Facility/models";
import React, { useState } from "react";
import { PatientModel } from "../models";
import PaginatedList from "@/CAREUI/misc/PaginatedList";
import routes from "@/Redux/api";
import { triggerGoal } from "@/Integrations/Plausible";
import useQuery from "@/Utils/request/useQuery";

interface ConsultationHistoryTabProps {
  patientData: PatientModel;
  id: string;
  facilityId: string;
  authUser: any;
}

const ConsultationHistoryTab: React.FC<ConsultationHistoryTabProps> = ({
  patientData: initialPatientData,
  id,
  facilityId,
  authUser,
}) => {
  const [patientData, setPatientData] =
    useState<PatientModel>(initialPatientData);
  const { loading: _isLoading, refetch } = useQuery(routes.getPatient, {
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
  return (
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
  );
};

export default ConsultationHistoryTab;
