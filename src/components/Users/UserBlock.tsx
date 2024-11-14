import routes from "@/Utils/request/api";
import useQuery from "@/Utils/request/useQuery";
import { formatDisplayName, humanizeStrings } from "@/Utils/utils";

import { Avatar } from "../Common/Avatar";
import { SkillModel, UserBareMinimum } from "./models";

export default function UserBlock(props: { user: UserBareMinimum }) {
  const { user } = props;
  const skillsQuery = useQuery(routes.userListSkill, {
    pathParams: {
      username: user.username ?? "",
    },
  });
  const formatSkills = (arr: SkillModel[]) => {
    const skills = arr.map((skill) => skill.skill_object.name);

    if (skills.length <= 3) {
      return humanizeStrings(skills);
    }

    return `${skills[0]}, ${skills[1]} and ${skills.length - 2} other skills...`;
  };
  return (
    <div className="flex items-center gap-2">
      <div>
        <Avatar
          imageUrl={user.read_profile_picture_url}
          name={formatDisplayName(user)}
          className="w-12 rounded-full"
        />
      </div>
      <div>
        <div className="font-bold">{formatDisplayName(user)}</div>
        <div className="tooltip text-xs text-secondary-800">
          {!!skillsQuery.data?.results?.length &&
            formatSkills(skillsQuery.data?.results)}
          {(skillsQuery.data?.results?.length || 0) > 3 && (
            <ul className="tooltip-text tooltip-bottom flex flex-col text-xs font-medium">
              {skillsQuery.data?.results.map((skill) => (
                <li>{skill.skill_object.name}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
