import { FgBackground } from "../../../elements/fgBackgroundSelector/lib/typeConstant";
import { ContentTypes } from "../../../../../universal/contentTypeConstant";
import {
  TableReactions,
  TableReactionStyles,
} from "../../../../../universal/reactionsTypeConstant";

export type TableColors =
  | "cyan"
  | "orange"
  | "blue"
  | "green"
  | "yellow"
  | "purple"
  | "pink"
  | "black"
  | "white"
  | "brown"
  | "lime"
  | "coral"
  | "gray"
  | "navy"
  | "lightBlue"
  | "tableTop";

export type OutGoingTableMessages =
  | onJoinTableType
  | onLeaveTableType
  | onChangeTableBackgroundType
  | onMoveSeatsType
  | onSwapSeatsType
  | onKickFromTableType
  | onReactionType;

type onJoinTableType = {
  type: "joinTable";
  header: {
    tableId: string;
    username: string;
    instance: string;
  };
};

type onLeaveTableType = {
  type: "leaveTable";
  header: {
    tableId: string;
    username: string;
    instance: string;
  };
};

type onChangeTableBackgroundType = {
  type: "changeTableBackground";
  header: {
    tableId: string;
    username: string;
    instance: string;
  };
  data: { background: FgBackground };
};

type onMoveSeatsType = {
  type: "moveSeats";
  header: {
    tableId: string;
    username: string;
  };
  data: { direction: "left" | "right" };
};

type onSwapSeatsType = {
  type: "swapSeats";
  header: {
    tableId: string;
    username: string;
    targetUsername: string;
  };
};

type onKickFromTableType = {
  type: "kickFromTable";
  header: {
    tableId: string;
    username: string;
    targetUsername: string;
  };
};

type onReactionType = {
  type: "reaction";
  header: {
    tableId: string;
    contentType: ContentTypes;
    contentId: string | undefined;
    instanceId: string | undefined;
  };
  data: { reaction: TableReactions; reactionStyle: TableReactionStyles };
};

export type IncomingTableMessages =
  | onTableBackgroundChangedType
  | onUserJoinedTableType
  | onUserLeftTableType
  | onSeatsMovedType
  | onSeatsSwappedType
  | onKickedFromTableType
  | onReactionOccurredType;

export type onTableBackgroundChangedType = {
  type: "tableBackgroundChanged";
  data: { background: FgBackground };
};

export type onUserJoinedTableType = {
  type: "userJoinedTable";
  data: {
    userData: {
      [username: string]: { color: TableColors; seat: number; online: boolean };
    };
  };
};

export type onUserLeftTableType = {
  type: "userLeftTable";
  header: { username: string; online: boolean };
};

export type onSeatsMovedType = {
  type: "seatsMoved";
  data: {
    userData: {
      [username: string]: { color: TableColors; seat: number; online: boolean };
    };
  };
};

export type onSeatsSwappedType = {
  type: "seatsSwapped";
  data: {
    username: string;
    targetUsername: string;
  };
};

export type onKickedFromTableType = {
  type: "kickedFromTable";
  data: {
    targetUsername: string;
  };
};

export type onReactionOccurredType = {
  type: "reactionOccurred";
  header: {
    contentType: ContentTypes;
    contentId: string | undefined;
    instanceId: string | undefined;
  };
  data: {
    reaction: TableReactions;
    reactionStyle: TableReactionStyles;
  };
};
