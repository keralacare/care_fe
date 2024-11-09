import React, { useState } from "react";
import dayjs from "dayjs";
import CareIcon from "@/CAREUI/icons/CareIcon";
import ButtonV2 from "@/components/Common/components/ButtonV2";
import { formatDateTime } from "@/Utils/utils";
import ConfirmDialog from "@/components/Common/ConfirmDialog";
import routes from "@/Redux/api";
import useQuery from "@/Utils/request/useQuery";
import useAuthUser from "@/common/hooks/useAuthUser";
import { navigate } from "raviger";
import request from "@/Utils/request/request";
import { useTranslation } from "react-i18next";
import { NonReadOnlyUsers } from "@/Utils/AuthorizeFor";
import { PatientModel } from "../models";
import { PatientProps } from ".";
import { ShiftingModel } from "@/components/Facility/models";

const ShiftingHistory = (props: PatientProps) => {
  const { patientData, facilityId, id } = props;
  const [showShifts, setShowShifts] = useState(false);
  const [isShiftClicked, setIsShiftClicked] = useState(false);
  const authUser = useAuthUser();
  const { t } = useTranslation();

  const [modalFor, setModalFor] = useState<{
    externalId: string | undefined;
    loading: boolean;
  }>({
    externalId: undefined,
    loading: false,
  });
  const handleTransferComplete = async (shift: ShiftingModel) => {
    setModalFor({ ...modalFor, loading: true });
    await request(routes.completeTransfer, {
      pathParams: {
        id: modalFor.externalId ?? "",
      },
    });
    navigate(
      `/facility/${shift.assigned_facility}/patient/${shift.patient}/consultation`,
    );
  };

  const { loading: isShiftDataLoading, data: activeShiftingData } = useQuery(
    routes.listShiftRequests,
    {
      query: {
        patient: id,
      },
      prefetch: isShiftClicked,
    },
  );

  const isPatientInactive = (patientData: PatientModel, facilityId: string) => {
    return (
      !patientData.is_active ||
      !(patientData?.last_consultation?.facility === facilityId)
    );
  };

  return (
    <section className="mt-4 h-full space-y-2 px-4 md:px-0">
      <div className="flex justify-between">
        <div className="text-2xl font-semibold text-secondary-900">
          Shifting
        </div>
        <div>
          <ButtonV2
            className="w-full bg-green-600 px-3 py-2 font-semibold text-white hover:bg-green-500"
            disabled={isPatientInactive(patientData, facilityId)}
            size="default"
            onClick={() =>
              navigate(`/facility/${facilityId}/patient/${id}/shift/new`)
            }
            authorizeFor={NonReadOnlyUsers}
          >
            <span className="flex w-full items-center justify-start gap-2">
              <CareIcon icon="l-ambulance" className="text-xl" />
              Shift Patient
            </span>
          </ButtonV2>
        </div>
      </div>
      <div
        className="flex cursor-pointer justify-between rounded border-b border-dashed bg-white p-5 pb-2 text-left text-lg font-semibold text-secondary-900 shadow"
        onClick={() => {
          setShowShifts(!showShifts);
          setIsShiftClicked(true);
        }}
      >
        <div>Shifting History</div>
        {showShifts ? (
          <CareIcon icon="l-angle-up" className="text-2xl" />
        ) : (
          <CareIcon icon="l-angle-down" className="text-2xl" />
        )}
      </div>
      <div
        className={
          showShifts
            ? activeShiftingData?.count || 0
              ? "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
              : ""
            : "hidden"
        }
      >
        {activeShiftingData?.count ? (
          activeShiftingData.results.map((shift: ShiftingModel) => (
            <div key={`shift_${shift.id}`} className="mx-2">
              <div className="h-full overflow-hidden rounded-lg bg-white shadow">
                <div className="flex h-full flex-col justify-between p-4">
                  <div>
                    <div className="mt-1 flex justify-between">
                      <div>
                        {shift.emergency && (
                          <span className="inline-block shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium leading-4 text-red-800">
                            Emergency
                          </span>
                        )}
                      </div>
                    </div>
                    <dl className="grid grid-cols-1 gap-x-1 gap-y-2 sm:grid-cols-1">
                      <div className="sm:col-span-1">
                        <dt
                          title="Shifting status"
                          className="flex items-center text-sm font-semibold leading-5 text-zinc-400"
                        >
                          <CareIcon icon="l-truck" className="mr-2 text-lg" />
                          <dd className="text-sm font-bold leading-5 text-secondary-900">
                            {shift.status}
                          </dd>
                        </dt>
                      </div>
                      <div className="sm:col-span-1">
                        <dt
                          title=" Origin facility"
                          className="flex items-center text-sm font-semibold leading-5 text-zinc-400"
                        >
                          <CareIcon
                            icon="l-plane-fly"
                            className="mr-2 text-lg"
                          />
                          <dd className="text-sm font-bold leading-5 text-secondary-900">
                            {shift.origin_facility_object?.name}
                          </dd>
                        </dt>
                      </div>
                      <div className="sm:col-span-1">
                        <dt
                          title="Shifting approving facility"
                          className="flex items-center text-sm font-semibold leading-5 text-zinc-400"
                        >
                          <CareIcon
                            icon="l-user-check"
                            className="mr-2 text-lg"
                          />
                          <dd className="text-sm font-bold leading-5 text-secondary-900">
                            {shift.shifting_approving_facility_object?.name}
                          </dd>
                        </dt>
                      </div>
                      <div className="sm:col-span-1">
                        <dt
                          title=" Assigned facility"
                          className="flex items-center text-sm font-semibold leading-5 text-zinc-400"
                        >
                          <CareIcon
                            icon="l-plane-arrival"
                            className="mr-2 text-lg"
                          />
                          <dd className="text-sm font-bold leading-5 text-secondary-900">
                            {shift.assigned_facility_object?.name ??
                              "Yet to be decided"}
                          </dd>
                        </dt>
                      </div>

                      <div className="sm:col-span-1">
                        <dt
                          title="  Last Modified"
                          className={
                            "flex items-center text-sm font-medium leading-5 " +
                            (dayjs()
                              .subtract(2, "hours")
                              .isBefore(shift.modified_date)
                              ? "text-secondary-900"
                              : "rounded p-1 font-normal text-red-600")
                          }
                        >
                          <CareIcon
                            icon="l-stopwatch"
                            className="mr-2 text-lg"
                          />
                          <dd className="text-sm font-bold leading-5">
                            {formatDateTime(shift.modified_date) || "--"}
                          </dd>
                        </dt>
                      </div>
                    </dl>
                  </div>

                  <div className="mt-2 flex">
                    <ButtonV2
                      className="mr-2 w-full bg-white hover:bg-secondary-100"
                      variant="secondary"
                      onClick={() => navigate(`/shifting/${shift.external_id}`)}
                    >
                      <CareIcon icon="l-eye" className="mr-2 text-lg" />
                      All Details
                    </ButtonV2>
                  </div>
                  {shift.status === "COMPLETED" && shift.assigned_facility && (
                    <div className="mt-2">
                      <ButtonV2
                        size="small"
                        className="w-full"
                        disabled={
                          !shift.patient_object.allow_transfer ||
                          !(
                            ["DistrictAdmin", "StateAdmin"].includes(
                              authUser.user_type,
                            ) ||
                            authUser.home_facility_object?.id ===
                              shift.assigned_facility
                          )
                        }
                      >
                        {t("transfer_to_receiving_facility")}
                      </ButtonV2>
                      <ConfirmDialog
                        title="Confirm Transfer Complete"
                        description="Are you sure you want to mark this transfer as complete? The Origin facility will no longer have access to this patient"
                        show={modalFor.externalId === shift.external_id}
                        action="Confirm"
                        onClose={() =>
                          setModalFor({
                            externalId: undefined,
                            loading: false,
                          })
                        }
                        onConfirm={() => handleTransferComplete(shift)}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded bg-white p-5 text-center text-secondary-500">
            {isShiftDataLoading ? "Loading..." : "No Shifting Records!"}
          </div>
        )}
      </div>
    </section>
  );
};

export default ShiftingHistory;
