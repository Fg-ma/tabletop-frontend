import BundlesController from "../../lib/BundlesController";
import { StaticContentMediaType } from "../../context/mediaContext/lib/typeConstant";
import SnakeGameMedia from "../../media/games/snakeGame/SnakeGameMedia";
import {
  IncomingMessages,
  onGameClosedType,
  onGameInitiatedType,
  onUserJoinedTableType,
  OutGoingMessages,
} from "./lib/typeConstant";
import { GameTypes } from "../../../../universal/contentTypeConstant";

const gamesServerIp = process.env.GAMES_SERVER_IP;
const gamesServerPort = process.env.GAMES_SERVER_PORT;

class GamesServerController {
  protected ws: WebSocket | undefined;
  private messageListeners: Set<(message: IncomingMessages) => void> =
    new Set();

  constructor(
    private tableId: string,
    private username: string,
    private instance: string,
    private url: string,
    private staticContentMedia: React.MutableRefObject<StaticContentMediaType>,
    private bundlesController: React.MutableRefObject<BundlesController>,
  ) {
    this.connect(this.url);
  }

  deconstructor = () => {
    if (this.ws) {
      this.ws.close();
      this.ws.onmessage = null;
      this.ws.onopen = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
    }

    this.messageListeners.clear();
  };

  private connect = (url: string) => {
    this.ws = new WebSocket(url);

    this.ws.onmessage = async (event: MessageEvent) => {
      let rawData: string;

      if (event.data instanceof Blob) {
        rawData = await event.data.text();
      } else {
        rawData = event.data;
      }

      let message: IncomingMessages;
      try {
        message = JSON.parse(rawData);
      } catch (err) {
        console.error("Invalid JSON from WebSocket:", rawData);
        return;
      }

      this.handleMessage(message);

      this.messageListeners.forEach((listener) => {
        listener(message);
      });
    };
  };

  addMessageListener = (
    listener: (message: IncomingMessages) => void,
  ): void => {
    this.messageListeners.add(listener);
  };

  removeMessageListener = (
    listener: (message: IncomingMessages) => void,
  ): void => {
    this.messageListeners.delete(listener);
  };

  sendMessage = (message: OutGoingMessages) => {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  };

  handleMessage = (event: IncomingMessages) => {
    switch (event.type) {
      case "gameInitiated":
        this.onGameInitiated(event);
        break;
      case "gameClosed":
        this.onGameClosed(event);
        break;
      case "userJoinedTable":
        this.onUserJoinedTable(event);
        break;
      default:
        break;
    }
  };

  onGameInitiated = async (event: onGameInitiatedType) => {
    const { gameType, gameId } = event.header;
    const { initiator } = event.data;

    switch (gameType) {
      case "snake": {
        if (!this.staticContentMedia.current.games.snake) {
          this.staticContentMedia.current.games.snake = {};
        }
        const snakeGameMedia = new SnakeGameMedia(
          this.tableId,
          this.username,
          this.instance,
          gameId,
          `wss://${gamesServerIp}:${gamesServerPort}/ws/${this.tableId}/${this.username}/${this.instance}/games/${gameType}/${gameId}`,
          initiator.username === this.username &&
            initiator.instance === this.instance,
        );

        this.staticContentMedia.current.games.snake[gameId] = snakeGameMedia;
        break;
      }
    }
  };

  onGameClosed = (event: onGameClosedType) => {
    const { gameType, gameId } = event.header;

    switch (gameType) {
      case "snake":
        {
          if (
            this.staticContentMedia.current.games.snake &&
            this.staticContentMedia.current.games.snake[gameId]
          ) {
            this.staticContentMedia.current.games.snake[gameId].destructor();
            delete this.staticContentMedia.current.games.snake[gameId];

            if (
              Object.keys(this.staticContentMedia.current.games.snake)
                .length === 0
            ) {
              delete this.staticContentMedia.current.games.snake;
            }
          }
        }
        break;
      default:
        break;
    }

    this.bundlesController.current.cleanUpProducerBundle();
  };

  onUserJoinedTable = (event: onUserJoinedTableType) => {
    const { activeGames } = event.data;

    activeGames.map(async (activeGame) => {
      switch (activeGame.gameType) {
        case "snake": {
          if (!this.staticContentMedia.current.games.snake) {
            this.staticContentMedia.current.games.snake = {};
          }
          const snakeGameMedia = new SnakeGameMedia(
            this.tableId,
            this.username,
            this.instance,
            activeGame.gameId,
            `wss://${gamesServerIp}:${gamesServerPort}/ws/${this.tableId}/${this.username}/${this.instance}/games/${activeGame.gameType}/${activeGame.gameId}`,
            false,
            activeGame.positioning,
          );

          this.staticContentMedia.current.games.snake[activeGame.gameId] =
            snakeGameMedia;
          break;
        }
      }
    });
  };

  initiateGame = (gameType: GameTypes, gameId: string) => {
    this.sendMessage({
      type: "initiateGame",
      header: {
        tableId: this.tableId,
        gameType,
        gameId,
      },
      data: {
        initiator: { username: this.username, instance: this.instance },
      },
    });
  };

  updateContentPositioning = (
    gameType: GameTypes,
    gameId: string,
    positioning: {
      position?: {
        left: number;
        top: number;
      };
      scale?: {
        x: number;
        y: number;
      };
      rotation?: number;
    },
  ) => {
    this.sendMessage({
      type: "updateContentPositioning",
      header: {
        tableId: this.tableId,
        gameType,
        gameId,
      },
      data: {
        positioning,
      },
    });
  };
}

export default GamesServerController;
