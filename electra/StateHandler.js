const unified = require('./unified')

module.exports = (device, platform) => {

	const setTimeoutDelay = 600
	let setTimer = null
	let preventTurningOff = false
	const ElectraApi = platform.ElectraApi

	const log = platform.log
	// const state = device.state

	return {
		get: (target, prop) => {
			// check for last update and refresh state if needed
			if (!platform.setProcessing)
				platform.refreshState()

			// return a function to update state (multiple properties)
			if (prop === 'update')
				return (state) => {
					if (!platform.setProcessing) {
						Object.keys(state).forEach(key => { target[key] = state[key] })
						device.updateHomeKit()
					}
				}


			return target[prop]
		},
	
		set: (state, prop, value) => {
			
			if (prop in state && state[prop] === value)
				return

			state[prop] = value
			
			// Send Reset Filter command and update value
			// if (prop === 'filterChange') {
			// 	try {
			// 		ElectraApi.resetFilterIndicator(device.id)
			// 	} catch(err) {
			// 		log('Error occurred! -> Could not reset filter indicator')
			// 	}
			// 	return
			// } else if (prop === 'filterLifeLevel')
			// 	return


			platform.setProcessing = true

			// Make sure device is not turning off when setting fanSpeed to 0 (AUTO)
			if (prop === 'fanSpeed' && value === 0 && device.capabilities[state.mode].autoFanSpeed)
				preventTurningOff = true
				
			
			clearTimeout(setTimer)
			setTimer = setTimeout(async function() {
				// Make sure device is not turning off when setting fanSpeed to 0 (AUTO)
				if (preventTurningOff && state.active === false) {
					state.active = true
					preventTurningOff = false
				}
		
				const newState = unified.formattedState(device, state)
				log(device.name, ' -> Setting New State:')
				log(JSON.stringify(newState, null, 2))
				
				try {
					// send state command to Electra
					await ElectraApi.setState(device.id, newState)
				} catch(err) {
					log(`ERROR setting ${prop} to ${value}`)
					log(err)
					setTimeout(() => {
						platform.setProcessing = false
						platform.refreshState()
					}, 1000)
					return
				}
				setTimeout(() => {
					device.updateHomeKit()
					setTimeout(() => {
						platform.setProcessing = false
						platform.refreshState()
					}, 5000)
				}, 500)

			}, setTimeoutDelay)

			return true;
		}
	}
}