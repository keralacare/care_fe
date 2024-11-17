import CareIcon, { IconName } from "@/CAREUI/icons/CareIcon";

import { classNames } from "@/Utils/utils";

interface Props {
  count: number;
  text: string;
  loading: boolean;
  icon: IconName;
  className?: string;
}

export default function CountBlock(props: Props) {
  return (
    <div className={classNames("rounded-lg", props.className)}>
      <dl className="flex gap-3">
        <div className="flex aspect-square h-16 items-center justify-center rounded-lg border border-accent-400/20 bg-accent-400/20 text-2xl">
          <CareIcon icon={props.icon} className="text-accent-500" />
        </div>
        <div>
          <dt className="mb-1 truncate text-sm font-semibold text-gray-500">
            {props.text}
          </dt>
          {props.loading ? (
            <dd className="h-10 w-full max-w-[100px] animate-pulse rounded-lg bg-gray-300" />
          ) : (
            <dd id="count" className="text-5xl font-black leading-9">
              {props.count}
            </dd>
          )}
        </div>
      </dl>
    </div>
  );
}
