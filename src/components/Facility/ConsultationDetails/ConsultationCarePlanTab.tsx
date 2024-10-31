import { useState, useEffect } from "react";
import { ConsultationTabProps } from ".";

interface CarePlanItem {
  id: string;
  description: string;
  status: "pending" | "completed";
  createdAt: string;
}

const STORAGE_KEY_PREFIX = "care_plan_";

export const ConsultationCarePlanTab = ({
  patientId,
}: ConsultationTabProps) => {
  const [carePlanItems, setCarePlanItems] = useState<CarePlanItem[]>([]);
  const [newItem, setNewItem] = useState("");

  // Load care plan items from localStorage on component mount
  useEffect(() => {
    const storedItems = localStorage.getItem(
      `${STORAGE_KEY_PREFIX}${patientId}`,
    );
    if (storedItems) {
      setCarePlanItems(JSON.parse(storedItems));
    }
  }, [patientId]);

  // Save to localStorage whenever items change
  useEffect(() => {
    localStorage.setItem(
      `${STORAGE_KEY_PREFIX}${patientId}`,
      JSON.stringify(carePlanItems),
    );
  }, [carePlanItems, patientId]);

  const addCarePlanItem = () => {
    if (!newItem.trim()) return;

    const item: CarePlanItem = {
      id: Date.now().toString(),
      description: newItem,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    setCarePlanItems((prevItems) => [...prevItems, item]);
    setNewItem("");
  };

  const toggleStatus = (id: string) => {
    setCarePlanItems((items) =>
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              status: item.status === "pending" ? "completed" : "pending",
            }
          : item,
      ),
    );
  };

  const deleteItem = (id: string) => {
    setCarePlanItems((items) => items.filter((item) => item.id !== id));
  };

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
        {carePlanItems.length === 0 ? (
          <div className="text-center text-gray-500">
            No care plan items yet. Add one above or ask Copilot to generate a
            care plan.
          </div>
        ) : (
          carePlanItems.map((item) => (
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
