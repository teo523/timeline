import { AnyChannelEvent, AnyEvent } from "midifile-ts"
import { deassemble as deassembleNote } from "../helpers/noteAssembler"
import Track, { TrackEvent } from "../track"
import { DistributiveOmit } from "../types"

export type ReaderEventOf<T> = DistributiveOmit<T, "deltaTime"> & {
  tick: number
  trackId: number
  subtype: string
  noteNumber: number
}

export type ReaderEvent = ReaderEventOf<AnyEvent>

export const convertTrackEvents = (
  events: TrackEvent[],
  channel: number | undefined,
  trackId: number,
) =>
  events
    .filter((e) => !(e.isRecording === true))
    .flatMap((e) => deassembleNote(e))
    .map(
      (e) =>
        ({ ...e, channel: channel, trackId }) as ReaderEventOf<AnyChannelEvent>,
    )

export const collectAllEvents = (tracks: Track[]): ReaderEvent[] =>
  tracks.flatMap((t, i) => convertTrackEvents(t.events, t.channel, i))
