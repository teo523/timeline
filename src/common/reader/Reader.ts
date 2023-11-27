import { Stream, deserializeSingleEvent } from "midifile-ts"
import { SongStore } from "../../main/stores/SongStore"
import Player from "../player/Player"
import EventHandler from "./EventHandler"
import EventScheduler from "./EventScheduler"
import { ReaderEvent } from "./ReaderEvent"

export default class Reader {
  private _currentTick: number = 0
  private _notes: [number, number][]
  private _chords: number[][]
  private _songStore: SongStore
  private _scheduler: EventScheduler<ReaderEvent> | null = null
  private _handler: EventHandler | null = null
  private _isPlaying: boolean = false
  private _interval: number | null = null
  private _player: Player
  private _playedNotes: number[] = []

  constructor(songStore: SongStore, player: Player) {
    this._notes = []
    this._chords = []
    this._songStore = songStore
    this._player = player
  }

  addPlayedNote(e: WebMidi.MIDIMessageEvent) {
    const stream = new Stream(e.data)
    if (stream["buf"].buffer.byteLength > 1) {
      const message = deserializeSingleEvent(stream)

      if (message.type !== "channel") {
        return
      }

      if (message.subtype == "noteOn") {
        this._playedNotes.push(message.noteNumber)
      }
    }
    //console.log(this._playedNotes)
  }

  allNotes() {
    const arr: [number, number][] = []
    this.song.getTrack(1)?.events.forEach((e) => {
      if (e.type === "channel") {
        if (e.subtype === "note") {
          arr.push([e.tick, e.noteNumber])
        }
      }
    })
    this._notes = arr
    console.log("notes: ", this._notes)
  }

  play() {
    if (this.isPlaying) {
      console.warn("called play() while playing. aborted.")
      return
    }

    this._currentTick = this._player.position
    this.allNotes()
    this._notes = this.getNextNotes()
    this._chords = this.getChords(this.notes)
    this._playedNotes = []

    this._handler = new EventHandler()
    this._interval = window.setInterval(() => this.listenEvents(), 10)

    // const nextNote = null

    // export const filterEventsWithRange = <T extends { tick: number }>(
    //   events: T[],
    //   ...range: Range
    // ): T[] => events.filter((e) => e.tick >= range[0] && e.tick < range[1])

    // move reader position
    // getNextNote()
    // listentoInput()
    // movePlayhead()
    // updateList()
  }

  stop() {
    this._scheduler = null
    this._handler = null
    this._isPlaying = false

    if (this._interval !== null) {
      clearInterval(this._interval)
      this._interval = null
    }
  }

  private getNextNotes() {
    return this.notes.filter((value) => value[0] > this._currentTick)
  }

  private getChords(notes: [number, number][]) {
    var chords: number[][] = []
    var chordActivated = false
    notes.forEach(function (value, idx) {
      if (idx > 0) {
        if (notes[idx][0] == notes[idx - 1][0]) {
          if (chordActivated) {
            chords[chords.length - 1].push(notes[idx][1])
          } else {
            chords.push([notes[idx - 1][0], notes[idx - 1][1], notes[idx][1]])
            chordActivated = true
          }
        } else {
          chordActivated = false
        }
      }
    })

    return chords
  }

  private checkMatchChords(): boolean {
    var check = true
    var checkedNotes = []
    for (let i = 1; i < this._chords[0].length - 1; i++) {
      var found = false
      for (let k = 0; k < this._playedNotes.length; k++) {
        if (this._chords[0][i] === this._playedNotes[k]) {
          found = true
          checkedNotes.push(this._chords[0][i])
          break
        }
      }
      if (!found) {
        // console.log(this._playedNotes)
        // console.log(this._chords)
        // console.log(i)
        check = false
      }
    }
    this._playedNotes = checkedNotes

    return check
  }

  private listenEvents() {
    // move reader position
    this._currentTick = this._player.position
    //if (this._playedNotes[0] === nextNotes[0][1])

    //this._playedNotes = [...new Set(this._playedNotes)]

    if (this.notes.length > 0) {
      // console.log(this.notes)
      // console.log(this._playedNotes)
      // console.log(this._playedNotes.length > 0)
      // console.log(this._currentTick >= this.notes[0][0])
      // console.log(this._playedNotes[0] != this.notes[0][1])
    }

    // If there are no played notes, only action can be to stop the playhead if we reach a new note
    if (
      this._player.isPlaying &&
      this._playedNotes.length == 0 &&
      this.notes.length > 0 &&
      this.notes[0][0] - 50 <= this._currentTick
    ) {
      this._player.stop()
      console.log("stop1")
      // console.log("this.notes[0][0]: ", this.notes[0][0])
      // console.log("this._currentTick : ", this._currentTick)
    }

    if (this._playedNotes.length > 0 && this.notes.length > 0) {
      //if next event is a chord
      if (this._chords.length > 0 && this._chords[0][0] <= this.notes[0][0]) {
        console.log("nextEvent is chord")
        console.log(this._playedNotes)
        console.log(this._chords[0])
        // if (this._playedNotes.length >= this._chords[0].length - 1) {
        //Check if notes match
        const match = this.checkMatchChords()
        console.log("match:", match)
        if (match) {
          //If playing, then move the playhead forward
          if (
            this._player.isPlaying &&
            this._player.position < this._chords[0][0]
          ) {
            this._player.position = this._chords[0][0] - 2
          }
          //If not playing, then play
          else {
            this._player.play()
          }
          //Update arrays
          for (var k = 0; k < this._chords[0].length - 1; k++) {
            this._notes.shift()
          }
          this._chords.shift()
          this._playedNotes = []
        }

        // If there is no match, only thing to do is to stop the playhead if we hit next chord
        else {
          console.log("this._currentTick", this._currentTick)
          console.log("this._chords[0][0] - 50", this._chords[0][0] - 50)
          if (
            this._player.isPlaying &&
            this._currentTick >= this._chords[0][0] - 50
          ) {
            this._player.stop()
          }
        }
        // }
      }
      //If next event is a single note
      else if (this.notes.length > 0) {
        if (this._playedNotes[0] == this._notes[0][1]) {
          if (
            this._player.isPlaying &&
            this._player.position < this._notes[0][0]
          ) {
            this._player.position = this.notes[0][0] - 2
          } else {
            this._player.play()
          }
          this.notes.shift()
        } else {
          if (this._player.isPlaying) {
            this._player.stop()
          }
        }

        this._playedNotes.shift()
      }
    }

    //Now handle player
    this._player.playNotes()
  }

  get song() {
    return this._songStore.song
  }

  get notes() {
    return this._notes
  }

  get isPlaying() {
    return this._isPlaying
  }
}
