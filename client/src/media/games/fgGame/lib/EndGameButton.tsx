import React from "react";
import FgButton from "../../../../elements/fgButton/FgButton";
import FgSVGElement from "../../../../elements/fgSVGElement/FgSVGElement";
import FgHoverContentStandard from "../../../../elements/fgHoverContentStandard/FgHoverContentStandard";

const nginxAssetServerBaseUrl = process.env.NGINX_ASSET_SERVER_BASE_URL;

const closeIcon = nginxAssetServerBaseUrl + "svgs/closeIcon.svg";

export default function EndGameButton({
  closeGameFunction,
  externalRef,
}: {
  closeGameFunction?: () => void;
  externalRef?: React.RefObject<HTMLButtonElement>;
}) {
  return (
    <FgButton
      externalRef={externalRef}
      className="aspect-square h-[60%] rounded pb-3 pr-2"
      clickFunction={closeGameFunction}
      contentFunction={() => (
        <FgSVGElement
          className="flex aspect-square h-full items-center justify-center"
          src={closeIcon}
          attributes={[
            { key: "width", value: "100%" },
            { key: "height", value: "100%" },
            { key: "stroke", value: "#f2f2f2" },
            { key: "fill", value: "#f2f2f2" },
          ]}
        />
      )}
      hoverContent={<FgHoverContentStandard content="End game (x)" />}
      options={{
        hoverTimeoutDuration: 750,
        hoverType: "above",
        hoverSpacing: 4,
      }}
    />
  );
}
