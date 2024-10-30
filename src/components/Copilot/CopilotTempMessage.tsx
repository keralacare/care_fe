import { Avatar } from "../Common/Avatar";
import useAuthUser from "@/common/hooks/useAuthUser";

interface CopilotTempMessageProps {
  message: string;
}

export function CopilotTempMessage({ message }: CopilotTempMessageProps) {
  if (!message.trim()) return null;

  const authUser = useAuthUser();

  return (
    <div className="flex flex-row-reverse justify-end gap-2">
      <div className="shrink-0">
        <Avatar
          name={authUser.first_name}
          imageUrl={authUser.read_profile_picture_url}
          className="h-8 shrink-0 rounded-full"
        />
      </div>
      <div className="flex flex-1 justify-end">
        <div className="inline-block rounded-xl border border-transparent bg-gradient-to-tr from-blue-500 to-primary-400 px-4 py-2 text-white">
          {message}
        </div>
      </div>
    </div>
  );
}
