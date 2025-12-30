import React, { useState, useRef, useEffect } from "react";
import FgGameButton from "../../../../elements/fgGameButton/FgGameButton";
import FgHoverContentStandard from "../../../../elements/fgHoverContentStandard/FgHoverContentStandard";
import FgGameController from "./FgGameController";

export default function ControlButtons({
  tableTopRef,
  startGameFunction,
  joinGameFunction,
  leaveGameFunction,
  userPlaying,
  playerCount,
  positioning,
  fgGameController,
}: {
  tableTopRef: React.RefObject<HTMLDivElement>;
  startGameFunction?: () => void;
  joinGameFunction?: () => void;
  leaveGameFunction?: () => void;
  userPlaying: boolean;
  playerCount: number;
  positioning: React.MutableRefObject<{
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
  fgGameController: FgGameController;
}) {
  const [hover, setHover] = useState(false);
  const startButtonRef = useRef<HTMLButtonElement>(null);
  const joinButtonRef = useRef<HTMLButtonElement>(null);
  const leaveButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    startButtonRef.current?.addEventListener("pointerenter", () =>
      fgGameController.handlePointerEnter("buttons", startButtonRef),
    );
    startButtonRef.current?.addEventListener("pointerleave", () =>
      fgGameController.handlePointerLeave("buttons", startButtonRef),
    );
    joinButtonRef.current?.addEventListener("pointerenter", () =>
      fgGameController.handlePointerEnter("buttons", joinButtonRef),
    );
    joinButtonRef.current?.addEventListener("pointerleave", () =>
      fgGameController.handlePointerLeave("buttons", joinButtonRef),
    );
    leaveButtonRef.current?.addEventListener("pointerenter", () =>
      fgGameController.handlePointerEnter("buttons", leaveButtonRef),
    );
    leaveButtonRef.current?.addEventListener("pointerleave", () =>
      fgGameController.handlePointerLeave("buttons", leaveButtonRef),
    );

    return () => {
      startButtonRef.current?.removeEventListener("pointerenter", () =>
        fgGameController.handlePointerEnter("popup", startButtonRef),
      );
      startButtonRef.current?.removeEventListener("pointerleave", () =>
        fgGameController.handlePointerLeave("popup", startButtonRef),
      );
      joinButtonRef.current?.removeEventListener("pointerenter", () =>
        fgGameController.handlePointerEnter("popup", joinButtonRef),
      );
      joinButtonRef.current?.removeEventListener("pointerleave", () =>
        fgGameController.handlePointerLeave("popup", joinButtonRef),
      );
      leaveButtonRef.current?.removeEventListener("pointerenter", () =>
        fgGameController.handlePointerEnter("popup", leaveButtonRef),
      );
      leaveButtonRef.current?.removeEventListener("pointerleave", () =>
        fgGameController.handlePointerLeave("popup", leaveButtonRef),
      );
    };
  }, [startButtonRef, joinButtonRef, leaveButtonRef]);

  return (
    <div
      className={`${(positioning.current.scale.x / 100) * (tableTopRef.current?.clientWidth ?? 1) <= 140 ? `${hover ? "h-[108px]" : "h-[36px]"} absolute bottom-0 left-0 flex-col-reverse` : "h-full space-x-2 py-2"} flex w-max items-center justify-center transition-all`}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
    >
      <FgGameButton
        externalRef={startButtonRef}
        className={`${(positioning.current.scale.x / 100) * (tableTopRef.current?.clientWidth ?? 1) <= 140 ? "h-[26px]" : "h-full"} aspect-square`}
        clickFunction={startGameFunction}
        hoverContent={<FgHoverContentStandard content="Start (p)" />}
        options={{
          primaryColor: "#3cf599",
          secondaryColor: "#00e359",
          hoverTimeoutDuration: 750,
          hoverType: "above",
          hoverSpacing: 4,
        }}
      />
      {!hover &&
        (positioning.current.scale.x / 100) *
          (tableTopRef.current?.clientWidth ?? 1) <
          140 && (
          <div className="absolute right-[-2px] top-[-2px] aspect-square h-[6px] rounded-full bg-fg-red-light"></div>
        )}
      {(hover ||
        (positioning.current.scale.x / 100) *
          (tableTopRef.current?.clientWidth ?? 1) >
          140) && (
        <>
          <FgGameButton
            externalRef={joinButtonRef}
            className={`${(positioning.current.scale.x / 100) * (tableTopRef.current?.clientWidth ?? 1) <= 140 ? "my-2 h-[26px]" : "h-full"} aspect-square`}
            clickFunction={joinGameFunction}
            hoverContent={<FgHoverContentStandard content="Join game (j)" />}
            options={{
              primaryColor: "#3991ff",
              secondaryColor: "#095dcc",
              hoverTimeoutDuration: 750,
              hoverType: "above",
              hoverSpacing: 4,
            }}
          />
          <FgGameButton
            externalRef={leaveButtonRef}
            className={`${(positioning.current.scale.x / 100) * (tableTopRef.current?.clientWidth ?? 1) <= 140 ? "h-[26px]" : "h-full"} aspect-square`}
            clickFunction={leaveGameFunction}
            hoverContent={
              <FgHoverContentStandard
                content={
                  userPlaying
                    ? playerCount > 1
                      ? "Leave game (l)"
                      : "End game (l)"
                    : "End game (l)"
                }
              />
            }
            options={{
              primaryColor: "#fd473c",
              secondaryColor: "#e11008",
              hoverTimeoutDuration: 750,
              hoverType: "above",
              hoverSpacing: 4,
            }}
          />
        </>
      )}
    </div>
  );
}
