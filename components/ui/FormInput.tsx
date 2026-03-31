// Input reutilizável com suporte a label, mensagem de erro e props nativas do HTML
// Compatível com react-hook-form ou uso simples com useState

"use client";

import React from "react";
import clsx from "clsx";

// Props do FormInput — estende todas as props nativas do <input>
interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  erro?: string;
  id?: string;
}

export default function FormInput({
  label,
  erro,
  id,
  className,
  ...props
}: FormInputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s/g, "-");

  return (
    <div className="flex flex-col gap-1">
      {/* Label do campo */}
      <label
        htmlFor={inputId}
        className="text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
      </label>

      {/* Campo de entrada */}
      <input
        id={inputId}
        className={clsx(
          "px-4 py-2.5 rounded-xl border text-sm transition-all outline-none",
          "bg-white dark:bg-gray-800",
          "text-gray-900 dark:text-gray-100",
          "placeholder:text-gray-400 dark:placeholder:text-gray-500",
          erro
            ? "border-red-400 focus:ring-2 focus:ring-red-300"
            : "border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800",
          className
        )}
        {...props}
      />

      {/* Mensagem de erro */}
      {erro && (
        <span className="text-xs text-red-500 mt-0.5">{erro}</span>
      )}
    </div>
  );
}