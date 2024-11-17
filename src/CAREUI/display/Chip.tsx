import CareIcon, { IconName } from "@/CAREUI/icons/CareIcon";

import { ButtonVariant } from "@/components/Common/ButtonV2";

import { classNames } from "@/Utils/utils";

interface Props {
  size?: "small" | "medium" | "large";
  hideBorder?: boolean;
  variant?: ButtonVariant | "custom";
  startIcon?: IconName;
  endIcon?: IconName;
  text: string;
  tooltip?: string;
  className?: string;
  id?: string;
}

export default function Chip({
  size = "medium",
  hideBorder = false,
  variant = "accent",
  ...props
}: Props) {
  return (
    <span
      id={props?.id}
      className={classNames(
        "inline-flex items-center gap-2 font-medium leading-4",

        {
          small: "rounded px-2 py-1 text-xs",
          medium: "rounded-lg px-3 py-2 text-xs",
          large: "rounded-lg px-4 py-3 text-sm",
        }[size],

        !hideBorder && "border",
        {
          accent: "border-accent-300 bg-accent-500/20 text-accent-600",
          secondary:
            "border-secondaryActive bg-secondary text-primaryFontLight",
          success: "border-success-300 bg-success-500/20 text-success-600",
          danger: "border-danger-300 bg-danger-500/20 text-danger-600",
          warning: "border-warning-300 bg-warning-500/20 text-warning-600",
          alert: "border-alert-300 bg-alert-500/20 text-alert-600",
          custom: "",
        }[variant],

        props.className,
      )}
      title={props.tooltip}
    >
      {props.startIcon && <CareIcon icon={props.startIcon} />}
      <span>{props.text}</span>
      {props.endIcon && <CareIcon icon={props.endIcon} />}
    </span>
  );
}
