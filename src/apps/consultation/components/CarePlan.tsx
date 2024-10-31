import { useState, useEffect, useCallback } from "react";
import { useCopilot } from "@/components/Copilot/CopilotContext";

interface CarePlanProps {
  patientId: string;
}

interface CarePlanItem {
  id: string;
  description: string;
  status: "pending" | "completed";
  createdAt: string;
}

export const CarePlan = ({ patientId }: CarePlanProps) => {
  const {
    carePlan: { items: carePlanItems, loadItems, saveItems },
  } = useCopilot();
  const [newItem, setNewItem] = useState("");
  const [localItems, setLocalItems] = useState<CarePlanItem[]>(carePlanItems);

  // Sync local state with context items
  useEffect(() => {
    console.log("🔄 Syncing local items with context items:", carePlanItems);
    setLocalItems(carePlanItems);
  }, [carePlanItems]);

  // Initial load
  useEffect(() => {
    console.log("🔍 Initial load for patientId:", patientId);
    loadItems(patientId);
  }, [patientId, loadItems]);

  const toggleStatus = useCallback(
    (id: string) => {
      console.log("🔄 Toggling status for item:", id);
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
      console.log("📝 Saving updated items after toggle:", updatedItems);
      saveItems(patientId, updatedItems);
    },
    [localItems, patientId, saveItems],
  );

  const addCarePlanItem = useCallback(() => {
    if (!newItem.trim()) return;

    console.log("➕ Adding new care plan item:", newItem);
    const item: CarePlanItem = {
      id: Date.now().toString(),
      description: newItem,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    const updatedItems = [...localItems, item];
    console.log("📝 Saving updated items:", updatedItems);
    saveItems(patientId, updatedItems);
    setNewItem("");
  }, [newItem, localItems, patientId, saveItems]);

  const deleteItem = useCallback(
    (id: string) => {
      console.log("🗑️ Deleting item:", id);
      const updatedItems = localItems.filter((item) => item.id !== id);
      console.log("📝 Saving updated items after delete:", updatedItems);
      saveItems(patientId, updatedItems);
    },
    [localItems, patientId, saveItems],
  );

  // Render items from local state
  return (
    <div className="p-4">
      <div className="mb-4">
        <h2 className="mb-4 text-xl font-semibold">Care Plan</h2>
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
            No care plan items yet. Add one above.
          </div>
        ) : (
          localItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={item.status === "completed"}
                  onChange={() => toggleStatus(item.id)}
                  className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span
                  className={`${
                    item.status === "completed"
                      ? "text-gray-500 line-through"
                      : "text-gray-900"
                  }`}
                >
                  {item.description}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
                <button
                  onClick={() => deleteItem(item.id)}
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
          ))
        )}
      </div>
    </div>
  );
};
