export type CopilotStorage = {
  patientId: string;
  threadId?: string;
  assistantId?: string;
};

export type ThinkingState = {
  stage: "analyzing" | "processing" | "generating" | "function_calling";
  message: string;
  completed: boolean;
  functionName?: string;
};

export type ThinkingStates = {
  analyzing: ThinkingState;
  processing: ThinkingState;
  generating: ThinkingState;
  function_calling: ThinkingState;
};
