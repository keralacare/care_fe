import InvestigationReports from "@/components/Facility/Investigations/Reports";
import { PatientManager } from "@/components/Patient/ManagePatients";
import { PatientHome } from "@/components/Patient/PatientHome";
import PatientNotes from "@/components/Patient/PatientNotes";
import { PatientRegister } from "@/components/Patient/PatientRegister";
import DeathReport from "@/components/DeathReport/DeathReport";
import { InsuranceDetails } from "@/components/Patient/InsuranceDetails";
import FileUploadPage from "@/components/Patient/FileUploadPage";
import { AppRoutes } from "../AppRouter";

const PatientRoutes: AppRoutes = {
  "/patients": () => <PatientManager />,
  "/patient/:id": ({ id }) => <PatientHome id={id} />,
  "/patient/:id/investigation_reports": ({ id }) => (
    <InvestigationReports id={id} />
  ),
  "/facility/:facilityId/patient": ({ facilityId }) => (
    <PatientRegister facilityId={facilityId} />
  ),
  "/facility/:facilityId/patient/:id": ({ facilityId, id }) => (
    <PatientHome facilityId={facilityId} id={id} page="demography" />
  ),
  "/facility/:facilityId/patient/:id/demography": ({ facilityId, id }) => (
    <PatientHome facilityId={facilityId} id={id} page="demography" />
  ),
  "/facility/:facilityId/patient/:id/encounters": ({ facilityId, id }) => (
    <PatientHome facilityId={facilityId} id={id} page="encounters" />
  ),
  "/facility/:facilityId/patient/:id/health_profile": ({ facilityId, id }) => (
    <PatientHome facilityId={facilityId} id={id} page="health_profile" />
  ),
  "/facility/:facilityId/patient/:id/immunisation_records": ({
    facilityId,
    id,
  }) => (
    <PatientHome facilityId={facilityId} id={id} page="immunisation_records" />
  ),
  "/facility/:facilityId/patient/:id/shift_patient": ({ facilityId, id }) => (
    <PatientHome facilityId={facilityId} id={id} page="shift_patient" />
  ),
  "/facility/:facilityId/patient/:id/request_sample_test": ({
    facilityId,
    id,
  }) => (
    <PatientHome facilityId={facilityId} id={id} page="request_sample_test" />
  ),

  "/facility/:facilityId/patient/:id/insurance": ({ facilityId, id }) => (
    <InsuranceDetails facilityId={facilityId} id={id} />
  ),
  "/facility/:facilityId/patient/:id/update": ({ facilityId, id }) => (
    <PatientRegister facilityId={facilityId} id={id} />
  ),
  "/facility/:facilityId/patient/:patientId/notes": ({
    facilityId,
    patientId,
  }) => <PatientNotes patientId={patientId} facilityId={facilityId} />,
  "/facility/:facilityId/patient/:patientId/files": ({
    facilityId,
    patientId,
  }) => (
    <FileUploadPage
      facilityId={facilityId}
      patientId={patientId}
      type="PATIENT"
    />
  ),
  "/death_report/:id": ({ id }) => <DeathReport id={id} />,
};

export default PatientRoutes;
