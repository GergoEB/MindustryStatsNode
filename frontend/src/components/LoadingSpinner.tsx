import React from "react";

export const LoadingSpinner: React.FC<{showText?: boolean}> = ({showText = true}) => (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surface-primary/50 z-20">
        <div className="animate-spin rounded h-6 w-6 border-2 border-accent border-t-transparent" />
        {showText && (
            <span className="text-xs text-secondary font-medium tracking-wide animate-pulse">
              Loading...
            </span>
        )}
    </div>
);