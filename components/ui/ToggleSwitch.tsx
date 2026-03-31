"use client";

interface ToggleSwitchProps {
  ativo: boolean;
  onChange: (valor: boolean) => void;
  disabled?: boolean;
}

export default function ToggleSwitch({ ativo, onChange, disabled }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ativo}
      disabled={disabled}
      onClick={() => onChange(!ativo)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed ${
        ativo ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          ativo ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}
