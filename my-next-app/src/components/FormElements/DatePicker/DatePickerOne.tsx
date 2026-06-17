"use client";

import { Calendar } from "@/components/Layouts/sidebar/icons";
import flatpickr from "flatpickr";
import { useEffect, useRef } from "react";

type Props = {
  label: string;
  value: string;
  onChange: (date: string) => void;
};

const DatePickerOne = ({ label, value, onChange }: Props) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const pickerInstance = useRef<any>(null);

  useEffect(() => {
    if (inputRef.current) {
      pickerInstance.current = flatpickr(inputRef.current, {
        mode: "single",
        static: true,
        dateFormat: "Y-m-d",
        defaultDate: value,
        monthSelectorType: "static",
        onChange: (_, dateStr) => {
          onChange(dateStr);
        },
      });
    }

    return () => pickerInstance.current?.destroy();
  }, []);

  const openCalendar = () => {
    pickerInstance.current?.open();
  };

  return (
    <div>
      {/* existing global class */}
      <label className="text-label mb-2">{label}</label>

      <div className="relative cursor-pointer" onClick={openCalendar}>
        <input
          ref={inputRef}
          defaultValue={value}
          readOnly
          className="w-full rounded border border-stroke bg-transparent px-5 py-3 outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:focus:border-primary"
        />

        <div className="pointer-events-none absolute right-5 top-3">
          <Calendar className="size-5 text-[#9CA3AF]" />
        </div>
      </div>
    </div>
  );
};

export default DatePickerOne;