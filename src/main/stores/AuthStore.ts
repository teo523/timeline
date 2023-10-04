import { User } from "firebase/auth"
import { makeObservable, observable } from "mobx"

export class AuthStore {
  user: User | null = null

  constructor() {
    makeObservable(this, {
      user: observable,
    })

    
  }
}
