import { Stream, deserializeSingleEvent } from "midifile-ts"
import { computed, makeObservable, observable } from "mobx"
import { SynthOutput } from "../../main/services/SynthOutput"
import { SongStore } from "../../main/stores/SongStore"
import {
  controllerMidiEvent,
  noteOffMidiEvent,
  noteOnMidiEvent,
} from "../midi/MidiEvent"
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
  // private _playedNotes: number[] = []
  private _playerOn: boolean = false
  private _prevTime: number = performance.now()
  private _output: SynthOutput
  private _in: number[][] = []
  private _out: number[][][] = []
  private _startTime: number = 0
  private _initialPosition: number = 0
  private _lastTick = 0
  private _noteTimeOut = 0
  private _noteTimeIn = 0
  private _lastTime = 0
  private _lastPlayedNote = 0
  private _lastPlayedTick = 0
  private _prevNoteTime = 0
  private _liveTempo: number[] = []
  private _averageTempo: number = 120
  private _playedNotes: number[][] = []
  private _tolerance = 50
  private _chordLock = false
  private _chordCounter = 0
  private directMode: boolean = true

  //Assuming files with resolution of 960
  lastMatchTime = 0
  lastPosition = 0
  instantTempo = 120
  delta_0 = 0
  delta_1 = 0
  playerTempo = 120

  //[tick of input note, expected time for input note to happen]
  private _expectedIn: number[][] = []

  constructor(songStore: SongStore, player: Player, output: SynthOutput) {
    makeObservable<Reader, "_averageTempo">(this, {
      _averageTempo: observable,
      playerTempo: computed,
    })

    this._notes = []
    this._chords = []
    this._songStore = songStore
    this._player = player
    this._output = output
    this._interval = null
    this._averageTempo = this._player.currentTempo
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
        // console.log("this._out: ", this._out)
        if (this._lastPlayedNote == 0) {
          this._lastPlayedNote = performance.now()
        } else {
          console.log("HERE ", this._expectedIn)
          if (
            this._expectedIn.length > 0 &&
            Math.abs(this._expectedIn[0][0] - this._player.position) < 500 &&
            message.noteNumber == this._expectedIn[0][1]
          ) {
            let delta0 = this.tickToMillisec(
              this._expectedIn[0][0] - this._lastPlayedTick,
              this._player.currentTempo,
            )
            let delta1 = performance.now() - this._lastPlayedNote

            let tmp = (this._player.currentTempo * delta0) / delta1
            console.log("delta0: ", delta0)
            console.log("delta1: ", delta1)
            console.log("instant tempo: ", tmp)
            console.log("performance.now(): ", performance.now())
            console.log("this._lastPlayedNote: ", this._lastPlayedNote)

            this._liveTempo.push(tmp)

            if (this._liveTempo.length > 3) {
              this._liveTempo.shift()
              let sum = 0
              for (let i = 0; i < this._liveTempo.length; i++) {
                sum += this._liveTempo[i]
              }
              const average = sum / this._liveTempo.length
              this._averageTempo = average
              console.log("averageTempo: ", this._averageTempo)
              this.playerTempo = this._averageTempo
            }
            this._lastPlayedTick = this._expectedIn[0][0]
            this._lastPlayedNote = performance.now()
            this._expectedIn.shift()
          }
        }

        // let time = performance.now()
        // let lastTick = this._lastPlayedTick
        // var self = this
        // this._expectedIn.forEach(function (value, idx) {
        //   if (
        //     Math.abs(time - value[1]) < 300 &&
        //     message.noteNumber == value[2]
        //   ) {
        //     let delta0 = self.tickToMillisec(
        //       value[0] - lastTick,
        //       self._player.currentTempo,
        //     )
        //     let delta1 = performance.now() - self._lastPlayedNote
        //     let tmp = (self._player.currentTempo * delta0) / delta1
        //     console.log("delta0: ", delta0)
        //     console.log("delta1: ", delta1)
        //     console.log("instant tempo: ", tmp)
        //     self._liveTempo.push(tmp)

        //     if (self._liveTempo.length > 5) {
        //       self._liveTempo.shift()
        //       let sum = 0
        //       for (let i = 0; i < self._liveTempo.length; i++) {
        //         sum += self._liveTempo[i]
        //       }
        //       const average = sum / self._liveTempo.length
        //       self._averageTempo = average
        //       console.log("averageTempo: ", self._averageTempo)
        //     }
        //     self._lastPlayedTick = value[0]
        //     self._lastPlayedNote = performance.now()
        //   }
        // })

        // let delta = performance.now() - this._lastPlayedNote
        // let segmentTime =
        //   this.tickToMillisec(this.timebase, this._player.currentTempo) / 2
        // //When press if slightly after the beat, reduce tempo
        // if (Math.abs(delta % segmentTime) < 40) {
        //   console.log("reduce tempo")
        // this._player.currentTempo =
        //   this._player.currentTempo *
        //   (1 -
        //     (delta % segmentTime) /
        //       this.tickToMillisec(480, this._player.currentTempo))
      }
      //When press if slightly before the beat, increase tempo
      // else if (segmentTime - ((delta + segmentTime) % segmentTime) < 40) {
      //   console.log("increase tempo")
      // this._player.currentTempo =
      //   this._player.currentTempo *
      //   (1 +
      //     (segmentTime - ((delta + segmentTime) % segmentTime)) /
      //       this.tickToMillisec(480, this._player.currentTempo))

      // if (
      //   Math.abs(this._player.position - this._lastPlayedNote[0]) < 50 &&
      //   message.noteNumber == this._lastPlayedNote[1]
      // ) {
      //   this._player.currentTempo =
      //     this._player.currentTempo *
      //     (1 -
      //       (this._player.position - this._lastPlayedNote[0]) /
      //         this.tickToMillisec(480, this._player.currentTempo))
      // } else if (
      //   Math.abs(this._player.position - this._prevNoteTime) < 50 &&
      //   this._out[0].length > 1
      // ) {
      //   if (message.noteNumber == this._out[0][1][0]) {
      //     this._player.currentTempo =
      //       this._player.currentTempo *
      //       (1 +
      //         (this._out[0][0][0] - this._player.position) /
      //           this.tickToMillisec(480, this._player.currentTempo))
      //   }
      // }

      //console.log(this._player.currentTempo)

      // if (message.subtype == "noteOn") {
      //   this._playedNotes.push(message.noteNumber)
      //   this.listenEvents()
      // }
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
    //this.in = [[0,23],[960,21],[21112,23,44,60],...]

    this._out = this.groupNotesOutput(output)
    this._expectedIn = this._in
    console.log("this._expectedIn: ", this._expectedIn)

    // console.log("groupedIn: ", this._in)
    // console.log("groupedOut: ", this._out)
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

    // console.log("init:", this._player.position)
    this._currentTick = this._player.position
    this._startTime = performance.now()
    this._noteTimeOut = this._startTime
    this._noteTimeIn = this._startTime
    this._lastTick = this._currentTick
    this._lastTime = this._startTime
    this._initialPosition = this._player.position

    // console.log("play")
    this._playerOn = true
    this.allNotes()
    this._notes = this.getNextNotes()
    //this._chords = this.getChords(this.notes)
    this._playedNotes = []

    this._handler = new EventHandler()
    if (this.directMode) {
      this._interval = window.setInterval(() => this._playOutNotes(), 30)
    } else {
      this._interval = window.setInterval(() => this.listenEvents(), 30)
    }

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
    this._averageTempo = this._player.currentTempo
    this._liveTempo = []

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
    console.log("chords: ", chords)
    return chords
  }

  private checkMatchChords(): [boolean, number] {
    var check = true
    var checkedNotes = []
    for (let i = 1; i < this._chords[0].length; i++) {
      var found = false
      for (let k = 0; k < this._playedNotes.length; k++) {
        if (this._chords[0][i] === this._playedNotes[k][1]) {
          found = true
          checkedNotes.push([this._playedNotes[k][0], this._chords[0][i]])
          break
        }
      }
      // if (!found) {
      //   // console.log(this._playedNotes)
      //   // console.log(this._chords)
      //   // console.log(i)
      //   check = false

      // }
    }
    this._playedNotes = checkedNotes
    let ratio = checkedNotes.length / (this._chords[0].length - 1)
    check = ratio >= this._tolerance / 100

    if (checkedNotes.length > 0) {
      return [check, checkedNotes[0][0]]
    } else {
      return [check, 1]
    }
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
      this.notes[0][0] - 30 <= this._currentTick
    ) {
      this._playerOn = false
      // console.log("stop1")
      // console.log("this.notes[0][0]: ", this.notes[0][0])
      // console.log("this._currentTick : ", this._currentTick)
    }
    if (this._playedNotes.length > 0 && this.notes.length > 0) {
      //if next event is a chord
      if (this._chords.length > 0 && this._chords[0][0] <= this.notes[0][0]) {
        if (!this._chordLock) {
          // console.log("nextEvent is chord")
          // console.log(this._playedNotes)
          // console.log(this._chords[0])
          // if (this._playedNotes.length >= this._chords[0].length - 1) {
          //Check if notes match
          let [match, timeNote] = this.checkMatchChords()
          // console.log("match:", match)
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

            //Calculate dofference between expected and actual tempo
            this.delta_0 = this.tickToMillisec(
              this._player.position - this.lastPosition,
              this._player.currentTempo,
            )
            this.delta_1 = timeNote - this.lastMatchTime

            console.log("instant tempo: ", this.instantTempo)

            // console.log("timeNote: ", timeNote)
            // console.log("this.lastMatchTime: ", this.lastMatchTime)

            this.instantTempo =
              (this._player.currentTempo * this.delta_0) / this.delta_1
            this.lastMatchTime = timeNote
            this.lastPosition = this._player.position

            //Update arrays
            for (var k = 0; k < this._chords[0].length - 1; k++) {
              this._notes.shift()
            }
            this._chords.shift()
            this._playedNotes = []
            this._chordLock = true
            this._chordCounter = performance.now()
          }

          // If there is no match, only thing to do is to stop the playhead if we hit next chord
          else {
            // console.log("this._currentTick", this._currentTick)
            // console.log("this._chords[0][0] - 50", this._chords[0][0] - 50)
            if (
              this._player.isPlaying &&
              this._currentTick >= this._chords[0][0] - 30
            ) {
              this._player.stop()
              console.log("stop2")
            }
          }
        }
      }

      //If next event is a single note
      else if (this.notes.length > 0 && !this._chordLock) {
        if (this._playedNotes[0][1] == this._notes[0][1]) {
          if (
            this._player.isPlaying &&
            this._player.position < this._notes[0][0]
          ) {
            this._player.position = this.notes[0][0] - 2
          } else {
            this._playerOn = true
          }

          this.notes.shift()

          //Calculate dofference between expected and actual tempo
          this.delta_0 = this.tickToMillisec(
            this._player.position - this.lastPosition,
            this._player.currentTempo,
          )
          this.delta_1 = this._playedNotes[0][0] - this.lastMatchTime
          this.instantTempo =
            (this._player.currentTempo * this.delta_0) / this.delta_1
          this.lastMatchTime = this._playedNotes[0][0]
          this.lastPosition = this._player.position
          // console.log("lastMatchTime: ", this.lastMatchTime)
          // console.log("delta0: ", this.delta_0)
          console.log("instant tempo: ", this.instantTempo)
        } else {
          if (this._player.isPlaying) {
            // this._player.stop()
            // console.log("stop3")
          }
        }
        this._playedNotes.shift()
      }
    }
    //Now handle player
    this._player.playNotes()
    if (performance.now() - this._chordCounter > 40) {
      this._chordLock = false
    }
    if (this._chordLock) {
      this._playedNotes = []
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

    this._noteTimeOut = this._noteTimeIn = performance.now()
    this._lastTick = this._player.position

    // If the playhead has passed the note to be played by 50 ms, then stop playing output notes
    // if (this._in[0][0] + 50 < this._player.position) {
    //   if (this._interval !== null) {
    //     clearInterval(this._interval)
    //     this._interval = null
    //     return
    //   }
    // }
    while (this._player.position + 40 > this._out[0][0][0]) {
      // console.log("this._noteTime", this._noteTime)
      // console.log(
      //   "this._out[0][0][0] - this._lastTick",
      //   this._out[0][0][0] - this._lastTick,
      // )

      this._noteTimeOut =
        this._noteTimeOut +
        this.tickToMillisec(
          this._out[0][0][0] - this._lastTick,
          this._player.currentTempo,
        )
      // console.log("performance.now()", performance.now())
      // console.log("this._noteTime:", this._noteTime)

      let time = this._noteTimeOut
      let addNote = false
      let note = 0

      //Calculate the ratio between real and original tempo
      let ratio = Math.min(
        (100 * this._averageTempo) / this._player.currentTempo,
        127,
      )

      this._out[0].forEach(function (msg, idx) {
        addNote = false
        if (idx > 0) {
          if (msg[1] > 0) {
            output.sendEvent(noteOnMidiEvent(0, 1, msg[0], msg[1]), 0, time)
            //Send tempo ratio to CC103:
            output.sendEvent(
              controllerMidiEvent(0, 1, 103, ratio),
              0,
              performance.now(),
            )

            addNote = true
            note = msg[0]
          } else {
            output.sendEvent(noteOffMidiEvent(0, 1, msg[0], msg[1]), 0, time)
          }
        }
      })

      // if (addNote) {
      //   this._lastPlayedNote = [this._out[0][0][0], note]
      // }

      this._out.shift()

      if (addNote) {
        this._prevNoteTime = this._out[0][0][0]
      }
    }

    // while (this._player.position + 100 > this._in[0][0]) {
    //   this._noteTimeIn =
    //     this._noteTimeIn +
    //     this.tickToMillisec(
    //       this._in[0][0] - this._lastTick,
    //       this._player.currentTempo,
    //     )

    //   //this._expectedIn.push([this._in[0][0], this._noteTimeIn, this._in[0][1]])

    //   this._in.shift()
    // }

    //Remove past notes that haven't been played
    while (this._player.position - 500 > this._expectedIn[0][0]) {
      this._expectedIn.shift()
      console.log("this._expectedIn: ", this._expectedIn)
    }

    if (this._lastTime > 0) {
      //console.log("this._player.position: ", this._player.position)
      //console.log("tempo: ", this._player.currentTempo)

      //Move playhead forward:
      this._player.position =
        this._player.position +
        Math.round(
          this.millisecToTick(
            performance.now() - this._lastTime,
            this._averageTempo,
          ),
        )
    }

    this._lastTime = performance.now()

    // console.log(
    //   " performance.now() - currentTime",
    //   performance.now() - currentTime,
    // )
  }

  get tolerance() {
    return this._tolerance
  }

  set tolerance(tol: number) {
    this._tolerance = tol
    console.log("tol", tol)
  }
}
