import { emptySong } from "common/song"
import { emptyTrack } from "common/track"
import { write as writeSong } from "midi/SongFile"
import RootStore from "../stores/RootStore"

export const CREATE_SONG = Symbol()
export const SAVE_SONG = Symbol()
export const OPEN_SONG = Symbol()
export const ADD_TRACK = Symbol()
export const REMOVE_TRACK = Symbol()
export const SELECT_TRACK = Symbol()
export const SET_TEMPO = Symbol()

export default (rootStore: RootStore) => {
  const {
    song,
    historyStore: history,
    services: { player }
  } = rootStore

  const saveHistory = () => {
    rootStore.pushHistory()
  }

  const setSong = song => {
    rootStore.song = song
    player.reset()
    rootStore.trackMute.reset()
  }

  return {
    [CREATE_SONG]: () => {
      setSong(emptySong())
    },
    [SAVE_SONG]: ({ filepath }) => {
      writeSong(song, filepath, e => {
        if (e) {
          console.error(e)
        } else {
          song.filepath = filepath
        }
      })
    },
    [OPEN_SONG]: ({ filepath }) => {
      // readSong(filepath, (e, song) => {
      //   if (e) {
      //     console.error(e)
      //   } else {
      //     setSong(song)
      //     history.clear()
      //     rootStore.pushHistory()
      //   }
      // })
    },
    [ADD_TRACK]: () => {
      saveHistory()
      song.addTrack(emptyTrack(song.tracks.length - 1))
    },
    [REMOVE_TRACK]: ({ trackId }) => {
      saveHistory()
      song.removeTrack(trackId)
    },
    [SELECT_TRACK]: ({ trackId }) => {
      song.selectTrack(trackId)
    },
    [SET_TEMPO]: ({ tempo }) => {
      saveHistory()
      song.getTrack(0).tempo = tempo
    }
  }
}