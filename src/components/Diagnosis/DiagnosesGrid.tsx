import { useTranslation } from "react-i18next";

import Card from "@/CAREUI/display/Card";

import {
  ActiveConditionVerificationStatuses,
  ConditionVerificationStatus,
  ConsultationDiagnosis,
} from "@/components/Diagnosis/types";

import { compareBy } from "@/Utils/utils";

interface Props {
  diagnoses: ConsultationDiagnosis[];
}

type GroupedDiagnoses = Record<
  ConditionVerificationStatus,
  ConsultationDiagnosis[]
>;

function groupDiagnoses(diagnoses: ConsultationDiagnosis[]) {
  const groupedDiagnoses = {} as GroupedDiagnoses;

  for (const status of ActiveConditionVerificationStatuses) {
    groupedDiagnoses[status] = diagnoses
      .filter((d) => d.verification_status === status)
      .sort(compareBy("is_principal"));
  }

  return groupedDiagnoses;
}

export default function DiagnosesGrid(props: Props) {
  const diagnoses = groupDiagnoses(props.diagnoses);

  return (
    <div>
      <div className={`transition-all duration-500 ease-in-out`}>
        <div
          className="grid grid-cols-1 items-start gap-2 md:grid-cols-2 2xl:grid-cols-3"
          id="diagnoses-view"
        >
          {Object.entries(diagnoses).map(
            ([status, diagnoses]) =>
              !!diagnoses.length && (
                <DiagnosesOfStatus key={status} diagnoses={diagnoses} />
              ),
          )}
        </div>
      </div>
    </div>
  );
}

const DiagnosesOfStatus = ({ diagnoses }: Props) => {
  const { t } = useTranslation();

  return (
    <Card
      title={
        <div className="capitalize">
          {diagnoses[0].verification_status + " " + t("diagnoses")}
        </div>
      }
      tight
      titleVariant="small"
    >
      <table className="text-sm">
        {diagnoses.map((diagnosis) => (
          <tr key={diagnosis.id}>
            <td>
              <i className="w-[60px] text-gray-400">
                {getDiagnosisLabels(diagnosis.diagnosis_object.label).code}
              </i>
            </td>
            <td className="pl-2">
              {getDiagnosisLabels(diagnosis.diagnosis_object.label).label}
            </td>
          </tr>
        ))}
      </table>
    </Card>
  );
};

const getDiagnosisLabels = (label: string) => {
  const split = label.split(" ");
  const code = split[0];
  const rest = split.slice(1).join(" ");

  return { code, label: rest };
};
