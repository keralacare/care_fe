import {
  FieldErrorText,
  FieldLabel,
} from "@/components/Form/FormFields/FormField";

type SwitchProps<T> = {
  name?: string;
  className?: string;
  label?: string;
  value?: T;
  options: T[];
  optionLabel?: (option: T) => string;
  optionClassName?: (option: T) => string | false;
  required?: boolean;
  onChange: (option: T) => void;
  error?: string;
};

export default function SwitchV2<T>(props: SwitchProps<T>) {
  return (
    <div className={props.className}>
      <FieldLabel
        htmlFor={props.name}
        required={props.required}
        className="mb-3"
      >
        {props.label}
      </FieldLabel>
      <ul role="list" className="flex">
        {props.options.map((option, index) => {
          const selected = option === props.value;
          const additionalClassNames = selected
            ? (props.optionClassName && props.optionClassName(option)) ||
              "bg-accent-500 hover:bg-accent-600 text-white border-accent-500 focus:ring-accent-500 focus:border-accent-500"
            : "bg-gray-50 hover:bg-gray-200 border-gray-400 focus:ring-accent-500 focus:border-accent-500";

          return (
            <li
              tabIndex={0}
              className={`cursor-pointer border p-2 px-4 shadow-sm outline-none transition-all duration-200 ease-in-out first:rounded-l-lg last:rounded-r-lg focus:ring-1 ${additionalClassNames}`}
              key={index}
              onClick={() => props.onChange(option)}
            >
              <span
                className={`select-none text-sm ${
                  selected ? "font-semibold" : "font-normal"
                }`}
              >
                {(props.optionLabel && props.optionLabel(option)) ||
                  String(option)}
              </span>
            </li>
          );
        })}
      </ul>
      <FieldErrorText error={props.error} />
    </div>
  );
}
