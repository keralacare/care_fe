import { Link, useNavigate, usePath } from "raviger";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

import { LABS_BASE_ROUTE } from "@/components/Lab/constants";

import InProcess from "./InProcess";
import OrdersPlaced from "./OrdersPlaced";
import ReceivedAtLab from "./ReceivedAtLab";
import Results from "./Results";
import ReviewRequired from "./ReviewRequired";
import SentToLab from "./SentToLab";
import SpecimenCollected from "./SpecimenCollected";

const labOrderTabs = [
  {
    route: `${LABS_BASE_ROUTE}/orders_placed`,
    label: "orders_placed",
    component: <OrdersPlaced />,
    default: true,
  },
  {
    route: `${LABS_BASE_ROUTE}/specimen_collected`,
    label: "specimen_collected",
    component: <SpecimenCollected />,
  },
  {
    route: `${LABS_BASE_ROUTE}/sent_to_lab`,
    label: "sent_to_lab",
    component: <SentToLab />,
  },
  {
    route: `${LABS_BASE_ROUTE}/received_at_lab`,
    label: "received_at_lab",
    component: <ReceivedAtLab />,
  },
  {
    route: `${LABS_BASE_ROUTE}/in_process`,
    label: "in_process",
    component: <InProcess />,
  },
  {
    route: `${LABS_BASE_ROUTE}/review_required`,
    label: "review_required",
    component: <ReviewRequired />,
  },
  {
    route: `${LABS_BASE_ROUTE}/results`,
    label: "results",
    component: <Results />,
  },
];

export default function LabOrdersTab() {
  const { t } = useTranslation();
  const currentPath = usePath();
  const navigate = useNavigate();

  const selectedTab = useMemo(() => {
    return labOrderTabs.find((tab) => tab.route === currentPath);
  }, [currentPath]);

  useEffect(() => {
    if (!selectedTab) {
      const defaultTab =
        labOrderTabs.find((tab) => tab.default) ?? labOrderTabs[0];
      navigate(defaultTab.route);
    }
  }, [selectedTab, navigate]);

  return (
    <div>
      <nav
        className="sticky top-0 z-10 mt-4 w-full overflow-x-auto border-b bg-gray-50"
        role="navigation"
      >
        <ul className="flex flex-row" role="tablist">
          {labOrderTabs.map((tab) => (
            <Link
              key={tab.route}
              href={tab.route}
              className={cn(
                "whitespace-nowrap px-4 py-2 text-sm font-medium",
                currentPath === tab.route
                  ? "border-b-4 border-green-800 text-green-800 md:border-b-2"
                  : "rounded-t-lg text-gray-600 hover:bg-gray-100",
              )}
              role="tab"
              aria-selected={currentPath === tab.route}
            >
              {t(tab.label)}
            </Link>
          ))}
        </ul>
      </nav>

      <main className="h-full lg:mr-7 lg:basis-5/6">
        <div className="mt-4">{selectedTab?.component}</div>
      </main>
    </div>
  );
}
