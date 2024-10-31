import { useState, useEffect, useCallback } from "react";
import { ConsultationTabProps } from ".";
import { useCopilot } from "@/components/Copilot/CopilotContext";

interface CarePlanItem {
  id: string;
  description: string;
  status: "pending" | "completed";
  createdAt: string;
}

export const ConsultationCarePlanTab = ({
  patientId,
}: ConsultationTabProps) => {
  const {
    carePlan: { items: carePlanItems, loadItems, saveItems },
  } = useCopilot();
  const [newItem, setNewItem] = useState("");
  const [localItems, setLocalItems] = useState<CarePlanItem[]>([]);
  const [isEditMode, setIsEditMode] = useState(true);
  const [editedItems, setEditedItems] = useState<Record<string, string>>({});

  // Sync local state with context items
  useEffect(() => {
    setLocalItems(carePlanItems);
    setEditedItems(
      carePlanItems.reduce(
        (acc, item) => {
          acc[item.id] = item.description;
          return acc;
        },
        {} as Record<string, string>,
      ),
    );
  }, [carePlanItems]);

  // Initial load from Copilot context
  useEffect(() => {
    loadItems(patientId);
  }, [patientId, loadItems]);

  const toggleStatus = useCallback(
    (id: string) => {
      const updatedItems = localItems.map((item) =>
        item.id === id
          ? {
              ...item,
              status:
                item.status === "pending"
                  ? ("completed" as const)
                  : ("pending" as const),
            }
          : item,
      );
      saveItems(patientId, updatedItems);
    },
    [localItems, patientId, saveItems],
  );

  const addCarePlanItem = useCallback(() => {
    if (!newItem.trim()) return;

    const item: CarePlanItem = {
      id: Date.now().toString(),
      description: newItem,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    const updatedItems = [...localItems, item];
    saveItems(patientId, updatedItems);
    setNewItem("");
  }, [newItem, localItems, patientId, saveItems]);

  const deleteItem = useCallback(
    (id: string) => {
      const updatedItems = localItems.filter((item) => item.id !== id);
      saveItems(patientId, updatedItems);
    },
    [localItems, patientId, saveItems],
  );

  const startEditing = useCallback(() => {
    setIsEditMode(true);
    const initialEdits = localItems.reduce(
      (acc, item) => {
        acc[item.id] = item.description;
        return acc;
      },
      {} as Record<string, string>,
    );
    setEditedItems(initialEdits);
  }, [localItems]);

  const saveEdits = useCallback(() => {
    const updatedItems = localItems.map((item) => ({
      ...item,
      description: editedItems[item.id]?.trim() || item.description,
    }));
    saveItems(patientId, updatedItems);
    setIsEditMode(false);
    setEditedItems({});
  }, [editedItems, localItems, patientId, saveItems]);

  const cancelEdits = useCallback(() => {
    setIsEditMode(false);
    setEditedItems({});
  }, []);

  const handleItemEdit = useCallback((id: string, value: string) => {
    setEditedItems((prev) => ({
      ...prev,
      [id]: value,
    }));
  }, []);

  const clearAllItems = useCallback(() => {
    if (
      window.confirm(
        "Are you sure you want to delete all care plan items? This action cannot be undone.",
      )
    ) {
      saveItems(patientId, []);
      setEditedItems({});
      setIsEditMode(false);
    }
  }, [patientId, saveItems]);

  return (
    <div className="p-4">
      <div className="mb-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Care Plan</h2>
          {localItems.length > 0 && (
            <div className="flex gap-2">
              {!isEditMode && (
                <button
                  onClick={startEditing}
                  className="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-white hover:bg-green-600"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Edit All
                </button>
              )}
              <button
                onClick={clearAllItems}
                className="flex items-center gap-2 rounded-lg border border-red-500 px-4 py-2 text-red-500 hover:bg-red-50"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Clear All
              </button>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            className="flex-1 rounded-lg border px-3 py-2"
            placeholder="Add new care plan item"
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                addCarePlanItem();
              }
            }}
          />
          <button
            onClick={addCarePlanItem}
            className="rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary-600"
          >
            Add
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {localItems.length === 0 ? (
          <div className="text-center text-gray-500">
            No care plan items yet. Add one above or ask Copilot to generate a
            care plan.
          </div>
        ) : (
          <>
            {localItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg hover:bg-gray-50"
              >
                <div className="flex flex-1 items-start gap-3 py-2">
                  <input
                    type="checkbox"
                    checked={item.status === "completed"}
                    onChange={() => toggleStatus(item.id)}
                    className="mt-1 h-5 w-5 rounded border-gray-300 text-primary"
                    disabled={isEditMode}
                  />
                  {isEditMode ? (
                    <textarea
                      value={editedItems[item.id] || ""}
                      onChange={(e) => handleItemEdit(item.id, e.target.value)}
                      className="flex-1 rounded border px-2 py-1"
                      rows={2}
                      autoFocus={localItems[0].id === item.id}
                      style={{ resize: "vertical", minHeight: "3rem" }}
                    />
                  ) : (
                    <span
                      className={`${
                        item.status === "completed"
                          ? "text-gray-500 line-through"
                          : "text-gray-900"
                      }`}
                    >
                      {item.description}
                    </span>
                  )}
                </div>
                <div className="ml-2 flex items-start gap-4 py-2">
                  {!isEditMode && (
                    <span className="text-sm text-gray-500">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  )}
                  <button
                    onClick={() => {
                      deleteItem(item.id);
                      if (isEditMode) {
                        const newEditedItems = { ...editedItems };
                        delete newEditedItems[item.id];
                        setEditedItems(newEditedItems);
                      }
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}

            {isEditMode && (
              <div className="sticky bottom-0 mt-4 flex justify-end gap-2 border-t bg-white pt-4">
                <button
                  onClick={saveEdits}
                  className="flex items-center gap-2 rounded-lg bg-green-500 px-6 py-2 text-white hover:bg-green-600"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Save All Changes
                </button>
                <button
                  onClick={cancelEdits}
                  className="flex items-center gap-2 rounded-lg border border-gray-300 px-6 py-2 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
