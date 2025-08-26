const ToggleSwitch = ({ value, onChange }) => {
  return (
    <>
      <div
        className="relative inline-flex items-center rounded-full bg-gray-700 p-1 overflow-hidden select-none"
        style={{ width: 260, height: 44 }} // ensure a real track to slide across
      >
        {/* sliding pill */}
        <div
          className="absolute top-1 bottom-1 left-1 w-1/2 rounded-full bg-blue-500 transition-transform duration-200 ease-out"
          style={{
            transform: value === "year" ? "translateX(100%)" : "translateX(0%)",
          }}
          aria-hidden="true"
        />

        {/* labels row */}
        <div className="relative z-10 grid grid-cols-2 w-full text-center">
          <span
            role="radio"
            aria-checked={value === "month"}
            tabIndex={0}
            onClick={() => onChange("month")}
            onKeyDown={(e) =>
              (e.key === "Enter" || e.key === " ") && onChange("month")
            }
            className={`cursor-pointer px-5 py-2 font-medium ${
              value === "month" ? "text-white" : "text-gray-300"
            }`}
          >
            MONTHLY
          </span>
          <span
            role="radio"
            aria-checked={value === "year"}
            tabIndex={0}
            onClick={() => onChange("year")}
            onKeyDown={(e) =>
              (e.key === "Enter" || e.key === " ") && onChange("year")
            }
            className={`cursor-pointer px-5 py-2 font-medium ${
              value === "year" ? "text-white" : "text-gray-300"
            }`}
          >
            YEARLY
          </span>
        </div>
      </div>

      {value === "year" && (
        <div className="mt-4 text-gray-300 text-center">Save 18% yearly</div>
      )}
    </>
  );
};

export default ToggleSwitch;
