// abstraction layer for pitch-bend and controller events

import { controllerMidiEvent, pitchBendMidiEvent } from "../midi/MidiEvent";

export type ccEventType =
  | { type: "pitchBend" }
  | { type: "controller"; controllerType: number }

export const createCCEvent = (t: ccEventType) => (value: number) => {
  switch (t.type) {
    case "pitchBend":
      return pitchBendMidiEvent(0, 0, Math.round(value))
    case "controller":
      return controllerMidiEvent(0, 0, 84, Math.round(value))
  }
}


