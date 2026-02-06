import React, { useState, useRef, useEffect } from "react";
import SelectTableLayerController from "./lib/SelectTableLayerController";
import { useSignalContext } from "../../context/signalContext/SignalContext";
import { useSocketContext } from "../../context/socketContext/SocketContext";

export default function SelectTableLayer({
  innerTableContainerRef,
  tableRef,
  tableTopRef,
}: {
  innerTableContainerRef: React.RefObject<HTMLDivElement>;
  tableRef: React.RefObject<HTMLDivElement>;
  tableTopRef: React.RefObject<HTMLDivElement>;
}) {
  const { sendGroupSignal, addGroupSignalListener, removeGroupSignalListener } =
    useSignalContext();
  const { tableStaticContentSocket, mediasoupSocket } = useSocketContext();

  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number } | undefined>(undefined);
  const dragEnd = useRef<{ x: number; y: number } | undefined>(undefined);

  const selected = useRef<HTMLElement[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);

  const [_, setRerender] = useState(false);

  const selectTableLayerController = useRef(
    new SelectTableLayerController(
      innerTableContainerRef,
      tableTopRef,
      tableRef,
      dragStart,
      dragEnd,
      setDragging,
      selected,
      setRerender,
      sendGroupSignal,
      groupRef,
    ),
  );

  useEffect(() => {
    if (dragging || selected.current.length) {
      document.addEventListener(
        "keydown",
        selectTableLayerController.current.handleKeyDown,
        true,
      );
      document.addEventListener(
        "pointerdown",
        selectTableLayerController.current.handleDocumentPointerDown,
      );
    }

    return () => {
      if (dragging || selected.current.length) {
        document.removeEventListener(
          "keydown",
          selectTableLayerController.current.handleKeyDown,
          true,
        );
        document.removeEventListener(
          "pointerdown",
          selectTableLayerController.current.handleDocumentPointerDown,
        );
      }
    };
  }, [dragging, selected.current.length]);

  useEffect(() => {
    document.addEventListener(
      "resize",
      selectTableLayerController.current.handleResize,
    );

    addGroupSignalListener(
      selectTableLayerController.current.handleGroupSignal,
    );

    return () => {
      document.removeEventListener(
        "resize",
        selectTableLayerController.current.handleResize,
      );
      removeGroupSignalListener(
        selectTableLayerController.current.handleGroupSignal,
      );
    };
  }, []);

  useEffect(() => {
    tableStaticContentSocket.current?.addMessageListener(
      selectTableLayerController.current.handleTableStaticMessage,
    );

    return () => {
      tableStaticContentSocket.current?.removeMessageListener(
        selectTableLayerController.current.handleTableStaticMessage,
      );
    };
  }, [tableStaticContentSocket.current]);

  useEffect(() => {
    mediasoupSocket.current?.addMessageListener(
      selectTableLayerController.current.handleMediasoupMessage,
    );

    return () => {
      mediasoupSocket.current?.removeMessageListener(
        selectTableLayerController.current.handleMediasoupMessage,
      );
    };
  }, [mediasoupSocket.current]);

  let boxStyle = {};
  if (dragStart.current && dragEnd.current) {
    const left = Math.min(dragStart.current.x, dragEnd.current.x);
    const top = Math.min(dragStart.current.y, dragEnd.current.y);
    const width = Math.abs(dragStart.current.x - dragEnd.current.x);
    const height = Math.abs(dragStart.current.y - dragEnd.current.y);

    boxStyle = {
      left,
      top,
      width,
      height,
    };
  }

  let selectedStyle = {};
  if (selected.current.length) {
    let minLeft = Infinity;
    let maxRight = 0;
    let minTop = Infinity;
    let maxBottom = 0;

    for (const elem of selected.current) {
      const box = elem.getBoundingClientRect();

      if (box.left < minLeft) {
        minLeft = box.left;
      }
      if (box.top < minTop) {
        minTop = box.top;
      }
      if (box.bottom > maxBottom) {
        maxBottom = box.bottom;
      }
      if (box.right > maxRight) {
        maxRight = box.right;
      }
    }

    const box = innerTableContainerRef.current?.getBoundingClientRect();
    const box2 = tableTopRef.current?.getBoundingClientRect();
    minLeft = minLeft - (box2?.x ?? 0) + (tableRef.current?.scrollLeft ?? 0);
    maxRight = maxRight - (box2?.x ?? 0) + (tableRef.current?.scrollLeft ?? 0);
    minTop = minTop - (box?.y ?? 0) + (tableRef.current?.scrollTop ?? 0);
    maxBottom = maxBottom - (box?.y ?? 0) + (tableRef.current?.scrollTop ?? 0);

    const left = minLeft - 6;
    const top = minTop - 8;
    const width = maxRight - minLeft + 12;
    const height = maxBottom - minTop + 12;

    selectedStyle = { left, top, width, height };
  }

  return (
    <div
      ref={containerRef}
      onPointerDown={selectTableLayerController.current.handlePointerDown}
      className="absolute left-0 top-0 z-select-layer h-full w-full bg-transparent"
    >
      {dragging && (
        <div
          className="pointer-events-none absolute rounded border-3 border-dashed border-fg-red bg-fg-red-light bg-opacity-20"
          style={boxStyle}
        />
      )}
      {selected.current.length !== 0 && (
        <>
          <div
            className={`${dragging ? "border-fg-white bg-fg-white transition-all" : "transition-color border-fg-red-light bg-fg-red-light"} pointer-events-none absolute rounded border-3 border-dashed bg-opacity-20`}
            style={selectedStyle}
          />
          <div
            ref={groupRef}
            className="pointer-events-auto absolute z-[100] rounded"
            draggable
            style={selectedStyle}
            onPointerDown={selectTableLayerController.current.groupDragStart}
          />
        </>
      )}
    </div>
  );
}
