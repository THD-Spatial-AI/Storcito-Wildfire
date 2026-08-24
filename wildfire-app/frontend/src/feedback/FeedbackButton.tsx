import { C } from './theme';

interface FeedbackButtonProps {
  onClick: (e: React.MouseEvent) => void;
}

export function FeedbackButton({ onClick }: FeedbackButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label="Give feedback"
      className="flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white transition-all duration-150 ease-out hover:brightness-90 active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2"
      style={{
        backgroundColor: C.primary,
        boxShadow: `0 4px 20px ${C.primaryGlow}, 0 1px 4px rgba(0,0,0,0.4)`,
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="size-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      Feedback
    </button>
  );
}
