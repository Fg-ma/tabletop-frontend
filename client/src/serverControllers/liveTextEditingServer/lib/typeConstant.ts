export type OutGoingLiveTextEditingMessages =
  | onDeleteContentType
  | onGetInitialDocStateType
  | onDocUpdateType
  | onGetSavedOpsType
  | onDocSaveType
  | onGetDownloadMetaType
  | onGetFileChunkType;

type onDeleteContentType = {
  type: "deleteContent";
  header: {
    tableId: string;
    contentId: string;
    instanceId: string;
  };
};

type onGetInitialDocStateType = {
  type: "getInitialDocState";
  header: {
    tableId: string;
    username: string;
    instance: string;
    contentId: string;
    instanceId: string;
  };
};

type onDocUpdateType = {
  type: "docUpdate";
  header: {
    tableId: string;
    username: string;
    instance: string;
    contentId: string;
    instanceId: string;
  };
  data: {
    payload: any;
  };
};

type onGetSavedOpsType = {
  type: "getSavedOps";
  header: {
    tableId: string;
    username: string;
    instance: string;
    contentId: string;
    instanceId: string;
  };
};

type onDocSaveType = {
  type: "docSave";
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
    contentId: string;
  };
};

type onGetFileChunkType = {
  type: "getFileChunk";
  header: {
    tableId: string;
    username: string;
    instance: string;
    contentId: string;
  };
  data: {
    range: string;
  };
};

export type IncomingLiveTextEditingMessages =
  | onDocUpdatedType
  | onDocSavedType
  | onDocSavedFailType
  | onDocSavedNewContentType
  | onInitialDocRespondedType
  | onSavedOpsType
  | onGetSavedOpsResponseRespondedType
  | onChunkType
  | onChunkErrorType
  | onDownloadMetaType
  | onOneShotDownloadType
  | onDownloadErrorType;

export type onDocUpdatedType = {
  type: "docUpdated";
  header: { contentId: string; instanceId: string };
  data: { payload: Uint8Array<ArrayBuffer> };
};

export type onDocSavedType = {
  type: "docSaved";
  header: { contentId: string; instanceId: string };
};

export type onDocSavedFailType = {
  type: "docSavedFail";
  header: { contentId: string; instanceId: string };
};

export type onDocSavedNewContentType = {
  type: "docSavedNewContent";
  header: { oldContentId: string; newContentId: string; instanceId: string };
};

export type onInitialDocRespondedType = {
  type: "initialDocResponded";
  header: {
    contentId: string;
    instanceId: string;
    lastOps: boolean;
  };
  data: {
    payload: Uint8Array<ArrayBuffer>[];
  };
};

export type onSavedOpsType = {
  type: "savedOps";
  header: {
    contentId: string;
    instanceId: string;
    lastOps: boolean;
  };
  data: {
    payload: Uint8Array<ArrayBuffer>[];
  };
};

export type onGetSavedOpsResponseRespondedType = {
  type: "getSavedOpsResponse";
  header: {
    contentId: string;
    instanceId: string;
    lastOps: boolean;
  };
  data: {
    payload: Uint8Array<ArrayBuffer>[];
  };
};

export type onChunkType = {
  type: "chunk";
  header: {
    contentId: string;
    idx: number;
  };
  data: {
    payload: Uint8Array<ArrayBuffer>;
  };
};

export type onChunkErrorType = {
  type: "chunkError";
  header: {
    contentId: string;
  };
};

export type onDownloadMetaType = {
  type: "downloadMeta";
  header: {
    contentId: string;
  };
  data: {
    fileSize: number;
  };
};

export type onOneShotDownloadType = {
  type: "oneShotDownload";
  header: {
    contentId: string;
  };
  data: {
    payload: Uint8Array<ArrayBuffer>;
    fileSize: number;
  };
};

export type onDownloadErrorType = {
  type: "downloadError";
  header: { contentId: string };
};
