import { SendableEvent, SynthOutput } from "./SynthOutput"

export interface SynthEntry {
  synth: SynthOutput
  isEnabled: boolean
}

export class GroupOutput implements SynthOutput {
  outputs: SynthEntry[] = []

  activate() {
    this.outputs.filter((o) => o.isEnabled).forEach((o) => o.synth.activate())
  }

  sendEvent(
    event: SendableEvent,
    delayTime: number,
    timestampNow: number,
  ): void {
    this.outputs
      .filter((o) => o.isEnabled)
      .forEach((o) => {
        if (event.subtype == "noteOn" || event.subtype == "noteOff") {
          o.synth.sendEvent(event, delayTime, timestampNow)
          console.log(event.subtype, event.noteNumber, event.velocity)
        }
      })
  }
}
