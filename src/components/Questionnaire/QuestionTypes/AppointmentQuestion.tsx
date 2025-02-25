import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { Avatar } from "@/components/Common/Avatar";

import useSlug from "@/hooks/useSlug";

import query from "@/Utils/request/query";
import { dateQueryString, formatDisplayName } from "@/Utils/utils";
import { groupSlotsByAvailability } from "@/pages/Appointments/utils";
import {
  QuestionnaireResponse,
  ResponseValue,
} from "@/types/questionnaire/form";
import { Question } from "@/types/questionnaire/question";
import { CreateAppointmentQuestion } from "@/types/scheduling/schedule";
import scheduleApis from "@/types/scheduling/scheduleApis";
import { UserBase } from "@/types/user/user";

interface FollowUpVisitQuestionProps {
  question: Question;
  questionnaireResponse: QuestionnaireResponse;
  updateQuestionnaireResponseCB: (
    values: ResponseValue[],
    questionId: string,
    note?: string,
  ) => void;
  disabled?: boolean;
}

export function AppointmentQuestion({
  questionnaireResponse,
  updateQuestionnaireResponseCB,
  disabled,
}: FollowUpVisitQuestionProps) {
  const { t } = useTranslation();
  const [resource, setResource] = useState<UserBase>();
  const [selectedDate, setSelectedDate] = useState<Date>();

  const values =
    (questionnaireResponse.values?.[0]
      ?.value as unknown as CreateAppointmentQuestion[]) || [];

  const value = values[0] ?? {};

  const handleUpdate = (updates: Partial<CreateAppointmentQuestion>) => {
    const appointment = { ...value, ...updates };
    updateQuestionnaireResponseCB(
      [
        {
          type: "appointment",
          value: [appointment] as unknown as ResponseValue["value"],
        },
      ],
      questionnaireResponse.question_id,
      questionnaireResponse.note,
    );
  };

  const facilityId = useSlug("facility");

  const resourcesQuery = useQuery({
    queryKey: ["availableResources", facilityId],
    queryFn: query(scheduleApis.appointments.availableUsers, {
      pathParams: { facility_id: facilityId },
    }),
  });

  const slotsQuery = useQuery({
    queryKey: [
      "slots",
      facilityId,
      resource?.id,
      dateQueryString(selectedDate),
    ],
    queryFn: query(scheduleApis.slots.getSlotsForDay, {
      pathParams: { facility_id: facilityId },
      body: {
        // voluntarily coalesce to empty string since we know query would be
        // enabled only if resource and selectedDate are present
        user: resource?.id ?? "",
        day: dateQueryString(selectedDate),
      },
    }),
    enabled: !!resource && !!selectedDate,
  });

  return (
    <div className="space-y-4">
      <div>
        <Label className="mb-2">{t("reason_for_visit")}</Label>
        <Textarea
          placeholder={t("reason_for_visit_placeholder")}
          value={value.reason_for_visit || ""}
          onChange={(e) => handleUpdate({ reason_for_visit: e.target.value })}
          disabled={disabled}
        />
      </div>
      <div>
        <Label className="block mb-2">{t("select_practitioner")}</Label>
        <Select
          disabled={resourcesQuery.isLoading || disabled}
          value={resource?.id}
          onValueChange={(value) =>
            setResource(resourcesQuery.data?.users.find((r) => r.id === value))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder={t("show_all")} />
          </SelectTrigger>
          <SelectContent>
            {resourcesQuery.data?.users.map((user) => (
              <SelectItem key={user.username} value={user.id}>
                <div className="flex items-center gap-2">
                  <Avatar
                    imageUrl={user.profile_picture_url}
                    name={formatDisplayName(user)}
                    className="size-6 rounded-full"
                  />
                  <span>{formatDisplayName(user)}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <Label className="block mb-2">{t("select_date")}</Label>
          <DatePicker date={selectedDate} onChange={setSelectedDate} />
        </div>

        <div className="flex-1">
          <Label className="block mb-2">{t("select_time")}</Label>
          {(!slotsQuery.data?.results ||
            slotsQuery.data.results.length === 0) &&
          selectedDate &&
          resource ? (
            <div className="rounded-md border border-input px-3 py-2 text-sm text-gray-500">
              {t("no_slots_available")}
            </div>
          ) : (
            <Select
              disabled={
                !selectedDate || !resource || slotsQuery.isLoading || disabled
              }
              value={value.slot_id}
              onValueChange={(slotId) => {
                handleUpdate({ slot_id: slotId });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("select_time_slot")} />
              </SelectTrigger>
              <SelectContent>
                {slotsQuery.data?.results &&
                  groupSlotsByAvailability(slotsQuery.data.results).map(
                    ({ availability, slots }) => (
                      <div key={availability.name}>
                        <div className="px-2 py-1.5 text-sm font-semibold">
                          {availability.name}
                        </div>
                        {slots.map((slot) => {
                          const isFullyBooked =
                            slot.allocated >= availability.tokens_per_slot;
                          return (
                            <SelectItem
                              key={slot.id}
                              value={slot.id}
                              disabled={isFullyBooked}
                            >
                              <div className="flex items-center justify-between">
                                <span>
                                  {format(slot.start_datetime, "HH:mm")}
                                </span>
                                <span className="pl-1 text-xs text-gray-500">
                                  {availability.tokens_per_slot -
                                    slot.allocated}{" "}
                                  {t("slots_left")}
                                </span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </div>
                    ),
                  )}
                {slotsQuery.data?.results.length === 0 && (
                  <div className="px-2 py-4 text-center text-sm text-gray-500">
                    {t("no_slots_available")}
                  </div>
                )}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
    </div>
  );
}
