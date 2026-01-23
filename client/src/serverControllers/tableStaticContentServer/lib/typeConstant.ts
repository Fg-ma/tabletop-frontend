import {
  TableContentStateTypes,
  StaticContentTypes,
  StaticMimeTypes,
} from "../../../../../universal/contentTypeConstant";
import {
  ApplicationEffectStylesType,
  ApplicationEffectTypes,
  AudioEffectTypes,
  ImageEffectStylesType,
  ImageEffectTypes,
  SvgEffectStylesType,
  SvgEffectTypes,
  TextEffectStylesType,
  VideoEffectStylesType,
  VideoEffectTypes,
} from "../../../../../universal/effectsTypeConstant";

export type OutGoingTableStaticContentMessages =
  | onRequestCatchUpTableDataType
  | onDeleteContentType
  | onGetDownloadMetaType
  | onGetFileChunkType
  | onUpdateContentPositioningType
  | onUpdateContentEffectsType
  | onRequestCatchUpEffectsType
  | onChangeContentStateType
  | onCreateNewInstancesType
  | onSearchTabledContentRequestType
  | onDeleteUploadSessionType
  | onSignalReuploadStartType;

type onRequestCatchUpTableDataType = {
  type: "requestCatchUpTableData";
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
    contentType: StaticContentTypes;
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

type onUpdateContentPositioningType = {
  type: "updateContentPositioning";
  header: {
    tableId: string;
    contentType: StaticContentTypes;
    contentId: string;
    instanceId: string;
  };
  data: {
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
    };
  };
};

type onUpdateContentEffectsType = {
  type: "updateContentEffects";
  header: {
    tableId: string;
    contentType: StaticContentTypes;
    contentId: string;
    instanceId: string;
  };
  data: {
    effects?: {
      [effectType: string]: boolean;
    };
    effectStyles?:
      | VideoEffectStylesType
      | ImageEffectStylesType
      | ApplicationEffectStylesType
      | SvgEffectStylesType
      | TextEffectStylesType;
  };
};

type onRequestCatchUpEffectsType = {
  type: "requestCatchUpEffects";
  header: {
    tableId: string;
    username: string;
    instance: string;
    contentType: StaticContentTypes;
    contentId: string;
    instanceId: string;
  };
};

type onChangeContentStateType = {
  type: "changeContentState";
  header: {
    tableId: string;
    contentType: StaticContentTypes;
    contentId: string;
  };
  data: {
    state: TableContentStateTypes[];
  };
};

type onCreateNewInstancesType = {
  type: "createNewInstances";
  header: {
    tableId: string;
  };
  data: {
    updates: {
      contentType: StaticContentTypes;
      contentId: string;
      instances: {
        instanceId: string;
        positioning: {
          position: {
            left: number;
            top: number;
          };
          scale: {
            x: number;
            y: number;
          };
          rotation: number;
        };
      }[];
    }[];
  };
};

type onSearchTabledContentRequestType = {
  type: "searchTabledContentRequest";
  header: {
    tableId: string;
    username: string;
    instance: string;
    contentType: StaticContentTypes | "all";
  };
  data: {
    name: string;
  };
};

type onDeleteUploadSessionType = {
  type: "deleteUploadSession";
  header: {
    uploadId: string;
    contentId: string;
    contentType: StaticContentTypes;
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

export type IncomingTableStaticContentMessages =
  | { type: undefined }
  | onSoundClipUploadedToTableType
  | onSoundClipUploadedToTabledType
  | onApplicationUploadedToTableType
  | onApplicationUploadedToTabledType
  | onImageUploadedToTableType
  | onImageUploadedToTabledType
  | onSvgUploadedToTableType
  | onSvgUploadedToTabledType
  | onTextUploadedToTableType
  | onTextUploadedToTabledType
  | onContentReuploadedType
  | onChunkType
  | onChunkErrorType
  | onDownloadMetaType
  | onOneShotDownloadType
  | onDownloadErrorType
  | onResponsedCatchUpTableDataType
  | onContentDeletedType
  | onContentStateChangedType
  | onUpdatedContentEffectsType
  | onRespondedCatchUpEffectsType
  | onCreatedNewInstancesType
  | onSearchTabledContentRespondedType
  | onReuploadStartedType
  | onReuploadCancelledType;

export type onImageUploadedToTableType = {
  type: "imageUploadedToTable";
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

export type onImageUploadedToTabledType = {
  type: "imageUploadedToTabled";
  header: {
    contentId: string;
  };
  data: {
    filename: string;
    mimeType: StaticMimeTypes;
    state: TableContentStateTypes[];
  };
};

export type onSvgUploadedToTableType = {
  type: "svgUploadedToTable";
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

export type onSvgUploadedToTabledType = {
  type: "svgUploadedToTabled";
  header: {
    contentId: string;
  };
  data: {
    filename: string;
    mimeType: StaticMimeTypes;
    state: TableContentStateTypes[];
  };
};

export type onContentReuploadedType = {
  type: "contentReuploaded";
  header: {
    contentId: string;
    contentType: StaticContentTypes;
  };
};

export type onTextUploadedToTableType = {
  type: "textUploadedToTable";
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

export type onTextUploadedToTabledType = {
  type: "textUploadedToTabled";
  header: {
    contentId: string;
  };
  data: {
    filename: string;
    mimeType: StaticMimeTypes;
    state: TableContentStateTypes[];
  };
};

export type onApplicationUploadedToTableType = {
  type: "applicationUploadedToTable";
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

export type onApplicationUploadedToTabledType = {
  type: "applicationUploadedToTabled";
  header: {
    contentId: string;
  };
  data: {
    filename: string;
    mimeType: StaticMimeTypes;
    state: TableContentStateTypes[];
  };
};

export type onSoundClipUploadedToTableType = {
  type: "soundClipUploadedToTable";
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

export type onSoundClipUploadedToTabledType = {
  type: "soundClipUploadedToTabled";
  header: {
    contentId: string;
  };
  data: {
    filename: string;
    mimeType: StaticMimeTypes;
    state: TableContentStateTypes[];
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

export type onResponsedCatchUpTableDataType = {
  type: "responsedCatchUpTableData";
  data: {
    images:
      | {
          tableId: string;
          imageId: string;
          filename: string;
          mimeType: string;
          state: TableContentStateTypes[];
          instances: {
            imageInstanceId: string;
            positioning: {
              position: {
                left: number;
                top: number;
              };
              scale: {
                x: number;
                y: number;
              };
              rotation: number;
            };
            effects: { [effectType in ImageEffectTypes]: boolean };
            effectStyles: ImageEffectStylesType;
          }[];
        }[]
      | undefined;
    svgs:
      | {
          tableId: string;
          svgId: string;
          filename: string;
          mimeType: string;
          state: TableContentStateTypes[];
          instances: {
            svgInstanceId: string;
            positioning: {
              position: {
                left: number;
                top: number;
              };
              scale: {
                x: number;
                y: number;
              };
              rotation: number;
            };
            effects: { [effectType in SvgEffectTypes]: boolean };
            effectStyles: SvgEffectStylesType;
          }[];
        }[]
      | undefined;
    videos:
      | {
          tableId: string;
          videoId: string;
          filename: string;
          mimeType: string;
          state: TableContentStateTypes[];
          instances: {
            videoInstanceId: string;
            positioning: {
              position: {
                left: number;
                top: number;
              };
              scale: {
                x: number;
                y: number;
              };
              rotation: number;
            };
            effects: { [effectType in VideoEffectTypes]: boolean };
            effectStyles: VideoEffectStylesType;
            videoPosition: number;
          }[];
        }[]
      | undefined;
    text:
      | {
          tableId: string;
          textId: string;
          filename: string;
          mimeType: string;
          state: TableContentStateTypes[];
          instances: {
            textInstanceId: string;
            positioning: {
              position: {
                left: number;
                top: number;
              };
              scale: {
                x: number;
                y: number;
              };
              rotation: number;
            };
            effectStyles: TextEffectStylesType;
          }[];
        }[]
      | undefined;
    soundClips:
      | {
          tableId: string;
          soundClipId: string;
          filename: string;
          mimeType: string;
          state: TableContentStateTypes[];
          instances: {
            soundClipInstanceId: string;
            positioning: {
              position: {
                left: number;
                top: number;
              };
              scale: {
                x: number;
                y: number;
              };
              rotation: number;
            };
            effects: { [effectType in AudioEffectTypes]: boolean };
          }[];
        }[]
      | undefined;
    applications:
      | {
          tableId: string;
          applicationId: string;
          filename: string;
          mimeType: string;
          state: TableContentStateTypes[];
          instances: {
            applicationInstanceId: string;
            positioning: {
              position: {
                left: number;
                top: number;
              };
              scale: {
                x: number;
                y: number;
              };
              rotation: number;
            };
            effects: { [effectType in ApplicationEffectTypes]: boolean };
            effectStyles: ApplicationEffectStylesType;
          }[];
        }[]
      | undefined;
  };
};

export type onContentDeletedType = {
  type: "contentDeleted";
  header: {
    contentType: StaticContentTypes;
    contentId: string;
    instanceId: string;
  };
};

export type onContentStateChangedType = {
  type: "contentStateChanged";
  header: { contentType: StaticContentTypes; contentId: string };
  data: { state: TableContentStateTypes[] };
};

export type onUpdatedContentEffectsType = {
  type: "updatedContentEffects";
  header: {
    contentType: StaticContentTypes;
    contentId: string;
    instanceId: string;
  };
  data: {
    effects: {
      [effectType: string]: boolean;
    };
    effectStyles?:
      | VideoEffectStylesType
      | ImageEffectStylesType
      | ApplicationEffectStylesType
      | SvgEffectStylesType
      | TextEffectStylesType;
  };
};

export type onRespondedCatchUpEffectsType = {
  type: "respondedCatchUpEffects";
  header: {
    contentType: StaticContentTypes;
    contentId: string;
    instanceId: string;
  };
  data: { effects?: object; effectStyles?: object };
};

export type onCreatedNewInstancesType = {
  type: "createdNewInstances";
  data: {
    newInstances: {
      contentType: StaticContentTypes;
      contentId: string;
      instances: {
        instanceId: string;
        positioning: {
          position: {
            left: number;
            top: number;
          };
          scale: {
            x: number;
            y: number;
          };
          rotation: number;
        };
      }[];
    }[];
  };
};

export type onSearchTabledContentRespondedType = {
  type: "searchTabledContentResponded";
  data: any;
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
