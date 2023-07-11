import { useState } from "react";
import Card from "../../../CAREUI/display/Card";
import { BedModel } from "../../Facility/models";
import ButtonV2, { Submit } from "../../Common/components/ButtonV2";
import { SelectFormField } from "../../Form/FormFields/SelectFormField";
type direction = "left" | "right" | "up" | "down";

interface CameraBoundaryConfigureProps {
  addBoundaryPreset(e: any): void;
  updateBoundaryPreset(e: any): void;
  deleteBoundaryPreset(e: any): void;
  boundaryPreset: any;
  bed: BedModel;
  direction: direction;
  setDirection(direction: direction): void;
}

export default function CameraBoundaryConfigure(
  props: CameraBoundaryConfigureProps
) {
  const {
    addBoundaryPreset,
    updateBoundaryPreset,
    deleteBoundaryPreset,
    boundaryPreset,
    bed,
    direction,
    setDirection,
  } = props;
  const [toUpdate, setToUpdate] = useState<boolean>(false);
  return (
    <div className="mb-5">
      {!boundaryPreset && bed?.id && (
        <Card className="mt-4">
          <form onSubmit={addBoundaryPreset} className="">
            <div className="mt-2 grid gap-4 grid-cols-1 md:grid-cols-2">
              <div>
                <label id="asset-type">Boundary Preset Name</label>
                {`${bed?.name} boundary-preset`}
              </div>
              <div>
                <Submit label="Add Boundary Preset" />
              </div>
            </div>
          </form>
        </Card>
      )}
      {boundaryPreset && bed?.id && (
        <Card className="mt-4">
          <div className="mt-2 grid gap-4 grid-cols-1 md:grid-cols-2">
            {toUpdate ? (
              <div>
                <SelectFormField
                  name="direction"
                  id="direction"
                  label="Direction"
                  options={["left", "right", "up", "down"]}
                  optionLabel={(option) => option}
                  value={direction}
                  onChange={(option) => setDirection(option.value)}
                  error=""
                />
                <ButtonV2
                  variant="primary"
                  onClick={updateBoundaryPreset}
                  id="confirm-update-boundary-preset"
                >
                  Confirm
                </ButtonV2>
                <ButtonV2
                  variant="danger"
                  onClick={() => {
                    setToUpdate(false);
                  }}
                  id="cancel-modify-boundary-preset"
                >
                  Cancel
                </ButtonV2>
              </div>
            ) : (
              <div className="">
                <ButtonV2
                  variant="primary"
                  onClick={() => {
                    setToUpdate(true);
                  }}
                  id="update-boundary-preset"
                >
                  Update Boundary Preset
                </ButtonV2>
                <ButtonV2
                  variant="danger"
                  onClick={deleteBoundaryPreset}
                  id="delete-boundary-preset"
                >
                  Delete Boundary Preset
                </ButtonV2>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
