import React, { useEffect, useRef, useState } from "react";
import { useSignalContext } from "../context/signalContext/SignalContext";
import { useSocketContext } from "../context/socketContext/SocketContext";
import { useUserInfoContext } from "../context/userInfoContext/UserInfoContext";
import { useEffectsContext } from "../context/effectsContext/EffectsContext";
import { useToolsContext } from "../context/toolsContext/ToolsContext";
import CameraSection from "./lib/cameraSection/CameraSection";
import AudioSection from "./lib/audioSection/AudioSection";
import ScreenSection from "./lib/screenSection/ScreenSection";
import ProducersController from "../lib/ProducersController";
import TableFunctionsController from "./lib/TableFunctionsController";
import { FgBackground } from "../elements/fgBackgroundSelector/lib/typeConstant";
import UploadMediaButton from "./lib/uploadMediaButton/UploadMediaButton";
import MoreTableFunctionsButton from "./lib/moreTableFunctionsButton/MoreTableFunctionsButton";
import MessageTableSection from "./lib/messageTableSection/MessageTableSection";
import CaptureMediaPortal from "../elements/captureMediaPortal/CaptureMediaPortal";
import CaptureMedia from "../media/capture/CaptureMedia";
import Deadbanding from "../babylon/Deadbanding";
import TabledPortal from "../elements/tabledPortal/TabledPortal";
import LittleBuddyPortal from "../elements/littleBuddyPortal/LittleBuddyPortal";

export default function TableFunctions({
  tableFunctionsRef,
  tableTopRef,
  isCamera,
  cameraActive,
  setCameraActive,
  cameraBtnRef,
  newCameraBtnRef,
  isScreen,
  screenActive,
  setScreenActive,
  screenBtnRef,
  newScreenBtnRef,
  mutedAudioRef,
  isAudio,
  audioActive,
  setAudioActive,
  audioBtnRef,
  muteAudio,
  handleDisableEnableBtns,
  gridActive,
  setGridActive,
  gridSize,
  setGridSize,
  producersController,
  deadbanding,
  tableSidePanelActive,
  setTableSidePanelActive,
  sidePanelPosition,
  setSidePanelPosition,
}: {
  tableFunctionsRef: React.RefObject<HTMLDivElement>;
  tableTopRef: React.RefObject<HTMLDivElement>;
  isCamera: React.MutableRefObject<boolean>;
  cameraActive: boolean;
  setCameraActive: React.Dispatch<React.SetStateAction<boolean>>;
  cameraBtnRef: React.RefObject<HTMLButtonElement>;
  newCameraBtnRef: React.RefObject<HTMLButtonElement>;
  isScreen: React.MutableRefObject<boolean>;
  screenActive: boolean;
  setScreenActive: React.Dispatch<React.SetStateAction<boolean>>;
  screenBtnRef: React.RefObject<HTMLButtonElement>;
  newScreenBtnRef: React.RefObject<HTMLButtonElement>;
  mutedAudioRef: React.MutableRefObject<boolean>;
  isAudio: React.MutableRefObject<boolean>;
  audioActive: boolean;
  setAudioActive: React.Dispatch<React.SetStateAction<boolean>>;
  audioBtnRef: React.RefObject<HTMLButtonElement>;
  muteAudio: (
    producerType: "audio" | "screenAudio",
    producerId: string | undefined,
  ) => void;
  handleDisableEnableBtns: (disabled: boolean) => void;
  gridActive: boolean;
  setGridActive: React.Dispatch<React.SetStateAction<boolean>>;
  gridSize: {
    rows: number;
    cols: number;
  };
  setGridSize: React.Dispatch<
    React.SetStateAction<{
      rows: number;
      cols: number;
    }>
  >;
  producersController: React.MutableRefObject<ProducersController>;
  deadbanding: React.MutableRefObject<Deadbanding>;
  tableSidePanelActive: boolean;
  setTableSidePanelActive: React.Dispatch<React.SetStateAction<boolean>>;
  sidePanelPosition: "left" | "right";
  setSidePanelPosition: React.Dispatch<React.SetStateAction<"left" | "right">>;
}) {
  const { sendGeneralSignal } = useSignalContext();
  const { tableSocket } = useSocketContext();
  const { tableId, username, instance } = useUserInfoContext();
  const { captureEffects, captureEffectsStyles } = useEffectsContext();
  const { userDevice } = useToolsContext();

  const externalBackgroundChange = useRef(false);

  const muteBtnRef = useRef<HTMLButtonElement>(null);

  const [audioEffectsActive, setAudioEffectsActive] = useState(false);
  const [tableBackground, setTableBackground] = useState<
    FgBackground | undefined
  >();

  const [captureMediaActive, setCaptureMediaActive] = useState(false);
  const captureMedia = useRef<CaptureMedia | undefined>(undefined);

  const [tabledActive, setTabledActive] = useState(false);
  const [dragging, setDragging] = useState(false);

  const [littleBuddyActive, setLittleBuddyActive] = useState(false);

  const [moreTableFunctionsActive, setMoreTableFunctionsActive] =
    useState(false);

  const [_, setRerender] = useState(false);

  const tableFunctionsController = useRef(
    new TableFunctionsController(
      tableTopRef,
      externalBackgroundChange,
      setTableBackground,
      setCaptureMediaActive,
      setMoreTableFunctionsActive,
      sendGeneralSignal,
      captureMedia,
      userDevice,
      deadbanding,
      captureEffects,
      captureEffectsStyles,
      setRerender,
    ),
  );

  const handleExternalMute = () => {
    muteAudio("audio", undefined);

    sendGeneralSignal({
      type: "localMuteChange",
      header: {
        tableId: tableId.current,
        username: username.current,
        instance: instance.current,
        producerType: "audio",
        producerId: undefined,
      },
    });
  };

  useEffect(() => {
    setAudioEffectsActive(false);
  }, [isAudio.current]);

  useEffect(() => {
    tableSocket.current?.addMessageListener(
      tableFunctionsController.current.handleTableSocketMessage,
    );

    return () => {
      tableSocket.current?.removeMessageListener(
        tableFunctionsController.current.handleTableSocketMessage,
      );
    };
  }, [tableSocket.current]);

  useEffect(() => {
    if (!captureMediaActive) return;

    tableFunctionsController.current.getVideo();
  }, [captureMediaActive]);

  return (
    <div
      ref={tableFunctionsRef}
      className="flex h-16 w-full items-center justify-center space-x-5 px-[5%]"
    >
      <div className="flex h-full w-max space-x-3 rounded-xl border-2 border-fg-off-white bg-fg-tone-black-6 px-4 py-2">
        <MoreTableFunctionsButton
          moreTableFunctionsActive={moreTableFunctionsActive}
          setMoreTableFunctionsActive={setMoreTableFunctionsActive}
          tableTopRef={tableTopRef}
          mutedAudioRef={mutedAudioRef}
          isAudio={isAudio}
          gridActive={gridActive}
          setGridActive={setGridActive}
          gridSize={gridSize}
          setGridSize={setGridSize}
          audioEffectsActive={audioEffectsActive}
          setAudioEffectsActive={setAudioEffectsActive}
          tableBackground={tableBackground}
          externalBackgroundChange={externalBackgroundChange}
          handleExternalMute={handleExternalMute}
          captureMediaActive={captureMediaActive}
          setCaptureMediaActive={setCaptureMediaActive}
          tabledActive={tabledActive}
          setTabledActive={setTabledActive}
          littleBuddyActive={littleBuddyActive}
          setLittleBuddyActive={setLittleBuddyActive}
          tableSidePanelActive={tableSidePanelActive}
          setTableSidePanelActive={setTableSidePanelActive}
          sidePanelPosition={sidePanelPosition}
          setSidePanelPosition={setSidePanelPosition}
        />
        <CameraSection
          cameraBtnRef={cameraBtnRef}
          newCameraBtnRef={newCameraBtnRef}
          isCamera={isCamera}
          setCameraActive={setCameraActive}
          cameraActive={cameraActive}
          producersController={producersController}
          handleDisableEnableBtns={handleDisableEnableBtns}
        />
        <ScreenSection
          screenBtnRef={screenBtnRef}
          newScreenBtnRef={newScreenBtnRef}
          isScreen={isScreen}
          screenActive={screenActive}
          setScreenActive={setScreenActive}
          producersController={producersController}
          handleDisableEnableBtns={handleDisableEnableBtns}
        />
        <AudioSection
          audioBtnRef={audioBtnRef}
          muteBtnRef={muteBtnRef}
          mutedAudioRef={mutedAudioRef}
          isAudio={isAudio}
          audioActive={audioActive}
          setAudioActive={setAudioActive}
          handleExternalMute={handleExternalMute}
          producersController={producersController}
          handleDisableEnableBtns={handleDisableEnableBtns}
        />
        <UploadMediaButton />
        {captureMediaActive && captureMedia.current && (
          <CaptureMediaPortal
            captureMedia={captureMedia}
            tableFunctionsController={tableFunctionsController}
            setCaptureMediaActive={setCaptureMediaActive}
          />
        )}
        {tabledActive && (
          <TabledPortal
            dragging={dragging}
            setDragging={setDragging}
            setTabledActive={setTabledActive}
          />
        )}
        {littleBuddyActive && (
          <LittleBuddyPortal
            dragging={dragging}
            setDragging={setDragging}
            setLittleBuddyActive={setLittleBuddyActive}
          />
        )}
      </div>
      <MessageTableSection />
    </div>
  );
}
