export type SchedulableEvent = {
  tick: number
}

export interface EventSchedulerLoop {
  begin: number
  end: number
}

type WithTimestamp<E> = {
  event: E
  timestamp: number
}

/**
 * Player でイベントを随時読み取るためのクラス
 * 精確にスケジューリングするために先読みを行う
 * https://www.html5rocks.com/ja/tutorials/audio/scheduling/
 */
/**
 * Player Classes for reading events at any time
 * Perform prefetching for accurate scheduling
 * https://www.html5rocks.com/ja/tutorials/audio/scheduling/
 */
export default class EventScheduler<E extends SchedulableEvent> {
  // 先読み時間 (ms)
  // Leading time (MS)
  lookAheadTime = 50

  // 1/4 拍子ごとの tick 数
  // 1/4 TICK number for each beat
  timebase = 480

  loop: EventSchedulerLoop | null = null

  private _currentTick = 0
  private _scheduledTick = 0
  private _prevTime: number | undefined = undefined
  private _getEvents: (startTick: number, endTick: number) => E[]

  constructor(
    getEvents: (startTick: number, endTick: number) => E[],
    tick = 0,
    timebase = 480,
    lookAheadTime = 50,
  ) {
    this._getEvents = getEvents
    this._currentTick = tick
    this._scheduledTick = tick
    this.timebase = timebase
    this.lookAheadTime = lookAheadTime
  }

  get scheduledTick() {
    return this._scheduledTick
  }

  millisecToTick(ms: number, bpm: number) {
    return (((ms / 1000) * bpm) / 60) * this.timebase
  }

  tickToMillisec(tick: number, bpm: number) {
    return (tick / (this.timebase / 60) / bpm) * 1000
  }

  seek(tick: number) {
    this._currentTick = this._scheduledTick = Math.max(0, tick)
  }

  readNextEvents(bpm: number, timestamp: number): WithTimestamp<E>[] {
    const withTimestamp =
      (currentTick: number) =>
      (e: E): WithTimestamp<E> => {
        const waitTick = e.tick - currentTick
        const delayedTime =
          timestamp + Math.max(0, this.tickToMillisec(waitTick, bpm))
        return { event: e, timestamp: delayedTime }
      }

    const getEventsInRange = (
      startTick: number,
      endTick: number,
      currentTick: number,
    ) => this._getEvents(startTick, endTick).map(withTimestamp(currentTick))

    if (this._prevTime === undefined) {
      this._prevTime = timestamp
    }
    const delta = timestamp - this._prevTime
    const deltaTick = Math.max(0, this.millisecToTick(delta, bpm))
    const nowTick = Math.floor(this._currentTick + deltaTick)

    // 先読み時間
    // Leading time
    const lookAheadTick = Math.floor(
      this.millisecToTick(this.lookAheadTime, bpm),
    )

    // 前回スケジュール済みの時点から、
    // From the previous scheduled point,
    // 先読み時間までを処理の対象とする
    // Target of processing up to read time
    const startTick = this._scheduledTick
    const endTick = nowTick + lookAheadTick

    this._prevTime = timestamp

    this._currentTick = nowTick
    this._scheduledTick = endTick
    console.log("position: ", this._scheduledTick)

    const ret = getEventsInRange(startTick, endTick, nowTick)
    if (ret.length > 0) {
      console.log("nowTick: ", nowTick)
      console.log("lookAheadTick: ", lookAheadTick)
      console.log("startTick: ", startTick)
      console.log("endTick: ", endTick)
      console.log("Events: ", getEventsInRange(startTick, endTick, nowTick))
    }

    return ret
  }
}
