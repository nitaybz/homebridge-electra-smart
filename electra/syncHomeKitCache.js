const AirConditioner = require('../homekit/AirConditioner')

module.exports = (platform) => {
	return () => {
		platform.devices.forEach(device => {
			
			// Add AirConditioner
			const airConditionerIsNew = !platform.activeAccessories.find(accessory => accessory.type === 'AirConditioner' && accessory.id === device.id)
			if (airConditionerIsNew) {
				const airConditioner = new AirConditioner(device, platform)
				platform.activeAccessories.push(airConditioner)
			}

		})


		// find devices to remove
		const accessoriesToRemove = []
		platform.cachedAccessories.forEach(accessory => {

			if (!accessory.context.type) {
				accessoriesToRemove.push(accessory)
				platform.log.easyDebug('removing old cached accessory')
			}

			let deviceExists
			switch(accessory.context.type) {
				case 'AirConditioner':
					deviceExists = platform.devices.find(device => device.id === accessory.context.deviceId)
					if (!deviceExists)
						accessoriesToRemove.push(accessory)
					break
				default:
					accessoriesToRemove.push(accessory)
					break
			}
		})

		if (accessoriesToRemove.length) {
			platform.log.easyDebug('Unregistering Unnecessary Cached Devices:')
			platform.log.easyDebug(accessoriesToRemove)

			// unregistering accessories
			platform.api.unregisterPlatformAccessories(platform.PLUGIN_NAME, platform.PLATFORM_NAME, accessoriesToRemove)

			// remove from cachedAccessories
			platform.cachedAccessories = platform.cachedAccessories.filter( cachedAccessory => !accessoriesToRemove.find(accessory => accessory.UUID === cachedAccessory.UUID) )

			// remove from activeAccessories
			platform.activeAccessories = platform.activeAccessories.filter( activeAccessory => !accessoriesToRemove.find(accessory => accessory.UUID === activeAccessory.UUID) )
		}
	}
}