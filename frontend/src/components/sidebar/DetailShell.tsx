import React from "react";
import { useSidebar } from "../../context/SidebarContext";

interface DetailShellProps {
  title: string;
  children: React.ReactNode;
}

const MobileHeader: React.FC<{ title: string; onBack: () => void }> = ({
  title,
  onBack,
}) => (
  <div className="bg-neutral-800 backdrop-blur-md border-b border-neutral-700/50 p-4 flex items-center">
    <button
      onClick={onBack}
      className="bg-neutral-700/50 hover:bg-neutral-600/50 text-gray-300 p-2 rounded-lg transition-colors border border-neutral-600/50 mr-4"
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M10 19l-7-7m0 0l7-7m-7 7h18"
        />
      </svg>
    </button>
    <h2 className="text-lg font-semibold text-white">{title}</h2>
  </div>
);

export const DetailShell: React.FC<DetailShellProps> = ({ title, children }) => {
  const { isMobile, handleToggleCollapse } = useSidebar();
  const showHeader = isMobile;

  return (
    <div className="flex-1 relative h-screen overflow-hidden">
      {showHeader && (
        <MobileHeader title={title} onBack={handleToggleCollapse} />
      )}
      {children}
    </div>
  );
};
