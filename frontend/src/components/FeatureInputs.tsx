import { FEATURE_SPECS, fmt, type Features } from "../lib/math";

interface Props {
  features: Features;
  onChange: (next: Features) => void;
  disabled?: boolean;
}

export function FeatureInputs({ features, onChange, disabled }: Props) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
      {FEATURE_SPECS.map((spec) => {
        const value = features[spec.key];
        const isDays = spec.key === "time_horizon_days";
        return (
          <div key={spec.key} className="border-2 border-ink bg-white p-3 shadow-hard-sm">
            <div className="flex items-baseline justify-between gap-2">
              <label className="text-xs font-extrabold uppercase tracking-wide">
                {spec.label}
              </label>
              <span className="bg-ink px-2 py-0.5 text-xs font-bold text-lime">
                {isDays ? Math.round(value) : fmt(value, 3)}
              </span>
            </div>
            <input
              type="range"
              min={spec.min}
              max={spec.max}
              step={spec.step}
              value={value}
              disabled={disabled}
              onChange={(e) =>
                onChange({ ...features, [spec.key]: parseFloat(e.target.value) })
              }
              className="mt-3 w-full"
              aria-label={spec.label}
            />
            <p className="mt-1 text-[10px] text-gray-500">{spec.clampRule}</p>
          </div>
        );
      })}
    </div>
  );
}
