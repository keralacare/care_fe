import { useState, useEffect, Dispatch, SetStateAction } from "react";
import * as Notification from "../../Utils/Notifications";
import { NonReadOnlyUsers } from "../../Utils/AuthorizeFor";
import CareIcon from "../../CAREUI/icons/CareIcon";
import { classNames, isAppleDevice, keysOf } from "../../Utils/utils";
import ButtonV2 from "@/components/Common/components/ButtonV2";
import { useMessageListener } from "@/common/hooks/useMessageListener";
import PatientConsultationNotesList from "./PatientConsultationNotesList";
import request from "../../Utils/request/request";
import routes from "../../Redux/api";
import { PatientNoteStateType, PaitentNotesReplyModel } from "./models";
import useKeyboardShortcut from "use-keyboard-shortcut";
import AutoExpandingTextInputFormField from "../Form/FormFields/AutoExpandingTextInputFormField";
import useAuthUser from "@/common/hooks/useAuthUser";
import { PATIENT_NOTES_THREADS } from "@/common/constants";
import DoctorNoteReplyPreviewCard from "./DoctorNoteReplyPreviewCard";
import useNotificationSubscriptionState from "@/common/hooks/useNotificationSubscriptionState";
import { Link } from "raviger";
import { t } from "i18next";
import CopilotChat, { copilotChatSend, listCopilotChats } from "@/CopilotChat";
import { Assistant } from "openai/resources/beta/assistants";
import { Thread } from "openai/resources/beta/threads/threads";
import OpenAI from "openai";
import { MessagesPage } from "openai/resources/beta/threads/messages";

interface PatientNotesProps {
  patientId: string;
  facilityId: string;
  consultationId: string;
  setShowPatientNotesPopup: Dispatch<SetStateAction<boolean>>;
}

export default function PatientNotesSlideover(props: PatientNotesProps) {
  const authUser = useAuthUser();
  const notificationSubscriptionState = useNotificationSubscriptionState();
  const [thread, setThread] = useState<any>(
    authUser.user_type === "Nurse"
      ? PATIENT_NOTES_THREADS.Nurses
      : PATIENT_NOTES_THREADS.Doctors,
  );
  const [show, setShow] = useState(true);
  const [patientActive, setPatientActive] = useState(true);
  const [reload, setReload] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reply_to, setReplyTo] = useState<PaitentNotesReplyModel | undefined>(
    undefined,
  );

  const [copilotAssistant, setCopilotAssistant] = useState<Assistant>();
  const [copliotThread, setCopilotThread] = useState<Thread>();
  const [copilotChatMessages, setCopilotChatMessages] =
    useState<MessagesPage>();
  const [copilotThinking, setCopilotThinking] = useState(false);

  useEffect(() => {
    const setupCopilot = async () => {
      const patient = await request(routes.getPatient, {
        pathParams: { id: patientId },
      });
      const openai = new OpenAI({
        apiKey: import.meta.env.REACT_COPILOT_API_KEY,
        dangerouslyAllowBrowser: true,
      });
      const localThreadId = localStorage.getItem(
        "copilot-thread-id-" + patientId,
      );
      const localAssistantId = localStorage.getItem(
        "copilot-assistant-id" + patientId,
      );
      if (localThreadId) {
        setCopilotThread(await openai.beta.threads.retrieve(localThreadId));
      } else {
        const newThread = await openai.beta.threads.create();
        setCopilotThread(newThread);
        localStorage.setItem("copilot-thread-id-" + patientId, newThread.id);
      }
      if (localAssistantId) {
        setCopilotAssistant(
          await openai.beta.assistants.retrieve(localAssistantId),
        );
      } else {
        const newAssistant = await openai.beta.assistants.create({
          name: "Care Copilot",
          instructions:
            "Your name is Care Copilot. You are a copilot assistant for the HMIS software CARE. Your job is to summarize and advice on patient status and further steps to be taken. The patient that is being referred to has the following data : " +
            JSON.stringify(patient.data),
          tools: [],
          model: "gpt-4o-mini",
        });
        setCopilotAssistant(newAssistant);
        localStorage.setItem(
          "copilot-assistant-id-" + patientId,
          newAssistant.id,
        );
      }
    };
    setupCopilot();
  }, []);

  useEffect(() => {
    if (copliotThread && copilotAssistant) refreshChats();
  }, [copliotThread, copilotAssistant]);

  const refreshChats = async () => {
    if (copliotThread)
      setCopilotChatMessages(await listCopilotChats(copliotThread));
  };

  useEffect(() => {
    if (notificationSubscriptionState === "unsubscribed") {
      Notification.Warn({
        msg: "Please subscribe to notifications to get live updates on discussion notes.",
      });
    } else if (notificationSubscriptionState === "subscribed_on_other_device") {
      Notification.Warn({
        msg: "Please subscribe to notifications on this device to get live updates on discussion notes.",
      });
    }
  }, [notificationSubscriptionState]);

  const initialData: PatientNoteStateType = {
    notes: [],
    cPage: 1,
    totalPages: 1,
    patientId: props.patientId,
    facilityId: props.facilityId,
  };
  const [state, setState] = useState(initialData);

  const { facilityId, patientId, consultationId, setShowPatientNotesPopup } =
    props;

  const localStorageKey = `patientNotesNoteField_${consultationId}`;
  const [noteField, setNoteField] = useState(
    localStorage.getItem(localStorageKey) || "",
  );

  const onAddNote = async () => {
    if (thread === 42) {
      setCopilotThinking(true);
      if (!copilotAssistant || !copliotThread) {
        throw Error("Thread or Assistant not initialized");
      }
      await copilotChatSend(noteField, copilotAssistant, copliotThread);
      await refreshChats();
      setCopilotThinking(false);
      setNoteField("");
      return;
    }
    if (!/\S+/.test(noteField)) {
      Notification.Error({
        msg: "Note Should Contain At Least 1 Character",
      });
      return;
    }
    const { res } = await request(routes.addPatientNote, {
      pathParams: { patientId: patientId },
      body: {
        note: noteField,
        consultation: consultationId,
        thread,
        reply_to: reply_to?.id,
      },
    });
    if (res?.status === 201) {
      Notification.Success({ msg: "Note added successfully" });
      setNoteField("");
      setState({ ...state, cPage: 1 });
      setReload(true);
      setReplyTo(undefined);
    }
  };

  useMessageListener((data) => {
    const message = data?.message;
    if (
      (message?.from == "patient/doctor_notes/create" ||
        message?.from == "patient/doctor_notes/edit") &&
      message?.facility_id == facilityId &&
      message?.patient_id == patientId
    ) {
      setReload(true);
    }
  });

  useEffect(() => {
    async function fetchPatientName() {
      if (patientId) {
        const { data } = await request(routes.getPatient, {
          pathParams: { id: patientId },
        });
        if (data) {
          setPatientActive(data.is_active ?? true);
        }
      }
    }
    fetchPatientName();
  }, [patientId]);

  useKeyboardShortcut(
    [isAppleDevice ? "Meta" : "Shift", "Enter"],
    () => {
      if (focused) {
        onAddNote();
      }
    },
    {
      ignoreInputFields: false,
    },
  );

  const notesActionIcons = (
    <div className="flex gap-1">
      {show && (
        <Link
          className="tooltip flex h-8 w-8 cursor-pointer items-center justify-center rounded bg-primary-800 text-secondary-100 text-opacity-70 hover:bg-primary-700 hover:text-opacity-100"
          href={`/facility/${facilityId}/patient/${patientId}/consultation/${consultationId}/notes`}
        >
          <CareIcon
            icon="l-window-maximize"
            className="tooltip text-lg transition-all delay-150 duration-300 ease-out"
          />
          <span className="tooltip-text tooltip-bottom -translate-x-[4.9rem] text-xs">
            {t("full_screen")}
          </span>
        </Link>
      )}
      <div
        id="expand_doctor_notes"
        className={classNames(
          "tooltip flex h-8 w-8 cursor-pointer items-center justify-center rounded bg-primary-800 text-secondary-100 text-opacity-70 hover:bg-primary-700 hover:text-opacity-100",
          show && "rotate-180",
        )}
        onClick={() => setShow(!show)}
      >
        <CareIcon
          icon="l-angle-up"
          className="tooltip text-lg transition-all delay-150 duration-300 ease-out"
        />
        <span className="tooltip-text tooltip-top rotate-[-180deg] text-xs">
          {t("minimize")}
        </span>
      </div>
      <div
        className="tooltip flex h-8 w-8 cursor-pointer items-center justify-center rounded bg-primary-800 text-secondary-100 text-opacity-70 hover:bg-primary-700 hover:text-opacity-100"
        onClick={() => setShowPatientNotesPopup(false)}
      >
        <CareIcon
          icon="l-times"
          className="tooltip text-lg transition-all delay-150 duration-300 ease-out"
        />
        <span className="tooltip-text tooltip-bottom -translate-x-11 text-xs">
          {t("close")}
        </span>
      </div>
    </div>
  );

  useEffect(() => {
    localStorage.setItem(localStorageKey, noteField);
  }, [noteField, localStorageKey]);

  return (
    <div
      className={classNames(
        "fixed bottom-0 z-20 sm:right-8",
        show
          ? "right-0 h-screen w-screen sm:h-fit sm:w-[400px]"
          : "right-8 w-[250px]",
      )}
    >
      {!show ? (
        <div
          className="flex w-full cursor-pointer items-center justify-around rounded-t-md bg-primary-800 p-2 text-white"
          onClick={() => setShow(!show)}
        >
          <span className="font-semibold">Discussion Notes</span>
          {notesActionIcons}
        </div>
      ) : (
        <div className="flex h-screen w-full -translate-y-0 flex-col text-clip border-2 border-b-0 border-primary-800 bg-white pb-3 transition-all sm:h-[500px] sm:rounded-t-md">
          <div className="flex w-full items-center justify-between bg-primary-800 p-2 px-4 text-white">
            <span className="font-semibold">Discussion Notes</span>
            {notesActionIcons}
          </div>
          <div className="flex bg-primary-800 text-sm">
            {[...keysOf(PATIENT_NOTES_THREADS), "Copilot"].map((current) => (
              <button
                id={`patient-note-tab-${current}`}
                key={current}
                className={classNames(
                  "flex flex-1 justify-center border-b-4 py-1",
                  thread ===
                    (PATIENT_NOTES_THREADS[
                      current as keyof typeof PATIENT_NOTES_THREADS
                    ] || 42)
                    ? "border-primary-500 font-medium text-white"
                    : "border-primary-800 text-white/70",
                )}
                onClick={() =>
                  setThread(
                    PATIENT_NOTES_THREADS[
                      current as keyof typeof PATIENT_NOTES_THREADS
                    ] || 42,
                  )
                }
              >
                {t(`patient_notes_thread__${current}`)}
              </button>
            ))}
          </div>
          {thread === 42 ? (
            <CopilotChat
              consultationId={consultationId}
              facilityId={facilityId}
              patientId={patientId}
              thread={copliotThread}
              assistant={copilotAssistant}
              chatMessages={copilotChatMessages}
              thinking={copilotThinking}
            />
          ) : (
            <PatientConsultationNotesList
              state={state}
              setState={setState}
              reload={reload}
              setReload={setReload}
              disableEdit={!patientActive}
              thread={thread}
              setReplyTo={setReplyTo}
            />
          )}
          <DoctorNoteReplyPreviewCard
            parentNote={reply_to}
            cancelReply={() => setReplyTo(undefined)}
          >
            <div className="relative mx-4 flex items-center">
              <AutoExpandingTextInputFormField
                id="discussion_notes_textarea"
                maxHeight={160}
                rows={2}
                name="note"
                value={noteField}
                onChange={(e) => setNoteField(e.value)}
                className="w-full grow"
                errorClassName="hidden"
                innerClassName="pr-10"
                placeholder={t("notes_placeholder")}
                disabled={!patientActive}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
              />
              <ButtonV2
                id="add_doctor_note_button"
                onClick={onAddNote}
                border={false}
                className="tooltip absolute right-2"
                ghost
                size="small"
                disabled={!patientActive}
                authorizeFor={NonReadOnlyUsers}
              >
                <CareIcon icon="l-message" className="tooltip text-lg" />
                <span className="tooltip-text tooltip-bottom -translate-x-11 -translate-y-1 text-xs">
                  {t("send")}
                </span>
              </ButtonV2>
            </div>
          </DoctorNoteReplyPreviewCard>
        </div>
      )}
    </div>
  );
}
