import { GameTypes } from "../../../../universal/contentTypeConstant";
import { SnakeColorsType } from "./snakeGame/lib/typeConstant";

type OutGoingUniversalMessages =
  | {
      type: "startGame";
      header: {
        tableId: string;
        gameType: GameTypes;
        gameId: string;
      };
    }
  | {
      type: "closeGame";
      header: {
        tableId: string;
        gameType: GameTypes;
        gameId: string;
      };
    }
  | {
      type: "joinGame";
      header: {
        tableId: string;
        username: string;
        instance: string;
        gameType: GameTypes;
        gameId: string;
      };
      data: { snakeColor?: SnakeColorsType };
    }
  | {
      type: "leaveGame";
      header: {
        tableId: string;
        username: string;
        instance: string;
        gameType: GameTypes;
        gameId: string;
      };
    }
  | {
      type: "getPlayersState";
      header: {
        tableId: string;
        username: string;
        instance: string;
        gameType: GameTypes;
        gameId: string;
      };
    }
  | {
      type: "getInitialGameStates";
      header: {
        tableId: string;
        username: string;
        instance: string;
        gameType: GameTypes;
        gameId: string;
      };
    };

class GameMediaUniversalFunctions {
  ws: WebSocket | undefined;

  constructor(
    protected tableId: string,
    protected username: string,
    protected instance: string,
    protected gameType: GameTypes,
    protected gameId: string,
  ) {}

  sendUniversalMessage = (message: OutGoingUniversalMessages) => {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  };

  startGame = () => {
    this.sendUniversalMessage({
      type: "startGame",
      header: {
        tableId: this.tableId,
        gameType: this.gameType,
        gameId: this.gameId,
      },
    });
  };

  closeGame = () => {
    this.sendUniversalMessage({
      type: "closeGame",
      header: {
        tableId: this.tableId,
        gameType: this.gameType,
        gameId: this.gameId,
      },
    });
  };

  joinGame = (data: { snakeColor?: SnakeColorsType }) => {
    this.sendUniversalMessage({
      type: "joinGame",
      header: {
        tableId: this.tableId,
        username: this.username,
        instance: this.instance,
        gameType: this.gameType,
        gameId: this.gameId,
      },
      data,
    });
  };

  leaveGame = () => {
    this.sendUniversalMessage({
      type: "leaveGame",
      header: {
        tableId: this.tableId,
        username: this.username,
        instance: this.instance,
        gameType: this.gameType,
        gameId: this.gameId,
      },
    });
  };

  getPlayersState = () => {
    this.sendUniversalMessage({
      type: "getPlayersState",
      header: {
        tableId: this.tableId,
        username: this.username,
        instance: this.instance,
        gameType: this.gameType,
        gameId: this.gameId,
      },
    });
  };

  getInitialGameStates = () => {
    this.sendUniversalMessage({
      type: "getInitialGameStates",
      header: {
        tableId: this.tableId,
        username: this.username,
        instance: this.instance,
        gameType: this.gameType,
        gameId: this.gameId,
      },
    });
  };
}

export default GameMediaUniversalFunctions;
