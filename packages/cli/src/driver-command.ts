import { Command, Flags, Interfaces } from '@oclif/core'
import chalk from 'chalk'
import BaseCommand from './base-command'
import { allDriverFlags, DriverName, MachineDriver, machineDrivers } from './lib/machine'
import { removeDriverPrefix } from './lib/machine/driver/flags'
import { Profile } from './lib/profile'
import { profileStore } from './lib/profile/store'
import { Store } from './lib/store'

// eslint-disable-next-line no-use-before-define
export type Flags<T extends typeof Command> = Interfaces.InferredFlags<typeof DriverCommand['baseFlags'] & T['flags']>
export type Args<T extends typeof Command> = Interfaces.InferredArgs<T['args']>

abstract class DriverCommand<T extends typeof Command> extends BaseCommand<T> {
  static baseFlags = {
    ...BaseCommand.baseFlags,
    driver: Flags.custom<DriverName>({
      description: 'Machine driver to use',
      char: 'd',
      default: 'lightsail' as const,
      options: Object.keys(machineDrivers),
    })(),
    ...allDriverFlags,
  }

  protected flags!: Flags<T>
  protected args!: Args<T>

  public async init(): Promise<void> {
    await super.init()
    this.#driver = this.flags.driver as DriverName
    const pm = this.profileConfig
    const currentProfile = await pm.current().then(x => x && pm.get(x.alias))
    if (currentProfile) {
      this.#profile = currentProfile.info
      this.#store = currentProfile.store
      this.#driver = currentProfile.info.driver as DriverName
    }
  }

  #driver: DriverName | undefined
  get driver() : DriverName {
    if (!this.#driver) {
      throw new Error("Driver wasn't specified")
    }
    return this.#driver
  }

  #store: Store | undefined
  get store(): Store {
    if (!this.#store) {
      throw new Error("Store wasn't initialized")
    }
    return this.#store
  }

  #machineDriver: MachineDriver | undefined
  async machineDriver() {
    if (this.#machineDriver) {
      return this.#machineDriver
    }
    const { profile } = this
    const driverName = this.flags.driver as DriverName
    let driverFlags = removeDriverPrefix<Interfaces.InferredFlags<typeof machineDrivers[typeof this.driver]['flags']>>(this.driver, this.flags)
    if (this.#store) {
      const defaultFlags = await profileStore(this.#store).defaultFlags(driverName)
      driverFlags = { ...defaultFlags, ...driverFlags }
    }
    const { factory } = machineDrivers[driverName]
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.#machineDriver = factory(driverFlags, profile)
    return this.#machineDriver
  }

  #profile: Profile | undefined
  get profile(): Profile {
    if (!this.#profile) {
      throw new Error(`Profile not initialized, run ${chalk.italic.bold.greenBright('preevy init')} to get started.`)
    }
    return this.#profile
  }
}

export default DriverCommand
