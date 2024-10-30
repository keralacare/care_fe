import { KeyboardEvent, useRef } from "react";

interface CopilotChatInputProps {
  onSubmit: (message: string) => Promise<void>;
  chat: string;
  setChat: (chat: string) => void;
  thinking: boolean;
  startNewThread: () => void;
}

export default function CopilotChatInput({
  onSubmit,
  chat,
  setChat,
  thinking,
  startNewThread,
}: CopilotChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      if (e.shiftKey) {
        // Shift + Enter: Add new line
        return;
      }
      // Enter: Submit message
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!chat.trim() || thinking) return;
    await onSubmit(chat.trim());

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
  };

  return (
    <div className="relative border-t border-secondary-200 bg-white px-3 py-2">
      <div className="flex items-end gap-2">
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={chat}
            onChange={(e) => {
              setChat(e.target.value);
              adjustTextareaHeight();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="w-full resize-none rounded-lg border border-secondary-200 bg-secondary-50 px-3 py-2 pr-20 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            rows={1}
            disabled={thinking}
            aria-label="Chat message"
          />
          <div className="absolute bottom-3 right-2 flex items-center gap-1">
            <button
              className="rounded-md p-1 text-secondary-500 transition-colors hover:text-primary-500"
              aria-label="Voice input"
              title="Voice input"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-4 w-4"
              >
                <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
              </svg>
            </button>
            <button
              onClick={handleSubmit}
              disabled={!chat.trim() || thinking}
              className="rounded-md p-1 text-secondary-500 transition-colors hover:text-primary-500 disabled:opacity-50"
              aria-label="Send message"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-4 w-4"
              >
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      {thinking && (
        <p className="mt-1.5 text-xs text-secondary-500">
          Care Copilot is thinking...
        </p>
      )}
    </div>
  );
}
