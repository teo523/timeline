import { clamp, flatten, maxBy, minBy } from "lodash"
import {
  action,
  autorun,
  computed,
  makeObservable,
  observable,
  observe,
} from "mobx"
import { IPoint, IRect, containsPoint } from "../../common/geometry"
import { isNotUndefined } from "../../common/helpers/array"
import { filterEventsOverlapScroll } from "../../common/helpers/filterEvents"
import { getMBTString } from "../../common/measure/mbt"
import Quantizer from "../../common/quantizer"
import { Selection, getSelectionBounds } from "../../common/selection/Selection"
import Track, { TrackEvent, isNoteEvent } from "../../common/track"
import { NoteCoordTransform } from "../../common/transform"
import { Layout } from "../Constants"
import { InstrumentSetting } from "../components/InstrumentBrowser/InstrumentBrowser"
import RootStore from "./RootStore"
import { RulerStore } from "./RulerStore"

export type PianoRollMouseMode = "pencil" | "selection"

export type PianoNoteItem = IRect & {
  id: number
  velocity: number
  isSelected: boolean
  isDrum: boolean
  trackId: number
}

export default class PianoRollStore {
  readonly rulerStore: RulerStore

  scrollLeftTicks = 0
  scrollTopKeys = 70 // 中央くらいの音程にスクロールしておく
  SCALE_X_MIN = 0.15
  SCALE_X_MAX = 15
  SCALE_Y_MIN = 0.3
  SCALE_Y_MAX = 4
  notesCursor = "auto"
  mouseMode: PianoRollMouseMode = "pencil"
  scaleX = 0.15
  scaleY = 0.3
  autoScroll = true
  quantize = 8
  isQuantizeEnabled = true
  selectedTrackId: number = 1
  selection: Selection | null = null
  selectedNoteIds: number[] = []
  lastNoteDuration: number | null = null
  openInstrumentBrowser = false
  instrumentBrowserSetting: InstrumentSetting = {
    isRhythmTrack: false,
    programNumber: 0,
  }
  notGhostTracks: Set<number> = new Set()
  canvasWidth: number = 0
  canvasHeight: number = 0
  showTrackList = false
  showEventList = false
  openTransposeDialog = false

  constructor(readonly rootStore: RootStore) {
    this.rulerStore = new RulerStore(this)

    makeObservable(this, {
      scrollLeftTicks: observable,
      scrollTopKeys: observable,
      notesCursor: observable,
      mouseMode: observable,
      scaleX: observable,
      scaleY: observable,
      autoScroll: observable,
      quantize: observable,
      isQuantizeEnabled: observable,
      selectedTrackId: observable,
      selection: observable.shallow,
      selectedNoteIds: observable,
      lastNoteDuration: observable,
      openInstrumentBrowser: observable,
      instrumentBrowserSetting: observable,
      notGhostTracks: observable,
      canvasWidth: observable,
      canvasHeight: observable,
      showTrackList: observable,
      showEventList: observable,
      openTransposeDialog: observable,
      contentWidth: computed,
      contentHeight: computed,
      scrollLeft: computed,
      scrollTop: computed,
      transform: computed,
      windowedEvents: computed,
      notes: computed,
      ghostNotes: computed,
      selectionBounds: computed,
      currentVolume: computed,
      currentVolume2: computed,
      currentVolume3: computed,
      currentPan: computed,
      playerTempo: computed,
      currentTempo: computed,
      currentMBTTime: computed,
      cursorX: computed,
      cursorX2: computed,
      quantizer: computed,
      controlCursor: computed,
      selectedTrack: computed,
      setScrollLeftInPixels: action,
      setScrollTopInPixels: action,
      setScrollLeftInTicks: action,
      scaleAroundPointX: action,
      scaleAroundPointY: action,
      scrollBy: action,
      toggleTool: action,
    })
  }

  setUpAutorun() {
    autorun(() => {
      const { isPlaying, position } = this.rootStore.player
      const { autoScroll, scrollLeftTicks, transform, canvasWidth } = this

      // keep scroll position to cursor
      if (autoScroll && isPlaying) {
        const screenX = transform.getX(position - scrollLeftTicks)
        if (screenX > canvasWidth * 0.7 || screenX < 0) {
          this.scrollLeftTicks = position
        }
      }
    })

    // reset selection when change track
    observe(this, "selectedTrackId", () => {
      this.selection = null
      this.selectedNoteIds = []
    })
  }

  get contentWidth(): number {
    const { scrollLeft, transform, canvasWidth } = this
    const trackEndTick = this.rootStore.song.endOfSong
    const startTick = scrollLeft / transform.pixelsPerTick
    const widthTick = transform.getTicks(canvasWidth)
    const endTick = startTick + widthTick
    return Math.max(trackEndTick, endTick) * transform.pixelsPerTick
  }

  get contentHeight(): number {
    const { transform } = this
    return transform.getMaxY()
  }

  get scrollLeft(): number {
    return Math.round(this.transform.getX(this.scrollLeftTicks))
  }

  get scrollTop(): number {
    return Math.round(this.transform.getY(this.scrollTopKeys))
  }

  setScrollLeftInPixels(x: number) {
    const { canvasWidth, contentWidth } = this
    const maxX = contentWidth - canvasWidth
    const scrollLeft = clamp(x, 0, maxX)
    this.scrollLeftTicks = this.transform.getTicks(scrollLeft)
    console.log("setScrollLeftInPixels")
  }

  setScrollTopInPixels(y: number) {
    const { transform, canvasHeight } = this
    const maxY = transform.getMaxY() - canvasHeight
    const scrollTop = clamp(y, 0, maxY)
    this.scrollTopKeys = this.transform.getNoteNumberFractional(scrollTop)
  }

  setScrollLeftInTicks(tick: number) {
    this.setScrollLeftInPixels(this.transform.getX(tick))
    console.log("setScrollLeftInTicks")
  }

  setScrollTopInKeys(keys: number) {
    this.setScrollTopInPixels(this.transform.getY(keys))
  }

  scrollBy(x: number, y: number) {
    this.setScrollLeftInPixels(this.scrollLeft - x)
    this.setScrollTopInPixels(this.scrollTop - y)
  }

  scaleAroundPointX(scaleXDelta: number, pixelX: number) {
    const pixelXInTicks0 = this.transform.getTicks(this.scrollLeft + pixelX)
    this.scaleX = clamp(
      this.scaleX * (1 + scaleXDelta),
      this.SCALE_X_MIN,
      this.SCALE_X_MAX,
    )
    const pixelXInTicks1 = this.transform.getTicks(this.scrollLeft + pixelX)
    const scrollInTicks = pixelXInTicks1 - pixelXInTicks0
    this.setScrollLeftInTicks(this.scrollLeftTicks - scrollInTicks)
  }

  scaleAroundPointY(scaleYDelta: number, pixelY: number) {
    const pixelYInKeys0 = this.transform.getNoteNumberFractional(
      this.scrollTop + pixelY,
    )
    this.scaleY = clamp(
      this.scaleY * (1 + scaleYDelta),
      this.SCALE_Y_MIN,
      this.SCALE_Y_MAX,
    )

    const pixelYInKeys1 = this.transform.getNoteNumberFractional(
      this.scrollTop + pixelY,
    )
    const scrollInKeys = pixelYInKeys1 - pixelYInKeys0
    this.setScrollTopInKeys(this.scrollTopKeys - scrollInKeys)
  }

  toggleTool() {
    this.mouseMode === "pencil" ? "selection" : "pencil"
  }

  get selectedTrack(): Track | undefined {
    return this.rootStore.song.tracks[this.selectedTrackId]
  }

  get transform(): NoteCoordTransform {
    return new NoteCoordTransform(
      Layout.pixelsPerTick * this.scaleX,
      Layout.keyHeight * this.scaleY,
      127,
    )
  }

  get windowedEvents(): TrackEvent[] {
    const { transform, scrollLeft, canvasWidth, selectedTrack: track } = this
    if (track === undefined) {
      return []
    }

    return filterEventsOverlapScroll(
      track.events,
      transform.pixelsPerTick,
      scrollLeft,
      canvasWidth,
    )
  }

  get notes(): PianoNoteItem[] {
    const {
      transform,
      windowedEvents,
      selectedNoteIds,
      selectedTrack: track,
      selectedTrackId,
    } = this

    if (track === undefined) {
      return []
    }
    const isRhythmTrack = track.isRhythmTrack

    const noteEvents = windowedEvents.filter(isNoteEvent)

    return noteEvents.map((e): PianoNoteItem => {
      const rect = isRhythmTrack
        ? transform.getDrumRect(e)
        : transform.getRect(e)
      const isSelected = selectedNoteIds.includes(e.id)
      return {
        ...rect,
        id: e.id,
        velocity: e.velocity,
        isSelected,
        isDrum: isRhythmTrack,
        trackId: selectedTrackId,
      }
    })
  }

  get ghostNotes(): PianoNoteItem[] {
    const song = this.rootStore.song
    const {
      transform,
      notGhostTracks,
      scrollLeft,
      canvasWidth,
      selectedTrackId,
    } = this

    return flatten(
      song.tracks.map((track, id) => {
        if (
          notGhostTracks.has(id) ||
          id === selectedTrackId ||
          track == undefined
        ) {
          return []
        }
        return filterEventsOverlapScroll(
          track.events.filter(isNoteEvent),
          transform.pixelsPerTick,
          scrollLeft,
          canvasWidth,
        ).map((e): PianoNoteItem => {
          const rect = track.isRhythmTrack
            ? transform.getDrumRect(e)
            : transform.getRect(e)
          return {
            ...rect,
            id: e.id,
            velocity: 127, // draw opaque when ghost
            isSelected: false,
            isDrum: track.isRhythmTrack,
            trackId: id,
          }
        })
      }),
    )
  }

  // hit test notes in canvas coordinates
  getNotes(local: IPoint): PianoNoteItem[] {
    return this.notes.filter((n) => containsPoint(n, local))
  }

  // convert mouse position to the local coordinate on the canvas
  getLocal(e: { offsetX: number; offsetY: number }): IPoint {
    return {
      x: e.offsetX + this.scrollLeft,
      y: e.offsetY + this.scrollTop,
    }
  }

  get selectionBounds(): IRect | null {
    if (this.selection !== null) {
      return getSelectionBounds(this.selection, this.transform)
    }
    return null
  }

  filteredEvents<T extends TrackEvent>(filter: (e: TrackEvent) => e is T): T[] {
    const {
      windowedEvents,
      scrollLeft,
      canvasWidth,
      transform,
      selectedTrack,
    } = this

    const controllerEvents = (selectedTrack?.events ?? []).filter(filter)
    const events = windowedEvents.filter(filter)

    // Add controller events in the outside of the visible area

    const tickStart = scrollLeft / transform.pixelsPerTick
    const tickEnd = (scrollLeft + canvasWidth) / transform.pixelsPerTick

    const prevEvent = maxBy(
      controllerEvents.filter((e) => e.tick < tickStart),
      (e) => e.tick,
    )
    const nextEvent = minBy(
      controllerEvents.filter((e) => e.tick > tickEnd),
      (e) => e.tick,
    )

    return [prevEvent, ...events, nextEvent].filter(isNotUndefined)
  }

  get currentVolume(): number | undefined {
    return this.selectedTrack?.getVolume(this.rootStore.player.position)
  }

  get currentVolume2(): number | undefined {
    return this.selectedTrack?.getVolume(this.rootStore.player.position)
  }

  get currentVolume3(): number | undefined {
    return this.selectedTrack?.getVolume(this.rootStore.player.position)
  }

  get currentPan(): number | undefined {
    return this.selectedTrack?.getPan(this.rootStore.player.position)
  }

  get playerTempo(): number | undefined {
    // console.log("get playerTempo", this.rootStore.reader.playerTempo)

    let tempo =
      this.rootStore.song.conductorTrack?.getTempo(
        this.rootStore.player.position,
      ) || 120

    return this.rootStore.reader.playerTempo
  }

  get currentTempo(): number | undefined {
    // console.log("get currentTempo")
    // console.log(
    //   "currentTempo(): ",
    //   this.rootStore.song.conductorTrack?.getTempo(
    //     this.rootStore.player.position,
    //   ),
    // )
    let prevTempo = this.rootStore.player.currentTempo
    let tempo =
      this.rootStore.song.conductorTrack?.getTempo(
        this.rootStore.player.position,
      ) || 120
    // console.log("Tick: ", this.rootStore.player.position)

    // console.log("Tempo: ", tempo)

    if (tempo < 15) {
      tempo = 120
    }

    this.rootStore.player.currentTempo = tempo
    // if (prevTempo != tempo) {
    //   console.log("deleteLiveTempo")
    //   this.rootStore.reader.deleteLiveTempo()
    // }

    let tempo2 =
      this.rootStore.song.conductorTrack?.getTempo(
        this.rootStore.player.position,
      ) || 120
    return tempo
  }

  get currentMBTTime(): string {
    return getMBTString(
      this.rootStore.song.measures,
      this.rootStore.player.position,
      this.rootStore.song.timebase,
    )
  }

  get cursorX(): number {
    return this.transform.getX(this.rootStore.player.position)
  }

  get cursorX2(): number {
    return this.transform.getX(this.rootStore.player.position2 || 100)
  }

  get quantizer(): Quantizer {
    return new Quantizer(this.rootStore, this.quantize, this.isQuantizeEnabled)
  }

  get enabledQuantizer(): Quantizer {
    return new Quantizer(this.rootStore, this.quantize, true)
  }

  get controlCursor(): string {
    return this.mouseMode === "pencil"
      ? `url("./cursor-pencil.svg") 0 20, pointer`
      : "auto"
  }
}
