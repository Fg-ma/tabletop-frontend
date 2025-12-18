import React from "react";
import { TableColors } from "../../../serverControllers/tableServer/lib/typeConstant";
import UserBubble from "../UserBubble";
import { tableColorMap } from "../tableColors";

const nginxAssetServerBaseUrl = process.env.NGINX_ASSET_SERVER_BASE_URL;

const hamster_64x64 =
  nginxAssetServerBaseUrl + "backgroundImages/pixelArt/hamster_64x64.jpg";

export default function LeftTableSection({
  userData,
  tableContainerRef,
}: {
  userData: {
    [username: string]: {
      color: TableColors;
      seat: number;
      online: boolean;
    };
  };
  tableContainerRef: React.RefObject<HTMLDivElement>;
}) {
  const minDimension = Math.min(
    tableContainerRef.current?.clientWidth ?? 0,
    tableContainerRef.current?.clientHeight ?? 0,
  );
  const leftSeats = [13, 14, 15, 16];
  const leftUsers = Object.entries(userData).filter((data) =>
    leftSeats.includes(data[1].seat),
  );

  return (
    <div
      className={`flex h-full w-max max-w-[8%] flex-col items-center ${
        leftUsers.length > 1 ? "justify-between" : "justify-center"
      }`}
      style={{
        maxWidth: `${minDimension * 0.08}px`,
        ...(leftUsers.length !== 0 && {
          marginRight: `${minDimension * 0.01}px`,
        }),
      }}
    >
      <div></div>
      {leftUsers.map((user) => (
        <UserBubble
          key={user[0]}
          username={user[0]}
          userData={userData}
          fullDim="width"
          placement="left"
          src={hamster_64x64}
          srcLoading={hamster_64x64}
          primaryColor={tableColorMap[user[1].color]?.primary}
          secondaryColor={tableColorMap[user[1].color]?.secondary}
        />
      ))}
      <div></div>
    </div>
  );
}
