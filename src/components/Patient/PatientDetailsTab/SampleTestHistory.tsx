import { navigate } from "raviger";
import React, { useState } from "react";

import CareIcon from "@/CAREUI/icons/CareIcon";
import PaginatedList from "@/CAREUI/misc/PaginatedList";

import ButtonV2 from "@/components/Common/ButtonV2";
import CircularProgress from "@/components/Common/CircularProgress";

import { NonReadOnlyUsers } from "@/Utils/AuthorizeFor";
import routes from "@/Utils/request/api";

import { PatientProps } from ".";
import { SampleTestCard } from "../SampleTestCard";
import { PatientModel, SampleTestModel } from "../models";

export const SampleTestHistory = (props: PatientProps) => {
  const { patientData, facilityId, id } = props;
  const [_selectedStatus, setSelectedStatus] = useState<{
    status: number;
    sample: SampleTestModel | null;
  }>({ status: 0, sample: null });
  const [_showAlertMessage, setShowAlertMessage] = useState(false);

  const isPatientInactive = (patientData: PatientModel, facilityId: string) => {
    return (
      !patientData.is_active ||
      !(
        patientData?.last_consultation &&
        patientData.last_consultation.facility === facilityId
      )
    );
  };

  const confirmApproval = (status: number, sample: SampleTestModel) => {
    setSelectedStatus({ status, sample });
    setShowAlertMessage(true);
  };

  return (
    <div className="mt-4 px-3 md:px-0">
      <div>
        <div className="flex justify-between">
          <h2 className="my-4 ml-0 text-2xl font-semibold leading-tight">
            Sample Test History
          </h2>
          <ButtonV2
            className="bg-green-600 px-3 py-2 font-semibold text-white hover:bg-green-500"
            disabled={isPatientInactive(patientData, facilityId)}
            size="default"
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
      </div>

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
  );
};
