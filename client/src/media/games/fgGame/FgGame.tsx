import React, { useState, useRef, useEffect } from "react";
import { Transition, Variants, motion } from "framer-motion";
import { useMediaContext } from "../../../context/mediaContext/MediaContext";
import { useSocketContext } from "../../../context/socketContext/SocketContext";
import { useUserInfoContext } from "../../../context/userInfoContext/UserInfoContext";
import { useSignalContext } from "../../../context/signalContext/SignalContext";
import FourCornersDecorator from "../../../elements/decorators/FourCornersDecorator";
import FgContentAdjustmentController from "../../../elements/fgAdjustmentElements/lib/FgContentAdjustmentControls";
import FgGameController from "./lib/FgGameController";
import FgGameAdjustmentButtons from "./lib/FgGameAdjustmentButtons";
import ControlButtons from "./lib/ControlButtons";
import EndGameButton from "./lib/EndGameButton";
import ReactButton from "../../../elements/reactButton/ReactButton";
import { GameTypes } from "../../../../../universal/contentTypeConstant";
import GameFunctions from "./lib/GameFunctions";
import "./lib/fgGame.css";

const GameTransition: Transition = {
  transition: {
    opacity: { duration: 0.15 },
  },
};

const GameVar: Variants = {
  init: { opacity: 0, scale: 0.8 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      scale: { type: "spring", stiffness: 100 },
      backgroundColor: { duration: 0.3, ease: "linear" },
    },
  },
};

export default function FgGame({
  tableTopRef,
  externalHideControls,
  gameId,
  gameType,
  gameStarted,
  sharedBundleRef,
  content,
  gameFunctionsSection,
  players,
  resizeCallback,
  startGameFunction,
  joinGameFunction,
  leaveGameFunction,
  closeGameFunction,
  popupRefs,
  initPositioning,
  setPositioning,
  contentRef,
}: {
  tableTopRef: React.RefObject<HTMLDivElement>;
  externalHideControls?: boolean;
  gameId: string;
  gameType: GameTypes;
  gameStarted: boolean;
  sharedBundleRef: React.RefObject<HTMLDivElement>;
  content?: React.ReactNode;
  gameFunctionsSection?: React.ReactNode[];
  players?: {
    user?: {
      primaryColor?: string;
      secondaryColor?: string;
      shadowColor?: { r: number; g: number; b: number };
    };
    players: {
      primaryColor?: string;
      secondaryColor?: string;
      shadowColor?: { r: number; g: number; b: number };
    }[];
  };
  resizeCallback?: () => void;
  startGameFunction?: () => void;
  joinGameFunction?: () => void;
  leaveGameFunction?: () => void;
  closeGameFunction?: () => void;
  popupRefs?: React.RefObject<HTMLElement>[];
  initPositioning: {
    position: { left: number; top: number };
    scale: { x: number; y: number };
    rotation: number;
  };
  setPositioning?: (positioning: {
    position: { left: number; top: number };
    scale: { x: number; y: number };
    rotation: number;
  }) => void;
  contentRef?: React.RefObject<HTMLDivElement>;
}) {
  const { tableId } = useUserInfoContext();
  const { userDataStreams, remoteDataStreams } = useMediaContext();
  const { mediasoupSocket, tableSocket } = useSocketContext();
  const { addGroupSignalListener, removeGroupSignalListener } =
    useSignalContext();

  const [_, setRerender] = useState(false);

  const positioningListeners = useRef<{
    [username: string]: {
      [instance: string]: () => void;
    };
  }>({});
  const positioning = useRef<{
    position: { left: number; top: number };
    scale: { x: number; y: number };
    rotation: number;
  }>(
    initPositioning
      ? initPositioning
      : {
          position: { left: 32.5, top: 32.5 },
          scale: { x: 35, y: 35 },
          rotation: 0,
        },
  );
  const [hideControls, setHideControls] = useState(true);
  const [adjustingDimensions, setAdjustingDimensions] = useState(false);
  const [reactionsPanelActive, setReactionsPanelActive] = useState(false);
  const gameRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const reactBtnRef = useRef<HTMLDivElement>(null);
  const endGameBtnRef = useRef<HTMLButtonElement>(null);
  const panBtnRef = useRef<HTMLButtonElement>(null);
  const rotationBtnRef = useRef<HTMLButtonElement>(null);
  const scaleBtnRef = useRef<HTMLButtonElement>(null);
  const isResizing = useRef(false);
  const resizingDirection = useRef<"se" | "sw" | "nw" | "ne" | undefined>(
    undefined,
  );
  const leaveTimer = useRef<NodeJS.Timeout | undefined>(undefined);
  const movementTimeout = useRef<NodeJS.Timeout | undefined>(undefined);

  const behindEffectsContainerRef = useRef<HTMLDivElement>(null);
  const frontEffectsContainerRef = useRef<HTMLDivElement>(null);

  const [selected, setSelected] = useState(false);

  const adjustmentButtonsActive = useRef(false);

  const fgContentAdjustmentController = useRef(
    new FgContentAdjustmentController(
      sharedBundleRef,
      positioning,
      setAdjustingDimensions,
      setRerender,
    ),
  );

  const fgGameController = new FgGameController(
    tableId,
    gameId,
    hideControls,
    gameStarted,
    setHideControls,
    leaveTimer,
    movementTimeout,
    gameRef,
    closeGameFunction,
    startGameFunction,
    joinGameFunction,
    leaveGameFunction,
    remoteDataStreams,
    positioningListeners,
    positioning,
    setRerender,
    sharedBundleRef,
    panBtnRef,
    fgContentAdjustmentController,
    popupRefs,
    behindEffectsContainerRef,
    frontEffectsContainerRef,
    tableSocket,
    adjustmentButtonsActive,
  );

  useEffect(() => {
    if (isResizing.current && resizingDirection.current) {
      document.body.style.cursor = `${resizingDirection.current}-resize`;
    } else {
      document.body.style.cursor = "";
    }
  }, [isResizing.current]);

  useEffect(() => {
    if (resizeCallback) {
      resizeCallback();
    }
  }, [positioning.current.scale]);

  useEffect(() => {
    fgGameController.attachPositioningListeners();
  }, [JSON.stringify(remoteDataStreams.current)]);

  useEffect(() => {
    mediasoupSocket.current?.addMessageListener(fgGameController.handleMessage);
    tableSocket.current?.addMessageListener(
      fgGameController.handleTableMessage,
    );
    addGroupSignalListener(fgGameController.handleSignal);

    return () => {
      Object.values(positioningListeners.current).forEach((userListners) =>
        Object.values(userListners).forEach((removeListener) =>
          removeListener(),
        ),
      );
      mediasoupSocket.current?.removeMessageListener(
        fgGameController.handleMessage,
      );
      tableSocket.current?.removeMessageListener(
        fgGameController.handleTableMessage,
      );
      removeGroupSignalListener(fgGameController.handleSignal);
    };
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", fgGameController.handleKeyDown);

    return () => {
      document.removeEventListener("keydown", fgGameController.handleKeyDown);
    };
  }, [hideControls]);

  useEffect(() => {
    if (popupRefs) {
      for (const ref of popupRefs) {
        if (!ref.current) {
          continue;
        }

        ref.current.addEventListener("pointerenter", () =>
          fgGameController.handlePointerEnter("popup", ref),
        );
        ref.current.addEventListener("pointerleave", () =>
          fgGameController.handlePointerLeave("popup", ref),
        );
      }
    }

    return () => {
      if (popupRefs) {
        for (const ref of popupRefs) {
          if (!ref.current) {
            continue;
          }

          ref.current.removeEventListener("pointerenter", () =>
            fgGameController.handlePointerEnter("popup", ref),
          );
          ref.current.removeEventListener("pointerleave", () =>
            fgGameController.handlePointerLeave("popup", ref),
          );
        }
      }
    };
  }, [popupRefs]);

  useEffect(() => {
    if (
      adjustingDimensions &&
      userDataStreams.current.positionScaleRotation?.readyState === "open"
    ) {
      userDataStreams.current.positionScaleRotation?.send(
        JSON.stringify({
          tableId: tableId.current,
          gameId,
          type: "games",
          positioning: positioning.current,
        }),
      );
    }
    if (setPositioning) setPositioning(positioning.current);
  }, [positioning.current]);

  useEffect(() => {
    if (!selected) return;

    const handleTableClick = (e: MouseEvent) => {
      if (
        tableTopRef.current?.contains(e.target as Node) &&
        !rotationBtnRef.current?.contains(e.target as Node) &&
        !panBtnRef.current?.contains(e.target as Node) &&
        !scaleBtnRef.current?.contains(e.target as Node) &&
        !gameRef.current?.contains(e.target as Node)
      ) {
        setSelected(false);
      }
    };

    document.addEventListener("pointerdown", handleTableClick);

    return () => {
      document.removeEventListener("pointerdown", handleTableClick);
    };
  }, [selected]);

  useEffect(() => {
    if (contentRef) {
      contentRef.current?.addEventListener("pointerenter", () =>
        fgGameController.handlePointerEnter("main", contentRef),
      );
      contentRef.current?.addEventListener("pointerleave", () =>
        fgGameController.handlePointerLeave("main", contentRef),
      );
    }
    endGameBtnRef.current?.addEventListener("pointerenter", () =>
      fgGameController.handlePointerEnter("buttons", endGameBtnRef),
    );
    endGameBtnRef.current?.addEventListener("pointerleave", () =>
      fgGameController.handlePointerLeave("buttons", endGameBtnRef),
    );

    return () => {
      if (contentRef) {
        contentRef.current?.removeEventListener("pointerenter", () =>
          fgGameController.handlePointerEnter("main", contentRef),
        );
        contentRef.current?.removeEventListener("pointerleave", () =>
          fgGameController.handlePointerLeave("main", contentRef),
        );
      }
      endGameBtnRef.current?.removeEventListener("pointerenter", () =>
        fgGameController.handlePointerEnter("buttons", endGameBtnRef),
      );
      endGameBtnRef.current?.removeEventListener("pointerleave", () =>
        fgGameController.handlePointerLeave("buttons", endGameBtnRef),
      );
    };
  }, [contentRef, endGameBtnRef]);

  return (
    <motion.div
      ref={gameRef}
      className={`fg-game ${
        hideControls && !reactionsPanelActive ? "z-[5] cursor-none" : "z-[49]"
      } ${
        (externalHideControls === undefined || externalHideControls) &&
        hideControls &&
        !reactionsPanelActive &&
        !adjustingDimensions &&
        (!selected || gameStarted)
          ? "hide-controls"
          : ""
      } pointer-events-auto absolute z-base-content rounded`}
      style={{
        left: `${positioning.current.position.left}%`,
        top: `${positioning.current.position.top}%`,
        width: `${Math.max(
          positioning.current.scale.x,
          positioning.current.scale.y,
        )}%`,
        height: `${Math.max(
          positioning.current.scale.x,
          positioning.current.scale.y,
        )}%`,
        rotate: `${positioning.current.rotation}deg`,
        transformOrigin: "0% 0%",
      }}
      variants={GameVar}
      initial="init"
      animate="animate"
      exit="init"
      transition={GameTransition}
    >
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
      <GameFunctions
        tableTopRef={tableTopRef}
        gameFunctionsSection={gameFunctionsSection}
        players={players}
        positioning={positioning}
        fgGameController={fgGameController}
      />
      <div
        className={`${(positioning.current.scale.x / 100) * (tableTopRef.current?.clientWidth ?? 1) <= 140 ? "justify-end" : "justify-between overflow-x-auto"} fg-game-top-controls-section hide-scroll-bar absolute bottom-full left-0 flex h-[15%] max-h-16 min-h-10 w-full items-center space-x-2`}
      >
        <ControlButtons
          tableTopRef={tableTopRef}
          startGameFunction={startGameFunction}
          joinGameFunction={joinGameFunction}
          leaveGameFunction={leaveGameFunction}
          userPlaying={players?.user === undefined ? false : true}
          playerCount={
            (players?.players.length ?? 0) +
            (players?.user === undefined ? 0 : 1)
          }
          positioning={positioning}
          fgGameController={fgGameController}
        />
        {(positioning.current.scale.x / 100) *
          (tableTopRef.current?.clientWidth ?? 1) >
          94 && (
          <div className="flex h-full w-max items-end justify-center">
            <div
              ref={reactBtnRef}
              className="aspect-square h-[75%] pb-1"
              onPointerEnter={() =>
                fgGameController.handlePointerEnter("buttons", reactBtnRef)
              }
              onPointerLeave={() =>
                fgGameController.handlePointerLeave("buttons", reactBtnRef)
              }
            >
              <ReactButton
                reactionsPanelActive={reactionsPanelActive}
                setReactionsPanelActive={setReactionsPanelActive}
                clickFunction={() => setReactionsPanelActive((prev) => !prev)}
                reactionFunction={
                  fgGameController.reactController.handleReaction
                }
              />
            </div>
            <EndGameButton
              externalRef={endGameBtnRef}
              closeGameFunction={closeGameFunction}
            />
          </div>
        )}
      </div>
      {content}
      {selected && !gameStarted && (
        <FourCornersDecorator
          className="!-left-1 !-top-1 z-[100] stroke-fg-red-light"
          width={4}
        />
      )}
      {(selected || adjustmentButtonsActive.current) && (
        <FgGameAdjustmentButtons
          fgGameController={fgGameController}
          gameId={gameId}
          gameType={gameType}
          sharedBundleRef={sharedBundleRef}
          fgContentAdjustmentController={fgContentAdjustmentController}
          positioning={positioning}
          rotationBtnRef={rotationBtnRef}
          panBtnRef={panBtnRef}
          scaleBtnRef={scaleBtnRef}
        />
      )}
      {!selected && (
        <div
          ref={overlayRef}
          onPointerEnter={() =>
            fgGameController.handlePointerEnter("main", overlayRef)
          }
          onPointerLeave={() =>
            fgGameController.handlePointerLeave("main", overlayRef)
          }
          className="pointer-events-auto absolute inset-0 bg-opacity-15"
          onClick={() => setSelected(true)}
        ></div>
      )}
    </motion.div>
  );
}
