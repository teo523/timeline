import { deserializeSingleEvent, Stream } from "midifile-ts"
import { makeObservable, observable, observe } from "mobx"
import Player from "../../common/player"
import { NoteEvent, TrackEvent } from "../../common/track"
import RootStore from "../stores/RootStore"

export class MIDIRecorder {
  private recordedNotes: NoteEvent[] = []
  private player: Player
  private rootStore: RootStore
  isRecording: boolean = false

  constructor(player: Player, rootStore: RootStore) {
    this.player = player
    this.rootStore = rootStore

    makeObservable(this, {
      isRecording: observable,
    })

    // extend duration while key press
    observe(player, "position", (change) => {
      if (!this.isRecording) {
        return
      }

      const track = rootStore.pianoRollStore.selectedTrack
      if (track === undefined) {
        return
      }

      const tick = change.object.get()

      this.recordedNotes.forEach((n) => {
        track.updateEvent<NoteEvent>(n.id, {
          duration: Math.max(0, tick - n.tick),
        })
      })
    })

    observe(this, "isRecording", (change) => {
      this.recordedNotes = []

      if (!change.newValue) {
        // stop recording
        this.rootStore.song.tracks.forEach((track) => {
          const events = track.events
            .filter((e) => e.isRecording === true)
            .map<Partial<TrackEvent>>((e) => ({ ...e, isRecording: false }))
          track.updateEvents(events)
        })
      }
    })
  }

  onMessage(e: WebMidi.MIDIMessageEvent) {
    if (!this.isRecording) {
      return
    }

    const track = this.rootStore.pianoRollStore.selectedTrack
    if (track === undefined) {
      return
    }

    const stream = new Stream(e.data)
    //console.log(stream["buf"].buffer.byteLength)

    //Workaround for avoiding error when connecting MIDI controller
    if (stream["buf"].buffer.byteLength > 1) {
      const message = deserializeSingleEvent(stream)

      if (message.type !== "channel") {
        return
      }

      const tick = this.player.position

      switch (message.subtype) {
        case "noteOn": {
          const note = track.addEvent<NoteEvent>({
            type: "channel",
            subtype: "note",
            noteNumber: message.noteNumber,
            tick,
            velocity: message.velocity,
            duration: 0,
            isRecording: true,
          })
          this.recordedNotes.push(note)
          break
        }
        case "noteOff": {
          this.recordedNotes
            .filter((n) => n.noteNumber === message.noteNumber)
            .forEach((n) => {
              track.updateEvent<NoteEvent>(n.id, {
                duration: Math.max(0, tick - n.tick),
              })
            })

          this.recordedNotes = this.recordedNotes.filter(
            (n) => n.noteNumber !== message.noteNumber,
          )
          break
        }
        default: {
          track.addEvent({ ...message, tick, isRecording: true })
          break
        }
      }
    }
  }
}
