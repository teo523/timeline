import { isNotNull } from "../../common/helpers/array"
import { Beat, createBeatsInRange } from "../../common/helpers/mapBeats"
import { downloadSongAsMidi } from "../../common/midi/midiConversion"
import Song, { emptySong } from "../../common/song"
import { emptyTrack, isNoteEvent } from "../../common/track"
import { clampNoteNumber } from "../../common/transform/NotePoint"
import RootStore from "../stores/RootStore"
import { songFromFile } from "./file"

const openSongFile = async (input: HTMLInputElement): Promise<Song | null> => {
  if (input.files === null || input.files.length === 0) {
    return Promise.resolve(null)
  }

  const file = input.files[0]
  return await songFromFile(file)
}

export const setSong = (rootStore: RootStore) => (song: Song) => {
  const { trackMute, pianoRollStore, player, historyStore, arrangeViewStore } =
    rootStore
  rootStore.song = song
  console.log("Track1: ")
  console.log(song.tracks[1])
  trackMute.reset()

  pianoRollStore.setScrollLeftInPixels(0)
  pianoRollStore.notGhostTracks = new Set()
  pianoRollStore.selection = null
  pianoRollStore.selectedNoteIds = []
  pianoRollStore.selectedTrackId = Math.min(song.tracks.length - 1, 1)

  arrangeViewStore.selection = null
  arrangeViewStore.selectedEventIds = []

  historyStore.clear()
  player.stop()
  player.reset()
  player.position = 0
}

export const setSong2 = (rootStore: RootStore) => (song2: Song) => {
  const { trackMute, pianoRollStore, player, historyStore, arrangeViewStore } =
    rootStore
  rootStore.song2 = song2
  console.log("setSong2")
  console.log(song2)
  trackMute.reset()

  pianoRollStore.setScrollLeftInPixels(0)
  pianoRollStore.notGhostTracks = new Set()
  pianoRollStore.selection = null
  pianoRollStore.selectedNoteIds = []
  pianoRollStore.selectedTrackId = Math.min(song2.tracks.length - 1, 1)

  arrangeViewStore.selection = null
  arrangeViewStore.selectedEventIds = []

  historyStore.clear()

  player.stop()
  player.reset()
  player.position = 0

  // Create spreadsheet from midi messages at song2:

  let data: number[][] = []
  let allBeats = createBeatsInRange(
    song2.measures,
    song2.timebase,
    0,
    song2.endOfSong,
  )

  //ISSUE TO FIX: when loading "Waving through a window" the 7th note appears incorrect

  const tickToBar = (tick: number, ab: Beat[]): [number, number, number] => {
    let array: [number, number, number] = [ab[0].measure, ab[0].beat, 0]
    while (tick > ab[0].tick) {
      array[0] = ab[0].measure
      array[1] = ab[0].beat
      ab.shift()
    }
    array[2] = ab[0].tick - tick
    // console.log(
    //   "tick: ",
    //   tick,
    //   "beatTick: ",
    //   ab[0].tick,
    //   ", bar: ",
    //   array[0],
    //   ", beat: ",
    //   array[1],
    // )
    return array
  }

  console.log("song2.getTrack(1)?.events: ", song2.getTrack(1)?.events)
  song2.getTrack(1)?.events.forEach((e) => {
    if (e.type === "channel") {
      if (e.subtype === "note") {
        let a = tickToBar(e.tick, allBeats)

        data.push(a)
      }
    }
  })

  console.log("data: ", data)
}

export const setSong3 = (rootStore: RootStore) => (song3: Song) => {
  const { trackMute, pianoRollStore, player, historyStore, arrangeViewStore } =
    rootStore
  rootStore.song3 = song3
  console.log("setSong3")
  console.log(song3)
  trackMute.reset()

  pianoRollStore.setScrollLeftInPixels(0)
  pianoRollStore.notGhostTracks = new Set()
  pianoRollStore.selection = null
  pianoRollStore.selectedNoteIds = []
  pianoRollStore.selectedTrackId = Math.min(song3.tracks.length - 1, 1)

  arrangeViewStore.selection = null
  arrangeViewStore.selectedEventIds = []

  historyStore.clear()

  player.stop()
  player.reset()
  player.position = 0

  // Create spreadsheet from midi messages at song3:

  let data: number[][] = []
  let allBeats = createBeatsInRange(
    song3.measures,
    song3.timebase,
    0,
    song3.endOfSong,
  )

  //ISSUE TO FIX: when loading "Waving through a window" the 7th note appears incorrect

  const tickToBar = (tick: number, ab: Beat[]): [number, number, number] => {
    let array: [number, number, number] = [ab[0].measure, ab[0].beat, 0]
    while (tick > ab[0].tick) {
      array[0] = ab[0].measure
      array[1] = ab[0].beat
      ab.shift()
    }
    array[2] = ab[0].tick - tick
    // console.log(
    //   "tick: ",
    //   tick,
    //   "beatTick: ",
    //   ab[0].tick,
    //   ", bar: ",
    //   array[0],
    //   ", beat: ",
    //   array[1],
    // )
    return array
  }

  console.log("song3.getTrack(1)?.events: ", song3.getTrack(1)?.events)
  song3.getTrack(1)?.events.forEach((e) => {
    if (e.type === "channel") {
      if (e.subtype === "note") {
        let a = tickToBar(e.tick, allBeats)

        data.push(a)
      }
    }
  })

  console.log("data: ", data)
}

export const createSong = (rootStore: RootStore) => () => {
  const store = rootStore
  setSong(store)(emptySong())
  setSong2(store)(emptySong())
}

export const saveSong = (rootStore: RootStore) => () => {
  const { song } = rootStore
  song.isSaved = true
  downloadSongAsMidi(song, rootStore)
}

export const openSong =
  (rootStore: RootStore) => async (input: HTMLInputElement) => {
    const song = await openSongFile(input)
    if (song === null) {
      return
    }

    setSong(rootStore)(song)
  }

export const openSong2 =
  (rootStore: RootStore) => async (input: HTMLInputElement) => {
    const song2 = await openSongFile(input)
    if (song2 === null) {
      return
    }
    setSong2(rootStore)(song2)
  }

export const addTrack =
  ({ song, pushHistory }: RootStore) =>
  () => {
    pushHistory()
    song.addTrack(emptyTrack(song.tracks.length - 1))
  }

export const removeTrack =
  ({ song, pianoRollStore, pushHistory }: RootStore) =>
  (trackId: number) => {
    if (song.tracks.filter((t) => !t.isConductorTrack).length <= 1) {
      // conductor track を除き、最後のトラックの場合
      // トラックがなくなるとエラーが出るので削除できなくする
      // For the last track except for Conductor Track
      // I can not delete it because there is an error when there is no track
      return
    }
    pushHistory()
    song.removeTrack(trackId)
    pianoRollStore.selectedTrackId = Math.min(trackId, song.tracks.length - 1)
  }

export const selectTrack =
  ({ pianoRollStore }: RootStore) =>
  (trackId: number) => {
    pianoRollStore.selectedTrackId = trackId
  }

export const insertTrack =
  ({ song, pushHistory }: RootStore) =>
  (trackId: number) => {
    pushHistory()
    song.insertTrack(emptyTrack(song.tracks.length - 1), trackId)
  }

export const duplicateTrack =
  ({ song, pushHistory }: RootStore) =>
  (trackId: number) => {
    if (trackId === 0) {
      throw new Error("Don't remove conductor track")
    }
    const track = song.getTrack(trackId)
    if (track === undefined) {
      throw new Error("No track found")
    }
    const newTrack = track.clone()
    newTrack.channel = undefined
    pushHistory()
    song.insertTrack(newTrack, trackId + 1)
  }

export const transposeNotes =
  ({ song }: RootStore) =>
  (
    deltaPitch: number,
    selectedEventIds: {
      [key: number]: number[] // trackId: eventId
    },
  ) => {
    for (const trackIdStr in selectedEventIds) {
      const trackId = parseInt(trackIdStr)
      const eventIds = selectedEventIds[trackId]
      const track = song.getTrack(trackId)
      if (track === undefined) {
        continue
      }
      track.updateEvents(
        eventIds
          .map((id) => {
            const n = track.getEventById(id)
            if (n == undefined || !isNoteEvent(n)) {
              return null
            }
            return {
              id,
              noteNumber: clampNoteNumber(n.noteNumber + deltaPitch),
            }
          })
          .filter(isNotNull),
      )
    }
  }
