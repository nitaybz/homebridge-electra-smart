const unified = require('../electra/unified')

let Characteristic

function toFahrenheit(value) {
	return Math.round((value * 1.8) + 32)
}

function characteristicToMode(characteristic) {
	switch (characteristic) {
		case Characteristic.TargetHeaterCoolerState.COOL:
			return 'COOL'
		case Characteristic.TargetHeaterCoolerState.HEAT:
			return 'HEAT'
		case Characteristic.TargetHeaterCoolerState.AUTO:
			return 'AUTO'
	}

}

module.exports = (device, platform) => {
	Characteristic = platform.api.hap.Characteristic
	const log = platform.log
	const ElectraApi = platform.ElectraApi
	const setTimeoutDelay = 500
	let preventTurningOff, setCommandPromise

	const setCommand = (changes) => {
		let changeExist = false
		const state = {
			...device.state
		}
		Object.keys(changes).forEach(key => { 
			if (key in state && state[key] === changes[key])
				return
			changeExist = true
			state[key] = changes[key]
			// Make sure device is not turning off when setting fanSpeed to 0 (AUTO)
			if (key === 'fanSpeed' && changes[key] === 0 && device.capabilities[state.mode].autoFanSpeed)
				preventTurningOff = true
		})

		if (!changeExist)
			return

		if (!setCommandPromise) {
			setCommandPromise = new Promise((resolve, reject) => {
				platform.setProcessing = true
				setTimeout(async function () {
					// Make sure device is not turning off when setting fanSpeed to 0 (AUTO)
					if (preventTurningOff && state.active === false) {
						state.active = true
						preventTurningOff = false
					}

					const formattedState = unified.formattedState(device)
					log(device.name, ' -> Setting New State:')
					log(JSON.stringify(formattedState, null, 2))

					try {
						// send state command to Electra
						await ElectraApi.setState(device.id, formattedState)
					} catch (err) {
						log.error(`ERROR setting the following changes: ${JSON.stringify(changes)}`)
						log.error(err.message || err.stack)
						log.easyDebug(err)
						platform.setProcessing = false
						device.updateHomeKit(device.state)
						reject(err)
					}
					resolve(true)
					setTimeout(() => {
						platform.setProcessing = false
						device.updateHomeKit(state)
					}, 1000)
				}, setTimeoutDelay)
			})
		}
		return setCommandPromise
	}

	return {

		get: {
			ACActive: () => {
				const active = device.state.active
				const mode = device.state.mode
				return (!active || mode === 'FAN' || mode === 'DRY') ? 0 : 1
			},

			CurrentHeaterCoolerState: () => {
				const active = device.state.active
				const mode = device.state.mode
				const targetTemp = device.state.targetTemperature
				const currentTemp = device.state.currentTemperature

				if (!active || mode === 'FAN' || mode === 'DRY')
					return Characteristic.CurrentHeaterCoolerState.INACTIVE
				else if (mode === 'COOL')
					return Characteristic.CurrentHeaterCoolerState.COOLING
				else if (mode === 'HEAT')
					return Characteristic.CurrentHeaterCoolerState.HEATING
				else if (currentTemp > targetTemp)
					return Characteristic.CurrentHeaterCoolerState.COOLING
				else
					return Characteristic.CurrentHeaterCoolerState.HEATING
			},

			TargetHeaterCoolerState: () => {
				const active = device.state.active
				const mode = device.state.mode
				const lastMode = device.HeaterCoolerService.getCharacteristic(Characteristic.TargetHeaterCoolerState).value
				return (!active || mode === 'FAN' || mode === 'DRY') ? lastMode : Characteristic.TargetHeaterCoolerState[mode]

			},

			CurrentTemperature: () => {
				const currentTemp = device.state.currentTemperature
				return currentTemp
			},

			CoolingThresholdTemperature: () => {
				const targetTemp = device.state.targetTemperature
				return targetTemp
			},

			HeatingThresholdTemperature: () => {
				const targetTemp = device.state.targetTemperature
				return targetTemp
			},

			TemperatureDisplayUnits: () => {
				return device.usesFahrenheit ? Characteristic.TemperatureDisplayUnits.FAHRENHEIT : Characteristic.TemperatureDisplayUnits.CELSIUS
			},

			CurrentRelativeHumidity: () => {
				return device.state.relativeHumidity
			},

			ACSwing: () => {
				const swing = device.state.swing
				return Characteristic.SwingMode[swing]
			},

			ACRotationSpeed: () => {
				const fanSpeed = device.state.fanSpeed
				return fanSpeed
			},

			// FILTER

			FilterChangeIndication: () => {
				const filterChange = device.state.filterChange
				return filterChange
			},

			FilterLifeLevel: () => {
				const filterLifeLevel = device.state.filterLifeLevel
				return filterLifeLevel
			},


			// FAN
			FanActive: () => {
				const active = device.state.active
				const mode = device.state.mode

				return (!active || mode !== 'FAN') ? 0 : 1
			},

			FanSwing: () => {
				const swing = device.state.swing
				return Characteristic.SwingMode[swing]
			},

			FanRotationSpeed: () => {
				const fanSpeed = device.state.fanSpeed
				return fanSpeed
			},

			// DEHUMIDIFIER
			DryActive: () => {
				const active = device.state.active
				const mode = device.state.mode

				return (!active || mode !== 'DRY') ? 0 : 1
			},

			CurrentHumidifierDehumidifierState: () => {
				const active = device.state.active
				const mode = device.state.mode

				return (!active || mode !== 'DRY') ?
					Characteristic.CurrentHumidifierDehumidifierState.INACTIVE : Characteristic.CurrentHumidifierDehumidifierState.DEHUMIDIFYING

			},

			TargetHumidifierDehumidifierState: () => {
				return Characteristic.TargetHumidifierDehumidifierState.DEHUMIDIFIER
			},

			DryRotationSpeed: () => {
				const fanSpeed = device.state.fanSpeed
				return fanSpeed
			},

			DrySwing: () => {
				const swing = device.state.swing
				return Characteristic.SwingMode[swing]
			},

		},

		set: {

			ACActive: (state) => {
				state = !!state
				log.easyDebug(device.name + ' -> Setting AC state Active:', state)

				if (state) {
					const lastMode = device.HeaterCoolerService.getCharacteristic(Characteristic.TargetHeaterCoolerState).value
					const mode = characteristicToMode(lastMode)
					log.easyDebug(device.name + ' -> Setting Mode to', mode)
					return setCommand({active: false, mode})
				} else if (device.state.mode === 'COOL' || device.state.mode === 'HEAT' || device.state.mode === 'AUTO')
					return setCommand({active: false})
			},


			TargetHeaterCoolerState: (state) => {
				const mode = characteristicToMode(state)
				log.easyDebug(device.name + ' -> Setting Target HeaterCooler State:', mode)
				return setCommand({active: true, mode})
			},

			CoolingThresholdTemperature: (targetTemperature) => {
				if (device.usesFahrenheit)
					log.easyDebug(device.name + ' -> Setting Cooling Threshold Temperature:', toFahrenheit(targetTemperature) + 'ºF')
				else
					log.easyDebug(device.name + ' -> Setting Cooling Threshold Temperature:', targetTemperature + 'ºC')

				const lastMode = device.HeaterCoolerService.getCharacteristic(Characteristic.TargetHeaterCoolerState).value
				const mode = characteristicToMode(lastMode)
				log.easyDebug(device.name + ' -> Setting Mode to: ' + mode)
				return setCommand({active: true, mode, targetTemperature})
			},

			HeatingThresholdTemperature: (targetTemperature) => {
				if (device.usesFahrenheit)
					log.easyDebug(device.name + ' -> Setting Heating Threshold Temperature:', toFahrenheit(targetTemperature) + 'ºF')
				else
					log.easyDebug(device.name + ' -> Setting Heating Threshold Temperature:', targetTemperature + 'ºC')

				const lastMode = device.HeaterCoolerService.getCharacteristic(Characteristic.TargetHeaterCoolerState).value
				const mode = characteristicToMode(lastMode)
				log.easyDebug(device.name + ' -> Setting Mode to: ' + mode)
				return setCommand({active: true, mode, targetTemperature})
			},

			ACSwing: (state) => {

				const swing = state === Characteristic.SwingMode.SWING_ENABLED ? 'SWING_ENABLED' : 'SWING_DISABLED'
				log.easyDebug(device.name + ' -> Setting AC Swing:', swing)

				const lastMode = device.HeaterCoolerService.getCharacteristic(Characteristic.TargetHeaterCoolerState).value
				const mode = characteristicToMode(lastMode)
				log.easyDebug(device.name + ' -> Setting Mode to', mode)

				return setCommand({active: true, mode, swing})
			},

			ACRotationSpeed: (fanSpeed) => {
				log.easyDebug(device.name + ' -> Setting AC Rotation Speed:', fanSpeed + '%')

				const lastMode = device.HeaterCoolerService.getCharacteristic(Characteristic.TargetHeaterCoolerState).value
				const mode = characteristicToMode(lastMode)
				log.easyDebug(device.name + ' -> Setting Mode to', mode)

				return setCommand({active: true, mode, fanSpeed})
			},

			// FILTER

			ResetFilterIndication: () => {
				// log.easyDebug(device.name + ' -> Resetting Filter Indication !!')
				return
			},

			// FAN

			FanActive: (state) => {
				state = !!state
				log.easyDebug(device.name + ' -> Setting Fan state Active:', state)
				if (state) {
					log.easyDebug(device.name + ' -> Setting Mode to: FAN')
					return setCommand({active: true, mode: 'FAN'})
				} else if (device.state.mode === 'FAN')
					return setCommand({active: false})
			},

			FanSwing: (state) => {
				const swing = state === Characteristic.SwingMode.SWING_ENABLED ? 'SWING_ENABLED' : 'SWING_DISABLED'
				log.easyDebug(device.name + ' -> Setting Fan Swing:', swing)
				log.easyDebug(device.name + ' -> Setting Mode to: FAN')
				return setCommand({active: true, mode: 'FAN', swing})
			},

			FanRotationSpeed: (fanSpeed) => {
				log.easyDebug(device.name + ' -> Setting Fan Rotation Speed:', fanSpeed + '%')
				log.easyDebug(device.name + ' -> Setting Mode to: FAN')
				return setCommand({active: true, mode: 'FAN', fanSpeed})
			},

			// DEHUMIDIFIER

			DryActive: (state) => {
				state = !!state
				log.easyDebug(device.name + ' -> Setting Dry state Active:', state)
				if (state) {
					log.easyDebug(device.name + ' -> Setting Mode to: DRY')
					return setCommand({active: true, mode: 'DRY'})
				} else if (device.state.mode === 'DRY')
					return setCommand({active: false})
			},

			TargetHumidifierDehumidifierState: () => {
				log.easyDebug(device.name + ' -> Setting Mode to: DRY')
				return setCommand({active: true, mode: 'DRY'})
			},

			DrySwing: (state) => {
				const swing = state === Characteristic.SwingMode.SWING_ENABLED ? 'SWING_ENABLED' : 'SWING_DISABLED'
				log.easyDebug(device.name + ' -> Setting Dry Swing:', swing)
				log.easyDebug(device.name + ' -> Setting Mode to: DRY')
				return setCommand({active: true, mode: 'DRY', swing})
			},

			DryRotationSpeed: (fanSpeed) => {
				log.easyDebug(device.name + ' -> Setting Dry Rotation Speed:', fanSpeed + '%')
				log.easyDebug(device.name + ' -> Setting Mode to: DRY')
				return setCommand({active: true, mode: 'DRY', fanSpeed})
			},

		}

	}
}