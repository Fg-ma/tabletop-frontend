import { IncomingMediasoupMessages } from "../../../../serverControllers/mediasoupServer/lib/typeConstant";
import MediasoupSocketController from "../../../../serverControllers/mediasoupServer/MediasoupSocketController";
import ReactController from "../../../../elements/reactButton/lib/ReactController";
import { RemoteDataStreamsType } from "../../../../context/mediaContext/lib/typeConstant";
import FgContentAdjustmentController from "../../../../elements/fgAdjustmentElements/lib/FgContentAdjustmentControls";
import TableSocketController from "../../../../serverControllers/tableServer/TableSocketController";
import {
  IncomingTableMessages,
  onReactionOccurredType,
} from "../../../../serverControllers/tableServer/lib/typeConstant";
import {
  GroupSignals,
  onGroupDeleteType,
  onGroupDragEndType,
  onGroupDragStartType,
  onGroupDragType,
} from "../../../../context/signalContext/lib/typeConstant";

class FgGameController {
  reactController: ReactController;
  groupStartDragPosition: { x: number; y: number } | undefined;
  savedMediaPosition: { top: number; left: number } | undefined;

  hoveringOver = {
    main: false,
    pan: false,
    scale: false,
    rotate: false,
    popup: false,
    buttons: false,
  };

  constructor(
    private tableId: React.MutableRefObject<string>,
    private gameId: string,
    private hideControls: boolean,
    private gameStarted: boolean,
    private setHideControls: React.Dispatch<React.SetStateAction<boolean>>,
    private leaveTimer: React.MutableRefObject<NodeJS.Timeout | undefined>,
    private movementTimeout: React.MutableRefObject<NodeJS.Timeout | undefined>,
    private gameRef: React.RefObject<HTMLDivElement>,
    private closeGameFunction: (() => void) | undefined,
    private startGameFunction: (() => void) | undefined,
    private joinGameFunction: (() => void) | undefined,
    private leaveGameFunction: (() => void) | undefined,
    private remoteDataStreams: React.MutableRefObject<RemoteDataStreamsType>,
    private positioningListeners: React.MutableRefObject<{
      [username: string]: {
        [instance: string]: () => void;
      };
    }>,
    private positioning: React.MutableRefObject<{
      position: {
        left: number;
        top: number;
      };
      scale: {
        x: number;
        y: number;
      };
      rotation: number;
    }>,
    private setRerender: React.Dispatch<React.SetStateAction<boolean>>,
    private sharedBundleRef: React.RefObject<HTMLDivElement>,
    private panBtnRef: React.RefObject<HTMLButtonElement>,
    private fgContentAdjustmentController: React.MutableRefObject<FgContentAdjustmentController | null>,
    private popupRefs: React.RefObject<HTMLElement>[] | undefined,
    private behindEffectsContainerRef: React.RefObject<HTMLDivElement>,
    private frontEffectsContainerRef: React.RefObject<HTMLDivElement>,
    private tableSocket: React.MutableRefObject<
      TableSocketController | undefined
    >,
    private adjustmentButtonsActive: React.MutableRefObject<boolean>,
  ) {
    this.reactController = new ReactController(
      this.gameId,
      undefined,
      "games",
      this.behindEffectsContainerRef,
      this.frontEffectsContainerRef,
      this.tableSocket,
    );
  }

  handleKeyDown = (event: KeyboardEvent) => {
    const tagName = (event.target as HTMLElement).tagName.toLowerCase();
    if (this.hideControls || tagName === "input" || tagName === "textarea")
      return;

    switch (event.key.toLowerCase()) {
      case "p":
        if (this.startGameFunction) {
          this.startGameFunction();
        }
        break;
      case "l":
        if (this.leaveGameFunction) {
          this.leaveGameFunction();
        }
        break;
      case "j":
        if (this.joinGameFunction) {
          this.joinGameFunction();
        }
        break;
      case "x":
        if (this.closeGameFunction) {
          this.closeGameFunction();
        }
        break;
      case "delete":
        if (this.closeGameFunction) {
          this.closeGameFunction();
        }
        break;
      case "escape":
        if (this.closeGameFunction) {
          this.closeGameFunction();
        }
        break;
      case "y":
        this.fgContentAdjustmentController.current?.adjustmentBtnPointerDownFunction(
          "scale",
        );
        document.addEventListener("pointermove", this.scaleFuntion);
        document.addEventListener("pointerdown", this.scaleFunctionEnd);
        break;
      case "g":
        this.fgContentAdjustmentController.current?.adjustmentBtnPointerDownFunction(
          "position",
          { rotationPointPlacement: "topLeft" },
        );
        document.addEventListener("pointermove", this.moveFunction);
        document.addEventListener("pointerdown", this.moveFunctionEnd);
        break;
      case "r":
        this.fgContentAdjustmentController.current?.adjustmentBtnPointerDownFunction(
          "rotation",
        );
        document.addEventListener("pointermove", this.rotateFunction);
        document.addEventListener("pointerdown", this.rotateFunctionEnd);
        break;
      default:
        break;
    }
  };

  scaleFunctionEnd = () => {
    this.fgContentAdjustmentController.current?.adjustmentBtnPointerUpFunction();
    document.removeEventListener("pointermove", this.scaleFuntion);
    document.removeEventListener("pointerdown", this.scaleFunctionEnd);
  };

  rotateFunctionEnd = () => {
    this.fgContentAdjustmentController.current?.adjustmentBtnPointerUpFunction();
    document.removeEventListener("pointermove", this.rotateFunction);
    document.removeEventListener("pointerdown", this.rotateFunctionEnd);
  };

  moveFunctionEnd = () => {
    this.fgContentAdjustmentController.current?.adjustmentBtnPointerUpFunction();
    document.removeEventListener("pointermove", this.moveFunction);
    document.removeEventListener("pointerdown", this.moveFunctionEnd);
  };

  moveFunction = (event: PointerEvent) => {
    if (!this.sharedBundleRef.current) {
      return;
    }

    const angle =
      2 * Math.PI - this.positioning.current.rotation * (Math.PI / 180);

    const pixelScale = {
      x:
        (this.positioning.current.scale.x / 100) *
        this.sharedBundleRef.current.clientWidth,
      y:
        (this.positioning.current.scale.y / 100) *
        this.sharedBundleRef.current.clientHeight,
    };

    const rect = this.sharedBundleRef.current.getBoundingClientRect();

    const buttonWidth = (this.panBtnRef.current?.clientWidth ?? 0) / 2;

    this.fgContentAdjustmentController.current?.movementDragFunction(
      {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      },
      {
        x:
          -buttonWidth * Math.cos(angle) -
          pixelScale.x * Math.cos(angle) -
          (pixelScale.y / 2) * Math.cos(Math.PI / 2 - angle),
        y:
          buttonWidth * Math.sin(angle) +
          pixelScale.x * Math.sin(angle) -
          (pixelScale.y / 2) * Math.sin(Math.PI / 2 - angle),
      },
      {
        x:
          (this.positioning.current.position.left / 100) *
          this.sharedBundleRef.current.clientWidth,
        y:
          (this.positioning.current.position.top / 100) *
          this.sharedBundleRef.current.clientHeight,
      },
    );
    this.fgContentAdjustmentController.current?.adjustmentBtnPointerDownFunction();
  };

  scaleFuntion = (event: PointerEvent) => {
    if (!this.sharedBundleRef.current) {
      return;
    }

    const rect = this.sharedBundleRef.current.getBoundingClientRect();

    const referencePoint = {
      x:
        (this.positioning.current.position.left / 100) *
        this.sharedBundleRef.current.clientWidth,
      y:
        (this.positioning.current.position.top / 100) *
        this.sharedBundleRef.current.clientHeight,
    };

    this.fgContentAdjustmentController.current?.scaleDragFunction(
      "square",
      {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      },
      referencePoint,
      referencePoint,
    );
    this.fgContentAdjustmentController.current?.adjustmentBtnPointerDownFunction();
  };

  rotateFunction = (event: PointerEvent) => {
    if (!this.sharedBundleRef.current) {
      return;
    }

    const box = this.sharedBundleRef.current.getBoundingClientRect();

    this.fgContentAdjustmentController.current?.rotateDragFunction(event, {
      x:
        (this.positioning.current.position.left / 100) *
          this.sharedBundleRef.current.clientWidth +
        box.left,
      y:
        (this.positioning.current.position.top / 100) *
          this.sharedBundleRef.current.clientHeight +
        box.top,
    });
    this.fgContentAdjustmentController.current?.adjustmentBtnPointerDownFunction();
  };

  attachPositioningListeners = () => {
    for (const remoteUsername in this.remoteDataStreams.current) {
      const remoteUserStreams = this.remoteDataStreams.current[remoteUsername];
      for (const remoteInstance in remoteUserStreams) {
        const stream = remoteUserStreams[remoteInstance].positionScaleRotation;
        if (
          stream &&
          (!this.positioningListeners.current[remoteUsername] ||
            !this.positioningListeners.current[remoteUsername][remoteInstance])
        ) {
          const handleMessage = (message: string) => {
            const data = JSON.parse(message);
            if (
              data.tableId === this.tableId.current &&
              data.gameId === this.gameId &&
              data.type === "games"
            ) {
              this.positioning.current = data.positioning;
              this.setRerender((prev) => !prev);
            }
          };

          stream.on("message", handleMessage);

          // Store cleanup function
          if (!this.positioningListeners.current[remoteUsername]) {
            this.positioningListeners.current[remoteUsername] = {};
          }
          this.positioningListeners.current[remoteUsername][remoteInstance] =
            () => stream.off("message", handleMessage);
        }
      }
    }
  };

  handleMessage = (event: IncomingMediasoupMessages) => {
    switch (event.type) {
      case "newConsumerWasCreated":
        this.attachPositioningListeners();
        break;
      default:
        break;
    }
  };

  handlePointerLeave = (
    type: "main" | "scale" | "pan" | "rotate" | "popup" | "buttons",
    ref: React.RefObject<HTMLDivElement | HTMLElement | HTMLButtonElement>,
  ) => {
    this.hoveringOver[type] = false;

    ref.current?.removeEventListener("pointermove", (e) =>
      this.handlePointerMove(e, type),
    );

    if (this.movementTimeout.current) {
      clearTimeout(this.movementTimeout.current);
      this.movementTimeout.current = undefined;
    }

    if (
      !Object.values(this.hoveringOver).some((val) => val) &&
      !this.leaveTimer.current
    ) {
      this.leaveTimer.current = setTimeout(() => {
        clearTimeout(this.leaveTimer.current);
        this.leaveTimer.current = undefined;

        this.setHideControls(true);

        if (this.popupRefs) {
          this.popupRefs.map((ref) => {
            if (!ref.current?.classList.contains("hide-controls"))
              ref.current?.classList.add("hide-controls");
          });
        }
      }, 1250);
    }
  };

  handlePointerEnter = (
    type: "main" | "scale" | "pan" | "rotate" | "popup" | "buttons",
    ref: React.RefObject<HTMLDivElement | HTMLElement | HTMLButtonElement>,
  ) => {
    this.hoveringOver[type] = true;

    this.setHideControls(false);

    ref.current?.addEventListener("pointermove", (e) =>
      this.handlePointerMove(e, type),
    );

    if (this.popupRefs) {
      this.popupRefs.map((ref) =>
        ref.current?.classList.remove("hide-controls"),
      );
    }

    if (this.leaveTimer.current) {
      clearTimeout(this.leaveTimer.current);
      this.leaveTimer.current = undefined;
    }
  };

  handlePointerMove = (
    e: Event,
    type: "main" | "scale" | "pan" | "rotate" | "popup" | "buttons",
  ) => {
    const event = e as PointerEvent;

    this.setHideControls(false);

    const container = this.gameRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      const mouseX = event.clientX;
      const rightEdge = rect.left + rect.width;
      const right10Threshold = rightEdge - rect.width * 0.1;

      const isInRight10Percent = mouseX >= right10Threshold;

      if (isInRight10Percent && !this.adjustmentButtonsActive.current) {
        this.adjustmentButtonsActive.current = true;
        this.setRerender((prev) => !prev);
      } else if (!isInRight10Percent && this.adjustmentButtonsActive.current) {
        this.adjustmentButtonsActive.current = false;
        this.setRerender((prev) => !prev);
      }
    }

    if (this.popupRefs) {
      this.popupRefs.map((ref) =>
        ref.current?.classList.remove("hide-controls"),
      );
    }

    if (this.movementTimeout.current) {
      clearTimeout(this.movementTimeout.current);
      this.movementTimeout.current = undefined;
    }

    if (
      type === "main" &&
      (Object.values(this.hoveringOver).filter((val) => val).length === 1 ||
        this.gameStarted) &&
      !this.movementTimeout.current
    ) {
      this.movementTimeout.current = setTimeout(() => {
        clearTimeout(this.movementTimeout.current);
        this.movementTimeout.current = undefined;
        this.setHideControls(true);

        if (this.popupRefs) {
          this.popupRefs.map((ref) => {
            if (!ref.current?.classList.contains("hide-controls"))
              ref.current?.classList.add("hide-controls");
          });
        }
      }, 5000);
    }
  };

  reactionOccurred = (event: onReactionOccurredType) => {
    const { contentType, contentId } = event.header;
    const { reaction, reactionStyle } = event.data;

    if (contentType === "games" && contentId === this.gameId) {
      this.reactController.handleReaction(reaction, false, reactionStyle);
    }
  };

  handleTableMessage = (event: IncomingTableMessages) => {
    switch (event.type) {
      case "reactionOccurred":
        this.reactionOccurred(event);
        break;
      default:
        break;
    }
  };

  onGroupDragStart = (signal: onGroupDragStartType) => {
    const { affected, startDragPosition } = signal.data;

    if (
      !affected.some((item) => item.id === this.gameId && item.type === "games")
    )
      return;

    this.fgContentAdjustmentController.current?.adjustmentBtnPointerDownFunction(
      "position",
      { rotationPointPlacement: "topLeft" },
    );

    this.groupStartDragPosition = startDragPosition;
    this.savedMediaPosition = this.positioning.current.position;
  };

  onGroupDrag = (signal: onGroupDragType) => {
    const { affected, dragPosition } = signal.data;

    if (
      !affected.some(
        (item) => item.id === this.gameId && item.type === "games",
      ) ||
      !this.groupStartDragPosition ||
      !this.savedMediaPosition ||
      !this.sharedBundleRef.current
    )
      return;

    this.fgContentAdjustmentController.current?.movementDragFunction(
      {
        x:
          ((this.savedMediaPosition.left +
            dragPosition.x -
            this.groupStartDragPosition.x) /
            100) *
          this.sharedBundleRef.current.clientWidth,
        y:
          ((this.savedMediaPosition.top +
            dragPosition.y -
            this.groupStartDragPosition.y) /
            100) *
          this.sharedBundleRef.current.clientHeight,
      },
      { x: 0, y: 0 },
      {
        x:
          (this.positioning.current.position.left / 100) *
          this.sharedBundleRef.current.clientWidth,
        y:
          (this.positioning.current.position.top / 100) *
          this.sharedBundleRef.current.clientHeight,
      },
    );
  };

  onGroupDragEnd = (signal: onGroupDragEndType) => {
    const { affected } = signal.data;

    if (
      !affected.some((item) => item.id === this.gameId && item.type === "games")
    )
      return;

    this.fgContentAdjustmentController.current?.adjustmentBtnPointerUpFunction();

    this.groupStartDragPosition = undefined;
    this.savedMediaPosition = undefined;
  };

  onGroupDelete = (signal: onGroupDeleteType) => {
    const { affected } = signal.data;

    if (
      !affected.some((item) => item.id === this.gameId && item.type === "games")
    )
      return;

    if (this.closeGameFunction) this.closeGameFunction();
  };

  handleSignal = (signal: GroupSignals) => {
    switch (signal.type) {
      case "groupDelete":
        this.onGroupDelete(signal);
        break;
      case "groupDragStart":
        this.onGroupDragStart(signal);
        break;
      case "groupDrag":
        this.onGroupDrag(signal);
        break;
      case "groupDragEnd":
        this.onGroupDragEnd(signal);
        break;
      default:
        break;
    }
  };
}

export default FgGameController;
