import React, { useEffect, useRef, useState } from "react";
import FgButton from "../fgButton/FgButton";
import FgSVGElement from "../fgSVGElement/FgSVGElement";
import FgHoverContentStandard from "../fgHoverContentStandard/FgHoverContentStandard";
import { FgBackground, categories } from "./lib/typeConstant";
import BackgroundSelectorPanel from "./lib/BackgroundSelectorPanel";

const nginxAssetServerBaseUrl = process.env.NGINX_ASSET_SERVER_BASE_URL;

const chooseBackgroundIcon =
  nginxAssetServerBaseUrl + "svgs/chooseBackgroundIcon.svg";
const chooseBackgroundOffIcon =
  nginxAssetServerBaseUrl + "svgs/chooseBackgroundOffIcon.svg";

export default function FgBackgroundSelector({
  externalPanelRef,
  backgroundRef,
  defaultActiveBackground,
  backgroundChangeFunction,
  hoverType = "below",
}: {
  externalPanelRef?: React.RefObject<HTMLDivElement>;
  backgroundRef: React.RefObject<HTMLDivElement>;
  defaultActiveBackground?: FgBackground;
  backgroundChangeFunction?: (background: FgBackground) => void;
  hoverType?: "below" | "above";
}) {
  const [activeBackground, setActiveBackground] = useState<
    { category: ""; categorySelection: string } | FgBackground
  >(defaultActiveBackground ?? { category: "", categorySelection: "" });
  const [imports, setImports] = useState<{
    [importFilename: string]: { file: File; url: string };
  }>({});
  const [backgroundSelectorPanelActive, setBackgroundSelectorPanelActive] =
    useState(false);

  const backgroundSelectorBtnRef = useRef<HTMLButtonElement>(null);

  const changeBackground = () => {
    if (!backgroundRef.current) {
      return;
    }

    if (activeBackground.categorySelection === "") {
      backgroundRef.current.style.imageRendering = "";
      backgroundRef.current.style.backgroundImage = "";
      backgroundRef.current.style.backgroundSize = "";
      backgroundRef.current.style.backgroundPosition = "";
      backgroundRef.current.style.backgroundRepeat = "";
      return;
    }

    if (activeBackground.category !== "") {
      const background =
        // @ts-expect-error: correlation error
        categories[activeBackground.category]?.[
          activeBackground.categorySelection
        ];

      backgroundRef.current.style.backgroundImage = background
        ? // prettier-ignore
          `url(${background.url})`
        : "";
      if (background.pixelated) {
        backgroundRef.current.style.imageRendering = "pixelated";
      } else {
        backgroundRef.current.style.imageRendering = "auto";
      }
    } else {
      // prettier-ignore
      backgroundRef.current.style.backgroundImage = `url(${imports[activeBackground.categorySelection].url})`;
    }
    backgroundRef.current.style.backgroundSize = "cover";
    backgroundRef.current.style.backgroundPosition = "center";
    backgroundRef.current.style.backgroundRepeat = "no-repeat";
  };

  useEffect(() => {
    changeBackground();

    if (backgroundChangeFunction) {
      backgroundChangeFunction(activeBackground as FgBackground);
    }
  }, [activeBackground]);

  useEffect(() => {
    if (defaultActiveBackground) setActiveBackground(defaultActiveBackground);
  }, [defaultActiveBackground]);

  return (
    <>
      <FgButton
        externalRef={backgroundSelectorBtnRef}
        contentFunction={() => {
          return (
            <FgSVGElement
              src={
                backgroundSelectorPanelActive
                  ? chooseBackgroundOffIcon
                  : chooseBackgroundIcon
              }
              className="fill-fg-off-white stroke-fg-off-white"
              attributes={[
                { key: "width", value: "100%" },
                { key: "height", value: "100%" },
              ]}
            />
          );
        }}
        clickFunction={() => setBackgroundSelectorPanelActive((prev) => !prev)}
        hoverContent={
          backgroundSelectorPanelActive ? (
            <></>
          ) : (
            <FgHoverContentStandard content="Background selector" />
          )
        }
        className="relative flex aspect-square h-full items-center justify-center"
        options={{
          hoverType: hoverType,
          hoverTimeoutDuration: 750,
        }}
      />
      {backgroundSelectorPanelActive && (
        <BackgroundSelectorPanel
          externalPanelRef={externalPanelRef}
          setBackgroundSelectorPanelActive={setBackgroundSelectorPanelActive}
          backgroundSelectorBtnRef={backgroundSelectorBtnRef}
          activeBackground={activeBackground}
          setActiveBackground={setActiveBackground}
          imports={imports}
          setImports={setImports}
        />
      )}
    </>
  );
}
