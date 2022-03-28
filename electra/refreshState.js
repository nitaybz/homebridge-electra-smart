const unified = require('./unified')

module.exports = (platform) => {
	return async () => {
		if (!platform.setProcessing) {

			try {
				platform.devices = await platform.ElectraApi.getDevices()
				await platform.storage.setItem('electra-devices', platform.devices)

			} catch (err) {
				platform.log.easyDebug('<<<< ---- Refresh State FAILED! ---- >>>>')
				platform.log.easyDebug(err)
				platform.log.easyDebug(`Will try again in ${platform.interval / 1000} seconds...`)
				return
			}

			platform.devices.forEach(device => {
				const airConditioner = platform.activeAccessories.find(accessory => accessory.type === 'AirConditioner' && accessory.id === device.id)

				if (airConditioner && device.state) {
					// Update AC state in cache + HomeKit
					airConditioner.rawState = device.state
					airConditioner.updateHomeKit(unified.acState(airConditioner))
				}
			})
			// register new devices / unregister removed devices
			platform.syncHomeKitCache()

		}
	}
}