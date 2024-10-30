export type CopilotStorage = {
  patientId: string;
  threadId?: string;
  assistantId?: string;
};

export type ThinkingState = {
  stage: "analyzing" | "processing" | "generating" | "complete";
  message: string;
  completed: boolean;
};

export type ThinkingStates = {
  [key: string]: ThinkingState;
};
