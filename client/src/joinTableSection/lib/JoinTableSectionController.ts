import { types } from "mediasoup-client";
import {
  RemoteMediaType,
  StaticContentMediaType,
  UserDataStreamsType,
  UserMediaType,
} from "../../context/mediaContext/lib/typeConstant";
import {
  StaticContentEffectsStylesType,
  StaticContentEffectsType,
} from "../../../../universal/effectsTypeConstant";
import GamesServerController from "../../serverControllers/gamesServer/GamesServerController";
import BundlesController from "../../lib/BundlesController";
import onRouterCapabilities from "../../lib/onRouterCapabilities";
import TableSocketController from "../../serverControllers/tableServer/TableSocketController";
import TableStaticContentSocketController from "../../serverControllers/tableStaticContentServer/TableStaticContentSocketController";
import MediasoupSocketController from "../../serverControllers/mediasoupServer/MediasoupSocketController";
import { IncomingMediasoupMessages } from "../../serverControllers/mediasoupServer/lib/typeConstant";
import LiveTextEditingSocketController from "../../serverControllers/liveTextEditingServer/LiveTextEditingSocketController";
import ProducersController from "../../lib/ProducersController";
import ConsumersController from "../../lib/ConsumersController";
import PermissionsController from "../../lib/PermissionsController";
import Metadata from "../../lib/Metadata";
import CleanupController from "../../lib/CleanupController";
import Deadbanding from "../../babylon/Deadbanding";
import UserDevice from "../../tools/userDevice/UserDevice";
import Downloader from "../../tools/downloader/Downloader";
import { DownloadSignals } from "../../context/uploadDownloadContext/lib/typeConstant";
import LiveTextDownloader from "../../tools/liveTextDownloader/LiveTextDownloader";
import VideoSocketController from "../../serverControllers/videoServer/VideoSocketController";
import { GeneralSignals } from "../../context/signalContext/lib/typeConstant";

const tableServerIp = process.env.TABLE_SERVER_IP;
const tableServerPort = process.env.TABLE_SERVER_PORT;
const gamesServerIp = process.env.GAMES_SERVER_IP;
const gamesServerPort = process.env.GAMES_SERVER_PORT;

class JoinTableSectionController {
  constructor(
    private tableSocket: React.MutableRefObject<
      TableSocketController | undefined
    >,
    private liveTextEditingSocket: React.MutableRefObject<
      LiveTextEditingSocketController | undefined
    >,
    private tableStaticContentSocket: React.MutableRefObject<
      TableStaticContentSocketController | undefined
    >,
    private videoSocket: React.MutableRefObject<
      VideoSocketController | undefined
    >,
    private mediasoupSocket: React.MutableRefObject<
      MediasoupSocketController | undefined
    >,
    private gamesSocket: React.MutableRefObject<
      GamesServerController | undefined
    >,
    private tableIdRef: React.RefObject<HTMLInputElement>,
    private usernameRef: React.RefObject<HTMLInputElement>,
    private tableId: React.MutableRefObject<string>,
    private username: React.MutableRefObject<string>,
    private instance: React.MutableRefObject<string>,
    private setIsInTable: React.Dispatch<React.SetStateAction<boolean>>,
    private userMedia: React.MutableRefObject<UserMediaType>,
    private staticContentMedia: React.MutableRefObject<StaticContentMediaType>,
    private userDataStreams: React.MutableRefObject<UserDataStreamsType>,
    private remoteMedia: React.MutableRefObject<RemoteMediaType>,
    private staticContentEffects: React.MutableRefObject<StaticContentEffectsType>,
    private staticContentEffectsStyles: React.MutableRefObject<StaticContentEffectsStylesType>,
    private handleDisableEnableBtns: (disabled: boolean) => void,
    private setBundles: React.Dispatch<
      React.SetStateAction<{
        [username: string]: { [instance: string]: React.JSX.Element };
      }>
    >,
    private consumerTransport: React.MutableRefObject<
      types.Transport<types.AppData> | undefined
    >,
    private producerTransport: React.MutableRefObject<
      types.Transport<types.AppData> | undefined
    >,
    private isCamera: React.MutableRefObject<boolean>,
    private setCameraActive: React.Dispatch<React.SetStateAction<boolean>>,
    private isScreen: React.MutableRefObject<boolean>,
    private setScreenActive: React.Dispatch<React.SetStateAction<boolean>>,
    private isAudio: React.MutableRefObject<boolean>,
    private setAudioActive: React.Dispatch<React.SetStateAction<boolean>>,
    private setMutedAudio: React.Dispatch<React.SetStateAction<boolean>>,
    private mutedAudioRef: React.MutableRefObject<boolean>,
    private isSubscribed: React.MutableRefObject<boolean>,
    private device: React.MutableRefObject<types.Device | undefined>,
    private bundlesController: React.MutableRefObject<BundlesController>,
    private producersController: React.MutableRefObject<ProducersController>,
    private consumersController: React.MutableRefObject<ConsumersController>,
    private permissionsController: React.MutableRefObject<PermissionsController>,
    private metadata: React.MutableRefObject<Metadata>,
    private userDevice: React.MutableRefObject<UserDevice>,
    private deadbanding: React.MutableRefObject<Deadbanding>,
    private cleanupController: React.MutableRefObject<CleanupController>,
    private setRerender: React.Dispatch<React.SetStateAction<boolean>>,
    private sendDownloadSignal: (signal: DownloadSignals) => void,
    private addCurrentDownload: (
      id: string,
      upload: Downloader | LiveTextDownloader,
    ) => void,
    private removeCurrentDownload: (id: string) => void,
    private sendGeneralSignal: (signal: GeneralSignals) => void,
  ) {}

  joinTable = () => {
    const previousTableId = this.tableId.current;
    const previousUsername = this.username.current;

    if (
      this.tableId.current === this.tableIdRef.current?.value &&
      this.username.current === this.usernameRef.current?.value
    ) {
      return;
    }

    if (this.tableIdRef.current) {
      this.tableId.current = this.tableIdRef.current?.value;
    }
    if (this.usernameRef.current) {
      this.username.current = this.usernameRef.current?.value;
    }
    if (
      this.tableId.current.trim() !== "" &&
      this.username.current.trim() !== ""
    ) {
      // Leave previous table if there is one
      if (previousTableId.trim() !== "" && previousUsername.trim() !== "") {
        this.leaveTable();
      }

      this.tableSocket.current = new TableSocketController(
        `wss://${tableServerIp}:${tableServerPort}/ws/${this.tableId.current}/${this.username.current}/${this.instance.current}`,
        this.tableId.current,
        this.username.current,
        this.instance.current,
      );

      this.liveTextEditingSocket.current = new LiveTextEditingSocketController(
        "wss://localhost:7334",
        this.tableId.current,
        this.username.current,
        this.instance.current,
        this.staticContentMedia,
        this.liveTextEditingSocket,
        this.sendDownloadSignal,
        this.addCurrentDownload,
        this.removeCurrentDownload,
      );

      this.tableStaticContentSocket.current =
        new TableStaticContentSocketController(
          "wss://localhost:7889",
          this.tableId.current,
          this.username.current,
          this.instance.current,
          this.staticContentMedia,
          this.deadbanding,
          this.userDevice,
          this.staticContentEffects,
          this.staticContentEffectsStyles,
          this.tableStaticContentSocket,
          this.liveTextEditingSocket,
          this.videoSocket,
          this.sendDownloadSignal,
          this.addCurrentDownload,
          this.removeCurrentDownload,
        );

      this.videoSocket.current = new VideoSocketController(
        "wss://localhost:7556",
        this.tableId.current,
        this.username.current,
        this.instance.current,
        this.staticContentMedia,
        this.deadbanding,
        this.userDevice,
        this.staticContentEffects,
        this.staticContentEffectsStyles,
        this.videoSocket,
        this.sendGeneralSignal,
      );

      this.gamesSocket.current = new GamesServerController(
        this.tableId.current,
        this.username.current,
        this.instance.current,
        `wss://${gamesServerIp}:${gamesServerPort}/ws/${this.tableId.current}/${this.username.current}/${this.instance.current}/signaling`,
        this.staticContentMedia,
        this.bundlesController,
      );

      this.mediasoupSocket.current = new MediasoupSocketController(
        "wss://localhost:7445",
        this.tableId.current,
        this.username.current,
        this.instance.current,
        this.producersController,
        this.consumersController,
        this.permissionsController,
        this.metadata,
        this.cleanupController,
      );

      this.setIsInTable(true);

      this.setRerender((prev) => !prev);
    }
  };

  private leaveTable = () => {
    this.tableSocket.current?.deconstructor();
    this.tableSocket.current = undefined;
    this.tableStaticContentSocket.current?.deconstructor();
    this.tableStaticContentSocket.current = undefined;
    this.mediasoupSocket.current?.deconstructor();
    this.mediasoupSocket.current = undefined;
    this.liveTextEditingSocket.current?.deconstructor();
    this.liveTextEditingSocket.current = undefined;
    this.gamesSocket.current?.deconstructor();
    this.gamesSocket.current = undefined;
    this.videoSocket.current?.deconstructor();
    this.videoSocket.current = undefined;

    this.unsubscribe();

    this.removePositionScaleRotationProducer();

    for (const cameraId in this.userMedia.current.camera) {
      this.userMedia.current.camera[cameraId].deconstructor();
      delete this.userMedia.current.camera[cameraId];
    }

    for (const screenId in this.userMedia.current.screen) {
      this.userMedia.current.screen[screenId].deconstructor();
      delete this.userMedia.current.screen[screenId];
    }

    for (const screenAudioId in this.userMedia.current.screenAudio) {
      this.userMedia.current.screenAudio[screenAudioId].deconstructor();
      delete this.userMedia.current.screenAudio[screenAudioId];
    }

    for (const applicationId in this.staticContentMedia.current.application
      .table) {
      this.staticContentMedia.current.application.table[
        applicationId
      ].deconstructor();
      delete this.staticContentMedia.current.application.table[applicationId];
    }

    for (const applicationId in this.staticContentMedia.current.application
      .tableInstances) {
      this.staticContentMedia.current.application.tableInstances[
        applicationId
      ].deconstructor();
      delete this.staticContentMedia.current.application.tableInstances[
        applicationId
      ];
    }

    for (const imageId in this.staticContentMedia.current.image.table) {
      this.staticContentMedia.current.image.table[imageId].deconstructor();
      delete this.staticContentMedia.current.image.table[imageId];
    }

    for (const imageId in this.staticContentMedia.current.image
      .tableInstances) {
      this.staticContentMedia.current.image.tableInstances[
        imageId
      ].deconstructor();
      delete this.staticContentMedia.current.image.tableInstances[imageId];
    }

    for (const soundClipId in this.staticContentMedia.current.soundClip.table) {
      this.staticContentMedia.current.soundClip.table[
        soundClipId
      ].deconstructor();
      delete this.staticContentMedia.current.soundClip.table[soundClipId];
    }

    for (const soundClipId in this.staticContentMedia.current.soundClip
      .tableInstances) {
      this.staticContentMedia.current.soundClip.tableInstances[
        soundClipId
      ].deconstructor();
      delete this.staticContentMedia.current.soundClip.tableInstances[
        soundClipId
      ];
    }

    for (const svgId in this.staticContentMedia.current.svg.table) {
      this.staticContentMedia.current.svg.table[svgId].deconstructor();
      delete this.staticContentMedia.current.svg.table[svgId];
    }

    for (const svgId in this.staticContentMedia.current.svg.tableInstances) {
      this.staticContentMedia.current.svg.tableInstances[svgId].deconstructor();
      delete this.staticContentMedia.current.svg.tableInstances[svgId];
    }

    for (const textId in this.staticContentMedia.current.text.tableInstances) {
      this.staticContentMedia.current.text.tableInstances[
        textId
      ].deconstructor();
      delete this.staticContentMedia.current.text.tableInstances[textId];
    }

    for (const textId in this.staticContentMedia.current.text.table) {
      this.staticContentMedia.current.text.table[textId].deconstructor();
      delete this.staticContentMedia.current.text.table[textId];
    }

    for (const videoId in this.staticContentMedia.current.video.table) {
      this.staticContentMedia.current.video.table[videoId].deconstructor();
      delete this.staticContentMedia.current.video.table[videoId];
    }

    for (const videoId in this.staticContentMedia.current.video
      .tableInstances) {
      this.staticContentMedia.current.video.tableInstances[
        videoId
      ].deconstructor();
      delete this.staticContentMedia.current.video.tableInstances[videoId];
    }

    if (this.userMedia.current.audio) {
      this.userMedia.current.audio.deconstructor();
      this.userMedia.current.audio = undefined;
    }

    for (const gameType in this.staticContentMedia.current.games) {
      // @ts-expect-error gameType stupid
      for (const game in this.staticContentMedia.current.games[gameType]) {
        // @ts-expect-error gameType stupid
        this.staticContentMedia.current.games[gameType][game].deconstructor();
        // @ts-expect-error gameType stupid
        delete this.staticContentMedia.current.games[gameType][game];
      }
    }

    this.remoteMedia.current = {};

    this.handleDisableEnableBtns(false);
    this.device.current = undefined;
    this.setBundles({});
    this.consumerTransport.current?.close();
    this.consumerTransport.current = undefined;
    this.producerTransport.current?.close();
    this.producerTransport.current = undefined;
    this.isCamera.current = false;
    this.setCameraActive(false);
    this.isScreen.current = false;
    this.setScreenActive(false);
    this.isAudio.current = false;
    this.setAudioActive(false);
    this.setMutedAudio(false);
    this.mutedAudioRef.current = false;
    this.isSubscribed.current = false;
    this.setIsInTable(false);
  };

  private unsubscribe = () => {
    this.isSubscribed.current = !this.isSubscribed.current;

    if (!this.isSubscribed.current) {
      this.setBundles((prev) => {
        const previousBundles = { ...prev };

        for (const bundleUsername in previousBundles) {
          if (bundleUsername !== this.username.current) {
            delete previousBundles[bundleUsername];
          } else {
            for (const bundleInstance in previousBundles[bundleUsername]) {
              if (bundleInstance !== this.instance.current) {
                delete previousBundles[bundleUsername][bundleInstance];
              }
            }
          }
        }
        return previousBundles;
      });
      this.remoteMedia.current = {};

      this.mediasoupSocket.current?.sendMessage({
        type: "unsubscribe",
        header: {
          tableId: this.tableId.current,
          username: this.username.current,
          instance: this.instance.current,
        },
      });
    }
  };

  private removePositionScaleRotationProducer = () => {
    if (this.userDataStreams.current.positionScaleRotation) {
      this.userDataStreams.current.positionScaleRotation.close();
      delete this.userDataStreams.current.positionScaleRotation;
    }

    this.mediasoupSocket.current?.sendMessage({
      type: "removeProducer",
      header: {
        tableId: this.tableId.current,
        username: this.username.current,
        instance: this.instance.current,
        producerType: "json",
        dataStreamType: "positionScaleRotation",
      },
    });
  };

  private subscribe = () => {
    if (!this.tableId.current || !this.username.current) {
      console.error("Missing tableId or username!");
      return;
    }
    this.isSubscribed.current = !this.isSubscribed.current;

    if (this.isSubscribed.current) {
      this.mediasoupSocket.current?.sendMessage({
        type: "createConsumerTransport",
        header: {
          tableId: this.tableId.current,
          username: this.username.current,
          instance: this.instance.current,
        },
      });
    }
  };

  private createProducerTransport = () => {
    this.mediasoupSocket.current?.sendMessage({
      type: "createProducerTransport",
      header: {
        tableId: this.tableId.current,
        username: this.username.current,
        instance: this.instance.current,
      },
    });
  };

  handleMediasoupSocketMessage = async (event: IncomingMediasoupMessages) => {
    switch (event.type) {
      case "routerCapabilities":
        await onRouterCapabilities(event, this.device);

        this.subscribe();
        this.createProducerTransport();
        break;
      default:
        break;
    }
  };
}

export default JoinTableSectionController;
