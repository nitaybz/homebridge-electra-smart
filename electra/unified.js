
const deviceCapabilities = {
	COOL: {
		temperatures: {
			C: {
				min: 16,
				max: 30
			}
		},
		fanSpeeds: ['LOW', 'MED', 'HIGH'],
		autoFanSpeed: true,
		swing: false
	},
	HEAT: {
		temperatures: {
			C: {
				min: 16,
				max: 30
			}
		},
		fanSpeeds: ['LOW', 'MEDIUM', 'HIGH'],
		autoFanSpeed: true,
		swing: false
	},
	AUTO: {
		temperatures: {
			C: {
				min: 16,
				max: 30
			}
		},
		fanSpeeds: ['LOW', 'MEDIUM', 'HIGH'],
		autoFanSpeed: true,
		swing: false
	},
	DRY: {
		fanSpeeds: ['LOW', 'MEDIUM', 'HIGH'],
		autoFanSpeed: true,
		swing: false
	},
	FAN: {
		fanSpeeds: ['LOW', 'MEDIUM', 'HIGH'],
		autoFanSpeed: true,
		swing: false
	}
}

function fanSpeedToHK(value, fanSpeeds) {
	if (value === 'AUTO')
		return 0

	fanSpeeds = fanSpeeds.filter(speed => speed !== 'AUTO')
	const totalSpeeds = fanSpeeds.length
	const valueIndex = fanSpeeds.indexOf(value) + 1
	return Math.round(100 * valueIndex / totalSpeeds)
}

function HKToFanSpeed(value, fanSpeeds) {

	let selected = 'AUTO'
	if (!fanSpeeds.includes('AUTO'))
		selected = fanSpeeds[0]

	if (value !== 0) {
		fanSpeeds = fanSpeeds.filter(speed => speed !== 'AUTO')
		const totalSpeeds = fanSpeeds.length
		for (let i = 0; i < fanSpeeds.length; i++) {
			if (value <= (100 * (i + 1) / totalSpeeds))	{
				selected = fanSpeeds[i]
				break
			}
		}
	}
	return selected
}

// function toFahrenheit(value) {
// 	return Math.round((value * 1.8) + 32)
// }


// function toCelsius(value) {
// 	return (value - 32) / 1.8
// }

module.exports = {

	deviceInformation: device => {
		return {
			id: device.id,
			model: device.model,
			serial: device.sn,
			manufacturer: device.manufactor,
			roomName: device.name,
			temperatureUnit: 'C',
			filterService: false
		}
	},

	capabilities: () => {

		return deviceCapabilities
	},

	acState: device => {
		const deviceState = JSON.parse(device.state.OPER).OPER
		const deviceMeasurements = JSON.parse(device.state.DIAG_L2).DIAG_L2

		const state = {
			active: deviceState.AC_MODE !== 'STBY',
			targetTemperature: deviceState.SPT,
			currentTemperature: parseInt(deviceMeasurements.I_RAT)
		}

		if (state.active) {
			state.mode = deviceState.AC_MODE
			
			const modeCapabilities = deviceCapabilities[state.mode]

			if (modeCapabilities.swing)
				state.swing = deviceState.SWING === 'rangeFull' ? 'SWING_ENABLED' : 'SWING_DISABLED'
	
			if (modeCapabilities.fanSpeeds)
				state.fanSpeed = fanSpeedToHK(deviceState.FANSPD, modeCapabilities.fanSpeeds)
		}

		if (device.filtersCleaning) {
			state.filterChange = deviceState.CLEAR_FILT === 'ON' ? 'CHANGE_FILTER' : 'FILTER_OK'
			// const acOnSecondsSinceLastFiltersClean = device.filtersCleaning.acOnSecondsSinceLastFiltersClean
			// const filtersCleanSecondsThreshold = device.filtersCleaning.filtersCleanSecondsThreshold
			// if (acOnSecondsSinceLastFiltersClean > filtersCleanSecondsThreshold)
			// 	state.filterLifeLevel = 0
			// else
			// 	state.filterLifeLevel =  100 - Math.floor(acOnSecondsSinceLastFiltersClean/filtersCleanSecondsThreshold*100)
		}


		return state
	},

	formattedState: (device, state) => {
		const lastState = JSON.parse(device.rawState.OPER).OPER
		
		if (!state.active) {
			lastState.AC_MODE = 'STBY'
			return lastState
		}
		
		const acState = {
			...lastState,
			'AC_MODE': state.mode,
			'SPT': state.targetTemperature
		}

		if ('swing' in device.capabilities[state.mode])
			acState['SWING'] = state.swing === 'SWING_ENABLED' ? 'ON' : 'OFF'

		if ('fanSpeeds' in device.capabilities[state.mode])
			acState['FANSPD'] = HKToFanSpeed(state.fanSpeed, device.capabilities[state.mode].fanSpeeds)

		return acState
	}
}