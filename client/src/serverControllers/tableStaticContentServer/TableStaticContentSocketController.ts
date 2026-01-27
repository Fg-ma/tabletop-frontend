import {
  ApplicationEffectStylesType,
  defaultAudioEffects,
  defaultAudioEffectsStyles,
  defaultVideoEffects,
  defaultVideoEffectsStyles,
  ImageEffectStylesType,
  StaticContentEffectsStylesType,
  StaticContentEffectsType,
  SvgEffectStylesType,
  TextEffectStylesType,
  VideoEffectStylesType,
} from "../../../../universal/effectsTypeConstant";
import { StaticContentMediaType } from "../../context/mediaContext/lib/typeConstant";
import {
  IncomingTableStaticContentMessages,
  onContentDeletedType,
  onContentReuploadedType,
  onContentStateChangedType,
  onCreatedNewInstancesType,
  onImageUploadedToTabledType,
  onImageUploadedToTableType,
  onResponsedCatchUpTableDataType,
  onReuploadCancelledType,
  onReuploadStartedType,
  onSvgUploadedToTabledType,
  onSvgUploadedToTableType,
  onTextUploadedToTabledType,
  onTextUploadedToTableType,
  OutGoingTableStaticContentMessages,
} from "./lib/typeConstant";
import {
  TableContentStateTypes,
  StaticContentTypes,
  StaticMimeTypes,
} from "../../../../universal/contentTypeConstant";
import TableVideoMediaInstance from "../../media/fgTableVideo/TableVideoMediaInstance";
import TableVideoMedia from "../../media/fgTableVideo/TableVideoMedia";
import Deadbanding from "../../babylon/Deadbanding";
import UserDevice from "../../tools/userDevice/UserDevice";
import { DownloadSignals } from "../../context/uploadDownloadContext/lib/typeConstant";
import Downloader from "../../tools/downloader/Downloader";
import TableImageMediaInstance from "../../media/fgTableImage/TableImageMediaInstance";
import TableImageMedia from "../../media/fgTableImage/TableImageMedia";
import TableSvgMediaInstance from "../../media/fgTableSvg/TableSvgMediaInstance";
import TableSvgMedia from "../../media/fgTableSvg/TableSvgMedia";
import TableTextMediaInstance from "../../media/fgTableText/TableTextMediaInstance";
import TableTextMedia from "../../media/fgTableText/TableTextMedia";
import TableApplicationMediaInstance from "../../media/fgTableApplication/TableApplicationMediaInstance";
import TableApplicationMedia from "../../media/fgTableApplication/TableApplicationMedia";
import LiveTextEditingSocketController from "../liveTextEditingServer/LiveTextEditingSocketController";
import LiveTextDownloader from "../../tools/liveTextDownloader/LiveTextDownloader";
import VideoSocketController from "../videoServer/VideoSocketController";

class TableStaticContentSocketController {
  private ws: WebSocket | undefined;
  private messageListeners: Set<
    (message: IncomingTableStaticContentMessages) => void
  > = new Set();

  constructor(
    private url: string,
    private tableId: string,
    private username: string,
    private instance: string,
    private staticContentMedia: React.MutableRefObject<StaticContentMediaType>,
    private deadbanding: React.MutableRefObject<Deadbanding>,
    private userDevice: React.MutableRefObject<UserDevice>,
    private staticContentEffects: React.MutableRefObject<StaticContentEffectsType>,
    private staticContentEffectsStyles: React.MutableRefObject<StaticContentEffectsStylesType>,
    private tableStaticContentSocket: React.MutableRefObject<
      TableStaticContentSocketController | undefined
    >,
    private liveTextEditingSocket: React.MutableRefObject<
      LiveTextEditingSocketController | undefined
    >,
    private videoSocket: React.MutableRefObject<
      VideoSocketController | undefined
    >,
    private sendDownloadSignal: (signal: DownloadSignals) => void,
    private addCurrentDownload: (
      id: string,
      upload: Downloader | LiveTextDownloader,
    ) => void,
    private removeCurrentDownload: (id: string) => void,
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

      this.ws = undefined;
    }

    this.messageListeners.clear();
  };

  private connect = (url: string) => {
    this.ws = new WebSocket(url);
    this.ws.binaryType = "arraybuffer";

    this.ws.onmessage = (event: MessageEvent) => {
      let message: IncomingTableStaticContentMessages;

      if (event.data instanceof ArrayBuffer) {
        const buf = new Uint8Array(event.data);

        if (buf.byteLength < 4) {
          return;
        }

        const view = new DataView(buf.buffer);

        // 1) Read first 4 bytes for JSON length
        const headerLen = view.getUint32(0);

        if (headerLen <= 0 || buf.byteLength < 4 + headerLen) {
          return;
        }

        // 2) Slice out the JSON header
        const headerBytes = buf.subarray(4, 4 + headerLen);
        const headerText = new TextDecoder().decode(headerBytes);

        let header;
        try {
          header = JSON.parse(headerText);
        } catch (e) {
          return;
        }

        // 3) The rest of file chunk
        const fileBuffer = buf.subarray(4 + headerLen);

        switch (header.type) {
          case "oneShotDownload":
            message = {
              type: header.type,
              header: {
                contentType: header.header.contentType,
                contentId: header.header.contentId,
              },
              data: {
                buffer: fileBuffer,
              },
            };
            break;
          case "chunk":
            message = {
              type: header.type,
              header: {
                contentType: header.header.contentType,
                contentId: header.header.contentId,
                range: header.header.range,
              },
              data: {
                chunk: fileBuffer,
              },
            };
            break;
          default:
            return;
        }
      } else {
        message =
          typeof event.data === "string"
            ? (JSON.parse(event.data) as IncomingTableStaticContentMessages)
            : { type: undefined };
      }

      this.handleMessage(message);

      this.messageListeners.forEach((listener) => {
        listener(message);
      });
    };

    this.ws.onopen = () => {
      this.sendMessage({
        type: "requestCatchUpTableData",
        header: {
          tableId: this.tableId,
          username: this.username,
          instance: this.instance,
        },
      });
    };
  };

  addMessageListener = (
    listener: (message: IncomingTableStaticContentMessages) => void,
  ): void => {
    this.messageListeners.add(listener);
  };

  removeMessageListener = (
    listener: (message: IncomingTableStaticContentMessages) => void,
  ): void => {
    this.messageListeners.delete(listener);
  };

  sendMessage = (message: OutGoingTableStaticContentMessages) => {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  };

  getFile = (contentType: StaticContentTypes, contentId: string) => {
    this.sendMessage({
      type: "getDownloadMeta",
      header: {
        tableId: this.tableId,
        username: this.username,
        instance: this.instance,
        contentType,
        contentId,
      },
    });
  };

  getChunk = (
    contentType: StaticContentTypes,
    contentId: string,
    range: string,
  ) => {
    this.sendMessage({
      type: "getFileChunk",
      header: {
        tableId: this.tableId,
        username: this.username,
        instance: this.instance,
        contentType,
        contentId,
      },
      data: { range },
    });
  };

  deleteContent = (
    contentType: StaticContentTypes,
    contentId: string,
    instanceId: string,
  ) => {
    this.sendMessage({
      type: "deleteContent",
      header: {
        tableId: this.tableId,
        contentType,
        contentId,
        instanceId,
      },
    });
  };

  updateContentPositioning = (
    contentType: StaticContentTypes,
    contentId: string,
    instanceId: string,
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
        contentType,
        contentId,
        instanceId,
      },
      data: {
        positioning,
      },
    });
  };

  updateContentEffects = (
    contentType: StaticContentTypes,
    contentId: string,
    instanceId: string,
    effects?: {
      [effectType: string]: boolean;
    },
    effectStyles?:
      | VideoEffectStylesType
      | ImageEffectStylesType
      | ApplicationEffectStylesType
      | SvgEffectStylesType
      | TextEffectStylesType,
  ) => {
    this.sendMessage({
      type: "updateContentEffects",
      header: {
        tableId: this.tableId,
        contentType,
        contentId,
        instanceId,
      },
      data: {
        ...(effects !== undefined ? { effects } : {}),
        ...(effectStyles !== undefined ? { effectStyles } : {}),
      },
    });
  };

  changeContentState = (
    contentType: StaticContentTypes,
    contentId: string,
    state: TableContentStateTypes[],
  ) => {
    this.sendMessage({
      type: "changeContentState",
      header: {
        tableId: this.tableId,
        contentType,
        contentId,
      },
      data: {
        state,
      },
    });
  };

  requestCatchUpEffects = (
    contentType: StaticContentTypes,
    contentId: string,
    instanceId: string,
  ) => {
    this.sendMessage({
      type: "requestCatchUpEffects",
      header: {
        tableId: this.tableId,
        username: this.username,
        instance: this.instance,
        contentType,
        contentId,
        instanceId,
      },
    });
  };

  createNewInstances = (
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
    }[],
  ) => {
    this.sendMessage({
      type: "createNewInstances",
      header: {
        tableId: this.tableId,
      },
      data: {
        updates,
      },
    });
  };

  searchTabledContent = (
    contentType: StaticContentTypes | "all",
    name: string,
  ) => {
    this.sendMessage({
      type: "searchTabledContentRequest",
      header: {
        tableId: this.tableId,
        username: this.username,
        instance: this.instance,
        contentType,
      },
      data: {
        name,
      },
    });
  };

  deleteUploadSession = (
    uploadId: string,
    contentId: string,
    contentType: StaticContentTypes,
  ) => {
    this.sendMessage({
      type: "deleteUploadSession",
      header: {
        uploadId,
        contentId,
        contentType,
      },
    });
  };

  signalReuploadStart = (
    contentType: StaticContentTypes,
    contentId: string,
  ) => {
    this.sendMessage({
      type: "signalReuploadStart",
      header: {
        tableId: this.tableId,
        contentType,
        contentId,
      },
    });
  };

  private handleMessage = (
    message: { type: undefined } | IncomingTableStaticContentMessages,
  ) => {
    switch (message.type) {
      case "contentDeleted":
        this.onContentDeleted(message);
        break;
      case "contentStateChanged":
        this.onContentStateChanged(message);
        break;
      case "responsedCatchUpTableData":
        this.onResponsedCatchUpTableData(message);
        break;
      case "imageUploadedToTable":
        this.onImageUploadedToTable(message);
        break;
      case "imageUploadedToTabled":
        this.onImageUploadedToTabled(message);
        break;
      case "svgUploadedToTable":
        this.onSvgUploadedToTable(message);
        break;
      case "svgUploadedToTabled":
        this.onSvgUploadedToTabled(message);
        break;
      case "contentReuploaded":
        this.onContentReuploaded(message);
        break;
      case "textUploadedToTable":
        this.onTextUploadedToTable(message);
        break;
      case "textUploadedToTabled":
        this.onTextUploadedToTabled(message);
        break;
      case "createdNewInstances":
        this.onCreatedNewInstances(message);
        break;
      case "reuploadStarted":
        this.onReuploadStarted(message);
        break;
      case "reuploadCancelled":
        this.onReuploadCancelled(message);
        break;
      default:
        break;
    }
  };

  private onReuploadStarted = (event: onReuploadStartedType) => {
    const { contentId, contentType } = event.header;

    this.staticContentMedia.current[contentType].table[contentId].loadingState =
      "reuploading";
  };

  private onReuploadCancelled = (event: onReuploadCancelledType) => {
    const { contentId, contentType } = event.header;

    this.staticContentMedia.current[contentType].table[contentId].loadingState =
      "downloaded";
  };

  private onContentDeleted = (event: onContentDeletedType) => {
    const { contentType, contentId, instanceId } = event.header;

    if (
      this.staticContentMedia.current[contentType].tableInstances[instanceId]
    ) {
      this.staticContentMedia.current[contentType].tableInstances[
        instanceId
      ].deconstructor();
      delete this.staticContentMedia.current[contentType].tableInstances[
        instanceId
      ];
    }

    if (
      Object.keys(this.staticContentMedia.current[contentType].tableInstances)
        .length === 0 &&
      this.staticContentMedia.current[contentType].table[contentId] &&
      !this.staticContentMedia.current[contentType].table[
        contentId
      ].state.includes("tabled")
    ) {
      this.staticContentMedia.current[contentType].table[
        contentId
      ].deconstructor();
      delete this.staticContentMedia.current[contentType].table[contentId];
    }
  };

  private onContentStateChanged = (event: onContentStateChangedType) => {
    const { contentType, contentId } = event.header;
    const { state } = event.data;

    this.staticContentMedia.current[contentType].table[contentId].setState(
      state,
    );
  };

  private onImageUploadedToTable = (message: onImageUploadedToTableType) => {
    const { contentId, instanceId } = message.header;
    const { filename, mimeType, state, initPositioning } = message.data;

    if (
      this.staticContentMedia.current.image.table[contentId] ||
      this.staticContentMedia.current.image.tableInstances[instanceId]
    )
      return;

    if (this.tableStaticContentSocket.current) {
      const newImageMedia = new TableImageMedia(
        contentId,
        filename,
        mimeType,
        state,
        this.deadbanding,
        this.userDevice,
        this.tableStaticContentSocket,
        this.sendDownloadSignal,
        this.addCurrentDownload,
        this.removeCurrentDownload,
      );

      this.staticContentMedia.current.image.table[contentId] = newImageMedia;

      this.staticContentMedia.current.image.tableInstances[instanceId] =
        new TableImageMediaInstance(
          newImageMedia,
          instanceId,
          this.staticContentEffectsStyles,
          this.staticContentEffects,
          this.userDevice,
          this.deadbanding,
          initPositioning && Object.keys(initPositioning).length !== 0
            ? initPositioning
            : {
                position: {
                  left: 50,
                  top: 50,
                },
                scale: {
                  x: 25,
                  y: 25,
                },
                rotation: 0,
              },
        );
    }
  };

  private onImageUploadedToTabled = (message: onImageUploadedToTabledType) => {
    const { contentId } = message.header;
    const { filename, mimeType, state } = message.data;

    if (this.tableStaticContentSocket.current) {
      this.staticContentMedia.current.image.table[contentId] =
        new TableImageMedia(
          contentId,
          filename,
          mimeType,
          state,
          this.deadbanding,
          this.userDevice,
          this.tableStaticContentSocket,
          this.sendDownloadSignal,
          this.addCurrentDownload,
          this.removeCurrentDownload,
        );
    }
  };

  private onSvgUploadedToTable = (message: onSvgUploadedToTableType) => {
    const { contentId, instanceId } = message.header;
    const { filename, mimeType, state, initPositioning } = message.data;

    if (this.tableStaticContentSocket.current) {
      const newSvgMedia = new TableSvgMedia(
        contentId,
        filename,
        mimeType,
        state,
        this.tableStaticContentSocket,
        this.sendDownloadSignal,
        this.addCurrentDownload,
        this.removeCurrentDownload,
      );

      this.staticContentMedia.current.svg.table[contentId] = newSvgMedia;

      this.staticContentMedia.current.svg.tableInstances[instanceId] =
        new TableSvgMediaInstance(
          newSvgMedia,
          instanceId,
          this.staticContentEffectsStyles,
          this.staticContentEffects,
          initPositioning && Object.keys(initPositioning).length !== 0
            ? initPositioning
            : {
                position: {
                  left: 50,
                  top: 50,
                },
                scale: {
                  x: 25,
                  y: 25,
                },
                rotation: 0,
              },
        );
    }
  };

  private onSvgUploadedToTabled = (message: onSvgUploadedToTabledType) => {
    const { contentId } = message.header;
    const { filename, mimeType, state } = message.data;

    if (this.tableStaticContentSocket.current) {
      this.staticContentMedia.current.svg.table[contentId] = new TableSvgMedia(
        contentId,
        filename,
        mimeType,
        state,
        this.tableStaticContentSocket,
        this.sendDownloadSignal,
        this.addCurrentDownload,
        this.removeCurrentDownload,
      );
    }
  };

  private onTextUploadedToTable = (message: onTextUploadedToTableType) => {
    const { contentId, instanceId } = message.header;
    const { filename, mimeType, state, initPositioning } = message.data;

    if (this.liveTextEditingSocket.current) {
      const newTextMedia = new TableTextMedia(
        contentId,
        filename,
        mimeType,
        state,
        this.liveTextEditingSocket,
        this.sendDownloadSignal,
        this.addCurrentDownload,
        this.removeCurrentDownload,
      );

      this.staticContentMedia.current.text.table[contentId] = newTextMedia;

      this.staticContentMedia.current.text.tableInstances[instanceId] =
        new TableTextMediaInstance(
          newTextMedia,
          this.staticContentEffectsStyles,
          instanceId,
          initPositioning && Object.keys(initPositioning).length !== 0
            ? initPositioning
            : {
                position: {
                  left: 50,
                  top: 50,
                },
                scale: {
                  x: 25,
                  y: 25,
                },
                rotation: 0,
              },
          this.liveTextEditingSocket,
        );
    }
  };

  private onTextUploadedToTabled = (message: onTextUploadedToTabledType) => {
    const { contentId } = message.header;
    const { filename, mimeType, state } = message.data;

    if (this.liveTextEditingSocket.current) {
      this.staticContentMedia.current.text.table[contentId] =
        new TableTextMedia(
          contentId,
          filename,
          mimeType,
          state,
          this.liveTextEditingSocket,
          this.sendDownloadSignal,
          this.addCurrentDownload,
          this.removeCurrentDownload,
        );
    }
  };

  private onContentReuploaded = (message: onContentReuploadedType) => {
    const { contentId, contentType } = message.header;

    if (contentType === "svg" || contentType === "image") {
      this.staticContentMedia.current[contentType].table[
        contentId
      ].reloadContent();
    }
  };

  private onResponsedCatchUpTableData = (
    event: onResponsedCatchUpTableDataType,
  ) => {
    if (!this.tableStaticContentSocket.current) return;

    const { images, svgs, videos, text, applications, soundClips } = event.data;
    console.log(event.data);
    if (videos) {
      for (const video of videos) {
        const newVideoMedia = new TableVideoMedia(
          video.videoId,
          video.filename,
          video.mimeType as StaticMimeTypes,
          video.state,
          this.staticContentEffects,
        );

        this.staticContentMedia.current.video.table[video.videoId] =
          newVideoMedia;

        for (const instance of video.instances) {
          if (
            !this.staticContentEffects.current.video[instance.videoInstanceId]
          ) {
            this.staticContentEffects.current.video[instance.videoInstanceId] =
              {
                video: structuredClone(defaultVideoEffects),
                audio: structuredClone(defaultAudioEffects),
              };
          }
          this.staticContentEffects.current.video[
            instance.videoInstanceId
          ].video = instance.effects;
          if (
            !this.staticContentEffectsStyles.current.video[
              instance.videoInstanceId
            ]
          ) {
            this.staticContentEffectsStyles.current.video[
              instance.videoInstanceId
            ] = {
              video: structuredClone(defaultVideoEffectsStyles),
              audio: structuredClone(defaultAudioEffectsStyles),
            };
          }
          this.staticContentEffectsStyles.current.video[
            instance.videoInstanceId
          ].video = instance.effectStyles;

          this.staticContentMedia.current.video.tableInstances[
            instance.videoInstanceId
          ] = new TableVideoMediaInstance(
            newVideoMedia,
            instance.videoInstanceId,
            this.userDevice,
            this.deadbanding,
            this.staticContentEffectsStyles,
            this.staticContentEffects,
            instance.positioning,
            this.videoSocket,
          );
        }
      }
    }
    if (images) {
      for (const image of images) {
        const newImageMedia = new TableImageMedia(
          image.imageId,
          image.filename,
          image.mimeType as StaticMimeTypes,
          image.state,
          this.deadbanding,
          this.userDevice,
          this.tableStaticContentSocket,
          this.sendDownloadSignal,
          this.addCurrentDownload,
          this.removeCurrentDownload,
        );

        this.staticContentMedia.current.image.table[image.imageId] =
          newImageMedia;

        for (const instance of image.instances) {
          this.staticContentEffects.current.image[instance.imageInstanceId] =
            instance.effects;
          this.staticContentEffectsStyles.current.image[
            instance.imageInstanceId
          ] = instance.effectStyles;

          this.staticContentMedia.current.image.tableInstances[
            instance.imageInstanceId
          ] = new TableImageMediaInstance(
            newImageMedia,
            instance.imageInstanceId,
            this.staticContentEffectsStyles,
            this.staticContentEffects,
            this.userDevice,
            this.deadbanding,
            instance.positioning,
          );
        }
      }
    }
    if (svgs) {
      for (const svg of svgs) {
        const newSvgMedia = new TableSvgMedia(
          svg.svgId,
          svg.filename,
          svg.mimeType as StaticMimeTypes,
          svg.state,
          this.tableStaticContentSocket,
          this.sendDownloadSignal,
          this.addCurrentDownload,
          this.removeCurrentDownload,
        );

        this.staticContentMedia.current.svg.table[svg.svgId] = newSvgMedia;

        for (const instance of svg.instances) {
          this.staticContentEffects.current.svg[instance.svgInstanceId] =
            instance.effects;
          this.staticContentEffectsStyles.current.svg[instance.svgInstanceId] =
            instance.effectStyles;

          this.staticContentMedia.current.svg.tableInstances[
            instance.svgInstanceId
          ] = new TableSvgMediaInstance(
            newSvgMedia,
            instance.svgInstanceId,
            this.staticContentEffectsStyles,
            this.staticContentEffects,
            instance.positioning,
          );
        }
      }
    }
    if (text) {
      for (const textItem of text) {
        const newTextMedia = new TableTextMedia(
          textItem.textId,
          textItem.filename,
          textItem.mimeType as StaticMimeTypes,
          textItem.state,
          this.liveTextEditingSocket,
          this.sendDownloadSignal,
          this.addCurrentDownload,
          this.removeCurrentDownload,
        );

        this.staticContentMedia.current.text.table[textItem.textId] =
          newTextMedia;

        for (const instance of textItem.instances) {
          this.staticContentEffectsStyles.current.text[
            instance.textInstanceId
          ] = instance.effectStyles;

          this.staticContentMedia.current.text.tableInstances[
            instance.textInstanceId
          ] = new TableTextMediaInstance(
            newTextMedia,
            this.staticContentEffectsStyles,
            instance.textInstanceId,
            instance.positioning,
            this.liveTextEditingSocket,
          );
        }
      }
    }
    if (applications) {
      for (const application of applications) {
        const newApplication = new TableApplicationMedia(
          application.applicationId,
          application.filename,
          application.mimeType as StaticMimeTypes,
          application.state,
          this.tableStaticContentSocket,
          this.sendDownloadSignal,
          this.addCurrentDownload,
          this.removeCurrentDownload,
        );

        this.staticContentMedia.current.application.table[
          application.applicationId
        ] = newApplication;

        for (const instance of application.instances) {
          this.staticContentEffects.current.application[
            instance.applicationInstanceId
          ] = instance.effects;
          this.staticContentEffectsStyles.current.application[
            instance.applicationInstanceId
          ] = instance.effectStyles;

          this.staticContentMedia.current.application.tableInstances[
            instance.applicationInstanceId
          ] = new TableApplicationMediaInstance(
            newApplication,
            instance.applicationInstanceId,
            this.staticContentEffectsStyles,
            this.staticContentEffects,
            this.userDevice,
            instance.positioning,
          );
        }
      }
    }
  };

  private onCreatedNewInstances = (event: onCreatedNewInstancesType) => {
    const { newInstances } = event.data;

    newInstances.forEach((instance) => {
      switch (instance.contentType) {
        case "svg":
          if (this.staticContentMedia.current.svg.table[instance.contentId]) {
            instance.instances.forEach((ins) => {
              this.staticContentMedia.current.svg.tableInstances[
                ins.instanceId
              ] = new TableSvgMediaInstance(
                this.staticContentMedia.current.svg.table[instance.contentId],
                ins.instanceId,
                this.staticContentEffectsStyles,
                this.staticContentEffects,
                ins.positioning,
              );
            });
          }
          break;
        case "application":
          if (
            this.staticContentMedia.current.application.table[
              instance.contentId
            ]
          ) {
            instance.instances.forEach((ins) => {
              this.staticContentMedia.current.application.tableInstances[
                ins.instanceId
              ] = new TableApplicationMediaInstance(
                this.staticContentMedia.current.application.table[
                  instance.contentId
                ],
                ins.instanceId,
                this.staticContentEffectsStyles,
                this.staticContentEffects,
                this.userDevice,
                ins.positioning,
              );
            });
          }
          break;
        case "image":
          if (this.staticContentMedia.current.image.table[instance.contentId]) {
            instance.instances.forEach((ins) => {
              this.staticContentMedia.current.image.tableInstances[
                ins.instanceId
              ] = new TableImageMediaInstance(
                this.staticContentMedia.current.image.table[instance.contentId],
                ins.instanceId,
                this.staticContentEffectsStyles,
                this.staticContentEffects,
                this.userDevice,
                this.deadbanding,
                ins.positioning,
              );
            });
          }
          break;
        case "text":
          if (this.staticContentMedia.current.text.table[instance.contentId]) {
            instance.instances.forEach((ins) => {
              this.staticContentMedia.current.text.tableInstances[
                ins.instanceId
              ] = new TableTextMediaInstance(
                this.staticContentMedia.current.text.table[instance.contentId],
                this.staticContentEffectsStyles,
                ins.instanceId,
                ins.positioning,
                this.liveTextEditingSocket,
              );
            });
          }
          break;
        case "video":
          if (this.staticContentMedia.current.video.table[instance.contentId]) {
            instance.instances.forEach((ins) => {
              if (this.tableStaticContentSocket.current)
                this.staticContentMedia.current.video.tableInstances[
                  ins.instanceId
                ] = new TableVideoMediaInstance(
                  this.staticContentMedia.current.video.table[
                    instance.contentId
                  ],
                  ins.instanceId,
                  this.userDevice,
                  this.deadbanding,
                  this.staticContentEffectsStyles,
                  this.staticContentEffects,
                  ins.positioning,
                  this.videoSocket,
                );
            });
          }
          break;
        case "soundClip":
          break;
      }
    });
  };
}

export default TableStaticContentSocketController;
