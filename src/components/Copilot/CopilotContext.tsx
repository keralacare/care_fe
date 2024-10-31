import React, { createContext, useContext, useState, useCallback } from "react";

interface CarePlanItem {
  id: string;
  description: string;
  status: "pending" | "completed";
  createdAt: string;
}

interface CopilotContextType {
  carePlan: {
    items: CarePlanItem[];
    loadItems: (patientId: string) => void;
    saveItems: (patientId: string, items: CarePlanItem[]) => void;
  };
}

const CopilotContext = createContext<CopilotContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = "care_plan_";

export function CopilotProvider({ children }: { children: React.ReactNode }) {
  const [carePlanItems, setCarePlanItems] = useState<CarePlanItem[]>([]);

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

  const value = {
    carePlan: {
      items: carePlanItems,
      loadItems: loadCarePlanItems,
      saveItems: saveCarePlanItems,
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
