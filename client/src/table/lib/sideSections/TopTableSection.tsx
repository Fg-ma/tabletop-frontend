import React from "react";
import { TableColors } from "../../../serverControllers/tableServer/lib/typeConstant";
import UserBubble from "../UserBubble";
import { tableColorMap } from "../tableColors";

const nginxAssetServerBaseUrl = process.env.NGINX_ASSET_SERVER_BASE_URL;

const hamster_64x64 =
  nginxAssetServerBaseUrl + "backgroundImages/pixelArt/hamster_64x64.jpg";

export default function TopTableSection({
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
  const topSeats = [1, 2, 3, 4];
  const topUsers = Object.entries(userData)
    .filter((data) => topSeats.includes(data[1].seat))
    .sort((a, b) => a[1].seat - b[1].seat);

  return (
    <div
      className={`flex h-max w-full items-center ${
        topUsers.length > 1 ? "justify-between" : "justify-center"
      }`}
      style={{
        maxHeight: `${minDimension * 0.08}px`,
        ...(Object.keys(userData).length >= 4 && {
          paddingLeft: `${minDimension * 0.08}px`,
          paddingRight: `${minDimension * 0.08}px`,
        }),
        ...(topUsers.length !== 0 && {
          marginBottom: `${minDimension * 0.01}px`,
        }),
      }}
    >
      <div></div>
      {topUsers.map((user) => (
        <UserBubble
          key={user[0]}
          username={user[0]}
          userData={userData}
          fullDim="height"
          placement="top"
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
