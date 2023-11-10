import { makeObservable, observable } from "mobx"
import Song, { emptySong } from "../../common/song"

export class SongStore {
  song: Song = emptySong()
  song2: Song = emptySong()

  constructor() {
    makeObservable(this, {
      song: observable.ref,
      song2: observable.ref,
    })
  }
}
