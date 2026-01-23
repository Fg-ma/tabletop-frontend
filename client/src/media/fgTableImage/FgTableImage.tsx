import React, { useEffect, useRef, useState } from "react";
import { useMediaContext } from "../../context/mediaContext/MediaContext";
import { useEffectsContext } from "../../context/effectsContext/EffectsContext";
import { useSocketContext } from "../../context/socketContext/SocketContext";
import { useSignalContext } from "../../context/signalContext/SignalContext";
import { useToolsContext } from "../../context/toolsContext/ToolsContext";
import ImageController from "./lib/ImageController";
import LowerImageController from "./lib/lowerImageControls/LowerImageController";
import { ActivePages, defaultActiveSettingsPages } from "./lib/typeConstant";
import FgMediaContainer from "../fgMediaContainer/FgMediaContainer";
import ImageEffectsButton from "./lib/lowerImageControls/imageEffectsButton/ImageEffectsButton";
import ImageEffectsSection from "./lib/imageEffectsSection/ImageEffectsSection";
import DownloadButton from "./lib/lowerImageControls/downloadButton/DownloadButton";
import SettingsButton from "./lib/lowerImageControls/settingsButton/SettingsButton";
import DownloadRecordingButton from "./lib/lowerImageControls/downloadButton/DownloadRecordingButton";
import FgPortal from "../../elements/fgPortal/FgPortal";
import TUI from "../../TUI/TUI";
import CautionTapeDecorator from "../../elements/decorators/CautionTapeDecorator";
import "./lib/fgImageStyles.css";

export default function FgTableImage({
  tableTopRef,
  imageInstanceId,
  bundleRef,
  tableRef,
}: {
  tableTopRef: React.RefObject<HTMLDivElement>;
  imageInstanceId: string;
  bundleRef: React.RefObject<HTMLDivElement>;
  tableRef: React.RefObject<HTMLDivElement>;
}) {
  const { staticContentMedia } = useMediaContext();
  const { staticContentEffects, staticContentEffectsStyles } =
    useEffectsContext();
  const { tableStaticContentSocket } = useSocketContext();
  const { sendGroupSignal, sendGeneralSignal } = useSignalContext();
  const { uploader } = useToolsContext();

  const imageMediaInstance =
    staticContentMedia.current.image.tableInstances[imageInstanceId];

  const [imageEffectsActive, setImageEffectsActive] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const positioning = useRef<{
    position: { left: number; top: number };
    scale: { x: number; y: number };
    rotation: number;
  }>(imageMediaInstance.getPositioning());

  const imageContainerRef = useRef<HTMLDivElement>(null);
  const subContainerRef = useRef<HTMLDivElement>(null);
  const rightLowerImageControlsRef = useRef<HTMLDivElement>(null);

  const tintColor = useRef(
    staticContentEffectsStyles.current.image[imageInstanceId]?.tint?.color ??
      "",
  );

  const [_, setRerender] = useState(false);

  const [settingsActive, setSettingsActive] = useState(false);
  const [activePages, setActivePages] = useState<ActivePages>(
    defaultActiveSettingsPages,
  );

  const recording = useRef(false);
  const downloadRecordingReady = useRef(false);

  const lowerImageController = useRef(
    new LowerImageController(
      imageInstanceId,
      imageMediaInstance,
      imageContainerRef,
      setImageEffectsActive,
      tintColor,
      staticContentEffects,
      staticContentEffectsStyles,
      setSettingsActive,
      recording,
      downloadRecordingReady,
      setRerender,
      tableStaticContentSocket,
      sendGroupSignal,
      sendGeneralSignal,
      setIsEditing,
    ),
  );

  const imageController = useRef(
    new ImageController(
      imageInstanceId,
      imageMediaInstance,
      setSettingsActive,
      staticContentEffects,
      staticContentEffectsStyles,
      tintColor,
      setRerender,
      subContainerRef,
      positioning,
    ),
  );

  useEffect(() => {
    if (imageMediaInstance.instanceCanvas) {
      subContainerRef.current?.appendChild(imageMediaInstance.instanceCanvas);

      positioning.current.scale = {
        x: imageMediaInstance.imageMedia.aspect
          ? positioning.current.scale.y * imageMediaInstance.imageMedia.aspect
          : positioning.current.scale.x,
        y: positioning.current.scale.y,
      };

      setRerender((prev) => !prev);
    }
    imageMediaInstance.imageMedia.addImageListener(
      imageController.current.handleImageMessages,
    );
    imageMediaInstance.addImageInstanceListener(
      imageController.current.handleImageInstanceMessages,
    );

    document.addEventListener(
      "keydown",
      lowerImageController.current.handleKeyDown,
    );

    tableRef.current?.addEventListener(
      "scroll",
      imageController.current.handleTableScroll,
    );

    return () => {
      imageMediaInstance.imageMedia.removeImageListener(
        imageController.current.handleImageMessages,
      );
      imageMediaInstance.removeImageInstanceListener(
        imageController.current.handleImageInstanceMessages,
      );
      document.removeEventListener(
        "keydown",
        lowerImageController.current.handleKeyDown,
      );
      tableRef.current?.removeEventListener(
        "scroll",
        imageController.current.handleTableScroll,
      );
    };
  }, []);

  useEffect(() => {
    setActivePages(defaultActiveSettingsPages);
  }, [settingsActive]);

  useEffect(() => {
    if (
      imageMediaInstance.settings.downloadType.value !== "record" &&
      recording.current
    ) {
      imageMediaInstance.babylonScene?.stopRecording();
      downloadRecordingReady.current = true;
      recording.current = false;
    }
  }, [imageMediaInstance.settings.downloadType.value]);

  useEffect(() => {
    tableStaticContentSocket.current?.addMessageListener(
      imageController.current.handleTableStaticContentMessage,
    );

    return () =>
      tableStaticContentSocket.current?.removeMessageListener(
        imageController.current.handleTableStaticContentMessage,
      );
  }, [tableStaticContentSocket.current]);

  return (
    <>
      <FgMediaContainer
        tableRef={tableRef}
        tableTopRef={tableTopRef}
        filename={imageMediaInstance.imageMedia.filename}
        pauseDownload={imageMediaInstance.imageMedia.downloader?.pause}
        resumeDownload={imageMediaInstance.imageMedia.downloader?.resume}
        retryDownload={imageMediaInstance.imageMedia.retryDownload}
        downloadingState={imageMediaInstance.imageMedia.loadingState}
        addDownloadListener={
          imageMediaInstance.imageMedia.loadingState !== "downloaded"
            ? imageMediaInstance.imageMedia.addImageListener
            : undefined
        }
        removeDownloadListener={
          imageMediaInstance.imageMedia.loadingState !== "downloaded"
            ? imageMediaInstance.imageMedia.removeImageListener
            : undefined
        }
        floatingContent={[
          imageMediaInstance.imageMedia.loadingState === "reuploading" ? (
            <CautionTapeDecorator
              className="z-[100] fill-fg-red-light stroke-fg-red-light"
              width={4}
            />
          ) : null,
        ]}
        getAspect={imageMediaInstance.getAspect}
        setPositioning={imageMediaInstance.setPositioning}
        mediaId={imageMediaInstance.imageMedia.imageId}
        mediaInstanceId={imageInstanceId}
        kind="image"
        initState={imageMediaInstance.imageMedia.state}
        bundleRef={bundleRef}
        backgroundMedia={imageMediaInstance.settings.background.value}
        className="image-container"
        popupElements={[
          imageEffectsActive ? (
            <ImageEffectsSection
              imageInstanceId={imageInstanceId}
              lowerImageController={lowerImageController}
              tintColor={tintColor}
              imageMediaInstance={imageMediaInstance}
              imageContainerRef={imageContainerRef}
            />
          ) : null,
        ]}
        leftLowerControls={[]}
        rightLowerControls={[
          <SettingsButton
            imageMediaInstance={imageMediaInstance}
            effectsActive={imageEffectsActive}
            containerRef={imageContainerRef}
            settingsActive={settingsActive}
            setSettingsActive={setSettingsActive}
            activePages={activePages}
            setActivePages={setActivePages}
            scrollingContainerRef={rightLowerImageControlsRef}
            lowerImageController={lowerImageController}
          />,
          imageMediaInstance.imageMedia.loadingState === "downloaded" && (
            <DownloadButton
              imageMediaInstance={imageMediaInstance}
              recording={recording}
              lowerImageController={lowerImageController}
              imageEffectsActive={imageEffectsActive}
              settingsActive={settingsActive}
              scrollingContainerRef={rightLowerImageControlsRef}
            />
          ),
          imageMediaInstance.settings.downloadType.value === "record" &&
          downloadRecordingReady.current ? (
            <DownloadRecordingButton
              lowerImageController={lowerImageController}
              imageEffectsActive={imageEffectsActive}
              settingsActive={settingsActive}
              scrollingContainerRef={rightLowerImageControlsRef}
            />
          ) : null,
          <ImageEffectsButton
            lowerImageController={lowerImageController}
            imageEffectsActive={imageEffectsActive}
            settingsActive={settingsActive}
            scrollingContainerRef={rightLowerImageControlsRef}
          />,
        ]}
        inMediaVariables={[imageEffectsActive, settingsActive]}
        preventLowerLabelsVariables={[settingsActive, imageEffectsActive]}
        externalPositioning={positioning}
        externalMediaContainerRef={imageContainerRef}
        externalSubContainerRef={subContainerRef}
        externalRightLowerControlsRef={rightLowerImageControlsRef}
      />
      {isEditing && imageMediaInstance.imageMedia.blobURL && (
        <FgPortal
          type="staticTopDomain"
          top={0}
          left={0}
          zValue={490000}
          className="h-full w-full"
          content={
            <TUI
              initialUrl={imageMediaInstance.imageMedia.blobURL}
              initialFilename={imageMediaInstance.imageMedia.filename}
              closeCallback={() => {
                setIsEditing(false);
              }}
              confirmCallback={(file) => {
                setIsEditing(false);

                tableStaticContentSocket.current?.signalReuploadStart(
                  "image",
                  imageMediaInstance.imageMedia.imageId,
                );

                uploader.current?.reuploadTableContent(
                  file,
                  imageMediaInstance.imageMedia.imageId,
                );
              }}
            />
          }
          options={{ animate: false }}
        />
      )}
    </>
  );
}
