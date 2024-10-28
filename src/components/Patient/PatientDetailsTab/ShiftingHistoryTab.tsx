import React, { useState } from "react";

import dayjs from "dayjs";
import CareIcon from "@/CAREUI/icons/CareIcon";
import ButtonV2 from "@/components/Common/components/ButtonV2";
import { formatDateTime } from "@/Utils/utils";
import { useNavigate } from "raviger";
import { PatientModel } from "../models";
import { t } from "i18next";
import { NonReadOnlyUsers } from "@/Utils/AuthorizeFor";
import ConfirmDialog from "@/components/Common/ConfirmDialog";
import routes from "@/Redux/api";
import request from "@/Utils/request/request";
import useQuery from "@/Utils/request/useQuery";

interface ShiftingHistoryProps {
  id: string;
  facilityId: string;
  patientData: PatientModel;
  authUser: any;
}

const ShiftingHistory: React.FC<ShiftingHistoryProps> = ({
  id,
  facilityId,
  patientData,
  authUser,
}) => {
  const [showShifts, setShowShifts] = useState(false);
  const [isShiftClicked, setIsShiftClicked] = useState(false);
  const navigate = useNavigate();

  const isPatientInactive = (patientData: PatientModel, facilityId: string) => {
    return (
      !patientData.is_active ||
      !(patientData?.last_consultation?.facility === facilityId)
    );
  };

  const [modalFor, setModalFor] = useState({
    externalId: undefined,
    loading: false,
  });

  const handleTransferComplete = async (shift: any) => {
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

  return (
    <section className="mt-7 h-full space-y-2">
      <div className="flex justify-between">
        <div className="text-2xl font-semibold text-secondary-900">
          Shifting
        </div>
        <div>
          <ButtonV2
            className="w-full bg-green-600 font-semibold text-white hover:bg-green-500"
            disabled={isPatientInactive(patientData, facilityId)}
            size="large"
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
      <div className="mt-7 h-full space-y-2 rounded-lg bg-white p-4 text-secondary-100 shadow">
        <div
          className="flex cursor-pointer justify-between border-b border-dashed pb-2 text-left text-lg font-semibold text-secondary-900"
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
            activeShiftingData.results.map((shift: any) => (
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
                              {(shift.origin_facility_object || {})?.name}
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
                              {
                                (shift.shifting_approving_facility_object || {})
                                  ?.name
                              }
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
                              {(shift.assigned_facility_object || {})?.name ||
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
                        onClick={() =>
                          navigate(`/shifting/${shift.external_id}`)
                        }
                      >
                        <CareIcon icon="l-eye" className="mr-2 text-lg" />
                        All Details
                      </ButtonV2>
                    </div>
                    {shift.status === "COMPLETED" &&
                      shift.assigned_facility && (
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
                            onClick={() => setModalFor(shift.external_id)}
                          >
                            {t("transfer_to_receiving_facility")}
                          </ButtonV2>
                          <ConfirmDialog
                            title="Confirm Transfer Complete"
                            description="Are you sure you want to mark this transfer as complete? The Origin facility will no longer have access to this patient"
                            show={modalFor === shift.external_id}
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
            <div className="text-center text-secondary-500">
              {isShiftDataLoading ? "Loading..." : "No Shifting Records!"}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ShiftingHistory;
