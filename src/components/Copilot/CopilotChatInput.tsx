import CareIcon from "@/CAREUI/icons/CareIcon";
import useRecorder from "@/Utils/useRecorder";
import OpenAI from "openai";
import { useEffect } from "react";
const openai = new OpenAI({
  apiKey: import.meta.env.REACT_COPILOT_API_KEY,
  dangerouslyAllowBrowser: true,
});

export default function CopilotChatInput(props: {
  chat: string;
  setChat: (chat: string) => void;
  onSubmit: (chat: string) => void;
  thinking: boolean;
  startNewThread: () => void;
}) {
  const { chat, setChat, onSubmit, thinking } = props;

  const [, isRecording, startRecording, stopRecording, blob, resetRecording] =
    useRecorder((permission: boolean) => {
      if (!permission) {
        handleStopRecording();
        resetRecording();
      }
    });

  const handleStopRecording = async () => {
    stopRecording();
  };

  useEffect(() => {
    if (blob) {
      const main = async () => {
        const audioFile = new File([blob], "audio.mpeg", {
          type: "audio/mpeg",
        });
        const transcription = await openai.audio.transcriptions.create({
          file: audioFile,
          model: "whisper-1",
        });
        setChat(transcription.text);
        onSubmit(transcription.text);
      };
      main();
    }
  }, [blob]);

  return (
    <div
      className={`absolute inset-x-4 bottom-4 flex h-[80px] items-center overflow-hidden rounded-xl border border-secondary-300 bg-white ${thinking ? "bg-secondary-200 grayscale" : ""}`}
    >
      <textarea
        disabled={thinking}
        value={chat}
        onChange={(e) => setChat(e.target.value)}
        placeholder="Chat with copilot"
        className="h-full w-full resize-none border-none bg-transparent shadow-none outline-none ring-0"
      />
      <div className="flex h-full flex-col items-center justify-center">
        <button
          onClick={() => onSubmit(chat)}
          className="h-full flex-1 px-4 text-xl text-primary-500 hover:bg-secondary-100 disabled:bg-transparent"
          disabled={thinking || isRecording}
        >
          <CareIcon icon="l-message" />
        </button>
        <button
          onClick={isRecording ? handleStopRecording : startRecording}
          className={`h-full flex-1 px-4 text-xl text-primary-500 hover:bg-secondary-100 disabled:bg-transparent ${isRecording ? "animate-pulse bg-red-500 text-white hover:bg-red-500" : ""}`}
          disabled={thinking}
        >
          <CareIcon icon="l-microphone" />
        </button>
      </div>
    </div>
  );
}
