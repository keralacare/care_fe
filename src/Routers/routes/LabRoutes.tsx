import LabOrdersTab from "@/components/Lab/LabOrdersTab";
import { LABS_BASE_ROUTE } from "@/components/Lab/constants";

import { AppRoutes } from "@/Routers/AppRouter";

const LabRoutes: AppRoutes = {
  [`${LABS_BASE_ROUTE}`]: () => <LabOrdersTab />,
  [`${LABS_BASE_ROUTE}/:tab`]: () => <LabOrdersTab />,
};

export default LabRoutes;
