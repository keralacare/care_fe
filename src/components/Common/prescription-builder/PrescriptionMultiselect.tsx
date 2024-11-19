import { useEffect, useRef, useState } from "react";

import CareIcon from "@/CAREUI/icons/CareIcon";

import { classNames } from "@/Utils/utils";

export function PrescriptionMultiDropdown(props: {
  options: string[];
  selectedValues: string[];
  setSelectedValues: (value: any) => void;
  placeholder?: string;
  type?: "string" | "number";
  min?: number;
  onFocus?: () => void;
  onBlur?: () => void;
}) {
  const { options, selectedValues, setSelectedValues } = props;
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  function useOutsideAlerter(ref: any) {
    useEffect(() => {
      function handleClickOutside(event: any) {
        if (ref.current && !ref.current.contains(event.target)) {
          setOpen(false);
        }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [ref]);
  }

  const dropRef = useRef(null);
  useOutsideAlerter(dropRef);

  return (
    <div className="relative w-full">
      <div className="my-2 flex flex-wrap gap-1">
        {selectedValues.length > 0 &&
          selectedValues.map((selectedValue, i) => {
            return (
              <div
                key={i}
                className="inline-flex gap-2 rounded-lg border border-accent-600 bg-accent-100 px-3 py-1 text-accent-900"
              >
                {selectedValue}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedValues(
                      selectedValues.filter((v) => v !== selectedValue),
                    );
                  }}
                >
                  <CareIcon icon="l-times" className="text-lg" />
                </button>
              </div>
            );
          })}
      </div>

      <input
        placeholder={props.placeholder}
        className="cui-input-base py-2"
        onClick={() => setOpen(!open)}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={props.onFocus}
        onBlur={props.onBlur}
      />
      <div
        ref={dropRef}
        className={classNames(
          "absolute left-0 top-[calc(100%+10px)] z-40 max-h-[300px] w-full overflow-auto rounded-md bg-primary shadow-lg",
          !open && "hidden",
        )}
      >
        {options
          .filter((o) => o.toLowerCase().includes(value.toLowerCase()))
          .map((option, i) => {
            return (
              <button
                type="button"
                id="investigation-group"
                key={i}
                className={classNames(
                  "block w-full px-4 py-2 text-left text-sm leading-5 text-gray-700 hover:text-primary-900 focus:text-primary-900 focus:outline-none",
                  selectedValues.includes(option)
                    ? "bg-accent-100 hover:bg-accent-200"
                    : "hover:bg-gray-100 focus:bg-gray-100",
                )}
                onClick={() => {
                  setSelectedValues(
                    selectedValues.includes(option)
                      ? selectedValues.filter((v) => v !== option)
                      : [...selectedValues, option],
                  );
                }}
              >
                {option}
              </button>
            );
          })}
      </div>
    </div>
  );
}
