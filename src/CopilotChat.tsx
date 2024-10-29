import OpenAI from "openai";
import { Assistant } from "openai/resources/beta/assistants";
import { Thread } from "openai/resources/beta/threads/threads";
import { Message, MessagesPage } from "openai/resources/beta/threads/messages";
import { Avatar } from "./components/Common/Avatar";
import useAuthUser from "./common/hooks/useAuthUser";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
const openai = new OpenAI({
  apiKey: import.meta.env.REACT_COPILOT_API_KEY,
  dangerouslyAllowBrowser: true,
});

export const copilotChatSend = async (
  chatMessage: string,
  assistant: Assistant,
  thread: Thread,
) => {
  await openai.beta.threads.messages.create(thread.id, {
    role: "user",
    content: chatMessage,
  });

  const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
    assistant_id: assistant.id,
  });

  return run;
};

export const listCopilotChats = async (thread: Thread) => {
  return await openai.beta.threads.messages.list(thread.id);
};

export default function CopilotChat(props: {
  consultationId: string;
  facilityId: string;
  patientId: string;
  thread?: Thread;
  assistant?: Assistant;
  chatMessages?: MessagesPage;
  thinking: boolean;
}) {
  const { chatMessages, thinking } = props;

  const orderedChats = chatMessages?.data.sort(
    (a, b) => a.created_at - b.created_at,
  );

  return (
    <div className="h-full p-4">
      <div className="flex h-[300px] w-full flex-col gap-4 overflow-auto">
        {orderedChats?.map((message) => <CopilotChatBlock message={message} />)}
        {thinking ? "Thinking" : ""}
      </div>
    </div>
  );
}

export function CopilotChatBlock(props: { message: Message }) {
  const { message } = props;

  const isUser = message.role === "user";
  const authUser = useAuthUser();

  return (
    <div
      className={`flex ${isUser ? "flex-row-reverse justify-end" : "flex-row justify-start"} gap-2`}
    >
      <div className="shrink-0">
        <Avatar
          name={isUser ? authUser.first_name : "👾"}
          imageUrl={isUser ? authUser.read_profile_picture_url : undefined}
          className="h-8 shrink-0 rounded-full"
        />
      </div>
      <div className="flex flex-1 justify-end">
        <div
          className={`inline-block rounded-lg border p-4 ${isUser ? "border-primary-600 bg-primary-500 text-white" : "border-secondary-300 bg-secondary-100"}`}
        >
          <ReactMarkdown rehypePlugins={[rehypeRaw]} className="">
            {(message.content[0] as any).text.value}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
