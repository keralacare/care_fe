import careConfig from "@careConfig";
import { Link } from "raviger";
import { useContext } from "react";
import { useTranslation } from "react-i18next";

import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";

import {
  IParentNavItem,
  NavItem,
  SidebarShrinkContext,
} from "@/components/Common/Sidebar/Sidebar";

import useActiveLink from "@/hooks/useActiveLink";

import { OTPPatientUserContext } from "@/Routers/OTPPatientRouter";
import { classNames } from "@/Utils/utils";
import { AppointmentPatient } from "@/pages/Patient/Utils";

import { Avatar } from "../Avatar";
import OTPPatientSidebarUserCard from "./OTPPatientSidebarUserCard";

const LOGO_COLLAPSE = "/images/care_logo_mark.svg";

const GetNavItems = (selectedUser: AppointmentPatient | null) => {
  const { t } = useTranslation();
  const { state, district, ward, local_body } = selectedUser || {};
  const paramString =
    (state ? `state=${state}&` : "") +
    (district ? `district=${district}&` : "") +
    (ward ? `ward=${ward}&` : "") +
    (local_body ? `local_body=${local_body}` : "");
  const BaseNavItems: IParentNavItem[] = [
    { text: t("appointments"), to: "/patient/home", icon: "d-patient" },
    {
      text: t("nearby_facilities"),
      to: `/facilities/?${paramString}`,
      icon: "d-patient",
    },
    {
      text: t("medical_records"),
      to: `/patient/${selectedUser?.id}`,
      icon: "d-book-open",
    },
  ];
  return BaseNavItems;
};

interface StatelessSidebarProps {
  onItemClick?: (open: boolean) => void;
}

export const OTPPatientStatelessSidebar = ({
  onItemClick,
}: StatelessSidebarProps) => {
  const activeLink = useActiveLink();
  const { t } = useTranslation();
  const { shrinked } = useContext(SidebarShrinkContext);
  const {
    users,
    selectedUser,
    setSelectedUser,
  }: {
    users?: AppointmentPatient[] | undefined;
    selectedUser: AppointmentPatient | null;
    setSelectedUser: (user: AppointmentPatient) => void;
  } = useContext(OTPPatientUserContext);

  const NavItems = GetNavItems(selectedUser);

  return (
    <aside
      className={classNames(
        "flex h-dvh flex-col bg-white border-r transition-all duration-300",
        shrinked ? "w-14" : "w-60",
      )}
    >
      <div className="flex h-14 items-center justify-between border-b px-3">
        <Link
          href="/"
          className={classNames(
            "flex items-center gap-2",
            shrinked && "justify-center",
          )}
        >
          <img
            src={shrinked ? LOGO_COLLAPSE : careConfig.mainLogo?.light}
            alt="Care Logo"
            className="h-8 w-auto"
          />
        </Link>
      </div>
      {!shrinked && (
        <div className="border-b p-2">
          <Select
            disabled={users?.length === 0}
            value={users ? selectedUser?.id : undefined}
            onValueChange={(value) => {
              const user = users?.find((user) => user.id === value);
              if (user) {
                setSelectedUser(user);
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={
                  users?.length === 0 ? t("no_patients") : t("select_patient")
                }
              >
                <div className="flex items-center gap-2">
                  <Avatar name={selectedUser?.name} className="h-4 w-4" />
                  <div className="flex items-center justify-between w-full gap-2">
                    <span className="font-semibold truncate max-w-32">
                      {selectedUser?.name}
                    </span>
                    <span className="text-xs text-secondary-600">
                      {t("switch")}
                    </span>
                  </div>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {users?.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  <div className="flex items-center gap-2">
                    <Avatar name={user.name} className="h-4 w-4" />
                    <span className="truncate">{user.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <ScrollArea className="flex-1 py-2">
        <div className="space-y-1 px-2">
          {NavItems.map((item) => (
            <NavItem
              key={item.text}
              item={item}
              isActive={item.to === activeLink}
              isShrinked={shrinked}
              onClick={() => onItemClick?.(false)}
            />
          ))}
        </div>
      </ScrollArea>
      <div className="border-t p-2">
        <OTPPatientSidebarUserCard shrinked={shrinked} />
      </div>
    </aside>
  );
};

export const OTPPatientDesktopSidebar = () => {
  return <OTPPatientStatelessSidebar />;
};

interface MobileSidebarProps {
  open: boolean;
  setOpen: (state: boolean) => void;
}

export const OTPPatientMobileSidebar = ({
  open,
  setOpen,
}: MobileSidebarProps) => {
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="left" className="w-[300px] p-0">
        <OTPPatientStatelessSidebar onItemClick={setOpen} />
      </SheetContent>
    </Sheet>
  );
};
