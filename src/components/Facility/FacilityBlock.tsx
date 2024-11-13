import { Link } from "raviger";
import { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Avatar } from "@/components/Common/Avatar";
import { FacilityModel } from "@/components/Facility/models";

export default function FacilityBlock(props: {
  facility: FacilityModel;
  redirect?: boolean;
  mini?: boolean;
  avatarClassName?: string;
}) {
  const { facility, redirect = true, mini = false, avatarClassName } = props;

  const Element = (props: { children: ReactNode; className?: string }) =>
    redirect ? (
      <Link
        target="_blank"
        href={`/facility/${facility.id}`}
        className={props.className}
      >
        {props.children}
      </Link>
    ) : (
      <button className={props.className}>{props.children}</button>
    );

  return (
    <Element
      className={`flex items-center ${mini ? "gap-2" : "gap-4"} text-left text-inherit`}
    >
      <div className="flex aspect-square shrink-0 items-center justify-center overflow-hidden">
        <Avatar
          name={facility.name!}
          imageUrl={facility.read_cover_image_url}
          className={cn(mini ? "rounded-lg w-8" : "w-14", avatarClassName)}
        />
      </div>
      <div>
        <b className="font-semibold">{facility.name}</b>
        {!mini && (
          <p className="text-sm">
            {facility.address} {facility.local_body_object?.name}
          </p>
        )}
      </div>
    </Element>
  );
}
