import { useAtom } from "jotai";
import { useEffect, useRef, useState, useCallback } from "react";
import { copilotAtom } from "./Store";
import request from "@/Utils/request/request";
import OpenAI from "openai";
import routes from "@/Redux/api";
import { MessagesPage } from "openai/resources/beta/threads/messages";
import { Assistant } from "openai/resources/beta/assistants";
import { Thread } from "openai/resources/beta/threads/threads";
import CopilotChatInput from "./CopilotChatInput";
import { CopilotChatBlock } from "./CopilotChatBlock";
import { ThinkingStates } from "./types";
import { Run } from "openai/resources/beta/threads/runs/runs";
import Spinner from "@/components/Common/Spinner";
import { CopilotTempMessage } from "./CopilotTempMessage";
import { useCopilot } from "./CopilotContext";

const openai = new OpenAI({
  apiKey: import.meta.env.REACT_COPILOT_API_KEY,
  dangerouslyAllowBrowser: true,
});

const INITIAL_THINKING_STATES: ThinkingStates = {
  processing: {
    stage: "processing",
    message: "Processing context and history...",
    completed: false,
  },
  analyzing: {
    stage: "analyzing",
    message: "Analyzing your request...",
    completed: false,
  },
  function_calling: {
    stage: "function_calling",
    message: "Calling required functions...",
    completed: false,
  },
  generating: {
    stage: "generating",
    message: "Generating response...",
    completed: false,
  },
};

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

  const [thinkingStates, setThinkingStates] = useState<ThinkingStates>(
    INITIAL_THINKING_STATES,
  );

  const {
    carePlan: { saveItems },
    dischargeSummary: { saveSummary },
  } = useCopilot();

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
        instructions: `Your name is Care Copilot. You are a copilot assistant for the HMIS software CARE. Your job is to summarize and advice on patient status and further steps to be taken.
        - Analyze the patient's condition thoroughly
        - Create specific, actionable items
        The patient that is being referred to has the following data: ${JSON.stringify(patient.data)}`,
        tools: [
          {
            type: "function",
            function: {
              name: "get_event_history_of_the_patient",
              description: "Returns the last 30 events for the patient",
            },
          },
          {
            type: "function",
            function: {
              name: "save_care_plan",
              description:
                "Saves the care plan to the patient's record, recommend users to visit the [Care Plan tab](./care_plan) to manage it",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "string",
                    description: "Line-separated list of care plan items",
                  },
                },
                required: ["suggestions"],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "generate_discharge_summary",
              description:
                "Generates and saves a discharge summary for the patient",
              parameters: {
                type: "object",
                properties: {
                  summary: {
                    type: "string",
                    description:
                      "The complete discharge summary text in markdown format",
                  },
                },
                required: ["summary"],
              },
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

  const getEventHistory = async () => {
    const recentEvents = await request(routes.getEvents, {
      pathParams: { consultationId },
      query: { limit: 30 },
    });

    return JSON.stringify(recentEvents.data?.results);
  };

  const generateCarePlan = async (patientId: string, suggestions: string) => {
    try {
      const carePlanItems = suggestions
        .split("\n")
        .filter((item) => item.trim())
        .map((item) => ({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          description: item.trim(),
          status: "pending" as const,
          createdAt: new Date().toISOString(),
        }));

      saveItems(patientId, carePlanItems);

      return "Care plan has been generated and saved. You can view and manage it in the Care Plan tab.";
    } catch (error) {
      console.error("Error generating care plan:", error);
      return "Failed to generate care plan. Please try again.";
    }
  };

  const handleDischargeSummary = useCallback(
    (summary: string) => {
      try {
        saveSummary(patientId, summary);
        return "Discharge summary generated and saved successfully";
      } catch (error) {
        console.error("Error saving discharge summary:", error);
        return "Error saving discharge summary";
      }
    },
    [patientId, saveSummary],
  );

  const callFunction = async (run: Run) => {
    if (run.required_action?.submit_tool_outputs?.tool_calls && copilotThread) {
      const functionNames = run.required_action.submit_tool_outputs.tool_calls
        .map((t) => t.function.name)
        .join(", ");

      setThinkingStates((prev) => ({
        ...prev,
        function_calling: {
          ...prev.function_calling,
          message: `Calling ${functionNames}...`,
          functionName: functionNames,
          completed: false,
        },
      }));

      const toolOutputs = [];
      for (const tool of run.required_action.submit_tool_outputs.tool_calls) {
        let output = "No data available";
        try {
          if (tool.function.name === "get_event_history_of_the_patient") {
            const eventHistory = await getEventHistory();
            output = eventHistory || "No event history available";
          } else if (tool.function.name === "save_care_plan") {
            const params = JSON.parse(tool.function.arguments);
            const carePlanResult = await generateCarePlan(
              patientId,
              params.suggestions,
            );
            output = carePlanResult || "Care plan generated successfully";
          } else if (tool.function.name === "generate_discharge_summary") {
            const params = JSON.parse(tool.function.arguments);
            output = handleDischargeSummary(params.summary);
          }
        } catch (error) {
          console.error(`Error in function ${tool.function.name}:`, error);
          output = `Error executing ${tool.function.name}: ${error instanceof Error ? error.message : "Unknown error"}`;
        }

        toolOutputs.push({
          tool_call_id: tool.id,
          output: output.toString(),
        });
      }

      if (toolOutputs.length > 0) {
        const toolRun = await openai.beta.threads.runs.submitToolOutputsAndPoll(
          copilotThread.id,
          run.id,
          { tool_outputs: toolOutputs },
        );

        setThinkingStates((prev) => ({
          ...prev,
          function_calling: {
            ...prev.function_calling,
            completed: true,
          },
        }));

        if (toolRun.status === "requires_action") {
          await callFunction(toolRun);
        }
      }
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!copilotAssistant || !copilotThread) {
      throw Error("Thread or Assistant not initialized");
    }
    stopAllAudio();
    setCopilotThinking(true);

    // Reset thinking states
    setThinkingStates(INITIAL_THINKING_STATES);

    await openai.beta.threads.messages.create(copilotThread.id, {
      role: "user",
      content: message,
    });

    // Scroll after user message is added
    setTimeout(() => {
      if (chatView.current) {
        chatView.current.scrollTo({
          top: chatView.current.scrollHeight,
          behavior: "smooth",
        });
      }
    }, 100);

    // Show second stage complete
    setThinkingStates((prev) => ({
      ...prev,
      processing: { ...prev.processing, completed: true },
    }));

    const run = await openai.beta.threads.runs.createAndPoll(copilotThread.id, {
      assistant_id: copilotAssistant.id,
    });

    if (run.status === "requires_action") {
      await callFunction(run);
    }

    // Show final stage complete
    setThinkingStates((prev) => ({
      ...prev,
      generating: { ...prev.generating, completed: true },
    }));

    await refreshChats();
    setChat("");
    setCopilotThinking(false);

    // Final scroll after everything is complete
    setTimeout(() => {
      if (chatView.current) {
        chatView.current.scrollTo({
          top: chatView.current.scrollHeight,
          behavior: "smooth",
        });
      }
    }, 100);
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
    setCopilotChatMessages(messages);

    // Ensure scroll happens after state update and DOM render
    setTimeout(() => {
      if (chatView.current) {
        chatView.current.scrollTo({
          top: chatView.current.scrollHeight,
          behavior: "smooth",
        });
      }
    }, 100);
  };

  const orderedChats = copilotChatMessages?.data.sort(
    (a, b) => a.created_at - b.created_at,
  );

  const startNewThread = async () => {
    try {
      // Reset all states
      setCopilotThinking(false);
      setChat("");
      setCopilotChatMessages(undefined);

      // Clear the thread from storage first
      const updatedStorage = copilotStorage.map((s) =>
        s.patientId === patientId
          ? {
              ...s,
              threadId: undefined,
            }
          : s,
      );
      setCopilotStorage(updatedStorage);

      // Create new thread
      const newThread = await openai.beta.threads.create();
      setCopilotThread(newThread);

      // Update storage with new thread
      setCopilotStorage(
        updatedStorage.map((s) =>
          s.patientId === patientId
            ? {
                ...s,
                threadId: newThread.id,
              }
            : s,
        ),
      );

      // Reset thinking states
      setThinkingStates(INITIAL_THINKING_STATES);

      // Scroll chat to top
      if (chatView.current) {
        chatView.current.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }
    } catch (error) {
      console.error("Error starting new thread:", error);
    }
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-20 bg-black/20 backdrop-blur-sm ${showPopup ? "visible opacity-100" : "invisible opacity-0"} transition-all`}
        onClick={() => setShowPopup(false)}
      />
      <div className="fixed bottom-6 right-6 z-30 flex flex-col gap-4">
        <div
          className={`${
            showPopup
              ? "visible translate-y-0 opacity-100"
              : "hidden translate-y-10 opacity-0"
          } flex h-[700px] w-[450px] flex-col overflow-hidden rounded-xl border border-secondary-300 bg-white transition-all`}
        >
          <div className="flex items-center justify-between border-b border-secondary-200 bg-white px-3 py-2">
            <div className="flex items-center gap-2">
              <img
                src="/images/copilot.svg"
                className="h-5 w-5"
                alt="Copilot"
              />
              <h2 className="text-sm font-medium">Care Copilot</h2>
            </div>
            <button
              onClick={startNewThread}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-secondary-500 transition-colors hover:bg-secondary-100 hover:text-primary-500"
              aria-label="Start new chat"
              title="Start new chat"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-4 w-4"
              >
                <path
                  fillRule="evenodd"
                  d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z"
                  clipRule="evenodd"
                />
              </svg>
              Start new chat
            </button>
          </div>
          <div
            ref={chatView}
            className={`flex flex-1 flex-col gap-3 overflow-auto bg-secondary-100 p-3 ${
              copilotThinking ? "pb-[120px]" : "pb-[70px]"
            }`}
            onClick={() => stopAllAudio()}
          >
            {!copilotThinking && orderedChats && !orderedChats.length && (
              <div className="flex h-full flex-col items-center justify-center gap-6 p-4 text-secondary-500">
                <img
                  src="/images/copilot.svg"
                  className="w-24 grayscale transition-all duration-300 hover:scale-105 hover:grayscale-0"
                  alt="Copilot"
                />
                <div className="flex flex-col items-center gap-2">
                  <p className="font-medium">
                    Start chatting with CARE Copilot
                  </p>
                  <p className="text-sm text-secondary-400">
                    Click on a suggestion or type your own question
                  </p>
                </div>
                <div className="flex w-full flex-col gap-2">
                  <button
                    onClick={() => {
                      const message =
                        "Can you summarize the current patient's status and medical history?";
                      setChat(message);
                      handleSendMessage(message);
                    }}
                    className="hover:bg-primary-50 w-full rounded-lg border border-secondary-200 bg-white p-3 text-left text-sm text-secondary-600 transition-all hover:border-primary-500 hover:text-primary-600"
                  >
                    📋 Summarize patient status and medical history
                  </button>
                  <button
                    onClick={() => {
                      const message =
                        "Create a comprehensive care plan for this patient based on their current condition.";
                      setChat(message);
                      handleSendMessage(message);
                    }}
                    className="hover:bg-primary-50 w-full rounded-lg border border-secondary-200 bg-white p-3 text-left text-sm text-secondary-600 transition-all hover:border-primary-500 hover:text-primary-600"
                  >
                    🎯 Generate personalized care plan
                  </button>
                  <button
                    onClick={() => {
                      const message =
                        "What are the potential differential diagnoses based on the patient's symptoms and history?";
                      setChat(message);
                      handleSendMessage(message);
                    }}
                    className="hover:bg-primary-50 w-full rounded-lg border border-secondary-200 bg-white p-3 text-left text-sm text-secondary-600 transition-all hover:border-primary-500 hover:text-primary-600"
                  >
                    🔍 Explore differential diagnoses
                  </button>
                  <button
                    onClick={() => {
                      const message =
                        "What are the key risk factors and preventive measures to consider for this patient?";
                      setChat(message);
                      handleSendMessage(message);
                    }}
                    className="hover:bg-primary-50 w-full rounded-lg border border-secondary-200 bg-white p-3 text-left text-sm text-secondary-600 transition-all hover:border-primary-500 hover:text-primary-600"
                  >
                    ⚠️ Analyze risk factors and preventive measures
                  </button>
                  <button
                    onClick={() => {
                      const message =
                        "Can you suggest relevant lab tests and investigations based on the patient's condition?";
                      setChat(message);
                      handleSendMessage(message);
                    }}
                    className="hover:bg-primary-50 w-full rounded-lg border border-secondary-200 bg-white p-3 text-left text-sm text-secondary-600 transition-all hover:border-primary-500 hover:text-primary-600"
                  >
                    🔬 Recommend relevant tests and investigations
                  </button>
                </div>
              </div>
            )}
            {orderedChats?.map((message) => (
              <CopilotChatBlock message={message} key={message.id} />
            ))}
            {copilotThinking && chat.trim() && (
              <CopilotTempMessage message={chat} />
            )}
            {copilotThinking && (
              <div className="mt-4 rounded-lg bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3">
                  {Object.values(thinkingStates).map((state) => (
                    <div key={state.stage} className="flex flex-col gap-2">
                      <div className="flex items-center gap-3">
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
                          className={`text-sm ${
                            state.completed
                              ? "text-green-600"
                              : "text-secondary-600"
                          }`}
                        >
                          {state.message}
                        </span>
                      </div>
                      {state.stage === "function_calling" &&
                        state.functionName && (
                          <div className="ml-8 flex items-center gap-2 text-xs text-secondary-500">
                            <span>
                              {state.completed ? "✓" : "•"} {state.functionName}
                            </span>
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="absolute bottom-[60px] left-0 right-0 flex justify-center">
            <div className="rounded-full bg-secondary-100 px-3 py-1 text-xs text-secondary-500">
              AI responses may not always be accurate
            </div>
          </div>
          <CopilotChatInput
            onSubmit={handleSendMessage}
            chat={chat}
            setChat={setChat}
            thinking={copilotThinking}
            startNewThread={startNewThread}
          />
        </div>
        <div className="flex items-center justify-end">
          <button
            onClick={() => setShowPopup(!showPopup)}
            className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-green-600/90 to-primary-600/90 shadow-lg transition-all duration-300 hover:shadow-xl"
          >
            <img
              src="/images/copilot.svg"
              className={`h-8 w-8 transition-all duration-500 ${
                showPopup ? "rotate-[360deg]" : "rotate-0"
              }`}
              alt="Copilot"
            />
          </button>
        </div>
      </div>
    </>
  );
}
