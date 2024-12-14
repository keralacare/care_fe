import { Link } from "raviger";

import CareIcon from "@/CAREUI/icons/CareIcon";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { FacilityModel } from "../Facility/models";

interface FacilityMenuProps {
  facility: FacilityModel | null;
  onSwitchFacility: () => void;
}

export function FacilityMenu({
  facility,
  onSwitchFacility,
}: FacilityMenuProps) {
  if (!facility) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 w-full">
          <div className="flex-1 text-left">
            <div className="font-medium truncate">{facility.name}</div>
            <div className="text-xs text-muted-foreground truncate">
              {facility.facility_type}
            </div>
          </div>
          <CareIcon icon="l-arrow-down" className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuItem asChild>
          <Link href="/settings" className="flex items-center">
            <CareIcon icon="l-cog" className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onSwitchFacility}>
          <CareIcon icon="l-exchange-alt" className="mr-2 h-4 w-4" />
          Switch Facility
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
