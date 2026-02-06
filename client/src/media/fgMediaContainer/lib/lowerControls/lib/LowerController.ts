import TableStaticContentSocketController from "../../../../../serverControllers/tableStaticContentServer/TableStaticContentSocketController";
import LiveTextEditingSocketController from "../../../../../serverControllers/liveTextEditingServer/LiveTextEditingSocketController";
import VideoSocketController from "../../../../../serverControllers/videoServer/VideoSocketController";
import FgContentAdjustmentController from "../../../../../elements/fgAdjustmentElements/lib/FgContentAdjustmentControls";
import { MediaContainerOptions } from "../../typeConstant";
import {
  TableContentStateTypes,
  StaticContentTypes,
} from "../../../../../../../universal/contentTypeConstant";
import TableSocketController from "../../../../../serverControllers/tableServer/TableSocketController";
import ReactController from "../../../../../elements/reactButton/lib/ReactController";

class LowerController {
  private moving: boolean = false;
  private scaling: boolean = false;
  private rotating: boolean = false;

  reactController: ReactController;

  constructor(
    private tableStaticContentSocket: React.MutableRefObject<
      TableStaticContentSocketController | undefined
    >,
    private liveTextEditingSocket: React.MutableRefObject<
      LiveTextEditingSocketController | undefined
    >,
    private videoSocket: React.MutableRefObject<
      VideoSocketController | undefined
    >,
    private mediaIdRef: React.MutableRefObject<string>,
    private mediaInstanceId: string,
    private kind: StaticContentTypes,
    private bundleRef: React.RefObject<HTMLDivElement>,
    private mediaContainerRef: React.RefObject<HTMLDivElement>,
    private panBtnRef: React.RefObject<HTMLButtonElement>,
    private fgContentAdjustmentController: React.MutableRefObject<FgContentAdjustmentController | null>,
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
    private aspectRatio: React.MutableRefObject<number | undefined>,
    private setFullScreen: React.Dispatch<React.SetStateAction<boolean>>,
    private mediaContainerOptions: MediaContainerOptions,
    private setReactionsPanelActive: React.Dispatch<
      React.SetStateAction<boolean>
    >,
    private behindEffectsContainerRef: React.RefObject<HTMLDivElement>,
    private frontEffectsContainerRef: React.RefObject<HTMLDivElement>,
    private tableSocket: React.MutableRefObject<
      TableSocketController | undefined
    >,
    private state: React.MutableRefObject<TableContentStateTypes[]>,
    private setRerender: React.Dispatch<React.SetStateAction<boolean>>,
  ) {
    this.reactController = new ReactController(
      this.mediaIdRef.current,
      this.mediaInstanceId,
      this.kind,
      this.behindEffectsContainerRef,
      this.frontEffectsContainerRef,
      this.tableSocket,
    );
  }

  handleKeyDown = (event: KeyboardEvent) => {
    if (
      !event.key ||
      (!this.mediaContainerRef.current?.classList.contains("in-media") &&
        !this.mediaContainerRef.current?.classList.contains("full-screen")) ||
      this.mediaContainerRef.current?.classList.contains("in-piano") ||
      event.ctrlKey ||
      event.shiftKey
    ) {
      return;
    }

    const tagName = document.activeElement?.tagName.toLowerCase();
    if (tagName === "input" || tagName === "textarea") return;

    switch (event.key.toLowerCase()) {
      case "x":
        this.handleClose();
        break;
      case "t":
        this.handleTable();
        break;
      case "delete":
        this.handleClose();
        break;
      case "s":
        this.scaling = !this.scaling;
        if (this.scaling) {
          this.scaleFunctionEnd();
        } else {
          this.fgContentAdjustmentController.current?.adjustmentBtnPointerDownFunction(
            "scale",
          );
          document.addEventListener("pointermove", this.scaleFuntion);
          document.addEventListener("pointerdown", this.scaleFunctionEnd);
        }
        break;
      case "g":
        this.moving = !this.moving;
        if (this.moving) {
          this.moveFunctionEnd();
        } else {
          this.fgContentAdjustmentController.current?.adjustmentBtnPointerDownFunction(
            "position",
            { rotationPointPlacement: "topLeft" },
          );
          document.addEventListener("pointermove", this.moveFunction);
          document.addEventListener("pointerdown", this.moveFunctionEnd);
        }
        break;
      case "r":
        this.rotating = !this.rotating;
        if (this.rotating) {
          this.rotateFunctionEnd();
        } else {
          this.fgContentAdjustmentController.current?.adjustmentBtnPointerDownFunction(
            "rotation",
          );
          document.addEventListener("pointermove", this.rotateFunction);
          document.addEventListener("pointerdown", this.rotateFunctionEnd);
        }
        break;
      case "f":
        this.handleFullScreen();
        break;
      case "q":
        this.handleReact();
        break;
      default:
        break;
    }
  };

  scaleFunctionEnd = () => {
    this.fgContentAdjustmentController.current?.adjustmentBtnPointerUpFunction();
    document.removeEventListener("pointermove", this.scaleFuntion);
    document.removeEventListener("pointerdown", this.scaleFunctionEnd);

    this.tableStaticContentSocket.current?.updateContentPositioning(
      this.kind,
      this.mediaIdRef.current,
      this.mediaInstanceId,
      { scale: this.positioning.current.scale },
    );
  };

  rotateFunctionEnd = () => {
    this.fgContentAdjustmentController.current?.adjustmentBtnPointerUpFunction();
    document.removeEventListener("pointermove", this.rotateFunction);
    document.removeEventListener("pointerdown", this.rotateFunctionEnd);

    this.tableStaticContentSocket.current?.updateContentPositioning(
      this.kind,
      this.mediaIdRef.current,
      this.mediaInstanceId,
      { rotation: this.positioning.current.rotation },
    );
  };

  moveFunctionEnd = () => {
    this.fgContentAdjustmentController.current?.adjustmentBtnPointerUpFunction();
    document.removeEventListener("pointermove", this.moveFunction);
    document.removeEventListener("pointerdown", this.moveFunctionEnd);

    this.tableStaticContentSocket.current?.updateContentPositioning(
      this.kind,
      this.mediaIdRef.current,
      this.mediaInstanceId,
      { position: this.positioning.current.position },
    );
  };

  moveFunction = (event: PointerEvent) => {
    if (!this.bundleRef.current) {
      return;
    }

    const angle =
      2 * Math.PI - this.positioning.current.rotation * (Math.PI / 180);

    const pixelScale = {
      x:
        (this.positioning.current.scale.x / 100) *
        this.bundleRef.current.clientWidth,
      y:
        (this.positioning.current.scale.y / 100) *
        this.bundleRef.current.clientHeight,
    };

    const rect = this.bundleRef.current.getBoundingClientRect();

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
          this.bundleRef.current.clientWidth,
        y:
          (this.positioning.current.position.top / 100) *
          this.bundleRef.current.clientHeight,
      },
    );
    this.fgContentAdjustmentController.current?.adjustmentBtnPointerDownFunction();
  };

  scaleFuntion = (event: PointerEvent) => {
    if (!this.bundleRef.current) {
      return;
    }

    const rect = this.bundleRef.current.getBoundingClientRect();

    const referencePoint = {
      x:
        (this.positioning.current.position.left / 100) *
        this.bundleRef.current.clientWidth,
      y:
        (this.positioning.current.position.top / 100) *
        this.bundleRef.current.clientHeight,
    };

    this.fgContentAdjustmentController.current?.scaleDragFunction(
      this.mediaContainerOptions.resizeType ?? "aspect",
      {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      },
      referencePoint,
      referencePoint,
      this.aspectRatio.current,
    );
    this.fgContentAdjustmentController.current?.adjustmentBtnPointerDownFunction();
  };

  rotateFunction = (event: PointerEvent) => {
    if (!this.bundleRef.current) {
      return;
    }

    const box = this.bundleRef.current.getBoundingClientRect();

    this.fgContentAdjustmentController.current?.rotateDragFunction(event, {
      x:
        (this.positioning.current.position.left / 100) *
          this.bundleRef.current.clientWidth +
        box.left,
      y:
        (this.positioning.current.position.top / 100) *
          this.bundleRef.current.clientHeight +
        box.top,
    });
    this.fgContentAdjustmentController.current?.adjustmentBtnPointerDownFunction();
  };

  handleClose = () => {
    this.tableStaticContentSocket.current?.deleteContent(
      this.kind,
      this.mediaIdRef.current,
      this.mediaInstanceId,
    );
    if (this.kind === "text") {
      this.liveTextEditingSocket.current?.deleteContent(
        this.mediaIdRef.current,
        this.mediaInstanceId,
      );
    } else if (this.kind === "video") {
      this.videoSocket.current?.deleteContent(
        this.mediaIdRef.current,
        this.mediaInstanceId,
      );
    }
  };

  handleTable = () => {
    const newState = [...this.state.current];

    const index = newState.indexOf("tabled");
    if (index !== -1) {
      newState.splice(index, 1);
    } else {
      newState.push("tabled");
    }

    this.state.current = newState;
    this.setRerender((prev) => !prev);

    this.tableStaticContentSocket.current?.changeContentState(
      this.kind,
      this.mediaIdRef.current,
      newState,
    );
  };

  handleFullScreen = () => {
    if (document.fullscreenElement) {
      document
        .exitFullscreen()
        .then(() => {
          this.mediaContainerRef.current?.classList.remove("full-screen");
        })
        .catch((error) => {
          console.error("Failed to exit full screen:", error);
        });
      this.setFullScreen(false);
    } else {
      this.mediaContainerRef.current
        ?.requestFullscreen()
        .then(() => {
          this.mediaContainerRef.current?.classList.add("full-screen");
        })
        .catch((error) => {
          console.error("Failed to request full screen:", error);
        });
      this.setFullScreen(true);
    }
  };

  handleFullScreenChange = () => {
    if (!document.fullscreenElement) {
      this.mediaContainerRef.current?.classList.remove("full-screen");
      this.setFullScreen(false);
    }
  };

  handleReact = () => {
    this.setReactionsPanelActive((prev) => !prev);
  };
}

export default LowerController;
