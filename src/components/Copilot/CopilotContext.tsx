import React, { createContext, useContext, useState, useCallback } from "react";

interface CarePlanItem {
  id: string;
  description: string;
  status: "pending" | "completed";
  createdAt: string;
}

interface DischargeSummary {
  id: string;
  content: string;
  createdAt: string;
}

interface CopilotContextType {
  carePlan: {
    items: CarePlanItem[];
    loadItems: (patientId: string) => void;
    saveItems: (patientId: string, items: CarePlanItem[]) => void;
  };
  dischargeSummary: {
    summary: DischargeSummary | null;
    saveSummary: (patientId: string, content: string) => void;
    loadSummary: (patientId: string) => void;
    clearSummary: (patientId: string) => void;
  };
}

const CopilotContext = createContext<CopilotContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = "care_plan_";
const DISCHARGE_SUMMARY_PREFIX = "discharge_summary_";

export function CopilotProvider({ children }: { children: React.ReactNode }) {
  const [carePlanItems, setCarePlanItems] = useState<CarePlanItem[]>([]);
  const [dischargeSummary, setDischargeSummary] =
    useState<DischargeSummary | null>(null);

  const loadCarePlanItems = useCallback((patientId: string) => {
    try {
      console.log("🔍 CopilotContext: Loading items for patientId:", patientId);
      const storedItems = localStorage.getItem(
        `${STORAGE_KEY_PREFIX}${patientId}`,
      );

      if (storedItems) {
        const parsedItems = JSON.parse(storedItems);
        console.log("📦 CopilotContext: Found stored items:", parsedItems);

        if (Array.isArray(parsedItems)) {
          console.log("✅ CopilotContext: Setting items in state");
          setCarePlanItems([...parsedItems]);
        }
      } else {
        console.log("ℹ️ CopilotContext: No stored items found");
        setCarePlanItems([]);
      }
    } catch (error) {
      console.error("❌ CopilotContext: Error loading care plan:", error);
      setCarePlanItems([]);
    }
  }, []);

  const saveCarePlanItems = useCallback(
    (patientId: string, newItems: CarePlanItem[]) => {
      try {
        console.log(
          "💾 CopilotContext: Saving items for patientId:",
          patientId,
        );
        console.log("📝 CopilotContext: Items to save:", newItems);

        localStorage.setItem(
          `${STORAGE_KEY_PREFIX}${patientId}`,
          JSON.stringify(newItems),
        );

        console.log("✅ CopilotContext: Items saved to localStorage");
        setCarePlanItems([...newItems]);
        console.log("✅ CopilotContext: State updated with new items");
      } catch (error) {
        console.error("❌ CopilotContext: Error saving care plan:", error);
      }
    },
    [],
  );

  const saveDischargeSummary = useCallback(
    (patientId: string, content: string) => {
      try {
        const summary: DischargeSummary = {
          id: Date.now().toString(),
          content,
          createdAt: new Date().toISOString(),
        };

        localStorage.setItem(
          `${DISCHARGE_SUMMARY_PREFIX}${patientId}`,
          JSON.stringify(summary),
        );

        setDischargeSummary(summary);
      } catch (error) {
        console.error("Error saving discharge summary:", error);
      }
    },
    [],
  );

  const loadDischargeSummary = useCallback((patientId: string) => {
    try {
      const stored = localStorage.getItem(
        `${DISCHARGE_SUMMARY_PREFIX}${patientId}`,
      );
      if (stored) {
        setDischargeSummary(JSON.parse(stored));
      } else {
        setDischargeSummary(null);
      }
    } catch (error) {
      console.error("Error loading discharge summary:", error);
      setDischargeSummary(null);
    }
  }, []);

  const clearDischargeSummary = useCallback((patientId: string) => {
    try {
      localStorage.removeItem(`${DISCHARGE_SUMMARY_PREFIX}${patientId}`);
      setDischargeSummary(null);
    } catch (error) {
      console.error("Error clearing discharge summary:", error);
    }
  }, []);

  const value = {
    carePlan: {
      items: carePlanItems,
      loadItems: loadCarePlanItems,
      saveItems: saveCarePlanItems,
    },
    dischargeSummary: {
      summary: dischargeSummary,
      saveSummary: saveDischargeSummary,
      loadSummary: loadDischargeSummary,
      clearSummary: clearDischargeSummary,
    },
  };

  return (
    <CopilotContext.Provider value={value}>{children}</CopilotContext.Provider>
  );
}

export function useCopilot() {
  const context = useContext(CopilotContext);
  if (!context) {
    throw new Error("useCopilot must be used within a CopilotProvider");
  }
  return context;
}
