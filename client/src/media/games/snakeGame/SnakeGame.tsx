import React, { useState, useEffect, useRef } from "react";
import { useMediaContext } from "../../../context/mediaContext/MediaContext";
import { useUserInfoContext } from "../../../context/userInfoContext/UserInfoContext";
import FgGame from "../fgGame/FgGame";
import FgButton from "../../../elements/fgButton/FgButton";
import FgSVGElement from "../../../elements/fgSVGElement/FgSVGElement";
import FgImageElement from "../../../elements/fgImageElement/FgImageElement";
import SnakeGameController from "./lib/SnakeGameController";
import SnakeColorPickerPanel from "./lib/SnakeColorPickerPanel";
import SnakeGridSizePanel from "./lib/SnakeGridSizePanel";
import {
  colorMap,
  GameState,
  PlayersState,
  snakeColorIconMap,
  SnakeColorsType,
} from "./lib/typeConstant";
import "./lib/snakeGame.css";

const nginxAssetServerBaseUrl = process.env.NGINX_ASSET_SERVER_BASE_URL;

const gameOverCard =
  nginxAssetServerBaseUrl + "snakeGameAssets/gameOverCard.jpg";

const snakeColorChangeIcon =
  nginxAssetServerBaseUrl + "svgs/games/snake/snakeColorChangeIcon.svg";
const gridIcon = nginxAssetServerBaseUrl + "svgs/games/snake/gridIcon.svg";
const gridOffIcon =
  nginxAssetServerBaseUrl + "svgs/games/snake/gridOffIcon.svg";

function SnakeGame({
  tableTopRef,
  snakeGameId,
  sharedBundleRef,
}: {
  tableTopRef: React.RefObject<HTMLDivElement>;
  snakeGameId: string;
  sharedBundleRef: React.RefObject<HTMLDivElement>;
}) {
  const { staticContentMedia } = useMediaContext();
  const { username, instance } = useUserInfoContext();

  const snakeGame = useRef(
    staticContentMedia.current.games.snake?.[snakeGameId],
  );

  if (!snakeGame.current) return;

  const [gridSize, setGridSize] = useState(15);

  const [gameState, setGameState] = useState<GameState>({
    snakes: {},
    food: [],
  });
  const playersState = useRef<PlayersState>({});
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [snakeColorPanelActive, setSnakeColorPanelActive] = useState(false);
  const [gridSizePanelActive, setGridSizePanelActive] = useState(false);
  const focused = useRef(true);
  const boardRef = useRef<HTMLDivElement>(null);
  const snakeColorPickerButtonRef = useRef<HTMLButtonElement>(null);
  const snakeGridSizeButtonRef = useRef<HTMLButtonElement>(null);
  const snakeColorPickerPanelRef = useRef<HTMLDivElement>(null);
  const snakeGridSizePanelRef = useRef<HTMLDivElement>(null);
  const userSnakeColor = useRef<SnakeColorsType | undefined>(undefined);

  const [_, setRerender] = useState(false);

  const snakeGameController = new SnakeGameController(
    snakeGame,
    gridSize,
    gameState,
    setGameState,
    focused,
    started,
    setStarted,
    setGameOver,
    playersState,
    setGridSize,
    setRerender,
  );

  useEffect(() => {
    document.addEventListener("keydown", snakeGameController.handleKeyPress);

    boardRef.current?.style.setProperty(
      "--nginx-asset-server-base-url",
      nginxAssetServerBaseUrl ?? "",
    );

    return () => {
      document.removeEventListener(
        "keydown",
        snakeGameController.handleKeyPress,
      );
    };
  }, [started]);

  useEffect(() => {
    snakeGame.current?.addSnakeGameListener(
      snakeGameController.handleSnakeGameMessage,
    );

    return () => {
      snakeGame.current?.removeSnakeGameListener(
        snakeGameController.handleSnakeGameMessage,
      );
    };
  }, []);

  useEffect(() => {
    if (snakeGame.current?.initiator) {
      snakeGame.current?.joinGame({});
    }
  }, [snakeGame.current?.initiator]);

  return (
    <>
      <FgGame
        tableTopRef={tableTopRef}
        externalHideControls={!snakeColorPanelActive && !gridSizePanelActive}
        gameId={snakeGameId}
        gameType="snake"
        gameStarted={started}
        sharedBundleRef={sharedBundleRef}
        content={
          <div
            ref={boardRef}
            className="selectable snake-game-board relative flex aspect-square w-full flex-col overflow-hidden rounded"
            data-selectable-type="games"
            data-selectable-id={snakeGameId}
          >
            {snakeGameController.renderBoard()}
            {gameOver && (
              <div
                className="absolute left-0 top-0 flex h-full w-full cursor-pointer items-center justify-center bg-fg-tone-black-1 bg-opacity-30"
                onClick={snakeGameController.startGameClick}
              >
                <div
                  className="flex h-3/5 w-4/5 items-center justify-center rounded-lg bg-cover bg-no-repeat font-K2D text-2xl"
                  style={{ backgroundImage: `url(${gameOverCard})` }}
                ></div>
              </div>
            )}
            {!started && !gameOver && (
              <div
                className="absolute left-0 top-0 flex h-full w-full items-center justify-center bg-fg-tone-black-1 bg-opacity-30"
                onClick={snakeGameController.startGameClick}
              >
                <div className="flex h-3/5 w-4/5 select-none items-center justify-center overflow-hidden rounded-lg bg-fg-white-95 text-center font-K2D text-2xl">
                  <p className="line-clamp-2 px-2">Press any key to start</p>
                </div>
              </div>
            )}
          </div>
        }
        gameFunctionsSection={[
          ...(playersState.current[username.current] &&
          playersState.current[username.current][instance.current]
            ? [
                <FgButton
                  key="snakeColor"
                  className="aspect-square w-full overflow-hidden rounded-xl border-2 border-gray-300 bg-fg-white"
                  clickFunction={() =>
                    setSnakeColorPanelActive((prev) => !prev)
                  }
                  contentFunction={() => {
                    const { primary, secondary } =
                      playersState.current[username.current][instance.current]
                        .snakeColor;

                    return (
                      <FgImageElement
                        // @ts-expect-error: can't correlate primary with secondary color
                        src={snakeColorIconMap[primary][secondary]}
                        style={{ width: "100%", height: "100%" }}
                        alt={`Snake color option: ${primary} ${secondary}`}
                      />
                    );
                  }}
                />,
                <FgButton
                  key="snakeColorPicker"
                  externalRef={snakeColorPickerButtonRef}
                  className="aspect-square w-full"
                  clickFunction={() =>
                    setSnakeColorPanelActive((prev) => !prev)
                  }
                  contentFunction={() => (
                    <FgSVGElement
                      src={snakeColorChangeIcon}
                      attributes={[
                        { key: "width", value: "100%" },
                        { key: "height", value: "100%" },
                        { key: "fill", value: "#f2f2f2" },
                        { key: "stroke", value: "#f2f2f2" },
                        ...(snakeColorPanelActive
                          ? [
                              {
                                key: "stroke",
                                value: "#3cf599",
                                id: "circle1",
                              },
                              {
                                key: "stroke",
                                value: "#3991ff",
                                id: "circle2",
                              },
                              {
                                key: "stroke",
                                value: "#fd473c",
                                id: "circle3",
                              },
                            ]
                          : []),
                      ]}
                    />
                  )}
                />,
                <FgButton
                  key="snakeGridSize"
                  externalRef={snakeGridSizeButtonRef}
                  className="aspect-square w-full"
                  clickFunction={() => setGridSizePanelActive((prev) => !prev)}
                  contentFunction={() => {
                    const src = gridSizePanelActive ? gridOffIcon : gridIcon;

                    return (
                      <FgSVGElement
                        src={src}
                        attributes={[
                          { key: "width", value: "100%" },
                          { key: "height", value: "100%" },
                          { key: "fill", value: "#f2f2f2" },
                          { key: "stroke", value: "#f2f2f2" },
                        ]}
                      />
                    );
                  }}
                />,
              ]
            : []),
        ]}
        players={{
          user:
            playersState.current[username.current] &&
            playersState.current[username.current][instance.current]
              ? {
                  primaryColor:
                    playersState.current[username.current][instance.current]
                      .snakeColor.primary,
                  secondaryColor:
                    playersState.current[username.current][instance.current]
                      .snakeColor.secondary,
                  shadowColor:
                    colorMap[
                      playersState.current[username.current][instance.current]
                        .snakeColor.primary
                    ],
                }
              : undefined,
          players: Object.entries(playersState.current)
            .flatMap(([playerUsername, userState]) =>
              Object.entries(userState).map(
                ([playerInstance, instanceState]) => {
                  if (
                    playerUsername !== username.current ||
                    playerInstance !== instance.current
                  ) {
                    return {
                      primaryColor: instanceState.snakeColor.primary,
                      secondaryColor: instanceState.snakeColor.secondary,
                      shadowColor: colorMap[instanceState.snakeColor.primary],
                    };
                  }
                },
              ),
            )
            .filter((player) => player !== undefined),
        }}
        startGameFunction={() => {
          if (!started) {
            setGameOver(false);
            snakeGame.current?.startGame();
          }
        }}
        closeGameFunction={() => {
          snakeGame.current?.closeGame();
        }}
        joinGameFunction={() => {
          snakeGame.current?.joinGame({
            snakeColor: userSnakeColor.current,
          });
        }}
        leaveGameFunction={() => {
          if (
            Object.keys(playersState.current).length === 0 ||
            (Object.keys(playersState.current).length === 1 &&
              Object.keys(Object.values(playersState.current)[0]).length <= 1)
          ) {
            snakeGame.current?.closeGame();
          } else {
            snakeGame.current?.leaveGame();
          }
        }}
        popupRefs={[snakeColorPickerPanelRef, snakeGridSizePanelRef]}
        initPositioning={snakeGame.current.positioning}
        setPositioning={(positioning) => {
          if (snakeGame.current) snakeGame.current.positioning = positioning;
          if (gridSizePanelActive) {
            setGridSizePanelActive(false);
          }
          if (snakeColorPanelActive) {
            setSnakeColorPanelActive(false);
          }
        }}
      />
      {snakeColorPanelActive && (
        <SnakeColorPickerPanel
          externalRef={snakeColorPickerPanelRef}
          snakeGameId={snakeGameId}
          snakeColorPickerButtonRef={snakeColorPickerButtonRef}
          setSnakeColorPanelActive={setSnakeColorPanelActive}
          playersState={playersState}
          userSnakeColor={userSnakeColor}
        />
      )}
      {gridSizePanelActive && (
        <SnakeGridSizePanel
          externalRef={snakeGridSizePanelRef}
          started={started}
          snakeGameId={snakeGameId}
          snakeGridSizeButtonRef={snakeGridSizeButtonRef}
          setGridSizePanelActive={setGridSizePanelActive}
          gridSize={gridSize}
          setGridSize={setGridSize}
        />
      )}
    </>
  );
}

export default SnakeGame;
