import React from "react";
import FgButton from "../../../elements/fgButton/FgButton";
import FgSVGElement from "../../../elements/fgSVGElement/FgSVGElement";
import FgHoverContentStandard from "../../../elements/fgHoverContentStandard/FgHoverContentStandard";

const nginxAssetServerBaseUrl = process.env.NGINX_ASSET_SERVER_BASE_URL;

const tableTopReducedLineIcon =
  nginxAssetServerBaseUrl + "svgs/tableTopReducedLineIcon.svg";
const tableTopReducedShrunkIcon =
  nginxAssetServerBaseUrl + "svgs/tableTopReducedShrunkIcon.svg";

export default function TabledSection({
  tabledActive,
  setTabledActive,
}: {
  tabledActive: boolean;
  setTabledActive: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  return (
    <FgButton
      clickFunction={() => setTabledActive((prev) => !prev)}
      className="flex aspect-square h-full items-center justify-center"
      contentFunction={() => {
        return (
          <FgSVGElement
            src={
              tabledActive ? tableTopReducedShrunkIcon : tableTopReducedLineIcon
            }
            className="aspect-square h-full fill-fg-off-white stroke-fg-off-white"
            attributes={[
              { key: "width", value: "100%" },
              { key: "height", value: "100%" },
            ]}
          />
        );
      }}
      hoverContent={
        <FgHoverContentStandard
          content={
            tabledActive ? "Close tabled content" : "Open tabled content"
          }
        />
      }
      options={{ hoverTimeoutDuration: 750 }}
      aria-label={"Tabled content"}
    />
  );
}
