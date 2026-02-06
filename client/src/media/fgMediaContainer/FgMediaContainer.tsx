import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMediaContext } from "../../context/mediaContext/MediaContext";
import { useSocketContext } from "../../context/socketContext/SocketContext";
import { useUserInfoContext } from "../../context/userInfoContext/UserInfoContext";
import { useSignalContext } from "../../context/signalContext/SignalContext";
import LowerControls from "./lib/lowerControls/LowerControls";
import MediaContainerController from "./lib/MediaContainerController";
import LowerController from "./lib/lowerControls/lib/LowerController";
import FgContentAdjustmentController from "../../elements/fgAdjustmentElements/lib/FgContentAdjustmentControls";
import {
  defaultMediaContainerOptions,
  MediaContainerOptions,
} from "./lib/typeConstant";
import Gradient from "./lib/Gradient";
import UpperControls from "./lib/upperControls/UpperControls";
import {
  TableContentStateTypes,
  StaticContentTypes,
  LoadingStateTypes,
} from "../../../../universal/contentTypeConstant";
import DownloadFailed from "../../elements/downloadFailed/DownloadFailed";
import DownloadPaused from "../../elements/downloadPaused/DownloadPaused";
import LoadingElement from "../../elements/loadingElement/LoadingElement";
import FourCornersDecorator from "../../elements/decorators/FourCornersDecorator";
import "./lib/mediaContainerStyles.css";

const AdjustmentButtons = React.lazy(() => import("./lib/AdjustmentButtons"));

export default function FgMediaContainer({
  tableRef,
  tableTopRef,
  filename,
  pauseDownload,
  resumeDownload,
  retryDownload,
  downloadingState,
  addDownloadListener,
  removeDownloadListener,
  getAspect,
  setPositioning,
  mediaId,
  mediaInstanceId,
  kind,
  initState,
  bundleRef,
  backgroundMedia,
  media,
  floatingContent,
  hideSelectedIndicator,
  className,
  popupElements,
  leftLowerControls,
  rightLowerControls,
  leftUpperControls,
  rightUpperControls,
  inMediaVariables,
  preventLowerLabelsVariables,
  externalPositioning,
  externalMediaContainerRef,
  externalSubContainerRef,
  externalRightLowerControlsRef,
  options,
}: {
  tableRef: React.RefObject<HTMLDivElement>;
  tableTopRef: React.RefObject<HTMLDivElement>;
  filename?: string;
  pauseDownload?: () => void;
  resumeDownload?: () => void;
  retryDownload?: () => void;
  downloadingState: LoadingStateTypes;
  addDownloadListener?: (
    listener: (
      message: { type: "downloadComplete" } | { type: string },
    ) => void,
  ) => void;
  removeDownloadListener?: (
    listener: (
      message: { type: "downloadComplete" } | { type: string },
    ) => void,
  ) => void;
  getAspect?: () => number | undefined;
  setPositioning?: (positioning: {
    position: {
      left: number;
      top: number;
    };
    scale: {
      x: number;
      y: number;
    };
    rotation: number;
  }) => void;
  mediaId: string;
  mediaInstanceId: string;
  kind: StaticContentTypes;
  initState: TableContentStateTypes[];
  bundleRef: React.RefObject<HTMLDivElement>;
  backgroundMedia: boolean;
  media?: React.ReactNode;
  floatingContent?: React.ReactNode[];
  hideSelectedIndicator?: boolean;
  className?: string;
  popupElements?: (React.ReactNode | null)[];
  leftLowerControls?: (React.ReactNode | null)[];
  rightLowerControls?: (React.ReactNode | null)[];
  leftUpperControls?: (React.ReactNode | null)[];
  rightUpperControls?: (React.ReactNode | null)[];
  inMediaVariables?: boolean[];
  preventLowerLabelsVariables?: boolean[];
  externalPositioning?: React.MutableRefObject<{
    position: {
      left: number;
      top: number;
    };
    scale: {
      x: number;
      y: number;
    };
    rotation: number;
  }>;
  externalMediaContainerRef?: React.RefObject<HTMLDivElement>;
  externalSubContainerRef?: React.RefObject<HTMLDivElement>;
  externalRightLowerControlsRef?: React.RefObject<HTMLDivElement>;
  options?: MediaContainerOptions;
}) {
  const mediaContainerOptions = {
    ...defaultMediaContainerOptions,
    ...options,
  };

  const { userDataStreams, remoteDataStreams } = useMediaContext();
  const {
    mediasoupSocket,
    tableStaticContentSocket,
    tableSocket,
    liveTextEditingSocket,
    videoSocket,
  } = useSocketContext();
  const { tableId } = useUserInfoContext();
  const {
    sendGroupSignal,
    addGroupSignalListener,
    removeGroupSignalListener,
    addMediaPositioningSignalListener,
    removeMediaPositioningSignalListener,
  } = useSignalContext();

  const mediaIdRef = useRef(mediaId);

  const mediaContainerRef =
    externalMediaContainerRef ?? useRef<HTMLDivElement>(null);
  const subContainerRef =
    externalSubContainerRef ?? useRef<HTMLDivElement>(null);
  const behindEffectsContainerRef = useRef<HTMLDivElement>(null);
  const frontEffectsContainerRef = useRef<HTMLDivElement>(null);
  const panBtnRef = useRef<HTMLButtonElement>(null);
  const rotationBtnRef = useRef<HTMLButtonElement>(null);
  const scaleBtnRef = useRef<HTMLButtonElement>(null);
  const lowerControlsRef = useRef<HTMLDivElement>(null);
  const upperControlsRef = useRef<HTMLDivElement>(null);

  const [inMedia, setInMedia] = useState(false);
  const [fullscreen, setFullScreen] = useState(false);

  const leaveTimer = useRef<NodeJS.Timeout | undefined>(undefined);
  const movementTimeout = useRef<NodeJS.Timeout | undefined>(undefined);

  const [adjustingDimensions, setAdjustingDimensions] = useState(false);

  const state = useRef<TableContentStateTypes[]>(initState);

  const [_, setRerender] = useState(false);

  const positioningListeners = useRef<{
    [username: string]: {
      [instance: string]: () => void;
    };
  }>({});

  const aspectRatio = useRef<number | undefined>(undefined);

  const positioning =
    externalPositioning ??
    useRef<{
      position: { left: number; top: number };
      scale: { x: number; y: number };
      rotation: number;
    }>({
      position: { left: 32.5, top: 32.5 },
      scale: { x: 35, y: 35 },
      rotation: 0,
    });

  const [reactionsPanelActive, setReactionsPanelActive] = useState(false);

  const [selected, setSelected] = useState(false);

  const adjustmentButtonsActive = useRef(false);

  const fgContentAdjustmentController = useRef<FgContentAdjustmentController>(
    new FgContentAdjustmentController(
      bundleRef,
      positioning,
      setAdjustingDimensions,
      setRerender,
    ),
  );

  const lowerController = useRef(
    new LowerController(
      tableStaticContentSocket,
      liveTextEditingSocket,
      videoSocket,
      mediaIdRef,
      mediaInstanceId,
      kind,
      bundleRef,
      mediaContainerRef,
      panBtnRef,
      fgContentAdjustmentController,
      positioning,
      aspectRatio,
      setFullScreen,
      mediaContainerOptions,
      setReactionsPanelActive,
      behindEffectsContainerRef,
      frontEffectsContainerRef,
      tableSocket,
      state,
      setRerender,
    ),
  );

  const mediaContainerController = useRef(
    new MediaContainerController(
      tableId,
      mediaIdRef,
      mediaInstanceId,
      kind,
      getAspect,
      setPositioning,
      positioningListeners,
      aspectRatio,
      positioning,
      remoteDataStreams,
      mediaContainerRef,
      mediaContainerOptions,
      setInMedia,
      leaveTimer,
      movementTimeout,
      setRerender,
      tableStaticContentSocket,
      lowerController,
      fgContentAdjustmentController,
      bundleRef,
      sendGroupSignal,
      userDataStreams,
      adjustmentButtonsActive,
      setReactionsPanelActive,
    ),
  );

  useEffect(() => {
    mediaIdRef.current = mediaId;
  }, [mediaId]);

  useEffect(() => {
    state.current = initState;
    setRerender((prev) => !prev);
  }, [initState]);

  useEffect(() => {
    mediaContainerController.current.attachPositioningListeners();
  }, [JSON.stringify(remoteDataStreams.current)]);

  useEffect(() => {
    // Listen for messages on mediasoupSocket
    mediasoupSocket.current?.addMessageListener(
      mediaContainerController.current.handleMediasoupMessage,
    );
    tableSocket.current?.addMessageListener(
      mediaContainerController.current.handleTableMessage,
    );
    addGroupSignalListener(mediaContainerController.current.handleGroupSignal);
    addMediaPositioningSignalListener(
      mediaContainerController.current.handleMediaPositioningSignal,
    );

    document.addEventListener("keydown", lowerController.current.handleKeyDown);

    if (downloadingState !== "downloaded") {
      if (addDownloadListener)
        addDownloadListener(mediaContainerController.current.downloadListener);
    } else {
      if (getAspect) {
        aspectRatio.current = getAspect();
      }
    }

    document.addEventListener(
      "fullscreenchange",
      lowerController.current.handleFullScreenChange,
    );

    tableRef.current?.addEventListener(
      "scroll",
      mediaContainerController.current.handleTableScroll,
    );

    return () => {
      Object.values(positioningListeners.current).forEach((userListners) =>
        Object.values(userListners).forEach((removeListener) =>
          removeListener(),
        ),
      );
      positioningListeners.current = {};
      mediasoupSocket.current?.removeMessageListener(
        mediaContainerController.current.handleMediasoupMessage,
      );
      tableSocket.current?.removeMessageListener(
        mediaContainerController.current.handleTableMessage,
      );
      removeGroupSignalListener(
        mediaContainerController.current.handleGroupSignal,
      );
      removeMediaPositioningSignalListener(
        mediaContainerController.current.handleMediaPositioningSignal,
      );
      document.removeEventListener(
        "keydown",
        lowerController.current.handleKeyDown,
      );
      if (downloadingState !== "downloaded") {
        if (removeDownloadListener)
          removeDownloadListener(
            mediaContainerController.current.downloadListener,
          );
      }
      document.removeEventListener(
        "fullscreenchange",
        lowerController.current.handleFullScreenChange,
      );
      tableRef.current?.removeEventListener(
        "scroll",
        mediaContainerController.current.handleTableScroll,
      );
    };
  }, []);

  useEffect(() => {
    if (
      adjustingDimensions &&
      userDataStreams.current.positionScaleRotation?.readyState === "open"
    ) {
      userDataStreams.current.positionScaleRotation?.send(
        JSON.stringify({
          tableId: tableId.current,
          kind,
          mediaId: mediaIdRef.current,
          mediaInstanceId,
          positioning: positioning.current,
        }),
      );
      if (setPositioning) setPositioning(positioning.current);
    }
  }, [positioning.current]);

  useEffect(() => {
    if (!selected) return;

    const handleTableClick = (e: MouseEvent) => {
      if (
        tableTopRef.current?.contains(e.target as Node) &&
        !subContainerRef.current?.contains(e.target as Node) &&
        !rotationBtnRef.current?.contains(e.target as Node) &&
        !panBtnRef.current?.contains(e.target as Node) &&
        !scaleBtnRef.current?.contains(e.target as Node) &&
        !upperControlsRef.current?.contains(e.target as Node) &&
        !lowerControlsRef.current?.contains(e.target as Node) &&
        !mediaContainerRef.current?.contains(e.target as Node)
      ) {
        setSelected(false);
      }
    };

    document.addEventListener("pointerdown", handleTableClick);

    return () => {
      document.removeEventListener("pointerdown", handleTableClick);
    };
  }, [selected]);

  return (
    <motion.div
      ref={mediaContainerRef}
      id={`${mediaInstanceId}_media_container`}
      className={`media-container ${
        inMedia ||
        selected ||
        reactionsPanelActive ||
        inMediaVariables?.some(Boolean)
          ? "in-media"
          : ""
      } ${
        adjustingDimensions
          ? "adjusting-dimensions pointer-events-none"
          : "pointer-events-auto"
      } ${
        fullscreen ? "full-screen" : ""
      } ${backgroundMedia ? "pointer-events-none z-background-content" : "z-base-content"} ${className} absolute flex items-center justify-center`}
      style={
        backgroundMedia
          ? {
              left: "50%",
              top: "50%",
              width: (aspectRatio.current ?? 1) > 1 ? "" : "100%",
              height: (aspectRatio.current ?? 1) > 1 ? "100%" : "",
              aspectRatio: aspectRatio.current ?? 1,
              rotate: "0deg",
              transform: "translate(-50%, -50%) !important",
            }
          : {
              left: `${positioning.current.position.left}%`,
              top: `${positioning.current.position.top}%`,
              width: `${positioning.current.scale.x}%`,
              height: `${positioning.current.scale.y}%`,
              rotate: `${positioning.current.rotation}deg`,
              transformOrigin: "0% 0%",
            }
      }
      onPointerEnter={() =>
        mediaContainerController.current.handlePointerEnter(
          "main",
          mediaContainerRef,
        )
      }
      onPointerLeave={() =>
        mediaContainerController.current.handlePointerLeave(
          "main",
          mediaContainerRef,
        )
      }
      data-positioning={JSON.stringify(positioning.current)}
      variants={{
        init: {
          opacity: 0,
          scale: 0.8,
          transform: backgroundMedia ? "translate(-50%, -50%)" : "",
        },
        animate: {
          opacity: 1,
          scale: 1,
          transform: backgroundMedia ? "translate(-50%, -50%)" : "",
          transition: {
            scale: { type: "spring", stiffness: 100 },
          },
        },
      }}
      initial="init"
      animate="animate"
      exit="init"
      transition={{
        opacity: { duration: 0.001 },
        scale: { duration: 0.001 },
      }}
    >
      {!backgroundMedia && (
        <>
          {floatingContent &&
            floatingContent.map((item, index) => (
              <React.Fragment key={index}>{item}</React.Fragment>
            ))}
          {selected && !hideSelectedIndicator && (
            <FourCornersDecorator
              className="z-[100] stroke-fg-red-light"
              width={4}
            />
          )}
          {(selected || adjustmentButtonsActive.current) && (
            <AdjustmentButtons
              mediaContainerController={mediaContainerController}
              kind={kind}
              mediaIdRef={mediaIdRef}
              mediaInstanceId={mediaInstanceId}
              bundleRef={bundleRef}
              positioning={positioning}
              fgContentAdjustmentController={fgContentAdjustmentController}
              tableStaticContentSocket={tableStaticContentSocket}
              aspectRatio={aspectRatio}
              mediaContainerOptions={mediaContainerOptions}
              rotationBtnRef={rotationBtnRef}
              panBtnRef={panBtnRef}
              scaleBtnRef={scaleBtnRef}
            />
          )}
          {mediaContainerOptions.adjustmentAnimation && adjustingDimensions && (
            <>
              <div className="animated-border-box-glow"></div>
              <div className="animated-border-box"></div>
            </>
          )}
          {mediaContainerOptions.controlsPlacement === "outside" &&
            !fullscreen && (
              <>
                <UpperControls
                  upperControlsRef={upperControlsRef}
                  filename={filename}
                  reactionsPanelActive={reactionsPanelActive}
                  setReactionsPanelActive={setReactionsPanelActive}
                  lowerController={lowerController}
                  leftUpperControls={leftUpperControls}
                  rightUpperControls={rightUpperControls}
                  mediaContainerOptions={mediaContainerOptions}
                  fullscreen={fullscreen}
                  backgroundMedia={backgroundMedia}
                  state={state}
                />
                <LowerControls
                  lowerControlsRef={lowerControlsRef}
                  lowerController={lowerController}
                  externalRightLowerControlsRef={externalRightLowerControlsRef}
                  leftLowerControls={leftLowerControls}
                  rightLowerControls={rightLowerControls}
                  mediaContainerOptions={mediaContainerOptions}
                  preventLowerLabelsVariables={preventLowerLabelsVariables}
                  fullscreen={fullscreen}
                  backgroundMedia={backgroundMedia}
                />
              </>
            )}
          <div className="pointer-events-none absolute left-0 top-0 h-full w-full">
            <div
              ref={frontEffectsContainerRef}
              className="pointer-events-none relative z-[100] h-full w-full"
            />
          </div>
          <div className="pointer-events-none absolute left-0 top-0 h-full w-full">
            <div
              ref={behindEffectsContainerRef}
              className="pointer-events-none relative -z-[100] h-full w-full"
            />
          </div>
        </>
      )}
      <div
        ref={subContainerRef}
        className={`${backgroundMedia ? "" : "selectable"} sub-media-container pointer-events-none absolute flex h-full w-full items-center justify-center overflow-hidden rounded-md font-K2D text-fg-white`}
        data-selectable-type={kind}
        data-selectable-id={mediaInstanceId}
      >
        {media && media}
        {!backgroundMedia && (
          <>
            <AnimatePresence>
              {downloadingState === "downloading" && (
                <motion.div
                  key="loading-element"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="pointer-events-auto absolute left-0 top-0 z-[100] h-full w-full"
                >
                  <LoadingElement
                    className="h-full w-full"
                    pauseDownload={pauseDownload}
                    aspectRatio={aspectRatio}
                  />
                </motion.div>
              )}
            </AnimatePresence>
            {downloadingState === "failed" && (
              <DownloadFailed
                className="pointer-events-auto absolute left-0 top-0 z-[100] h-full w-full"
                onClick={retryDownload}
              />
            )}
            {downloadingState === "paused" && (
              <DownloadPaused
                className="pointer-events-auto absolute left-0 top-0 z-[100] h-full w-full"
                onClick={resumeDownload}
              />
            )}
            {popupElements &&
              popupElements.length > 0 &&
              popupElements.map((element, index) => (
                <React.Fragment key={index}>{element}</React.Fragment>
              ))}
            {(mediaContainerOptions.controlsPlacement === "inside" ||
              fullscreen ||
              backgroundMedia) && (
              <>
                <UpperControls
                  upperControlsRef={upperControlsRef}
                  filename={filename}
                  reactionsPanelActive={reactionsPanelActive}
                  setReactionsPanelActive={setReactionsPanelActive}
                  lowerController={lowerController}
                  leftUpperControls={leftUpperControls}
                  rightUpperControls={rightUpperControls}
                  mediaContainerOptions={mediaContainerOptions}
                  fullscreen={fullscreen}
                  backgroundMedia={backgroundMedia}
                  state={state}
                />
                <LowerControls
                  lowerControlsRef={lowerControlsRef}
                  lowerController={lowerController}
                  externalRightLowerControlsRef={externalRightLowerControlsRef}
                  leftLowerControls={leftLowerControls}
                  rightLowerControls={rightLowerControls}
                  mediaContainerOptions={mediaContainerOptions}
                  preventLowerLabelsVariables={preventLowerLabelsVariables}
                  fullscreen={fullscreen}
                  backgroundMedia={backgroundMedia}
                />
              </>
            )}
            {(mediaContainerOptions.gradient || fullscreen) && <Gradient />}
            {!selected && (
              <div
                className="pointer-events-auto absolute inset-0 bg-opacity-15"
                onClick={() => setSelected(true)}
              ></div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
