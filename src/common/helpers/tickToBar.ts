import { useStores } from "../../main/hooks/useStores"
import { createBeatsInRange } from "./mapBeats"

export const tickToBar = (tick: number): [number, number, number] => {
  const rootStore = useStores()
  const song2 = rootStore.song2
  let ab = createBeatsInRange(
    song2.measures,
    song2.timebase,
    0,
    song2.endOfSong,
  )
  let array: [number, number, number] = [ab[0].measure, ab[0].beat, 0]
  while (tick >= ab[0].tick) {
    array[0] = ab[0].measure
    array[1] = ab[0].beat
    ab.shift()
  }
  array[2] = ab[0].tick - tick
  if (array[2] == 960) {
    array[2] = 0
  }
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
