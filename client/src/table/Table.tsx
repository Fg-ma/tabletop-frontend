import React, { useEffect, useRef, useState } from "react";
import { useSocketContext } from "../context/socketContext/SocketContext";
import { useSignalContext } from "../context/signalContext/SignalContext";
import TableController from "./lib/TableController";
import FgScrollbarElement from "../elements/fgScrollbarElement/FgScrollbarElement";
import TableGridOverlay from "./lib/TableGridOverlay";
import UploadTableLayer from "../tableLayers/uploadTableLayer/UploadTableLayer";
import NewInstancesLayer from "../tableLayers/newInstancesLayer/NewInstancesLayer";
import PlaceLittleBuddyLayer from "../tableLayers/placeLittleBuddyLayer/PlaceLittleBuddyLayer";
import SelectTableLayer from "../tableLayers/selectTableLayer/SelectTableLayer";
import LittleBuddiesLayer from "../tableLayers/littleBuddiesLayer/LittleBuddiesLayer";
import BabylonLayer from "../tableLayers/babylonLayer/BabylonLayer";
import SharedBundle from "../sharedBundle/SharedBundle";
import LeftTableSection from "./lib/sideSections/LeftTableSection";
import RightTableSection from "./lib/sideSections/RightTableSection";
import TopTableSection from "./lib/sideSections/TopTableSection";
import BottomTableSection from "./lib/sideSections/BottomTableSection";
import { TableColors } from "../serverControllers/tableServer/lib/typeConstant";
import TableInfoPopup from "./lib/tableInfoPopup/TableInfoPopup";
import LoadingTab from "./lib/loadingTab/LoadingTab";
import TableSidePanel from "../tableSidePanel/TableSidePanel";
import "./lib/fgTable.css";

export default function Table({
  tableFunctionsRef,
  tableRef,
  tableTopRef,
  bundles,
  gridActive,
  gridSize,
  tableSidePanelActive,
  setTableSidePanelActive,
  sidePanelPosition,
  setSidePanelPosition,
}: {
  tableFunctionsRef: React.RefObject<HTMLDivElement>;
  tableRef: React.RefObject<HTMLDivElement>;
  tableTopRef: React.RefObject<HTMLDivElement>;
  bundles: {
    [username: string]: {
      [instance: string]: React.JSX.Element;
    };
  };
  gridActive: boolean;
  gridSize: {
    rows: number;
    cols: number;
  };
  tableSidePanelActive: boolean;
  setTableSidePanelActive: React.Dispatch<React.SetStateAction<boolean>>;
  sidePanelPosition: "left" | "right";
  setSidePanelPosition: React.Dispatch<React.SetStateAction<"left" | "right">>;
}) {
  const { tableSocket } = useSocketContext();
  const { sendGroupSignal } = useSignalContext();

  const [userData, setUserData] = useState<{
    [username: string]: { color: TableColors; seat: number; online: boolean };
  }>({});
  const [tableSidePanelWidth, setTableSidePanelWidth] = useState(256);
  const [_, setRerender] = useState(false);
  const aspectDir = useRef<"width" | "height">("width");
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const innerTableContainerRef = useRef<HTMLDivElement>(null);

  const tableController = useRef(
    new TableController(
      tableRef,
      setUserData,
      aspectDir,
      setRerender,
      setTableSidePanelActive,
      sendGroupSignal,
    ),
  );

  useEffect(() => {
    tableController.current.getAspectDir();

    setTimeout(() => {
      if (tableRef.current) {
        if (aspectDir.current === "width") {
          tableRef.current.scrollTo({
            top:
              (tableRef.current.scrollHeight - tableRef.current.clientHeight) /
              2,
            behavior: "instant",
          });
        } else {
          tableRef.current.scrollTo({
            left:
              (tableRef.current.scrollWidth - tableRef.current.clientWidth) / 2,
            behavior: "instant",
          });
        }
      }
    }, 100);

    window.addEventListener("resize", tableController.current.getAspectDir);

    window.addEventListener("keydown", tableController.current.handleKeyDown);

    return () => {
      window.removeEventListener(
        "resize",
        tableController.current.getAspectDir,
      );
      window.removeEventListener(
        "keydown",
        tableController.current.handleKeyDown,
      );
    };
  }, []);

  useEffect(() => {
    tableSocket.current?.addMessageListener(
      tableController.current.handleTableMessage,
    );

    return () => {
      tableSocket.current?.removeMessageListener(
        tableController.current.handleTableMessage,
      );
    };
  }, [tableSocket.current]);

  useEffect(() => {
    if (!tableRef.current) return;

    const observer = new ResizeObserver(tableController.current.getAspectDir);

    observer.observe(tableRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`${sidePanelPosition === "right" ? "flex-row-reverse" : ""} flex w-full items-center justify-center`}
      style={{
        height: `calc(100% - ${tableFunctionsRef.current?.clientHeight ?? 0}px - 6.125rem)`,
      }}
    >
      <TableSidePanel
        tableSidePanelActive={tableSidePanelActive}
        setTableSidePanelActive={setTableSidePanelActive}
        tableController={tableController}
        setExternalRerender={setRerender}
        tableSidePanelWidth={tableSidePanelWidth}
        setTableSidePanelWidth={setTableSidePanelWidth}
        sidePanelPosition={sidePanelPosition}
        setSidePanelPosition={setSidePanelPosition}
      />
      <div
        ref={tableContainerRef}
        className="table-container flex h-full flex-col"
        style={
          {
            "--dynamic-width": `calc(100%${tableSidePanelActive ? ` - ${Math.max(200, tableSidePanelWidth)}px - 1.75rem` : ""})`,
            minWidth: "30%",
          } as React.CSSProperties
        }
      >
        <TopTableSection
          userData={userData}
          tableContainerRef={tableContainerRef}
        />
        <div
          ref={innerTableContainerRef}
          className="flex w-full"
          style={{ height: "1px", flexGrow: "1" }}
        >
          <LeftTableSection
            userData={userData}
            tableContainerRef={tableContainerRef}
          />
          <FgScrollbarElement
            className="relative"
            direction={
              aspectDir.current === "width" ? "vertical" : "horizontal"
            }
            scrollingContentRef={tableRef}
            externalContentContainerRef={tableRef}
            contentContainerClassName={`fg-table relative h-full w-full rounded-md border-2 border-fg-off-white ${
              aspectDir.current === "width"
                ? "overflow-y-auto"
                : "overflow-x-auto"
            }`}
            outsideContent={
              <>
                <TableInfoPopup />
                <LoadingTab
                  tableSidePanelActive={tableSidePanelActive}
                  setTableSidePanelActive={setTableSidePanelActive}
                  setExternalRerender={setRerender}
                />
              </>
            }
            content={
              <div
                ref={tableTopRef}
                className="relative aspect-square overflow-hidden bg-fg-tone-black-6.5"
                style={{
                  ...(aspectDir.current === "width"
                    ? { width: "100%" }
                    : { height: "100%" }),
                }}
              >
                {/* <BabylonLayer /> */}
                <SelectTableLayer
                  innerTableContainerRef={innerTableContainerRef}
                  tableRef={tableRef}
                  tableTopRef={tableTopRef}
                />
                <UploadTableLayer tableTopRef={tableTopRef} />
                <NewInstancesLayer tableRef={tableRef} />
                {/* <PlaceLittleBuddyLayer tableRef={tableRef} />
                <LittleBuddiesLayer littleBuddy="rottingZombie" />
                <LittleBuddiesLayer littleBuddy="zombie" />
                <LittleBuddiesLayer littleBuddy="pinkSlime" />
                <LittleBuddiesLayer littleBuddy="wizard" />
                <LittleBuddiesLayer littleBuddy="bloodyZombie" />
                <LittleBuddiesLayer littleBuddy="headlessZombie" /> */}
                {gridActive && (
                  <TableGridOverlay
                    gridSize={gridSize}
                    tableTopRef={tableTopRef}
                    gridColor="#f2f2f2"
                  />
                )}
                <SharedBundle tableRef={tableRef} tableTopRef={tableTopRef} />
                {bundles &&
                  Object.keys(bundles).length !== 0 &&
                  Object.keys(bundles).map(
                    (username) =>
                      Object.keys(bundles[username]).length !== 0 &&
                      Object.entries(bundles[username]).map(([key, bundle]) => (
                        <div
                          className="pointer-events-none absolute left-0 top-0 h-full w-full"
                          key={key}
                          id={`${key}_bundle`}
                        >
                          {bundle}
                        </div>
                      )),
                  )}
              </div>
            }
            style={{
              width: "100%",
              flexGrow: "1",
            }}
          />
          <RightTableSection
            userData={userData}
            tableContainerRef={tableContainerRef}
          />
        </div>
        <BottomTableSection
          userData={userData}
          tableContainerRef={tableContainerRef}
        />
      </div>
    </div>
  );
}
