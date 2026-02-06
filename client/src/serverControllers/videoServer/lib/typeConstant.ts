import {
  TableContentStateTypes,
  StaticContentTypes,
  StaticMimeTypes,
} from "../../../../../universal/contentTypeConstant";

export type OutGoingVideoMessages =
  | onJoinTableType
  | onLeaveTableType
  | onDeleteContentType
  | onGetDownloadMetaType
  | onGetFileChunkType
  | onUpdateVideoMetadataType
  | onRequestCatchUpVideoMetadataType
  | onDeleteUploadSessionType
  | onSignalReuploadStartType;

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

type onDeleteContentType = {
  type: "deleteContent";
  header: {
    tableId: string;
    contentId: string;
    instanceId: string;
  };
};

type onGetDownloadMetaType = {
  type: "getDownloadMeta";
  header: {
    tableId: string;
    username: string;
    instance: string;
    contentType: StaticContentTypes;
    contentId: string;
  };
};

type onGetFileChunkType = {
  type: "getFileChunk";
  header: {
    tableId: string;
    username: string;
    instance: string;
    contentType: StaticContentTypes;
    contentId: string;
  };
  data: {
    range: string;
  };
};

type onUpdateVideoMetadataType = {
  type: "updateVideoMetadata";
  header: {
    tableId: string;
    contentId: string;
    instanceId: string;
  };
  data: {
    isPlaying: boolean;
    videoPosition: number;
    videoPlaybackSpeed: number;
    ended: boolean;
  };
};

type onRequestCatchUpVideoMetadataType = {
  type: "requestCatchUpVideoMetadata";
  header: {
    tableId: string;
    username: string;
    instance: string;
    contentId: string;
    instanceId: string;
  };
};

type onDeleteUploadSessionType = {
  type: "deleteUploadSession";
  header: {
    uploadId: string;
    contentId: string;
  };
};

type onSignalReuploadStartType = {
  type: "signalReuploadStart";
  header: {
    tableId: string;
    contentType: StaticContentTypes;
    contentId: string;
  };
};

export type IncomingVideoMessages =
  | { type: undefined }
  | onVideoFailedUploadType
  | onProcessingProgressType
  | onProcessingFinishedType
  | onVideoUploadedToTableType
  | onVideoUploadedToTabledType
  | onDashVideoReadyType
  | onContentReuploadedType
  | onChunkType
  | onChunkErrorType
  | onDownloadMetaType
  | onOneShotDownloadType
  | onDownloadErrorType
  | onUpdatedVideoMetadataType
  | onRespondedCatchUpVideoMetadataType
  | onReuploadStartedType
  | onReuploadCancelledType;

export type onVideoFailedUploadType = {
  type: "videoFailedUpload";
  header: { contentId: string; filename: string };
};

export type onProcessingProgressType = {
  type: "processingProgress";
  header: { contentId: string };
  data: { progress: number };
};

export type onProcessingFinishedType = {
  type: "processingFinished";
  header: { contentId: string; oneShot: boolean; filename: string };
};

export type onVideoUploadedToTableType = {
  type: "videoUploadedToTable";
  header: {
    contentId: string;
    instanceId: string;
  };
  data: {
    filename: string;
    mimeType: StaticMimeTypes;
    state: TableContentStateTypes[];
    initPositioning:
      | {
          position: {
            top: number;
            left: number;
          };
          scale: {
            x: number;
            y: number;
          };
          rotation: number;
        }
      | undefined;
  };
};

export type onVideoUploadedToTabledType = {
  type: "videoUploadedToTabled";
  header: {
    contentId: string;
  };
  data: {
    filename: string;
    mimeType: StaticMimeTypes;
    state: TableContentStateTypes[];
  };
};

export type onDashVideoReadyType = {
  type: "dashVideoReady";
  header: {
    videoId: string;
  };
  data: {
    filename: string;
  };
};

export type onContentReuploadedType = {
  type: "contentReuploaded";
  header: {
    contentId: string;
    contentType: StaticContentTypes;
  };
};

export type onChunkType = {
  type: "chunk";
  header: {
    contentType: StaticContentTypes;
    contentId: string;
    range: string;
  };
  data: {
    chunk: Uint8Array<any>;
  };
};

export type onChunkErrorType = {
  type: "chunkError";
  header: {
    contentType: StaticContentTypes;
    contentId: string;
  };
};

export type onDownloadMetaType = {
  type: "downloadMeta";
  header: {
    contentType: StaticContentTypes;
    contentId: string;
  };
  data: {
    fileSize: number;
  };
};

export type onOneShotDownloadType = {
  type: "oneShotDownload";
  header: {
    contentType: StaticContentTypes;
    contentId: string;
  };
  data: {
    buffer: Uint8Array<any>;
  };
};

export type onDownloadErrorType = {
  type: "downloadError";
  header: { contentType: StaticContentTypes; contentId: string };
};

export type onUpdatedVideoMetadataType = {
  type: "updatedVideoMetadata";
  header: {
    contentId: string;
    instanceId: string;
  };
  data: {
    isPlaying: boolean;
    lastKnownPosition: number;
    videoPlaybackSpeed: number;
    ended: boolean;
    lastUpdatedAt: number;
  };
};

export type onRespondedCatchUpVideoMetadataType = {
  type: "respondedCatchUpVideoMetadata";
  header: {
    contentId: string;
    instanceId: string;
  };
  data: {
    isPlaying: boolean;
    lastKnownPosition: number;
    videoPlaybackSpeed: number;
    ended: boolean;
    lastUpdatedAt: number;
  };
};

export type onReuploadStartedType = {
  type: "reuploadStarted";
  header: {
    contentType: StaticContentTypes;
    contentId: string;
  };
};

export type onReuploadCancelledType = {
  type: "reuploadCancelled";
  header: {
    contentType: StaticContentTypes;
    contentId: string;
  };
};
