import { IncomingTableStaticContentMessages } from "../../../serverControllers/tableStaticContentServer/lib/typeConstant";
import { ContentTypes } from "../../../../../universal/contentTypeConstant";
import { GroupSignals } from "../../../context/signalContext/lib/typeConstant";
import { IncomingMediasoupMessages } from "../../../serverControllers/mediasoupServer/lib/typeConstant";

class SelectTableLayerController {
  queryInterval: NodeJS.Timeout | undefined;

  selectables: NodeListOf<HTMLElement> | undefined;
  selectedInfo:
    | {
        type: ContentTypes;
        id: string;
        username?: string;
        instance?: string;
        isUser?: boolean;
      }[]
    | undefined;

  dragging = false;

  constructor(
    private innerTableContainerRef: React.RefObject<HTMLDivElement>,
    private tableTopRef: React.RefObject<HTMLDivElement>,
    private tableRef: React.RefObject<HTMLDivElement>,
    private dragStart: React.MutableRefObject<
      | {
          x: number;
          y: number;
        }
      | undefined
    >,
    private dragEnd: React.MutableRefObject<
      | {
          x: number;
          y: number;
        }
      | undefined
    >,
    private setDragging: React.Dispatch<React.SetStateAction<boolean>>,
    private selected: React.MutableRefObject<HTMLElement[]>,
    private setRerender: React.Dispatch<React.SetStateAction<boolean>>,
    private sendGroupSignal: (signal: GroupSignals) => void,
    private groupRef: React.RefObject<HTMLDivElement>,
  ) {}

  handleResize = () => {
    this.selectables =
      this.tableTopRef.current?.querySelectorAll<HTMLElement>(".selectable");
    this.setRerender((prev) => !prev);
  };

  handleGroupSignal = (signal: GroupSignals) => {
    switch (signal.type) {
      case "clearGroup": {
        this.selected.current = [];
        this.selectedInfo = [];

        this.sendGroupSignal({
          type: "groupChange",
          data: { selected: this.selectedInfo },
        });

        this.setRerender((prev) => !prev);
        break;
      }
      case "groupUpdate": {
        this.selectables =
          this.tableTopRef.current?.querySelectorAll<HTMLElement>(
            ".selectable",
          );
        this.setRerender((prev) => !prev);
        break;
      }
      case "removeGroupElement": {
        const { removeType, removeId } = signal.data;
        this.selectables =
          this.tableTopRef.current?.querySelectorAll<HTMLElement>(
            ".selectable",
          );
        this.selectedInfo = this.selectedInfo?.filter(
          (info) => info.type !== removeType || info.id !== removeId,
        );
        this.selected.current = this.selected.current?.filter((sel) => {
          const type = sel.getAttribute("data-selectable-type") as ContentTypes;
          const id = sel.getAttribute("data-selectable-id");
          return type !== removeType || id !== removeId;
        });
        this.setRerender((prev) => !prev);
        break;
      }
      case "groupElementMove": {
        const { contentType, instanceId } = signal.data;
        if (
          this.selectedInfo?.some(
            (info) => info.type === contentType && info.id === instanceId,
          )
        ) {
          this.selectables =
            this.tableTopRef.current?.querySelectorAll<HTMLElement>(
              ".selectable",
            );

          if (this.selected.current.length) {
            this.selectedInfo = [];

            for (const sel of this.selected.current) {
              const type = sel.getAttribute(
                "data-selectable-type",
              ) as ContentTypes;
              const id = sel.getAttribute("data-selectable-id");
              const username = sel.getAttribute("data-selectable-username");
              const instance = sel.getAttribute("data-selectable-instance");
              const isUser = sel.getAttribute("data-selectable-isuser");

              if (type && id)
                this.selectedInfo.push({
                  type,
                  id,
                  username: username ?? undefined,
                  instance: instance ?? undefined,
                  isUser: isUser !== null ? isUser === "true" : undefined,
                });
            }

            this.sendGroupSignal({
              type: "groupChange",
              data: { selected: this.selectedInfo },
            });
          }

          this.setRerender((prev) => !prev);
        }
        break;
      }
      default:
        break;
    }
  };

  handleDocumentPointerDown = (e: MouseEvent) => {
    const target = e.target as Node;

    const isInsideTable = this.tableTopRef.current?.contains(target);
    const isInGroup = this.groupRef.current?.contains(target);
    const isInSelectables = this.selectables
      ? Array.from(this.selectables).some((el) => el.contains(target))
      : false;

    if (!isInsideTable || isInGroup || isInSelectables || this.dragging) return;

    this.selected.current = [];
    this.selectedInfo = [];

    this.sendGroupSignal({
      type: "groupChange",
      data: { selected: [] },
    });

    this.setRerender((prev) => !prev);
  };

  handlePointerDown = (e: React.MouseEvent) => {
    e.preventDefault();

    if (this.groupRef.current?.contains(e.target as Node)) return;

    document.addEventListener("pointerup", this.handlePointerUp);
    document.addEventListener("pointermove", this.handlePointerMove);

    const box = this.innerTableContainerRef.current?.getBoundingClientRect();
    const box2 = this.tableTopRef.current?.getBoundingClientRect();
    this.dragStart.current = {
      x: e.clientX - (box2?.x ?? 0) + (this.tableRef.current?.scrollLeft ?? 0),
      y: e.clientY - (box?.y ?? 0) + (this.tableRef.current?.scrollTop ?? 0),
    };
    this.dragEnd.current = undefined;

    this.selected.current = [];
    this.selectedInfo = [];

    this.sendGroupSignal({
      type: "groupChange",
      data: { selected: [] },
    });

    this.setDragging(true);

    this.selectables =
      this.tableTopRef.current?.querySelectorAll<HTMLElement>(".selectable");
    if (!this.queryInterval) {
      this.queryInterval = setInterval(() => {
        this.selectables =
          this.tableTopRef.current?.querySelectorAll<HTMLElement>(
            ".selectable",
          );
      }, 1000);
    }
  };

  handlePointerMove = (e: PointerEvent) => {
    if (!this.dragStart.current) return;

    const box = this.innerTableContainerRef.current?.getBoundingClientRect();
    const box2 = this.tableTopRef.current?.getBoundingClientRect();
    const newDragEnd = {
      x: e.clientX - (box2?.x ?? 0) + (this.tableRef.current?.scrollLeft ?? 0),
      y: e.clientY - (box?.y ?? 0) + (this.tableRef.current?.scrollTop ?? 0),
    };

    this.dragEnd.current = newDragEnd;

    const left = Math.min(this.dragStart.current.x, this.dragEnd.current.x);
    const top = Math.min(this.dragStart.current.y, this.dragEnd.current.y);
    const width = Math.abs(this.dragStart.current.x - this.dragEnd.current.x);
    const height = Math.abs(this.dragStart.current.y - this.dragEnd.current.y);

    this.selected.current = this.getSelectablesInBox({
      left,
      top,
      width,
      height,
    });

    this.setRerender((prev) => !prev);
  };

  handlePointerUp = () => {
    document.removeEventListener("pointerup", this.handlePointerUp);
    document.removeEventListener("pointermove", this.handlePointerMove);

    this.dragStart.current = undefined;
    this.dragEnd.current = undefined;

    if (this.selected.current.length) {
      this.selectedInfo = [];

      for (const sel of this.selected.current) {
        const type = sel.getAttribute("data-selectable-type") as ContentTypes;
        const id = sel.getAttribute("data-selectable-id");
        const username = sel.getAttribute("data-selectable-username");
        const instance = sel.getAttribute("data-selectable-instance");
        const isUser = sel.getAttribute("data-selectable-isuser");

        if (type && id)
          this.selectedInfo.push({
            type,
            id,
            username: username ?? undefined,
            instance: instance ?? undefined,
            isUser: isUser !== null ? isUser === "true" : undefined,
          });
      }

      this.sendGroupSignal({
        type: "groupChange",
        data: { selected: this.selectedInfo },
      });
    }

    if (this.queryInterval) {
      clearInterval(this.queryInterval);
      this.queryInterval = undefined;
    }

    this.setDragging(false);
  };

  getSelectablesInBox = (selectionBox: {
    left: number;
    top: number;
    width: number;
    height: number;
  }): HTMLElement[] => {
    if (!this.tableTopRef.current || !this.selectables) return [];

    const selectionRect = {
      left: selectionBox.left,
      right: selectionBox.left + selectionBox.width,
      top: selectionBox.top,
      bottom: selectionBox.top + selectionBox.height,
    };

    const overlappingElements: HTMLElement[] = [];

    this.selectables.forEach((el) => {
      if (!this.tableTopRef.current) return;

      const rect = el.getBoundingClientRect();
      const containerRect = this.tableTopRef.current.getBoundingClientRect();

      const elRect = {
        left:
          rect.left - containerRect.left + this.tableTopRef.current.scrollLeft,
        right:
          rect.right - containerRect.left + this.tableTopRef.current.scrollLeft,
        top: rect.top - containerRect.top + this.tableTopRef.current.scrollTop,
        bottom:
          rect.bottom - containerRect.top + this.tableTopRef.current.scrollTop,
      };

      const isOverlapping =
        selectionRect.left < elRect.right &&
        selectionRect.right > elRect.left &&
        selectionRect.top < elRect.bottom &&
        selectionRect.bottom > elRect.top;

      if (isOverlapping) {
        overlappingElements.push(el);
      }
    });

    return overlappingElements;
  };

  groupDragStart = (event: React.PointerEvent) => {
    document.addEventListener("pointerup", this.groupDragEnd);
    document.addEventListener("pointermove", this.groupDrag);

    setTimeout(() => {
      this.dragging = true;
    }, 100);

    if (this.selectedInfo && this.selectedInfo.length) {
      const box = this.innerTableContainerRef.current?.getBoundingClientRect();
      const box2 = this.tableTopRef.current?.getBoundingClientRect();

      this.sendGroupSignal({
        type: "groupDragStart",
        data: {
          affected: this.selectedInfo,
          startDragPosition: {
            x:
              ((event.clientX -
                (box2?.x ?? 0) +
                (this.tableRef.current?.scrollLeft ?? 0)) /
                (this.tableTopRef.current?.clientWidth ?? 1)) *
              100,
            y:
              ((event.clientY -
                (box?.y ?? 0) +
                (this.tableRef.current?.scrollTop ?? 0)) /
                (this.tableTopRef.current?.clientHeight ?? 1)) *
              100,
          },
        },
      });
    }
  };

  groupDrag = (event: PointerEvent) => {
    if (this.selectedInfo && this.selectedInfo.length) {
      const box = this.innerTableContainerRef.current?.getBoundingClientRect();
      const box2 = this.tableTopRef.current?.getBoundingClientRect();

      this.sendGroupSignal({
        type: "groupDrag",
        data: {
          affected: this.selectedInfo,
          dragPosition: {
            x:
              ((event.clientX -
                (box2?.x ?? 0) +
                (this.tableRef.current?.scrollLeft ?? 0)) /
                (this.tableTopRef.current?.clientWidth ?? 1)) *
              100,
            y:
              ((event.clientY -
                (box?.y ?? 0) +
                (this.tableRef.current?.scrollTop ?? 0)) /
                (this.tableTopRef.current?.clientHeight ?? 1)) *
              100,
          },
        },
      });

      this.setRerender((prev) => !prev);
    }
  };

  groupDragEnd = () => {
    document.removeEventListener("pointerup", this.groupDragEnd);
    document.removeEventListener("pointermove", this.groupDrag);

    setTimeout(() => {
      this.dragging = false;
    }, 0);

    if (this.selectedInfo && this.selectedInfo.length) {
      this.sendGroupSignal({
        type: "groupDragEnd",
        data: { affected: this.selectedInfo },
      });
    }
  };

  handleKeyDown = (event: KeyboardEvent) => {
    const tagName = document.activeElement?.tagName.toLowerCase();
    if (tagName === "input" || tagName === "textarea") return;

    const key = event.key.toLowerCase();

    switch (key) {
      case "x":
        event.stopPropagation();
        event.preventDefault();
        if (this.selectedInfo) {
          this.sendGroupSignal({
            type: "groupDelete",
            data: { affected: this.selectedInfo },
          });
        }
        this.dragStart.current = undefined;
        this.dragEnd.current = undefined;
        this.selected.current = [];
        this.selectedInfo = [];
        this.setDragging(false);
        this.setRerender((prev) => !prev);
        break;
      case "delete":
        event.stopPropagation();
        event.preventDefault();
        if (this.selectedInfo) {
          this.sendGroupSignal({
            type: "groupDelete",
            data: { affected: this.selectedInfo },
          });
        }
        this.dragStart.current = undefined;
        this.dragEnd.current = undefined;
        this.selected.current = [];
        this.selectedInfo = [];
        this.setDragging(false);
        this.setRerender((prev) => !prev);
        break;
      case "escape":
        this.dragStart.current = undefined;
        this.dragEnd.current = undefined;
        this.selected.current = [];
        this.setDragging(false);
        this.setRerender((prev) => !prev);
        break;
      default:
        break;
    }
  };

  handleTableStaticMessage = (event: IncomingTableStaticContentMessages) => {
    if (event.type === "contentDeleted") {
      const { contentType, instanceId } = event.header;
      this.selectables =
        this.tableTopRef.current?.querySelectorAll<HTMLElement>(".selectable");

      this.selected.current = this.selected.current?.filter((sel) => {
        const type = sel.getAttribute("data-selectable-type") as ContentTypes;
        const id = sel.getAttribute("data-selectable-id");
        return type !== contentType || id !== instanceId;
      });

      if (this.selectedInfo) {
        this.selectedInfo = this.selectedInfo.filter((sel) => {
          return sel.type !== contentType || sel.id !== instanceId;
        });
      } else {
        this.selectedInfo = [];
      }

      this.sendGroupSignal({
        type: "groupChange",
        data: { selected: this.selectedInfo },
      });

      this.setRerender((prev) => !prev);
    }
  };

  handleMediasoupMessage = (event: IncomingMediasoupMessages) => {
    if (event.type === "producerDisconnected") {
      const { producerUsername, producerInstance, producerType, producerId } =
        event.header;
      if (producerType === "json" || producerType === "screenAudio") return;

      this.selectables =
        this.tableTopRef.current?.querySelectorAll<HTMLElement>(".selectable");

      this.selected.current = this.selected.current?.filter((sel) => {
        const type = sel.getAttribute("data-selectable-type") as ContentTypes;
        const id = sel.getAttribute("data-selectable-id");
        const username = sel.getAttribute("data-selectable-username");
        const instance = sel.getAttribute("data-selectable-instance");

        return (
          type !== producerType ||
          id !== producerId ||
          username !== producerUsername ||
          instance !== producerInstance
        );
      });

      if (this.selectedInfo) {
        this.selectedInfo = this.selectedInfo.filter((sel) => {
          return (
            sel.type !== producerType ||
            sel.id !== producerId ||
            sel.username !== producerUsername ||
            sel.instance !== producerInstance
          );
        });
      } else {
        this.selectedInfo = [];
      }

      this.sendGroupSignal({
        type: "groupChange",
        data: { selected: this.selectedInfo },
      });

      this.setRerender((prev) => !prev);
    }
  };
}

export default SelectTableLayerController;
