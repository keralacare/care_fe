import CircularProgress from "@/components/Common/components/CircularProgress";
import { ConsultationCard } from "@/components/Facility/ConsultationCard";
import { ConsultationModel } from "@/components/Facility/models";
import React, { useState } from "react";
import { PatientModel } from "../models";
import PaginatedList from "@/CAREUI/misc/PaginatedList";
import routes from "@/Redux/api";
import { triggerGoal } from "@/Integrations/Plausible";
import useQuery from "@/Utils/request/useQuery";
import Loading from "@/components/Common/Loading";
import useAuthUser from "@/common/hooks/useAuthUser";
import { PatientProps } from ".";

const EncounterHistory = (props: PatientProps) => {
  const { facilityId, id } = props;
  const [patientData, setPatientData] = useState<PatientModel>({});
  const authUser = useAuthUser();
  const [_selectedStatus, _setSelectedStatus] = useState<{
    status: number;
    sample: any;
  }>({ status: 0, sample: null });

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

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="mt-4 px-3 md:px-0">
      <h2 className="text-2xl font-semibold leading-tight">
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
  );
};

export default EncounterHistory;
