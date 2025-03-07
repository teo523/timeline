import { Stream, deserializeSingleEvent } from "midifile-ts"
import { computed, makeObservable, observable } from "mobx"
import {
  setTrackVolume,
  setTrackVolume2,
  setTrackVolume3,
} from "../../main/actions"
import { SynthOutput } from "../../main/services/SynthOutput"
import RootStore from "../../main/stores/RootStore"
import { SongStore } from "../../main/stores/SongStore"
import { filterEventsWithRange } from "../helpers/filterEvents"
import {
  controllerMidiEvent,
  noteOffMidiEvent,
  noteOnMidiEvent,
} from "../midi/MidiEvent"
import Player, { DEFAULT_TEMPO } from "../player/Player"
import EventHandler from "./EventHandler"
import EventScheduler from "./EventScheduler"
import { ReaderEvent } from "./ReaderEvent"

export default class Reader {
  private _currentTick: number = 0
  private _inVamp: boolean = false
  private _vampIdx: number = 0
  private _notes: [number, number][]
  private _chords: number[][]
  private _songStore: SongStore
  private _rootStore: RootStore
  private _mode: number[][]
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
  private _noteOffs: number[] = []
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
  private _tolerance = 30
  private _averageLength: number = 5
  private _timeRange = 300
  private _chordLock = false
  private _chordCounter = 0
  private _autoMode: boolean = false
  private _tmp: number = DEFAULT_TEMPO

  //Assuming files with resolution of 960
  lastMatchTime = 0
  lastPosition = 0
  instantTempo = 120
  delta_0 = 0
  delta_1 = 0

  //[tick of input note, expected time for input note to happen]
  private _expectedIn: number[][] = []

  constructor(
    songStore: SongStore,
    player: Player,
    output: SynthOutput,
    mode: number[][],
    rootStore: RootStore,
  ) {
    makeObservable<Reader, "_averageTempo">(this, {
      _averageTempo: observable,
      playerTempo: computed,
    })

    this._notes = []
    this._chords = []
    this._songStore = songStore
    this._rootStore = rootStore
    this._mode = mode
    this._player = player
    this._output = output
    this._interval = null
    this._averageTempo = this._player.currentTempo || 120
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
        // console.log(
        //   "this._playedNotes: ",
        //   this._playedNotes,
        //   ", this._notes: ",
        //   this._notes,
        // )
        // console.log("this._out: ", this._out)
        this._playedNotes.push([performance.now(), message.noteNumber])

        if (this._lastPlayedNote == 0) {
          this._lastPlayedNote = performance.now()
        } else {
          // console.log("this._expectedIn.length", this._expectedIn.length)

          if (this._autoMode) {
            if (
              this._expectedIn.length > 0 &&
              Math.abs(this._expectedIn[0][0] - this._player.position) <
                this.timeRange &&
              message.noteNumber == this._expectedIn[0][1]
            ) {
              let delta0 = this.tickToMillisec(
                this._expectedIn[0][0] - this._lastPlayedTick,
                this._player.currentTempo,
              )
              let delta1 = performance.now() - this._lastPlayedNote

              let tmp = (this._player.currentTempo * delta0) / delta1

              //bound values to +/- 20% around the currentTempo
              tmp = Math.max(
                Math.min(1.2 * this._player.currentTempo, tmp),
                0.8 * this._player.currentTempo,
              )

              // console.log("delta0: ", delta0)
              // console.log("delta1: ", delta1)
              // console.log("instant tempo: ", tmp)
              // console.log("performance.now(): ", performance.now())
              // console.log("this._lastPlayedNote: ", this._lastPlayedNote)

              this._liveTempo.push(tmp)

              if (this._liveTempo.length > this._averageLength - 1) {
                this._liveTempo.shift()
                let sum = 0
                for (let i = 0; i < this._liveTempo.length; i++) {
                  sum += this._liveTempo[i]
                }
                const average = sum / this._liveTempo.length
                this._averageTempo = average
                console.log("averageTempo: ", this._averageTempo)
              }
              this._lastPlayedTick = this._expectedIn[0][0]

              //Define the level of autonomy through tolerance slider
              if (this.autoMode) {
                this._player.position = Math.round(
                  (this._tolerance / 100) * this._player.position +
                    (1 - this._tolerance / 100) * this._expectedIn[0][0],
                )
              }
              this._lastPlayedNote = performance.now()
              this._expectedIn.shift()
            }
          } else {
            if (
              this._expectedIn.length > 0 &&
              message.noteNumber == this._expectedIn[0][1]
            ) {
              let delta0 = this.tickToMillisec(
                this._expectedIn[0][0] - this._lastPlayedTick,
                this._player.currentTempo,
              )
              let delta1 = performance.now() - this._lastPlayedNote

              let tmp = (this._player.currentTempo * delta0) / delta1

              //bound values to +/- 20% around the currentTempo
              tmp = Math.max(
                Math.min(1.2 * this._player.currentTempo, tmp),
                0.8 * this._player.currentTempo,
              )

              // console.log("delta0: ", delta0)
              // console.log("delta1: ", delta1)
              // console.log("instant tempo: ", tmp)
              // console.log("performance.now(): ", performance.now())
              // console.log("this._lastPlayedNote: ", this._lastPlayedNote)

              this._liveTempo.push(tmp)

              if (this._liveTempo.length > this._averageLength - 1) {
                this._liveTempo.shift()
                let sum = 0
                for (let i = 0; i < this._liveTempo.length; i++) {
                  sum += this._liveTempo[i]
                }
                const average = sum / this._liveTempo.length
                this._averageTempo = average
                this._player.averageTempo = average
                // console.log("averageTempo2: ", this._averageTempo)
              }
              this._lastPlayedTick = this._expectedIn[0][0]

              //Define the level of autonomy through tolerance slider

              this._lastPlayedNote = performance.now()
              this._expectedIn.shift()
            }
          }
        }

        //Calculate the ratio between real and original tempo
        let recTempo =
          this._songStore.song3.conductorTrack?.getTempo(
            this._player.position,
          ) || 120

        let ratio = Math.trunc(
          Math.min((100 * this._averageTempo) / recTempo, 127),
        )
        if (isNaN(ratio)) {
          ratio = 1
        }
        //Send tempo ratio. This works for CC119 but not for every CC controller.
        this._player.sendEvent(
          controllerMidiEvent(0, 1, 119, ratio),
          0,
          performance.now(),
        )
      }
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

    this._notes = input
    this._in = this.groupNotesInput(input)
    var b = this._in.filter((c) => c[0] >= this._player.position)
    this._in = b

    //this.in = [[0,23],[960,21],[21112,23,44,60],...]

    this._out = this.groupNotesOutput(output)

    var a = this._out.filter((c) => c[0][0] >= this._player.position)
    this._out = a
    this._expectedIn = this._in
    // console.log("this._expectedIn: ", this._expectedIn)

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
    // console.log("reader start play()")
    // console.log("init:", this._player.position)
    this._currentTick = this._player.position
    // console.log("this._player.position: ", this._player.position)
    this._isPlaying = true
    this._tmp = this._player.currentTempo
    this._startTime = performance.now()
    this._noteTimeOut = this._startTime
    this._noteTimeIn = this._startTime
    this._lastTick = this._currentTick
    this._lastTime = this._startTime
    this._initialPosition = this._player.position
    this._averageTempo = this._player.currentTempo

    this._playerOn = true
    this.allNotes()
    this._notes = this.getNextNotes()
    this._chords = this.getChords(this.notes)
    this._playedNotes = []
    this._player.noteOffs = this.noteOffs()

    if (!this.autoMode) {
      this._interval = window.setInterval(() => this._directControl(), 30)
    } else {
      this._interval = window.setInterval(() => this._autoControl(), 30)
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
    console.log("stop")
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
    // console.log("chords: ", chords)
    return chords
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
    // console.log("chords: ", chords)
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

  private noteOffs(): number[] {
    let array: number[] = []
    const allEvents = filterEventsWithRange(
      this.song2.tracks[1].allevents,
      this._player.position,
      this.song2.endOfSong,
    )

    allEvents.forEach((e, idx) => {
      if (e.type == "channel" && e.subtype == "note") {
        array.push(e.duration)
      }
    })

    return array
  }

  private _setMode() {
    let self = this
    let initial = this._autoMode

    this._mode = this._rootStore.mode

    for (var i in this._mode) {
      if (
        Number(i) < this._mode.length - 1 &&
        this._mode[Number(i) + 1][0] > this._player.position + 100
      ) {
        if (this._mode[i][1] == 1 && self._autoMode == false) {
          self._autoMode = true
          // console.log("changed to auto")
        } else if (this._mode[i][1] == 0 && self._autoMode == true) {
          self._autoMode = false
          //hand-made solution for missing note offs not being passed to auto mode. Check next 10 events and if theres an uncoupled note-off, schedule it
          let noteons: number[] = []
          let noteoffs: number[] = []
          let output = this._output
          if (this._out.length > 20) {
            for (let i = 0; i < 10; i++) {
              this._out[i].forEach(function (msg, idx) {
                console.log(msg)
                if (idx > 0) {
                  if (msg[1] > 0) {
                    noteons.push(msg[0])
                  } else {
                    if (!noteons.includes(msg[0])) {
                      console.log("sendOff2: ", msg[0])
                      output.sendEvent(
                        noteOffMidiEvent(0, 1, msg[0], 0),
                        30,
                        performance.now(),
                      )
                    }
                  }
                }
              })
            }
          }

          // console.log("changed to direct")
          // console.log(elem)
        }
        self.tolerance = this._mode[i][2]
        self.timeRange = this._mode[i][3]
        self.averageLength = this._mode[i][4]
        setTrackVolume(this._rootStore)(1, self.tolerance)
        setTrackVolume2(this._rootStore)(1, self.timeRange)
        setTrackVolume3(this._rootStore)(1, self.averageLength)

        break
      }

      if (Number(i) == this._mode.length - 1) {
        if (this._mode[i][1] == 1) {
          self._autoMode = true
          // console.log("changed to auto")
        } else {
          self._autoMode = false
          // console.log("changed to direct")
          // console.log(elem)
        }
        self.tolerance = this._mode[i][2]
        self.timeRange = this._mode[i][3]
        self.averageLength = this._mode[i][4]
        setTrackVolume(this._rootStore)(1, self.tolerance)
        setTrackVolume2(this._rootStore)(1, self.timeRange)
        setTrackVolume3(this._rootStore)(1, self.averageLength)
      }
    }

    if (this._autoMode != initial) {
      var auxTempo = this._averageTempo
      var auxLast = this._liveTempo
      this.stop()
      this.play()
      this._averageTempo = auxTempo
      this._liveTempo = auxLast
    }
    // console.log("mode:", this._mode)
  }

  private _directControl() {
    // console.log("this._tmp: ", this._tmp)
    // console.log("this._player.currentTempo: ", this._player.currentTempo)

    if (this._tmp != this._player.currentTempo) {
      // console.log("deleteLiveTempo")
      this._tmp = this._player.currentTempo
      this.deleteLiveTempo()
    }
    // console.log("this._liveTempo: ", this._liveTempo)

    this._setMode()
    if (this._autoMode == true) {
      return
    }
    // console.log("DC")
    // console.log("this.notes[0][0]: ", this.notes[0][0])
    // console.log("this.notes[0][1]: ", this.notes[0][1])
    // console.log("this._position: ", this._player.position)
    // console.log("this.player.currentTrempo: ", this._player.currentTempo)

    // move reader position
    this._currentTick = this._player.position

    //check if we entered or exited a vamp section
    if (!this._inVamp) {
      this._rootStore.vampStarts.forEach((val, idx) => {
        if (
          this._currentTick >= this._rootStore.vampStarts[idx] &&
          this._currentTick <= this._rootStore.vampEnds[idx]
        ) {
          console.log("entered vamp section")
          this._inVamp = true
          this._vampIdx = idx
        }
      })
    } else {
      if (this._currentTick >= this._rootStore.vampEnds[this._vampIdx]) {
        this._inVamp = false
        this._vampIdx = 0
      }
    }

    // if (this._in.length > 0) {
    //   // console.log(this.notes)
    //   // console.log(this._playedNotes)
    //   // console.log(this._playedNotes.length > 0)
    //   // console.log(this._currentTick >= this.notes[0][0])
    //   // console.log(this._playedNotes[0] != this.notes[0][1])
    // }
    // If there are no played notes, only action can be to stop the playhead if we reach a new note
    if (
      this._playerOn &&
      this._playedNotes.length == 0 &&
      this.notes.length > 0 &&
      this.notes[0][0] - 30 <= this._currentTick
    ) {
      this._playerOn = false
      this._player.stop()
      console.log("s1")
    }

    // If next note is a vamp loop
    // 1. Check if note played is first note of vamp and that we are in the end of loop
    // 2. If so, move playhead to start of vamp
    // 3. Update notes to be played

    if (
      this._playedNotes.length > 0 &&
      this._inVamp &&
      this._notes[0][0] >= this._rootStore.vampEnds[this._vampIdx] &&
      this._playedNotes[0][1] == this._rootStore.vampNotes[this._vampIdx]
    ) {
      console.log("here")
      this._currentTick = this._player.position =
        this._rootStore.vampStarts[this._vampIdx] - 2
      this.allNotes()
      this._notes = this.getNextNotes()
      this._chords = this.getChords(this.notes)
      this._player.noteOffs = this.noteOffs()
      this._currentTick = this._player.position = this._notes[0][0] - 2
    }

    if (this._playedNotes.length > 0 && this.notes.length > 0) {
      //if next event is a chord
      if (this._chords.length > 0 && this._chords[0][0] <= this.notes[0][0]) {
        //console.log("s2")
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
              this._playerOn = true
              this._player.play()
            }

            //Calculate dofference between expected and actual tempo
            // this.delta_0 = this.tickToMillisec(
            //   this._player.position - this.lastPosition,
            //   this._player.currentTempo,
            // )
            // this.delta_1 = timeNote - this.lastMatchTime

            // console.log("instant tempo: ", this.instantTempo)

            // // console.log("timeNote: ", timeNote)
            // // console.log("this.lastMatchTime: ", this.lastMatchTime)

            // this.instantTempo =
            //   (this._player.currentTempo * this.delta_0) / this.delta_1
            // this.lastMatchTime = timeNote
            // this.lastPosition = this._player.position

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
        // console.log("s3")
        if (this._playedNotes[0][1] == this._notes[0][1]) {
          // console.log("playedNextNote!")
          if (
            this._player.isPlaying &&
            this._player.position < this._notes[0][0]
          ) {
            this._player.position = this.notes[0][0] - 2
          } else {
            this._playerOn = true
            this._player.play()
          }

          this.notes.shift()

          //Calculate dofference between expected and actual tempo
          // this.delta_0 = this.tickToMillisec(
          //   this._player.position - this.lastPosition,
          //   this._player.currentTempo,
          // )
          // console.log("this._playedNotes: ", this._playedNotes)

          // this.delta_1 = this._playedNotes[0][0] - this.lastMatchTime
          // this.instantTempo =
          //   (this._player.currentTempo * this.delta_0) / this.delta_1
          // this.lastMatchTime = this._playedNotes[0][0]
          // this.lastPosition = this._player.position
          // console.log("lastMatchTime: ", this.lastMatchTime)
          // console.log("delta0: ", this.delta_0)
          // console.log("instant tempo: ", this.instantTempo)
        } else {
          if (this._player.isPlaying) {
            // this._player.stop()
            // console.log("stop3")
          }
        }
        this._playedNotes.shift()
      }
    }

    while (
      this._expectedIn.length > 0 &&
      this._player.position - 500 > this._expectedIn[0][0]
    ) {
      this._expectedIn.shift()
      //console.log("this._expectedIn: ", this._expectedIn)
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

  get playerTempo() {
    return this._averageTempo
  }

  deleteLiveTempo() {
    this._liveTempo = []
    for (let i = 0; i < this._averageLength; i++) {
      this._liveTempo.push(this._player.currentTempo)
    }
    console.log("this._liveTempo", this._liveTempo)
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

  private _autoControl() {
    // console.log("this._tmp: ", this._tmp)
    // console.log("this._player.currentTempo: ", this._player.currentTempo)

    if (this._tmp != this._player.currentTempo) {
      // console.log("deleteLiveTempo")
      this._tmp = this._player.currentTempo
      this.deleteLiveTempo()
    }
    // console.log("this._liveTempo: ", this._liveTempo)

    // console.log("playedNotes:", this._playedNotes)
    // console.log("this._position: ", this._player.position)
    this._setMode()
    // if (this._autoMode == false) {
    //   return
    // }

    const output = this._output

    //check if we entered or exited a vamp section
    if (!this._inVamp) {
      this._rootStore.vampStarts.forEach((val, idx) => {
        if (
          this._currentTick >= this._rootStore.vampStarts[idx] &&
          this._currentTick <= this._rootStore.vampEnds[idx]
        ) {
          console.log("entered vamp section")
          this._inVamp = true
          this._vampIdx = idx
        }
      })
    } else {
      if (this._currentTick >= this._rootStore.vampEnds[this._vampIdx]) {
        this._inVamp = false
        this._vampIdx = 0
      }
    }

    this._noteTimeOut = this._noteTimeIn = performance.now()
    this._lastTick = this._player.position
    // console.log("this._player.currentTempo: ", this._player.currentTempo)

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
      let recTempo =
        this._songStore.song3.conductorTrack?.getTempo(this._player.position) ||
        120
      let ratio = Math.trunc(
        Math.min((100 * this._averageTempo) / recTempo, 127),
      )

      console.log("ratio: ", ratio)
      if (isNaN(ratio)) {
        ratio = 1
      }
      this._out[0].forEach(function (msg, idx) {
        addNote = false
        if (idx > 0) {
          console.log(msg)
          if (msg[1] > 0) {
            output.sendEvent(noteOnMidiEvent(0, 1, msg[0], msg[1]), 0, time)
            //Send tempo ratio to CC119:
            output.sendEvent(
              controllerMidiEvent(0, 1, 119, ratio),
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
    while (
      this._expectedIn.length > 0 &&
      this._player.position - 500 > this._expectedIn[0][0]
    ) {
      this._expectedIn.shift()
      //console.log("this._expectedIn: ", this._expectedIn)
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
    // console.log("this._averageTempo", this._averageTempo)
    this._lastTime = performance.now()

    this._setMode()

    // if (
    //   this._inVamp &&
    //   this._out[0][0][0] > this._rootStore.vampEnds[this._vampIdx]
    // ) {
    //   this._autoMode = true
    // }

    // If next note is a vamp loop
    // 1. Check if note played is first note of vamp and that we are in the end of loop
    // 2. If so, move playhead to start of vamp
    // 3. Update notes to be played

    // console.log("this._inVamp", this._inVamp)
    // console.log("this._notes", this._notes)
    // console.log(
    //   "this._rootStore.vampEnds[this._vampIdx]",
    //   this._rootStore.vampEnds[this._vampIdx],
    // )
    // console.log("this._playedNotes", this._playedNotes)
    // console.log(
    //   "this._rootStore.vampNotes[this._vampIdx]",
    //   this._rootStore.vampNotes[this._vampIdx],
    // )

    if (
      this._playedNotes.length > 0 &&
      this._expectedIn.length > 0 &&
      this._inVamp &&
      this._expectedIn[0][0] >= this._rootStore.vampEnds[this._vampIdx] &&
      this._playedNotes[this._playedNotes.length - 1][1] ==
        this._rootStore.vampNotes[this._vampIdx]
    ) {
      console.log("here")
      this._currentTick = this._player.position =
        this._rootStore.vampStarts[this._vampIdx] - 2
      this.allNotes()
      this._notes = this.getNextNotes()
      this._chords = this.getChords(this.notes)
      this._player.noteOffs = this.noteOffs()
      this._currentTick = this._player.position = this._expectedIn[0][0] + 2
      this._out[0].forEach(function (msg, idx) {
        var addNote = false
        if (idx > 0) {
          console.log(msg)
          if (msg[1] > 0) {
            output.sendEvent(
              noteOnMidiEvent(0, 1, msg[0], msg[1]),
              0,
              performance.now(),
            )
            //Send tempo ratio to CC119:

            addNote = true
          } else {
            output.sendEvent(
              noteOffMidiEvent(0, 1, msg[0], msg[1]),
              0,
              performance.now(),
            )
          }
        }
      })
      this._out.shift()
    }

    // // If played the first note from next section
    // if (
    //   this._playedNotes.length > 0 &&
    //   this._inVamp &&
    //   this._expectedIn[0][0] >= this._rootStore.vampEnds[this._vampIdx] &&
    //   this._playedNotes[this._playedNotes.length - 1][1] ==
    //     this._expectedIn[0][0]
    // ) {
    //   console.log("here")
    //   this._currentTick = this._player.position = this._expectedIn[0][0] - 2
    //   this.allNotes()
    //   this._notes = this.getNextNotes()
    //   this._chords = this.getChords(this.notes)
    //   this._player.noteOffs = this.noteOffs()
    //   this._currentTick = this._player.position = this._expectedIn[0][0] + 2
    //   this._out[0].forEach(function (msg, idx) {
    //     var addNote = false
    //     if (idx > 0) {
    //       console.log(msg)
    //       if (msg[1] > 0) {
    //         output.sendEvent(
    //           noteOnMidiEvent(0, 1, msg[0], msg[1]),
    //           0,
    //           performance.now(),
    //         )
    //         //Send tempo ratio to CC119:

    //         addNote = true
    //       } else {
    //         output.sendEvent(
    //           noteOffMidiEvent(0, 1, msg[0], msg[1]),
    //           0,
    //           performance.now(),
    //         )
    //       }
    //     }
    //   })
    //   this._out.shift()
    // }

    // console.log(
    //   " performance.now() - currentTime",
    //   performance.now() - currentTime,
    // )
    // console.log("averageL: ", this.averageLength)
  }

  get tolerance() {
    return this._tolerance
  }

  set tolerance(tol: number) {
    this._tolerance = tol
    // console.log("tol", tol)
  }

  get averageLength() {
    return this._averageLength
  }

  set averageLength(avg: number) {
    if (avg > 0) {
      this._averageLength = avg
    } else {
      this._averageLength = 1
    }
    // console.log("this._averageLength: ", this._averageLength)
  }

  get timeRange() {
    return this._timeRange
  }

  set timeRange(tol: number) {
    if (tol > 20) {
      this._timeRange = tol
    } else {
      this._timeRange = 20
    }
    // console.log("timeRange", this._timeRange)
  }

  get autoMode() {
    return this._autoMode
  }

  set autoMode(dc: boolean) {
    this._autoMode = dc
    console.log("dc: ", dc)
  }
}
