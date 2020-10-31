
const deviceCapabilities = {
	COOL: {
		temperatures: {
			C: {
				min: 16,
				max: 30
			}
		},
		fanSpeeds: ['LOW', 'MED', 'HIGH', 'AUTO'],
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
		fanSpeeds: ['LOW', 'MED', 'HIGH', 'AUTO'],
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
		fanSpeeds: ['LOW', 'MED', 'HIGH', 'AUTO'],
		autoFanSpeed: true,
		swing: false
	},
	DRY: {
		fanSpeeds: ['LOW', 'MED', 'HIGH', 'AUTO'],
		autoFanSpeed: true,
		swing: false
	},
	FAN: {
		fanSpeeds: ['LOW', 'MED', 'HIGH', 'AUTO'],
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
			active: (deviceState.AC_MODE !== 'STBY' && !('TURN_ON_OFF' in deviceState)) || (('TURN_ON_OFF' in deviceState) && deviceState.TURN_ON_OFF !== 'OFF'),
			targetTemperature: deviceState.SPT,
			currentTemperature: Math.abs(parseInt(deviceMeasurements.I_RAT || deviceMeasurements.I_CALC_AT || 0))
		}

		if (state.active || deviceState.TURN_ON_OFF) {
			state.mode = deviceState.AC_MODE
		}

		const modeCapabilities = deviceCapabilities[state.mode || 'COOL']

		if ('SWING' in deviceState && deviceState.SWING !== 'None')
			state.swing = deviceState.SWING === 'ON' ? 'SWING_ENABLED' : 'SWING_DISABLED'

		if ('FANSPD' in deviceState && deviceState.FANSPD !== 'None')
			state.fanSpeed = fanSpeedToHK(deviceState.FANSPD, modeCapabilities.fanSpeeds)

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
			if ('TURN_ON_OFF' in lastState)
				lastState.TURN_ON_OFF = 'OFF'
			else 
				lastState.AC_MODE = 'STBY'
			return lastState
		}
		
		if ('TURN_ON_OFF' in lastState)
			lastState.TURN_ON_OFF = 'ON'

		const acState = {
			...lastState,
			'AC_MODE': state.mode,
			'SPT': state.targetTemperature
		}

		if ('swing' in device.capabilities[state.mode] && device.capabilities[state.mode].swing)
			acState['SWING'] = state.swing === 'SWING_ENABLED' ? 'ON' : 'OFF'

		if ('fanSpeeds' in device.capabilities[state.mode] && device.capabilities[state.mode].fanSpeeds.length)
			acState['FANSPD'] = HKToFanSpeed(state.fanSpeed, device.capabilities[state.mode].fanSpeeds)

		return acState
	}
}