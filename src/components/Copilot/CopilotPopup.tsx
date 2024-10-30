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
import { CopilotStorage, ThinkingState, ThinkingStates } from "./types";
import { Run } from "openai/resources/beta/threads/runs/runs";
import Spinner from "@/components/Common/Spinner";

const openai = new OpenAI({
  apiKey: import.meta.env.REACT_COPILOT_API_KEY,
  dangerouslyAllowBrowser: true,
});

export default function CopilotPopup(props: {
  patientId: string;
  consultationId: string;
}) {
  const { patientId, consultationId } = props;

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

  const [thinkingStates, setThinkingStates] = useState<ThinkingStates>({
    analyzing: {
      stage: "analyzing",
      message: "Analyzing your request...",
      completed: false,
    },
    processing: {
      stage: "processing",
      message: "Processing context and history...",
      completed: false,
    },
    generating: {
      stage: "generating",
      message: "Generating response...",
      completed: false,
    },
  });

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
        tools: [
          {
            type: "function",
            function: {
              name: "generateCarePlan",
              description:
                "Returns the last 30 events for the patient to generate a CARE plan to target the future goals and plan for the patient",
            },
          },
        ],
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

  const generateCarePlan = async () => {
    const recentEvents = await request(routes.getEvents, {
      pathParams: { consultationId },
      query: { limit: 30 },
    });

    return JSON.stringify(recentEvents.data?.results);
  };

  const callFunction = async (run: Run) => {
    if (
      run.required_action &&
      run.required_action.submit_tool_outputs &&
      run.required_action.submit_tool_outputs.tool_calls &&
      copilotThread
    ) {
      const toolOutputs = [];
      for (const tool of run.required_action.submit_tool_outputs.tool_calls) {
        let output;
        if (tool.function.name === "generateCarePlan") {
          output = await generateCarePlan();
        }
        toolOutputs.push({
          tool_call_id: tool.id,
          output,
        });
      }
      if (toolOutputs.length > 0) {
        const toolRun = await openai.beta.threads.runs.submitToolOutputsAndPoll(
          copilotThread.id,
          run.id,
          { tool_outputs: toolOutputs },
        );
        if (run.status === "requires_action") {
          await callFunction(toolRun);
        }
        console.log("Tool outputs submitted successfully.");
      } else {
        console.log("No tool outputs to submit.");
      }
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!copilotAssistant || !copilotThread) {
      throw Error("Thread or Assistant not initialized");
    }
    stopAllAudio();
    setCopilotThinking(true);

    setThinkingStates({
      analyzing: {
        stage: "analyzing",
        message: "Analyzing your request...",
        completed: false,
      },
      processing: {
        stage: "processing",
        message: "Processing context and history...",
        completed: false,
      },
      generating: {
        stage: "generating",
        message: "Generating response...",
        completed: false,
      },
    });

    setTimeout(() => {
      setThinkingStates((prev) => ({
        ...prev,
        analyzing: { ...prev.analyzing, completed: true },
      }));
    }, 1000);

    setTimeout(() => {
      setThinkingStates((prev) => ({
        ...prev,
        processing: { ...prev.processing, completed: true },
      }));
    }, 2000);

    if (chatView.current) {
      const { scrollHeight, scrollTop, clientHeight } = chatView.current;
      const wasAtBottom = scrollHeight - scrollTop - clientHeight < 10;
      if (wasAtBottom) {
        setTimeout(() => {
          chatView.current?.scrollTo({
            top: chatView.current.scrollHeight,
            behavior: "smooth",
          });
        }, 100);
      }
    }

    await openai.beta.threads.messages.create(copilotThread.id, {
      role: "user",
      content: message,
    });

    const run = await openai.beta.threads.runs.createAndPoll(copilotThread.id, {
      assistant_id: copilotAssistant.id,
    });

    if (run.status === "requires_action") {
      await callFunction(run);
    }

    setThinkingStates((prev) => ({
      ...prev,
      generating: { ...prev.generating, completed: true },
    }));

    await refreshChats();
    setChat("");
    setCopilotThinking(false);
  };

  const generateAudio = async (text: string) => {
    const mediaSource = new MediaSource();

    const audio = new Audio();
    audio.src = URL.createObjectURL(mediaSource);
    audioRef.current = audio;
    audio.play();

    mediaSource.addEventListener("sourceopen", async () => {
      const sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg"); // Adjust MIME type if needed

      const response = await openai.audio.speech.create({
        model: "tts-1",
        voice: "alloy",
        input: text,
      });
      const reader = response.body?.getReader();
      if (!reader) return;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sourceBuffer.appendBuffer(value);

        await new Promise((resolve) => {
          sourceBuffer.addEventListener("updateend", resolve, { once: true });
        });
      }

      mediaSource.endOfStream();
    });
  };

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopAllAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
  };

  const refreshChats = async () => {
    if (!copilotThread) return;
    const messages = await openai.beta.threads.messages.list(copilotThread.id);
    if (messages.data.length > (copilotChatMessages?.data.length || 0)) {
      // const lastMessage = messages.data[0];
      // if (lastMessage.role === "assistant") {
      // const text = (lastMessage.content[0] as any).text.value;
      // generateAudio(text);
      // }
    }
    setCopilotChatMessages(messages);
    if (chatView.current) {
      const { scrollHeight, scrollTop, clientHeight } = chatView.current;
      const wasAtBottom = scrollHeight - scrollTop - clientHeight < 10;
      if (wasAtBottom) {
        setTimeout(() => {
          chatView.current?.scrollTo({
            top: chatView.current.scrollHeight,
            behavior: "smooth",
          });
        }, 100);
      }
    }
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
          className={`${showPopup ? "visible translate-y-0 opacity-100" : "hidden translate-y-10 opacity-0"} flex h-[500px] w-[400px] flex-col overflow-hidden rounded-xl border border-secondary-300 bg-white transition-all`}
        >
          <div
            ref={chatView}
            className={`flex h-[500px] w-full flex-col gap-4 overflow-auto bg-secondary-100 p-4 ${copilotThinking ? "pb-[100px]" : "pb-[50px]"}`}
            onClick={() => stopAllAudio()}
          >
            {!copilotThinking && orderedChats && !orderedChats.length && (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-secondary-500">
                <img src="/images/copilot.svg" className="w-32 grayscale" />
                <p>Start chatting with CARE Copilot</p>
              </div>
            )}
            {orderedChats?.map((message) => (
              <CopilotChatBlock message={message} key={message.id} />
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
              <div className="mt-4 rounded-lg bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3">
                  {Object.values(thinkingStates).map((state) => (
                    <div key={state.stage} className="flex items-center gap-3">
                      {state.completed ? (
                        <div className="h-5 w-5 text-green-500">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      ) : (
                        <div className="h-5 w-5">
                          <Spinner className="h-5 w-5" />
                        </div>
                      )}
                      <span
                        className={`text-sm ${state.completed ? "text-green-600" : "text-secondary-600"}`}
                      >
                        {state.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
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
            className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-primary-500/90 to-blue-500/90 shadow-lg transition-all duration-300 before:absolute before:inset-0 before:-z-10 before:animate-pulse before:rounded-full before:bg-gradient-to-tr before:from-primary-400/20 before:to-blue-400/20 before:blur-xl hover:from-primary-500 hover:to-blue-500 hover:shadow-xl"
          >
            <img
              src="/images/copilot.svg"
              className="h-8 w-8 transition-all duration-300 group-hover:rotate-[360deg] group-hover:scale-110"
              alt="Copilot"
            />
          </button>
        </div>
      </div>
    </>
  );
}
