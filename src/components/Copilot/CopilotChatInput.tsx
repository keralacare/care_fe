import CareIcon from "@/CAREUI/icons/CareIcon";

export default function CopilotChatInput(props: {
  chat: string;
  setChat: (chat: string) => void;
  onSubmit: (chat: string) => void;
  thinking: boolean;
  startNewThread: () => void;
}) {
  const { chat, setChat, onSubmit, thinking, startNewThread } = props;

  return (
    <div className="absolute inset-x-4 bottom-4 flex h-[80px] items-center overflow-hidden rounded-xl border border-secondary-300 bg-white">
      <textarea
        disabled={thinking}
        value={chat}
        onChange={(e) => setChat(e.target.value)}
        placeholder="Chat with copilot"
        className="h-full w-full resize-none border-none disabled:bg-secondary-200 disabled:grayscale"
      />
      <div className="flex flex-col items-center justify-center">
        <button
          onClick={() => onSubmit(chat)}
          className="px-4 text-2xl text-primary-500"
          disabled={thinking}
        >
          <CareIcon icon="l-message" />
        </button>
        <button
          onClick={startNewThread}
          className="px-4 text-lg text-primary-500"
          disabled={thinking}
        >
          <CareIcon icon="l-trash" />
        </button>
      </div>
    </div>
  );
}
