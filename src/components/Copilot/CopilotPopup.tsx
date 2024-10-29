import { useAtom } from "jotai";
import { useEffect, useRef, useState } from "react";
import { copilotAtom } from "./Store";
import request from "@/Utils/request/request";
import OpenAI from "openai";
import routes from "@/Redux/api";
import { MessagesPage } from "openai/resources/beta/threads/messages";
import { Assistant } from "openai/resources/beta/assistants";
import { Thread } from "openai/resources/beta/threads/threads";
import CopilotChatInput from "./CopilotChatInput";
import { CopilotChatBlock } from "./CopilotChatBlock";
import { CopilotStorage } from "./types";

const openai = new OpenAI({
  apiKey: import.meta.env.REACT_COPILOT_API_KEY,
  dangerouslyAllowBrowser: true,
});

export default function CopilotPopup(props: { patientId: string }) {
  const { patientId } = props;

  const [showPopup, setShowPopup] = useState(false);
  const [copilotStorage, setCopilotStorage] = useAtom(copilotAtom);
  const [copilotAssistant, setCopilotAssistant] = useState<Assistant>();
  const [copilotThread, setCopilotThread] = useState<Thread>();
  const [copilotChatMessages, setCopilotChatMessages] =
    useState<MessagesPage>();
  const [copilotThinking, setCopilotThinking] = useState(false);
  const [chat, setChat] = useState("");
  const chatView = useRef<HTMLDivElement>(null);

  const currentCopilot = copilotStorage.find((c) => c.patientId === patientId);

  const configureCopilot = async () => {
    const openai = new OpenAI({
      apiKey: import.meta.env.REACT_COPILOT_API_KEY,
      dangerouslyAllowBrowser: true,
    });

    let threadId = currentCopilot?.threadId;
    let assistantId = currentCopilot?.assistantId;

    if (threadId) {
      setCopilotThread(await openai.beta.threads.retrieve(threadId));
    } else {
      const newThread = await openai.beta.threads.create();
      setCopilotThread(newThread);
      threadId = newThread.id;
    }
    if (assistantId) {
      setCopilotAssistant(await openai.beta.assistants.retrieve(assistantId));
    } else {
      const patient = await request(routes.getPatient, {
        pathParams: { id: patientId },
      });
      const newAssistant = await openai.beta.assistants.create({
        name: "Care Copilot",
        instructions:
          "Your name is Care Copilot. You are a copilot assistant for the HMIS software CARE. Your job is to summarize and advice on patient status and further steps to be taken. Make sure to not respond in key value pairs, and rather output a structured paragraph. The patient that is being referred to has the following data : " +
          JSON.stringify(patient.data),
        tools: [],
        model: "gpt-4o-mini",
      });
      setCopilotAssistant(newAssistant);
      assistantId = newAssistant.id;
    }
    setCopilotStorage([
      ...copilotStorage.filter((c) => c.patientId !== patientId),
      {
        patientId,
        threadId,
        assistantId,
      },
    ]);
  };

  useEffect(() => {
    configureCopilot();
  }, [patientId]);

  useEffect(() => {
    if (copilotThread && copilotAssistant) refreshChats();
  }, [copilotThread, copilotAssistant]);

  const handleSendMessage = async () => {
    if (!copilotAssistant || !copilotThread) {
      throw Error("Thread or Assistant not initialized");
    }
    setCopilotThinking(true);
    await openai.beta.threads.messages.create(copilotThread.id, {
      role: "user",
      content: chat,
    });

    await openai.beta.threads.runs.createAndPoll(copilotThread.id, {
      assistant_id: copilotAssistant.id,
    });

    await refreshChats();
    setChat("");
    setCopilotThinking(false);
  };

  const refreshChats = async () => {
    if (copilotThread)
      setCopilotChatMessages(
        await openai.beta.threads.messages.list(copilotThread.id),
      );
  };

  const orderedChats = copilotChatMessages?.data.sort(
    (a, b) => a.created_at - b.created_at,
  );

  return (
    <>
      <div
        className={`fixed inset-0 z-20 bg-black/20 backdrop-blur-sm ${showPopup ? "visible opacity-100" : "invisible opacity-0"} transition-all`}
        onClick={() => setShowPopup(false)}
      />
      <div className="fixed bottom-6 right-6 z-30 flex flex-col gap-4">
        <div
          className={`${showPopup ? "visible translate-y-0 opacity-100" : "invisible translate-y-10 opacity-0"} flex h-[500px] w-[400px] flex-col overflow-hidden rounded-xl border border-secondary-300 bg-white transition-all`}
        >
          <div
            ref={chatView}
            className="flex h-[500px] w-full flex-col gap-4 overflow-auto bg-secondary-100 p-4 pb-[50px]"
          >
            {orderedChats?.map((message) => (
              <CopilotChatBlock message={message} />
            ))}
            <div
              className={`${copilotThinking ? "visible translate-y-0 opacity-100" : "invisible translate-y-10 opacity-0"} transition-all`}
            >
              <CopilotChatBlock
                message={
                  {
                    role: "user",
                    content: [{ text: { value: chat } }],
                  } as any
                }
              />
            </div>
            <div
              className={`${copilotThinking ? "visible translate-y-0 opacity-100" : "invisible translate-y-10 opacity-0"} transition-all`}
            >
              <CopilotChatBlock
                message={
                  {
                    role: "assistant",
                    content: [{ text: { value: "Thinking..." } }],
                  } as any
                }
              />
            </div>
          </div>
          <CopilotChatInput
            onSubmit={handleSendMessage}
            chat={chat}
            setChat={setChat}
            thinking={copilotThinking}
            startNewThread={() => {
              setCopilotStorage(
                copilotStorage.map((s) =>
                  s.patientId === patientId
                    ? {
                        ...(currentCopilot as CopilotStorage),
                        threadId: undefined,
                      }
                    : s,
                ),
              );
              configureCopilot();
            }}
          />
        </div>
        <div className="flex items-center justify-end">
          <button
            onClick={() => setShowPopup(!showPopup)}
            className="rounded-full bg-primary-500 p-4 font-black text-white"
          >
            Copilot Chat
          </button>
        </div>
      </div>
    </>
  );
}
