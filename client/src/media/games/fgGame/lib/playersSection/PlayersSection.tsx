import React, { useEffect, useRef, useState } from "react";
import GamePlayerIcon from "./lib/GamePlayerIcon";
import FgGameController from "../FgGameController";

export default function PlayersSection({
  players,
  fgGameController,
}: {
  players?: {
    user?: {
      primaryColor?: string;
      secondaryColor?: string;
      shadowColor?: { r: number; g: number; b: number };
    };
    players: {
      primaryColor?: string;
      secondaryColor?: string;
      shadowColor?: { r: number; g: number; b: number };
    }[];
  };
  fgGameController: FgGameController;
}) {
  const [isHover, setIsHover] = useState(false);
  const playersSectionRef = useRef<HTMLDivElement>(null);
  const hoverTimeout = useRef<NodeJS.Timeout | undefined>(undefined);

  const handlePointerEnter = () => {
    setIsHover(true);
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
      hoverTimeout.current = undefined;
    }
  };

  const handlePointerLeave = () => {
    if (!hoverTimeout.current) {
      hoverTimeout.current = setTimeout(() => {
        setIsHover(false);
      }, 750);
    }
  };

  useEffect(() => {
    if (!isHover || !playersSectionRef.current) {
      return;
    }

    playersSectionRef.current.scrollTop =
      playersSectionRef.current.scrollHeight;
  }, [isHover]);

  return (
    <div
      ref={playersSectionRef}
      onPointerEnter={() =>
        fgGameController.handlePointerEnter("buttons", playersSectionRef)
      }
      onPointerLeave={() =>
        fgGameController.handlePointerLeave("buttons", playersSectionRef)
      }
      className="hide-scroll-bar z-10 min-h-14 w-full overflow-y-auto py-2"
    >
      <div
        className="flex h-max w-full flex-col items-center justify-end space-y-2 px-2"
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onWheel={(event) => {
          event.stopPropagation();
        }}
      >
        {isHover &&
          players &&
          players.players.map((player, index) => {
            if (index !== 0 || players.user !== undefined) {
              return (
                <GamePlayerIcon
                  key={index}
                  primaryColor={player.primaryColor}
                  secondaryColor={player.secondaryColor}
                  shadowColor={player.shadowColor}
                />
              );
            }
          })}
        {players &&
          (players.user ? (
            <GamePlayerIcon
              primaryColor={players.user.primaryColor}
              secondaryColor={players.user.secondaryColor}
              shadowColor={players.user.shadowColor}
            />
          ) : (
            players.players[0] && (
              <GamePlayerIcon
                primaryColor={players.players[0].primaryColor}
                secondaryColor={players.players[0].secondaryColor}
                shadowColor={players.players[0].shadowColor}
              />
            )
          ))}
      </div>
    </div>
  );
}
