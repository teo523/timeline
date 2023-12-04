import { Stream, deserializeSingleEvent } from "midifile-ts"
import { SynthOutput } from "../../main/services/SynthOutput"
import { SongStore } from "../../main/stores/SongStore"
import { noteOffMidiEvent, noteOnMidiEvent } from "../midi/MidiEvent"
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
  private _playerOn: boolean = false
  private _prevTime: number = performance.now()
  private _output: SynthOutput
  private _in: number[][] = []
  private _out: number[][][] = []
  private _startTime: number = 0
  private _initialPosition: number = 0

  constructor(songStore: SongStore, player: Player, output: SynthOutput) {
    this._notes = []
    this._chords = []
    this._songStore = songStore
    this._player = player
    this._output = output
    this._interval = null
  }

  addPlayedNote(e: WebMidi.MIDIMessageEvent) {
    const stream = new Stream(e.data)
    if (stream["buf"].buffer.byteLength > 1) {
      const message = deserializeSingleEvent(stream)

      if (message.type !== "channel") {
        return
      }
      //check if there are recent notes and put them together

      if (message.subtype == "noteOn") {
        this._playedNotes.push(message.noteNumber)
        this.listenEvents()
      }
      // else if (message.subtype == "noteOff") {
      //   this._player.sendEvent(
      //     noteOffMidiEvent(0, 1, message.noteNumber, message.velocity),
      //   )
      //   console.log("sent: ", message.noteNumber)
      // }
    }
    //console.log(this._playedNotes)
  }

  allNotes() {
    const input: [number, number][] = []
    const output: [number, number, number][] = []
    const endTick = Math.max(this.song.endOfSong, this.song2.endOfSong)

    this.song.getTrack(1)?.events.forEach((e) => {
      if (e.type === "channel") {
        if (e.subtype === "note") {
          input.push([e.tick, e.noteNumber])
        }
      }
    })

    this.song2.getTrack(1)?.events.forEach((e) => {
      if (e.type === "channel") {
        if (e.subtype === "note") {
          output.push([e.tick, e.noteNumber, e.velocity])
          output.push([e.tick + e.duration, e.noteNumber, 0])
        }
      }
    })

    output.sort(([a, b, c], [d, e, f]) => a - d || b - e)

    this._in = this.groupNotesInput(input)
    this._out = this.groupNotesOutput(output)

    console.log("groupedIn: ", this._in)
    console.log("groupedOut: ", this._out)
    // console.log("input: ", input)
    // console.log("output: ", output)

    // while (this._in.length > 0 || this._out.length > 0){
    //   //Look for next event

    //   if (Math.abs(this._in[0][0] - this._out[0][0][0]) < 20){
    //     this._notes.push([input[0][0],input[0],input[0]])
    //   }

    //   else if (input[0][0]<output[0][0]){

    //   }
    //   else if (input[0][0]>output[0][0])  {

    //   }

    // }
    // console.log("notes: ", this._notes)
  }

  play() {
    if (this.isPlaying) {
      console.warn("called play() while playing. aborted.")
      return
    }

    this._currentTick = this._player.position
    this._startTime = performance.now()
    this._initialPosition = this._player.position
    console.log(this._initialPosition)
    console.log("play")
    this._playerOn = true
    this.allNotes()
    this._notes = this.getNextNotes()
    //this._chords = this.getChords(this.notes)
    this._playedNotes = []

    this._handler = new EventHandler()
    this._interval = window.setInterval(() => this._playOutNotes(), 50)

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
    this._playerOn = false

    if (this._interval !== null) {
      clearInterval(this._interval)
      this._interval = null
    }
  }

  private getNextNotes() {
    return this.notes.filter((value) => value[0] > this._currentTick)
  }

  private groupNotesInput(notes: [number, number][]) {
    var chords: number[][] = []
    var chordActivated = false
    notes.forEach(function (value, idx) {
      if (idx > 0) {
        if (Math.abs(notes[idx][0] - notes[idx - 1][0]) < 20) {
          if (chordActivated) {
            chords[chords.length - 1].push(notes[idx][1])
          } else {
            chords.push([notes[idx - 1][0], notes[idx - 1][1], notes[idx][1]])
            chordActivated = true
          }
        } else {
          if (!chordActivated) {
            chords.push([notes[idx - 1][0], notes[idx - 1][1]])
          }
          chordActivated = false
        }
      }
    })

    return chords
  }

  private groupNotesOutput(notes: [number, number, number][]) {
    var chords: number[][][] = []
    var chordActivated = false
    notes.forEach(function (value, idx) {
      if (idx > 0) {
        if (Math.abs(notes[idx][0] - notes[idx - 1][0]) < 20) {
          if (chordActivated) {
            chords[chords.length - 1].push([notes[idx][1], notes[idx][2]])
          } else {
            chords.push([
              [notes[idx - 1][0]],
              [notes[idx - 1][1], notes[idx - 1][2]],
              [notes[idx][1], notes[idx][2]],
            ])
            chordActivated = true
          }
        } else {
          if (!chordActivated) {
            chords.push([
              [notes[idx - 1][0]],
              [notes[idx - 1][1], notes[idx - 1][2]],
            ])
          }
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
    if (!this._playerOn) {
      this._player.timeStopped =
        this._player.timeStopped + performance.now() - this._prevTime
    }
    this._prevTime = performance.now()

    if (this._in.length > 0) {
      // console.log(this.notes)
      // console.log(this._playedNotes)
      // console.log(this._playedNotes.length > 0)
      // console.log(this._currentTick >= this.notes[0][0])
      // console.log(this._playedNotes[0] != this.notes[0][1])
    }
    // If there are no played notes, only action can be to stop the playhead if we reach a new note
    if (
      this._playerOn &&
      this._playedNotes.length == 0 &&
      this.notes.length > 0 &&
      this.notes[0][0] + 20 <= this._currentTick
    ) {
      this._playerOn = false
      // console.log("stop1")
      // console.log("this.notes[0][0]: ", this.notes[0][0])
      // console.log("this._currentTick : ", this._currentTick)
    }
    if (this._playedNotes.length > 0 && this.notes.length > 0) {
      //if next event is a chord
      if (this._chords.length > 0 && this._chords[0][0] <= this.notes[0][0]) {
        // console.log("nextEvent is chord")
        // console.log(this._playedNotes)
        // console.log(this._chords[0])
        // if (this._playedNotes.length >= this._chords[0].length - 1) {
        //Check if notes match
        const match = this.checkMatchChords()
        // console.log("match:", match)
        if (match) {
          //If playing, then move the playhead forward
          if (this._playerOn && this._player.position < this._chords[0][0]) {
            this._player.position = this._chords[0][0] - 2
          }
          //If not playing, then play
          else {
            this._playerOn = true
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
          // console.log("this._currentTick", this._currentTick)
          // console.log("this._chords[0][0] - 50", this._chords[0][0] - 50)
          if (!this._playerOn && this._currentTick >= this._chords[0][0] + 20) {
            this._playerOn = false
            // console.log("stop2")
          }
        }
        // }
      }
      //If next event is a single note
      else if (this.notes.length > 0) {
        if (this._playedNotes[0] == this._notes[0][1]) {
          if (this._playerOn && this._player.position < this._notes[0][0]) {
            this._player.position = this.notes[0][0] + 2
            console.log("New Position: ", this._player.position)
          } else {
            this._playerOn = true
          }
          this.notes.shift()
        } else {
          if (this._playerOn) {
            // console.log("stop3")
            this._playerOn = false
          }
        }
        this._playedNotes.shift()
      }
    }
    //Now handle player
    if (this._playerOn) {
      //this._player.playNotes()
    }
  }

  get song() {
    return this._songStore.song
  }

  get song2() {
    return this._songStore.song2
  }

  get notes() {
    return this._notes
  }

  get isPlaying() {
    return this._isPlaying
  }

  private get timebase() {
    return this.song.timebase
  }

  tickToMillisec(tick: number, bpm: number) {
    return (tick / (this.timebase / 60) / bpm) * 1000
  }

  millisecToTick(ms: number, bpm: number) {
    return (((ms / 1000) * bpm) / 60) * this.timebase
  }

  _playOutNotes() {
    const output = this._output
    const startTime = this._startTime
    const initPos = this.tickToMillisec(this._initialPosition, 144)

    // If the playhead has passed the note to be played by 50 ms, then stop playing output notes
    // if (this._in[0][0] + 50 < this._player.position) {
    //   if (this._interval !== null) {
    //     clearInterval(this._interval)
    //     this._interval = null
    //     return
    //   }
    // }
    while (this._player.position + 100 > this._out[0][0][0]) {
      const noteTime = this.tickToMillisec(this._out[0][0][0], 144)
      this._out[0].forEach(function (msg, idx) {
        if (idx > 0) {
          if (msg[1] > 0) {
            output.sendEvent(
              noteOnMidiEvent(0, 1, msg[0], msg[1]),
              0,
              startTime + noteTime - initPos,
            )
            // console.log(performance.now())
            // console.log(startTime + noteTime - initPos)
          } else {
            output.sendEvent(
              noteOffMidiEvent(0, 1, msg[0], msg[1]),
              0,
              startTime + noteTime - initPos,
            )
          }
        }
      })
      this._out.shift()
    }

    this._player.position = Math.round(
      this.millisecToTick(performance.now() - this._startTime + initPos, 144),
    )
  }
}
