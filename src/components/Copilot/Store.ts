import { atomWithStorage } from "jotai/utils";
import { CopilotStorage } from "./types";

export const copilotAtom = atomWithStorage<CopilotStorage[]>(
  "copilot-storage",
  [],
);
