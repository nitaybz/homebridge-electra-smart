
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

module.exports = {

	deviceInformation: device => {
		return {
			id: device.id,
			model: device.model || 'unknown',
			serial: device.sn !== '0000000000' ? device.sn : device.mac,
			manufacturer: device.manufactor,
			roomName: device.name,
			temperatureUnit: 'C',
			filterService: true
		}
	},

	capabilities: (device) => {

		try {
			const deviceState = JSON.parse(device.state.OPER).OPER

			if ('HSWING' in deviceState || 'VSWING' in deviceState) {
				Object.keys(deviceCapabilities).forEach(mode => {
					deviceCapabilities[mode].swing = true
				})
			}
		} catch (err) {
			// device.log('Error: Can\'t get State!')
		}
		return deviceCapabilities
	},

	acState: device => {
		let deviceState, deviceMeasurements
		try {
			deviceState = JSON.parse(device.rawState.OPER).OPER
		} catch (err) {
			device.log.error('Error: Can\'t get State! ---> returning OFF state')
			device.log.error(err.stack || err.message)
			device.log.easyDebug(device.rawState || err)

			return null
		}

		try {
			deviceMeasurements = JSON.parse(device.rawState.DIAG_L2).DIAG_L2
		} catch (err) {
			device.log.easyDebug('Error: Can\'t get Measurements! ---> returning 0 for current temp')
			device.log.easyDebug('DIAG_L2:')
			device.log.easyDebug(device.rawState.DIAG_L2)

			return null
		}

		const state = {
			active: (deviceState.AC_MODE !== 'STBY' && !('TURN_ON_OFF' in deviceState)) || (('TURN_ON_OFF' in deviceState) && deviceState.TURN_ON_OFF !== 'OFF'),
			targetTemperature: parseInt(deviceState.SPT),
			currentTemperature: Math.abs(parseInt(deviceMeasurements.I_RAT || deviceMeasurements.I_CALC_AT || 0))
		}

		if (state.active || deviceState.TURN_ON_OFF) {
			state.mode = deviceState.AC_MODE
		}

		const modeCapabilities = device.capabilities[state.mode || 'COOL']


		if ('swing' in modeCapabilities && modeCapabilities.swing) {

			let vEnabled = true
			let hEnabled = true
			switch (device.swingDirection) {
				case 'vertical':
					if ('VSWING' in deviceState)
						state.swing = deviceState.VSWING  === 'ON' ? 'SWING_ENABLED' : 'SWING_DISABLED'
					break
				case 'horizontal':
					if ('HSWING' in deviceState)
						state.swing = deviceState.HSWING  === 'ON' ? 'SWING_ENABLED' : 'SWING_DISABLED'
					break
				default:
					if ('VSWING' in deviceState && deviceState.VSWING  === 'OFF')
						vEnabled = false
					if ('HSWING' in deviceState && deviceState.HSWING  === 'OFF')
						hEnabled = false
					state.swing = vEnabled && hEnabled ? 'SWING_ENABLED' : 'SWING_DISABLED'
					break
			}
		}

		if ('FANSPD' in deviceState)
			state.fanSpeed = fanSpeedToHK(deviceState.FANSPD, modeCapabilities.fanSpeeds)

		if (device.filterService) {
			state.filterChange = deviceState.CLEAR_FILT === 'ON' ? 'CHANGE_FILTER' : 'FILTER_OK'
		}

		return state
	},

	formattedState: (device, newState) => {
		const lastState = JSON.parse(device.rawState.OPER).OPER
		
		if (!newState.active) {
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
			AC_MODE: newState.mode,
			SPT: typeof lastState.SPT === 'string' ? newState.targetTemperature.toString() : newState.targetTemperature
		}

		if ('swing' in device.capabilities[newState.mode] && device.capabilities[newState.mode].swing) {
			
			const swingState = newState.swing === 'SWING_ENABLED' ? 'ON' : 'OFF'

			switch (device.swingDirection) {
				case 'vertical':
					if ('VSWING' in acState)
						acState.VSWING = swingState
					if ('HSWING' in acState)
						acState.HSWING = 'OFF'
					break
				case 'horizontal':
					if ('VSWING' in acState)
						acState.VSWING = 'OFF'
					if ('HSWING' in acState)
						acState.HSWING = swingState
					break
				default:
					if ('VSWING' in acState)
						acState.VSWING = swingState
					if ('HSWING' in acState)
						acState.HSWING = swingState
					break
			}
		}
		
		if ('fanSpeeds' in device.capabilities[newState.mode] && device.capabilities[newState.mode].fanSpeeds.length) {
			acState['FANSPD'] = HKToFanSpeed(newState.fanSpeed, device.capabilities[newState.mode].fanSpeeds)
		}

		return acState
	}
}