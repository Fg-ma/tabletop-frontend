import React from "react";
import { useMediaContext } from "../../../../context/mediaContext/MediaContext";
import FgPanel from "../../../../elements/fgPanel/FgPanel";
import FgSlider from "../../../../elements/fgSlider/FgSlider";

export default function SnakeGridSizePanel({
  externalRef,
  snakeGameId,
  started,
  snakeGridSizeButtonRef,
  setGridSizePanelActive,
  gridSize,
  setGridSize,
}: {
  externalRef: React.RefObject<HTMLDivElement>;
  snakeGameId: string;
  started: boolean;
  snakeGridSizeButtonRef: React.RefObject<HTMLButtonElement>;
  setGridSizePanelActive: React.Dispatch<React.SetStateAction<boolean>>;
  gridSize: number;
  setGridSize: React.Dispatch<React.SetStateAction<number>>;
}) {
  const { staticContentMedia } = useMediaContext();

  return (
    <FgPanel
      className="border-2 border-fg-white shadow-md shadow-fg-tone-black-8"
      externalRef={externalRef}
      content={
        <div className="flex h-full w-full items-center justify-center">
          <FgSlider
            onValueChange={(event) => {
              if (started) {
                return;
              }

              staticContentMedia.current.games.snake?.[
                snakeGameId
              ].changeGridSize(event.value);
              setGridSize(event.value);
            }}
            disabled={started}
            options={{
              initValue: gridSize,
              bottomLabel: "Grid size",
              labelsColor: "#f2f2f2",
              ticks: 6,
              rangeMax: 60,
              rangeMin: 10,
              precision: 0,
              snapToWholeNum: true,
              orientation: "vertical",
            }}
          />
        </div>
      }
      initPosition={{
        referenceElement: snakeGridSizeButtonRef.current ?? undefined,
        placement: "left",
        padding: 8,
      }}
      initWidth={"80px"}
      initHeight={"370px"}
      minWidth={60}
      minHeight={200}
      closeCallback={() => setGridSizePanelActive(false)}
      closePosition="topRight"
      backgroundColor={"#090909"}
      secondaryBackgroundColor={"#161616"}
    />
  );
}
