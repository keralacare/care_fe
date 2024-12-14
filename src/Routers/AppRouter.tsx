import careConfig from "@careConfig";
import { useQuery } from "@tanstack/react-query";
import { Redirect, navigate, usePath, useRedirect, useRoutes } from "raviger";
import { useCallback, useEffect, useState } from "react";

import CareIcon from "@/CAREUI/icons/CareIcon";

import ErrorBoundary from "@/components/Common/ErrorBoundary";
import {
  DesktopSidebar,
  MobileSidebar,
  SIDEBAR_SHRINK_PREFERENCE_KEY,
  SidebarShrinkContext,
} from "@/components/Common/Sidebar/Sidebar";
import ErrorPage from "@/components/ErrorPages/DefaultErrorPage";
import SessionExpired from "@/components/ErrorPages/SessionExpired";
import { FacilityModel } from "@/components/Facility/models";
import { NoticeBoard } from "@/components/Notifications/NoticeBoard";
import ShowPushNotification from "@/components/Notifications/ShowPushNotification";

import { usePluginRoutes } from "@/hooks/useCareApps";

import { BLACKLISTED_PATHS, SELECTED_FACILITY_KEY } from "@/common/constants";

import AssetRoutes from "@/Routers/routes/AssetRoutes";
import ConsultationRoutes from "@/Routers/routes/ConsultationRoutes";
import FacilityRoutes from "@/Routers/routes/FacilityRoutes";
import PatientRoutes from "@/Routers/routes/PatientRoutes";
import ResourceRoutes from "@/Routers/routes/ResourceRoutes";
import ShiftingRoutes from "@/Routers/routes/ShiftingRoutes";
import UserRoutes from "@/Routers/routes/UserRoutes";
import apiRoutes from "@/Utils/request/api";
import request from "@/Utils/request/request";
import { PaginatedResponse, RequestResult } from "@/Utils/request/types";
import useTanStackQueryInstead from "@/Utils/request/useQuery";
import { PlugConfigEdit } from "@/pages/Apps/PlugConfigEdit";
import { PlugConfigList } from "@/pages/Apps/PlugConfigList";
import { FacilitySelectionPage } from "@/pages/Facility/FacilitySelectionPage";

import { QuestionnaireList } from "../components/Questionnaire";
import { QuestionnaireShow } from "../components/Questionnaire/show";

export type RouteParams<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? { [K in Param | keyof RouteParams<Rest>]: string }
    : T extends `${string}:${infer Param}`
      ? { [K in Param]: string }
      : Record<string, never>;

export type RouteFunction<T extends string> = (
  params: RouteParams<T>,
) => JSX.Element;

export type AppRoutes = {
  [K in string]: RouteFunction<K>;
};

const Routes: AppRoutes = {
  "/": () => <Redirect to="/facility" />,

  ...AssetRoutes,
  ...ConsultationRoutes,
  ...FacilityRoutes,
  ...PatientRoutes,
  ...ResourceRoutes,
  ...ShiftingRoutes,
  ...UserRoutes,

  "/notifications/:id": ({ id }) => <ShowPushNotification id={id} />,
  "/notice_board": () => <NoticeBoard />,

  "/session-expired": () => <SessionExpired />,
  "/not-found": () => <ErrorPage />,
  "/icons": () => <CareIcon icon="l-spinner" className="h-8 w-8" />,

  // Only include the icon route in development environment
  ...(import.meta.env.PROD
    ? { "/icons": () => <CareIcon icon="l-spinner" className="h-8 w-8" /> }
    : {}),

  // Questionnaire Routes
  "/questionnaire": () => <QuestionnaireList />,
  "/questionnaire/:id": ({ id }) => <QuestionnaireShow id={id} />,
  "/apps": () => <PlugConfigList />,
  "/apps/plug-configs/:slug": ({ slug }) => <PlugConfigEdit slug={slug} />,
};

export default function AppRouter() {
  const pluginRoutes = usePluginRoutes();
  const path = usePath();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedFacility, setSelectedFacility] =
    useState<FacilityModel | null>(() => {
      const stored = localStorage.getItem(SELECTED_FACILITY_KEY);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return null;
        }
      }
      return null;
    });

  const [shrinked, setShrinked] = useState(
    localStorage.getItem(SIDEBAR_SHRINK_PREFERENCE_KEY) === "true",
  );

  // Always initialize the query, but control its execution with enabled
  const { data: permittedFacility, isLoading: isVerifyingAccess } = useQuery<
    RequestResult<FacilityModel>
  >({
    queryKey: ["permittedFacility", selectedFacility?.id],
    queryFn: async () => {
      const response = await request(apiRoutes.getPermittedFacility, {
        pathParams: { id: selectedFacility?.id || "" },
      });
      return response;
    },
    enabled: !!selectedFacility?.id,
    retry: false,
  });

  const clearSelectedFacility = useCallback(() => {
    localStorage.removeItem(SELECTED_FACILITY_KEY);
    setSelectedFacility(null);
    navigate("/");
  }, []);

  useEffect(() => {
    if (selectedFacility && !isVerifyingAccess && !permittedFacility?.data) {
      clearSelectedFacility();
    }
  }, [
    selectedFacility,
    isVerifyingAccess,
    permittedFacility,
    clearSelectedFacility,
  ]);

  useEffect(() => {
    localStorage.setItem(
      SIDEBAR_SHRINK_PREFERENCE_KEY,
      shrinked ? "true" : "false",
    );
  }, [shrinked]);

  useEffect(() => {
    setSidebarOpen(false);
    let flag = false;
    if (path) {
      BLACKLISTED_PATHS.forEach((regex: RegExp) => {
        flag = flag || regex.test(path);
      });
      if (!flag) {
        const pageContainer = window.document.getElementById("pages");
        pageContainer?.scroll(0, 0);
      }
    }
  }, [path]);

  // Check if current path is in facility-exempt paths
  const isFacilityExemptPath = (path: string) => {
    const exemptPaths = [
      "/facility",
      "/icons",
      "/session-expired",
      "/not-found",
      "/notice_board",
      "/apps",
      "/questionnaire",
    ];
    return exemptPaths.some((exemptPath) => path.startsWith(exemptPath));
  };

  let routes = Routes;
  useRedirect("/user", "/users");

  // Wrap the routes with facility check
  const wrappedRoutes = Object.entries(routes).reduce(
    (acc, [path, component]) => {
      if (isFacilityExemptPath(path)) {
        acc[path] = component;
      } else {
        acc[path] = (params: any) => {
          if (!selectedFacility) {
            return (
              <FacilitySelectionPage
                onSelect={(facility: FacilityModel) => {
                  localStorage.setItem(
                    SELECTED_FACILITY_KEY,
                    JSON.stringify(facility),
                  );
                  setSelectedFacility(facility);
                  // Redirect to the same path after facility selection
                  if (path !== "/") {
                    navigate(path);
                  } else {
                    navigate("/facility/" + facility.id);
                  }
                }}
              />
            );
          }
          return component(params);
        };
      }
      return acc;
    },
    {} as AppRoutes,
  );

  // Merge in Plugin Routes
  routes = {
    ...pluginRoutes,
    ...wrappedRoutes,
  };

  const pages = useRoutes(routes) || <ErrorPage />;

  return (
    <SidebarShrinkContext.Provider
      value={{
        shrinked,
        setShrinked,
        selectedFacility,
        clearSelectedFacility,
      }}
    >
      {selectedFacility ? (
        // Show the full layout with sidebar only when a facility is selected
        <div className="flex h-screen overflow-hidden bg-secondary-100 print:overflow-visible">
          <>
            <div className="block md:hidden">
              <MobileSidebar open={sidebarOpen} setOpen={setSidebarOpen} />
            </div>
            <div className="hidden md:block">
              <DesktopSidebar />
            </div>
          </>

          <div className="relative flex w-full flex-1 flex-col overflow-hidden bg-gray-100 print:overflow-visible">
            <div className="relative z-10 flex h-16 shrink-0 bg-white shadow md:hidden">
              <button
                onClick={() => setSidebarOpen(true)}
                className="border-r border-secondary-200 px-4 text-secondary-500 focus:bg-secondary-100 focus:text-secondary-600 focus:outline-none md:hidden"
                aria-label="Open sidebar"
              >
                <svg
                  className="h-6 w-6"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h7"
                  />
                </svg>
              </button>
            </div>

            <main
              id="pages"
              className="flex-1 overflow-y-auto bg-gray-100 focus:outline-none md:pb-2 md:pr-2"
            >
              <div
                className="max-w-8xl mx-auto mt-4 min-h-[96vh] rounded-lg border bg-gray-50 p-3 shadow"
                data-cui-page
              >
                <ErrorBoundary
                  fallback={<ErrorPage forError="PAGE_LOAD_ERROR" />}
                >
                  {pages}
                </ErrorBoundary>
              </div>
            </main>
          </div>
        </div>
      ) : (
        // Show only the pages content when no facility is selected
        <div className="h-screen w-full overflow-auto bg-gray-100">
          <ErrorBoundary fallback={<ErrorPage forError="PAGE_LOAD_ERROR" />}>
            {pages}
          </ErrorBoundary>
        </div>
      )}
    </SidebarShrinkContext.Provider>
  );
}
