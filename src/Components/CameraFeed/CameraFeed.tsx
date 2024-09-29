import * as Notification from "../../Utils/Notifications";

import FeedAlert, { FeedAlertState, StreamStatus } from "./FeedAlert";
import {
  GetLockCameraResponse,
  GetPresetsResponse,
  GetRequestAccessResponse,
} from "./routes";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { classNames, isIOS } from "../../Utils/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import useOperateCamera, { PTZPayload } from "./useOperateCamera";

import { AssetData } from "../Assets/AssetTypes";
import ButtonV2 from "../Common/components/ButtonV2";
import FeedControls from "./FeedControls";
import FeedNetworkSignal from "./FeedNetworkSignal";
import FeedWatermark from "./FeedWatermark";
import NoFeedAvailable from "./NoFeedAvailable";
import { UserBareMinimum } from "../Users/models";
import VideoPlayer from "./videoPlayer";
import { getStreamUrl } from "./utils";
import useAuthUser from "../../Common/hooks/useAuthUser";
import useBreakpoints from "../../Common/hooks/useBreakpoints";
import useFullscreen from "../../Common/hooks/useFullscreen";
import { useMessageListener } from "../../Common/hooks/useMessageListener";

interface Props {
  children?: React.ReactNode;
  asset: AssetData;
  preset?: PTZPayload;
  className?: string;
  // Callbacks
  onCameraPresetsObtained?: (presets: Record<string, number>) => void;
  onStreamSuccess?: () => void;
  onStreamError?: () => void;
  // Controls
  constrolsDisabled?: boolean;
  shortcutsDisabled?: boolean;
  onMove?: () => void;
  operate: ReturnType<typeof useOperateCamera>["operate"];
  feedDisabled?: boolean | string | React.ReactNode;
}

export default function CameraFeed(props: Props) {
  const playerRef = useRef<HTMLVideoElement | null>(null);
  const playerWrapperRef = useRef<HTMLDivElement>(null);
  const [streamUrl, setStreamUrl] = useState<string>("");
  const inlineControls = useBreakpoints({ default: false, sm: true });

  const [isFullscreen, setFullscreen] = useFullscreen();
  const [state, setState] = useState<FeedAlertState>();
  const [playedOn, setPlayedOn] = useState<Date>();
  const [playerStatus, setPlayerStatus] = useState<StreamStatus>("stop");

  const [cameraUser, setCameraUser] = useState<UserBareMinimum>();
  const user = useAuthUser();

  const lockCamera = useCallback(async () => {
    const { res, data, error } = await props.operate({ type: "lock_camera" });

    const successData = data as GetLockCameraResponse;
    const errorData = error as GetLockCameraResponse["result"];

    if (res?.status === 200 && successData?.result) {
      Notification.Success({
        msg: successData.result.message,
      });
      setCameraUser(successData.result.camera_user);
    } else if (res?.status === 409 && errorData) {
      Notification.Warn({
        msg: errorData.message,
      });
      setCameraUser(errorData.camera_user);
    } else {
      Notification.Error({
        msg: "An error occurred while locking the camera",
      });
    }
  }, []);

  const unlockCamera = useCallback(async () => {
    await props.operate({ type: "unlock_camera" });
  }, []);

  useEffect(() => {
    lockCamera();

    return () => {
      unlockCamera();
    };
  }, [lockCamera, unlockCamera]);

  useMessageListener((data) => {
    if (data?.action === "CAMERA_ACCESS_REQUEST") {
      Notification.Warn({
        msg: data?.message,
      });
    }

    if (data?.action === "CAMERA_AVAILABILITY") {
      Notification.Success({
        msg: data?.message,
      });
      lockCamera();
    }
  });

  // Move camera when selected preset has changed
  useEffect(() => {
    async function move(preset: PTZPayload) {
      setState("moving");
      const { res } = await props.operate({
        type: "absolute_move",
        data: preset,
      });
      setTimeout(() => setState((s) => (s === "moving" ? undefined : s)), 4000);
      if (res?.status === 500) {
        setState("host_unreachable");
      }
    }

    if (props.preset) {
      move(props.preset);
    }
  }, [props.preset]); // eslint-disable-line react-hooks/exhaustive-deps

  // Get camera presets (only if onCameraPresetsObtained is provided)
  useEffect(() => {
    if (!props.onCameraPresetsObtained) return;
    async function getPresets(cb: (presets: Record<string, number>) => void) {
      const { res, data } = await props.operate({ type: "get_presets" });
      if (res?.ok && data) {
        cb((data as GetPresetsResponse).result);
      }
    }
    getPresets(props.onCameraPresetsObtained);
  }, [props.operate, props.onCameraPresetsObtained]); // eslint-disable-line react-hooks/exhaustive-deps

  const initializeStream = useCallback(async () => {
    if (!playerRef.current) return;
    setPlayerStatus("loading");
    await props
      .operate({ type: "get_stream_token" })
      .then(({ res, data }) => {
        if (res?.status != 200) {
          setState("authentication_error");
          return props.onStreamError?.();
        }
        const result = data?.result as { token: string };
        return setStreamUrl(getStreamUrl(props.asset, result.token));
      })
      .catch(() => {
        setState("host_unreachable");
        return props.onStreamError?.();
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Start stream on mount
  useEffect(() => {
    if (!props.feedDisabled) {
      initializeStream();
    }
  }, [props.feedDisabled, initializeStream]);

  const resetStream = () => {
    setState("loading");
    initializeStream();
  };

  const controls = !props.constrolsDisabled && (
    <FeedControls
      inlineView={inlineControls}
      shortcutsDisabled={props.shortcutsDisabled}
      isFullscreen={isFullscreen}
      setFullscreen={(value) => {
        if (!value) {
          setFullscreen(false);
          return;
        }

        if (isIOS) {
          const element = document.querySelector("video");
          if (!element) {
            return;
          }
          setFullscreen(true, element, true);
          return;
        }

        if (!playerRef.current) {
          return;
        }

        setFullscreen(
          true,
          playerWrapperRef.current || (playerRef.current as HTMLElement),
          true,
        );
      }}
      onReset={resetStream}
      onMove={async (data) => {
        setState("moving");
        const { res } = await props.operate({ type: "relative_move", data });
        props.onMove?.();
        setTimeout(() => {
          setState((state) => (state === "moving" ? undefined : state));
        }, 4000);
        if (res?.status === 500) {
          setState("host_unreachable");
        }
      }}
    />
  );

  return (
    <div ref={playerWrapperRef} className="flex h-full flex-col justify-center">
      <div
        className={classNames(
          "flex max-h-screen min-h-full flex-col justify-center",
          props.className,
          isFullscreen ? "bg-black" : "bg-zinc-100",
          isIOS && isFullscreen && "px-20",
        )}
      >
        <div
          className={classNames(
            isFullscreen ? "hidden lg:flex" : "flex",
            "shrink-0 items-center justify-between px-4 py-0.5 transition-all duration-500 ease-in-out lg:py-1",
            (() => {
              if (playerStatus !== "playing") {
                return "bg-black text-zinc-400";
              }

              if (isFullscreen) {
                return "bg-zinc-900 text-white";
              }

              return "bg-zinc-500/20 text-zinc-800";
            })(),
          )}
        >
          <div
            className={classNames(
              playerStatus !== "playing"
                ? "pointer-events-none opacity-10"
                : "opacity-100",
              "transition-all duration-200 ease-in-out flex-1",
            )}
          >
            {props.children}
          </div>
          <div className="flex flex-col items-end justify-end md:flex-row md:items-center md:gap-4">
            <span className="text-xs font-bold md:text-sm">
              {props.asset.name}
            </span>
            {!isIOS && (
              <div
                className={classNames(
                  state === "loading" && "animate-pulse",
                  "-mr-1 -mt-1 scale-90 md:mt-0 md:scale-100",
                )}
              >
                <FeedNetworkSignal
                  playerRef={playerRef as any}
                  playedOn={playedOn}
                  status={playerStatus}
                  onReset={resetStream}
                />
              </div>
            )}
            {cameraUser && (
              <Menu>
                <MenuButton className="h-8 w-8 rounded-full bg-primary-500 text-white flex items-center justify-center uppercase text-sm shadow">
                  <span>{cameraUser.username[0]}</span>
                </MenuButton>

                <MenuItems
                  transition
                  anchor="bottom end"
                  className="z-30 w-52 origin-top-right rounded-xl border  p-4 text-sm/6 transition duration-100 ease-out [--anchor-gap:var(--spacing-1)] focus:outline-none data-[closed]:scale-95 data-[closed]:opacity-0 mt-2 min-w-full  bg-white py-1 shadow-lg ring-1 ring-black/5 sm:min-w-[250px] md:w-max "
                >
                  <MenuItem>
                    <div className="flex items-end justify-end flex-col w-full">
                      <p className="font-semibold">
                        {[
                          cameraUser.first_name,
                          cameraUser.last_name,
                          `(${cameraUser.username})`,
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      </p>
                      <p className="text-sm text-secondary-500">
                        {cameraUser.user_type}
                      </p>
                      <p className="text-sm text-secondary-500">
                        {cameraUser.email}
                      </p>
                    </div>
                  </MenuItem>

                  {cameraUser.username !== user.username && (
                    <MenuItem>
                      <div className="flex items-center justify-between flex-col w-full mt-3">
                        <p>Need access to move camera?</p>
                        <ButtonV2
                          size="small"
                          variant="primary"
                          onClick={async () => {
                            const { res, data } = await props.operate({
                              type: "request_access",
                            });

                            const successData =
                              data as GetRequestAccessResponse;

                            if (res?.status === 200) {
                              Notification.Success({
                                msg: successData.result.message,
                              });
                              setCameraUser(successData.result.camera_user);
                            } else {
                              Notification.Error({
                                msg: "An error occurred while requesting access",
                              });
                            }
                          }}
                        >
                          Request Access
                        </ButtonV2>
                      </div>
                    </MenuItem>
                  )}
                </MenuItems>
              </Menu>
            )}
          </div>
        </div>
        <div className="group relative flex-1 bg-black">
          {/* Notifications */}
          <FeedAlert state={state} />
          {playerStatus === "playing" && <FeedWatermark />}

          {/* No Feed informations */}
          {(() => {
            switch (state) {
              case "host_unreachable":
                return (
                  <NoFeedAvailable
                    message="Host Unreachable"
                    className="text-warning-500"
                    icon="l-exclamation-triangle"
                    streamUrl=""
                    asset={props.asset}
                    onResetClick={resetStream}
                  />
                );
              case "authentication_error":
                return (
                  <NoFeedAvailable
                    message="Authentication Error"
                    className="text-warning-500"
                    icon="l-exclamation-triangle"
                    streamUrl=""
                    asset={props.asset}
                    onResetClick={resetStream}
                  />
                );
              case "offline":
                return (
                  <NoFeedAvailable
                    message="Offline"
                    className="text-secondary-500"
                    icon="l-exclamation-triangle"
                    streamUrl=""
                    asset={props.asset}
                    onResetClick={resetStream}
                  />
                );
            }
          })()}

          {props.feedDisabled &&
            (["string", "boolean"].includes(typeof props.feedDisabled) ? (
              <NoFeedAvailable
                message={
                  typeof props.feedDisabled === "string"
                    ? props.feedDisabled
                    : "Feed Disabled"
                }
                className="text-warning-500"
                icon="l-exclamation-triangle"
                streamUrl=""
              />
            ) : (
              props.feedDisabled
            ))}

          {/* Video Player */}
          <VideoPlayer
            playerRef={playerRef}
            streamUrl={streamUrl}
            className={classNames(
              "max-h-[calc(100vh-40px)] w-full object-contain",
              !!props.feedDisabled && "opacity-10",
            )}
            onPlay={() => {
              setPlayedOn(new Date());
              setState("playing");
              setPlayerStatus("playing");
            }}
            onEnded={() => setPlayerStatus("stop")}
            onSuccess={async () => {
              props.onStreamSuccess?.();
              const { res } = await props.operate({ type: "get_status" });
              if (res?.status === 500) {
                setState("host_unreachable");
              }
            }}
            onError={props.onStreamError}
          />

          {inlineControls && playerStatus === "playing" && controls}
        </div>
        {!inlineControls && (
          <div
            className={classNames(
              "py-4 transition-all duration-500 ease-in-out",
              playerStatus !== "playing"
                ? "pointer-events-none px-6 opacity-30"
                : "px-12 opacity-100",
            )}
          >
            {controls}
          </div>
        )}
      </div>
    </div>
  );
}
