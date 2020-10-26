const unified = require('./unified')

module.exports = (platform) => {
	return () => {
		if (!platform.processingState && !platform.setProcessing) {
			platform.processingState = true
			clearTimeout(platform.pollingTimeout)
			setTimeout(async () => {

				try {
					platform.devices = await platform.ElectraApi.getDevices()
					await platform.storage.setItem('electra-devices', platform.devices)
					
				} catch(err) {
					platform.log.easyDebug('<<<< ---- Refresh State FAILED! ---- >>>>')
					platform.processingState = false
					if (platform.pollingInterval) {
						platform.log.easyDebug(`Will try again in ${platform.pollingInterval/1000} seconds...`)
						platform.pollingTimeout = setTimeout(platform.refreshState, platform.pollingInterval)
					}
					return
				}
				if (platform.setProcessing) {
					platform.processingState = false
					return
				}
				
				platform.devices.forEach(device => {
					const airConditioner = platform.activeAccessories.find(accessory => accessory.type === 'AirConditioner' && accessory.id === device.id)

					if (airConditioner && device.state) {
						// Update AC state in cache + HomeKit
						airConditioner.rawState = device.state
						airConditioner.state.update(unified.acState(device))
					}
				})



				// register new devices / unregister removed devices
				platform.syncHomeKitCache()

				// start timeout for next polling
				if (platform.pollingInterval)
					platform.pollingTimeout = setTimeout(platform.refreshState, platform.pollingInterval)

				// block new requests for extra 5 seconds
				setTimeout(() => {
					platform.processingState = false
				}, 5000)

			}, platform.refreshDelay)
		}
	}
}