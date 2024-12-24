import careConfig from "@careConfig";
import { Link } from "raviger";
import { createContext, useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import CareIcon, { IconName } from "@/CAREUI/icons/CareIcon";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import SidebarUserCard from "@/components/Common/Sidebar/SidebarUserCard";
import NotificationItem from "@/components/Notifications/NotificationsList";

import useActiveLink from "@/hooks/useActiveLink";
import { useCareAppNavItems } from "@/hooks/useCareApps";

import { classNames } from "@/Utils/utils";

const LOGO_COLLAPSE = "/images/care_logo_mark.svg";

export interface INavItem {
  text: string;
  to?: string;
  icon?: IconName;
}

export interface IParentNavItem extends INavItem {
  icon: IconName;
  children?: Omit<INavItem, "children">[];
}

type StatelessSidebarProps = {
  onItemClick?: (open: boolean) => void;
};

export interface NavItemProps {
  item: IParentNavItem;
  isActive: boolean;
  isShrinked: boolean;
  onClick?: () => void;
}

export const NavItem = ({
  item,
  isActive,
  isShrinked,
  onClick,
}: NavItemProps) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {item.to ? (
            <Link href={item.to} onClick={onClick} className="text-gray-500">
              <Button
                variant="ghost"
                className={classNames(
                  "group relative w-full justify-start gap-3",
                  isActive ? "text-primary-600" : "text-gray-500",
                  isShrinked ? "px-3" : "px-4",
                )}
                type="button"
              >
                <CareIcon icon={item.icon} className="h-5 w-5 shrink-0" />
                {!isShrinked && (
                  <span className="truncate text-sm">{item.text}</span>
                )}
                {!isShrinked && item.children && (
                  <CareIcon
                    icon="l-angle-right"
                    className={classNames(
                      "ml-auto h-4 w-4 shrink-0 transition-transform",
                      isActive && "rotate-90",
                    )}
                  />
                )}
              </Button>
            </Link>
          ) : (
            <Button
              variant="ghost"
              className={classNames(
                "group relative w-full justify-start gap-3",
                isActive ? "text-primary-600" : "text-gray-500",
                isShrinked ? "px-3" : "px-4",
              )}
              onClick={onClick}
            >
              <CareIcon icon={item.icon} className="h-5 w-5 shrink-0" />
              {!isShrinked && (
                <span className="truncate text-sm">{item.text}</span>
              )}
              {!isShrinked && item.children && (
                <CareIcon
                  icon="l-angle-right"
                  className={classNames(
                    "ml-auto h-4 w-4 shrink-0 transition-transform",
                    isActive && "rotate-90",
                  )}
                />
              )}
            </Button>
          )}
        </TooltipTrigger>
        {isShrinked && (
          <TooltipContent side="right" className="flex items-center gap-4">
            <span className="text-sm">{item.text}</span>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};

export const SIDEBAR_SHRINK_PREFERENCE_KEY = "sidebarShrinkPreference";

export const SidebarShrinkContext = createContext<{
  shrinked: boolean;
  setShrinked: (state: boolean) => void;
}>({
  shrinked: false,
  setShrinked: () => {},
});

const StatelessSidebar = ({ onItemClick }: StatelessSidebarProps) => {
  const { t } = useTranslation();
  const activeLink = useActiveLink();
  const { shrinked } = useContext(SidebarShrinkContext);

  const BaseNavItems: IParentNavItem[] = [
    {
      text: t("facilities"),
      to: "/facility",
      icon: "d-hospital",
      children: [
        { text: t("facility_list"), to: "/facility" },
        { text: t("add_facility"), to: "/facility/create" },
        { text: t("facility_types"), to: "/facility/types" },
      ],
    },
    { text: t("appointments"), to: "/appointments", icon: "d-calendar" },
    {
      text: t("patients"),
      to: "/patients",
      icon: "d-patient",
      children: [
        { text: t("search"), to: "/patients" },
        { text: t("live"), to: "/patients/live" },
        { text: t("discharged"), to: "/patients/discharged" },
      ],
    },
    { text: t("assets"), to: "/assets", icon: "d-folder" },
    { text: t("shifting"), to: "/shifting", icon: "d-ambulance" },
    { text: t("resource"), to: "/resource", icon: "d-book-open" },
    { text: t("users"), to: "/users", icon: "d-people" },
    { text: t("notice_board"), to: "/notice_board", icon: "d-notice-board" },
  ] as const;

  const PluginNavItems = useCareAppNavItems();
  const NavItems = [...BaseNavItems, ...PluginNavItems] as IParentNavItem[];

  // Helper function to find the parent nav item for a given URL
  const findParentNavItem = (url: string | undefined) => {
    if (!url) return null;

    // Remove query parameters for matching
    const urlPath = url.split("?")[0];

    // First check exact matches for parent items
    const exactParent = NavItems.find((item) => item.to === urlPath);
    if (exactParent) return exactParent;

    // Then check child items
    return NavItems.find((item) =>
      item.children?.some((child) => {
        if (!child.to) return false;
        // Check exact match without query params
        if (child.to === urlPath) return true;
        // Check if the URL starts with the child's path
        if (urlPath.startsWith(child.to + "/")) return true;
        return false;
      }),
    );
  };

  // Helper function to check if an item is active
  const isItemActive = (item: IParentNavItem) => {
    if (!activeLink) return false;

    // Remove query parameters for matching
    const urlPath = activeLink.split("?")[0];

    if (item.children) {
      return item.children.some((child) => {
        if (!child.to) return false;
        if (child.to === urlPath) return true;
        if (urlPath.startsWith(child.to + "/")) return true;
        return false;
      });
    }
    if (!item.to) return false;
    return item.to === urlPath || urlPath.startsWith(item.to + "/");
  };

  // Initialize activeSecondaryNav based on current route
  const [activeSecondaryNav, setActiveSecondaryNav] = useState<string | null>(
    () => {
      const parent = findParentNavItem(activeLink);
      return parent?.children ? parent.text : null;
    },
  );

  // Update activeSecondaryNav when route changes
  useEffect(() => {
    const parent = findParentNavItem(activeLink);
    if (parent?.children) {
      setActiveSecondaryNav(parent.text);
    }
  }, [activeLink]);

  return (
    <div className="flex">
      <aside
        className={classNames(
          "flex h-dvh flex-col bg-white transition-all duration-300",
          activeSecondaryNav || shrinked ? "w-14" : "w-60",
          "border-r",
        )}
      >
        <div className="flex h-14 items-center justify-between border-b px-3">
          <Link
            href="/"
            className={classNames(
              "flex items-center gap-2",
              activeSecondaryNav || shrinked ? "justify-center" : "",
            )}
          >
            <img
              src={
                activeSecondaryNav || shrinked
                  ? LOGO_COLLAPSE
                  : careConfig.mainLogo?.light
              }
              alt="Care Logo"
              className="h-8 w-auto"
            />
          </Link>
        </div>
        <ScrollArea className="flex-1 py-2">
          <div className="space-y-1 px-2">
            {NavItems.map((item) => {
              const isActive = isItemActive(item);

              return (
                <NavItem
                  key={item.text}
                  item={item}
                  isActive={isActive}
                  isShrinked={activeSecondaryNav !== null || shrinked}
                  onClick={() => {
                    if (item.children) {
                      setActiveSecondaryNav(
                        activeSecondaryNav === item.text ? null : item.text,
                      );
                    } else {
                      setActiveSecondaryNav(null);
                      if (onItemClick) {
                        onItemClick(false);
                      }
                    }
                  }}
                />
              );
            })}

            <NotificationItem
              shrinked={activeSecondaryNav !== null || shrinked}
              handleOverflow={() => {}}
              onClickCB={() => {
                setActiveSecondaryNav(null);
                onItemClick?.(false);
              }}
            />

            {careConfig.urls.dashboard && (
              <NavItem
                item={{
                  text: "Dashboard",
                  to: careConfig.urls.dashboard,
                  icon: "l-dashboard",
                }}
                isActive={careConfig.urls.dashboard === activeLink}
                isShrinked={activeSecondaryNav !== null || shrinked}
                onClick={() => {
                  setActiveSecondaryNav(null);
                  onItemClick?.(false);
                }}
              />
            )}
          </div>
        </ScrollArea>
        <div className="border-t p-2">
          <SidebarUserCard shrinked={activeSecondaryNav !== null || shrinked} />
        </div>
      </aside>
      {activeSecondaryNav && (
        <aside className="flex h-dvh w-56 flex-col border-r bg-white">
          <div className="flex h-14 items-center justify-between border-b px-4">
            <h2 className="text-sm font-semibold text-gray-700">
              {NavItems.find((item) => item.text === activeSecondaryNav)?.text}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-500"
              onClick={() => setActiveSecondaryNav(null)}
            >
              <CareIcon icon="l-times" className="h-4 w-4" />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="space-y-1 p-2">
              {NavItems.find(
                (item) => item.text === activeSecondaryNav,
              )?.children?.map((child) => {
                if (!child.to || !activeLink) return null;
                // Remove query parameters for matching
                const urlPath = activeLink.split("?")[0];
                const isChildActive =
                  child.to === urlPath || urlPath.startsWith(child.to + "/");
                return (
                  <Button
                    key={child.to}
                    variant="ghost"
                    className={classNames(
                      "w-full justify-start",
                      isChildActive ? "text-primary-600" : "text-gray-500",
                    )}
                    asChild
                  >
                    <Link
                      href={child.to}
                      onClick={() => {
                        if (onItemClick) {
                          onItemClick(false);
                        }
                      }}
                    >
                      <span className="truncate text-sm">{child.text}</span>
                    </Link>
                  </Button>
                );
              })}
            </div>
          </ScrollArea>
        </aside>
      )}
    </div>
  );
};

export const DesktopSidebar = () => {
  const [shrinked, setShrinked] = useState(() => {
    const stored = localStorage.getItem(SIDEBAR_SHRINK_PREFERENCE_KEY);
    return stored ? JSON.parse(stored) : false;
  });

  useEffect(() => {
    localStorage.setItem(
      SIDEBAR_SHRINK_PREFERENCE_KEY,
      JSON.stringify(shrinked),
    );
  }, [shrinked]);

  return (
    <SidebarShrinkContext.Provider value={{ shrinked, setShrinked }}>
      <StatelessSidebar />
    </SidebarShrinkContext.Provider>
  );
};

interface MobileSidebarProps {
  open: boolean;
  setOpen: (state: boolean) => void;
}

export const MobileSidebar = ({ open, setOpen }: MobileSidebarProps) => {
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="left" className="w-[300px] p-0">
        <StatelessSidebar onItemClick={setOpen} />
      </SheetContent>
    </Sheet>
  );
};
