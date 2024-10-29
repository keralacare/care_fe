import ReactMarkdown from "react-markdown";
import { Avatar } from "../Common/Avatar";
import rehypeRaw from "rehype-raw";
import useAuthUser from "@/common/hooks/useAuthUser";
import { Message } from "openai/resources/beta/threads/messages";

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
          imageUrl={
            isUser
              ? authUser.read_profile_picture_url
              : "https://ayushma-staging.ohc.network/icon.png"
          }
          className={`${isUser ? "rounded-full" : "rounded-none border-0"} h-8 shrink-0`}
        />
      </div>
      <div
        className={`flex flex-1 ${isUser ? "justify-end" : "justify-start"}`}
      >
        <div
          className={`inline-block rounded-xl border px-4 py-2 ${isUser ? "border-transparent bg-gradient-to-tr from-blue-500 to-primary-400 text-white" : "border-secondary-300 bg-white"}`}
        >
          <ReactMarkdown rehypePlugins={[rehypeRaw]} className="">
            {(message.content[0] as any).text.value}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
