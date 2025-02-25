import ObservationsList from "@/components/Facility/ConsultationDetails/ObservationsList";
import QuestionnaireResponsesList from "@/components/Facility/ConsultationDetails/QuestionnaireResponsesList";
import { AllergyList } from "@/components/Patient/allergy/list";
import { DiagnosisList } from "@/components/Patient/diagnosis/list";
import { SymptomsList } from "@/components/Patient/symptoms/list";

import { EncounterTabProps } from "@/pages/Encounters/EncounterShow";

export const EncounterUpdatesTab = ({
  facilityId,
  encounter,
  patient,
}: EncounterTabProps) => {
  return (
    <div className="flex flex-col gap-4">
      {/* Main Content Area */}
      <div className="flex flex-col xl:flex-row gap-4">
        {/* Left Column - Symptoms, Diagnoses, and Questionnaire Responses */}
        <div className="flex-1 space-y-4" data-cy="encounter-overview">
          {/* Allergies Section */}
          <div>
            <AllergyList
              facilityId={facilityId}
              patientId={patient.id}
              encounterId={encounter.id}
            />
          </div>

          {/* Symptoms Section */}
          <div>
            <SymptomsList
              patientId={patient.id}
              encounterId={encounter.id}
              facilityId={facilityId}
            />
          </div>

          {/* Diagnoses Section */}
          <div>
            <DiagnosisList
              patientId={patient.id}
              encounterId={encounter.id}
              facilityId={facilityId}
            />
          </div>

          {/* Questionnaire Responses Section */}
          <div>
            <QuestionnaireResponsesList
              encounter={encounter}
              patientId={patient.id}
            />
          </div>
        </div>

        {/* Right Column - Observations */}
        <div className="xl:w-1/3">
          <ObservationsList encounter={encounter} />
        </div>
      </div>
    </div>
  );
};
