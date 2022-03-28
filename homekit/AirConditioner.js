const unified = require('../electra/unified')
let Characteristic, Service, FAHRENHEIT_UNIT

class AirConditioner {
	constructor(device, platform) {

		Service = platform.api.hap.Service
		Characteristic = platform.api.hap.Characteristic
		FAHRENHEIT_UNIT = platform.FAHRENHEIT_UNIT

		const deviceInfo = unified.deviceInformation(device)
		
		this.log = platform.log
		this.api = platform.api
		this.storage = platform.storage
		this.cachedState = platform.cachedState
		this.id = deviceInfo.id
		this.model = deviceInfo.model
		this.serial = deviceInfo.serial
		this.manufacturer = deviceInfo.manufacturer
		this.roomName = deviceInfo.roomName
		this.name = this.roomName + ' AC' 
		this.type = 'AirConditioner'
		this.displayName = this.name
		this.temperatureUnit = deviceInfo.temperatureUnit
		this.usesFahrenheit = this.temperatureUnit === FAHRENHEIT_UNIT
		this.disableFan = platform.disableFan
		this.disableDry = platform.disableDry
		this.swingDirection = platform.swingDirection
		this.minTemp = platform.minTemp
		this.maxTemp = platform.maxTemp
		this.filterService = deviceInfo.filterService
		this.capabilities = unified.capabilities(device)

		this.rawState = device.state
		this.state = this.cachedState.devices[this.id]
		const newState = unified.acState(this)
		if (newState)
			this.state = newState
		else if (!this.state) {
			this.error('Can\'t initiate the plugin without initial state!')
			this.error('The plugin will NOT create an accessory')
		}


		if (!this.state.mode)
			this.state.mode = 'COOL'

		this.stateManager = require('./StateManager')(this, platform)

		this.UUID = this.api.hap.uuid.generate(this.id.toString())
		this.accessory = platform.cachedAccessories.find(accessory => accessory.UUID === this.UUID)

		if (!this.accessory) {
			this.log(`Creating New ${platform.PLATFORM_NAME} ${this.type} Accessory in the ${this.roomName}`)
			this.accessory = new this.api.platformAccessory(this.name, this.UUID)
			this.accessory.context.type = this.type
			this.accessory.context.deviceId = this.id

			platform.cachedAccessories.push(this.accessory)
			// register the accessory
			this.api.registerPlatformAccessories(platform.PLUGIN_NAME, platform.PLATFORM_NAME, [this.accessory])
		}

		this.accessory.context.roomName = this.roomName

		let informationService = this.accessory.getService(Service.AccessoryInformation)

		if (!informationService)
			informationService = this.accessory.addService(Service.AccessoryInformation)

		informationService
			.setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
			.setCharacteristic(Characteristic.Model, this.model)
			.setCharacteristic(Characteristic.SerialNumber, this.serial)
			
			

		this.addHeaterCoolerService()

		if (this.capabilities.FAN && !this.disableFan)
			this.addFanService()
		else
			this.removeFanService()


		if (this.capabilities.DRY && !this.disableDry)
			this.addDryService()
		else
			this.removeDryService()

	}

	addHeaterCoolerService() {
		this.log.easyDebug(`Adding HeaterCooler Service in the ${this.roomName}`)
		this.HeaterCoolerService = this.accessory.getService(Service.HeaterCooler)
		if (!this.HeaterCoolerService)
			this.HeaterCoolerService = this.accessory.addService(Service.HeaterCooler, this.name, 'HeaterCooler')

		this.HeaterCoolerService.getCharacteristic(Characteristic.Active)
			.onSet(this.stateManager.set.ACActive)
			.updateValue(this.stateManager.get.ACActive)

		this.HeaterCoolerService.getCharacteristic(Characteristic.CurrentHeaterCoolerState)
			.updateValue(this.stateManager.get.CurrentHeaterCoolerState)


		const props = []

		if (this.capabilities.COOL) props.push(Characteristic.TargetHeaterCoolerState.COOL)
		if (this.capabilities.HEAT) props.push(Characteristic.TargetHeaterCoolerState.HEAT)
		if (this.capabilities.AUTO) props.push(Characteristic.TargetHeaterCoolerState.AUTO)
	
		this.HeaterCoolerService.getCharacteristic(Characteristic.TargetHeaterCoolerState)
			.setProps({validValues: props})
			.updateValue(this.stateManager.get.TargetHeaterCoolerState)
			.onSet(this.stateManager.set.TargetHeaterCoolerState)


		this.HeaterCoolerService.getCharacteristic(Characteristic.CurrentTemperature)
			.setProps({
				minValue: -100,
				maxValue: 100,
				minStep: 0.1
			})
			.updateValue(this.stateManager.get.CurrentTemperature)

		if (this.capabilities.COOL) {
			this.HeaterCoolerService.getCharacteristic(Characteristic.CoolingThresholdTemperature)
				.setProps({
					minValue: this.minTemp,
					maxValue: this.maxTemp,
					minStep: this.usesFahrenheit ? 0.1 : 1
				})
				.updateValue(this.stateManager.get.CoolingThresholdTemperature)
				.onSet(this.stateManager.set.CoolingThresholdTemperature)
		}

		if (this.capabilities.HEAT) {
			this.HeaterCoolerService.getCharacteristic(Characteristic.HeatingThresholdTemperature)
				.setProps({
					minValue: this.minTemp,
					maxValue: this.maxTemp,
					minStep: this.usesFahrenheit ? 0.1 : 1
				})
				.updateValue(this.stateManager.get.HeatingThresholdTemperature)
				.onSet(this.stateManager.set.HeatingThresholdTemperature)
		}

		if (this.capabilities.AUTO && !this.capabilities.COOL && this.capabilities.AUTO.temperatures) {
			this.HeaterCoolerService.getCharacteristic(Characteristic.CoolingThresholdTemperature)
				.setProps({
					minValue: this.minTemp,
					maxValue: this.maxTemp,
					minStep: this.usesFahrenheit ? 0.1 : 1
				})
				.updateValue(this.stateManager.get.CoolingThresholdTemperature)
				.onSet(this.stateManager.set.CoolingThresholdTemperature)

		}

		if (this.capabilities.AUTO && !this.capabilities.HEAT && this.capabilities.AUTO.temperatures) {
			this.HeaterCoolerService.getCharacteristic(Characteristic.HeatingThresholdTemperature)
				.setProps({
					minValue: this.minTemp,
					maxValue: this.maxTemp,
					minStep: this.usesFahrenheit ? 0.1 : 1
				})
				.updateValue(this.stateManager.get.HeatingThresholdTemperature)
				.onSet(this.stateManager.set.HeatingThresholdTemperature)
		}

		// this.HeaterCoolerService.getCharacteristic(Characteristic.TemperatureDisplayUnits)
		// 	.updateValue(this.stateManager.get.TemperatureDisplayUnits)

		// this.HeaterCoolerService.getCharacteristic(Characteristic.CurrentRelativeHumidity)
		// 	.updateValue(this.stateManager.get.CurrentRelativeHumidity)


		if ((this.capabilities.COOL && this.capabilities.COOL.swing) || (this.capabilities.HEAT && this.capabilities.HEAT.swing)) {
			this.HeaterCoolerService.getCharacteristic(Characteristic.SwingMode)
				.updateValue(this.stateManager.get.ACSwing)
				.onSet(this.stateManager.set.ACSwing)
		}

		if (	(this.capabilities.COOL && this.capabilities.COOL.fanSpeeds) || (this.capabilities.HEAT && this.capabilities.HEAT.fanSpeeds)) {
			this.HeaterCoolerService.getCharacteristic(Characteristic.RotationSpeed)
				.updateValue(this.stateManager.get.ACRotationSpeed)
				.onSet(this.stateManager.set.ACRotationSpeed)
		}

		if (this.filterService) {
			this.HeaterCoolerService.getCharacteristic(Characteristic.FilterChangeIndication)
				.updateValue(this.stateManager.get.FilterChangeIndication)
	
			// this.HeaterCoolerService.getCharacteristic(Characteristic.FilterLifeLevel)
			// 	.updateValue(this.stateManager.get.FilterLifeLevel)

			this.HeaterCoolerService.getCharacteristic(Characteristic.ResetFilterIndication)
				.onSet(this.stateManager.set.ResetFilterIndication)
		}

	}

	addFanService() {
		this.log.easyDebug(`Adding Fan Service in the ${this.roomName}`)

		this.FanService = this.accessory.getService(Service.Fanv2)
		if (!this.FanService)
			this.FanService = this.accessory.addService(Service.Fanv2, this.roomName + ' Fan', 'Fan')

		this.FanService.getCharacteristic(Characteristic.Active)
			.updateValue(this.stateManager.get.FanActive)
			.onSet(this.stateManager.set.FanActive)

		if (this.capabilities.FAN.swing) {
			this.FanService.getCharacteristic(Characteristic.SwingMode)
				.updateValue(this.stateManager.get.FanSwing)
				.onSet(this.stateManager.set.FanSwing)
		}

		if (this.capabilities.FAN.fanSpeeds) {
			this.FanService.getCharacteristic(Characteristic.RotationSpeed)
				.updateValue(this.stateManager.get.FanRotationSpeed)
				.onSet(this.stateManager.set.FanRotationSpeed)
		}

	}

	removeFanService() {
		let FanService = this.accessory.getService(Service.Fanv2)
		if (FanService) {
			// remove service
			this.log.easyDebug(`Removing Fan Service from the ${this.roomName}`)
			this.accessory.removeService(FanService)
		}
	}
	
	addDryService() {
		this.log.easyDebug(`Adding Dehumidifier Service in the ${this.roomName}`)

		this.DryService = this.accessory.getService(Service.HumidifierDehumidifier)
		if (!this.DryService)
			this.DryService = this.accessory.addService(Service.HumidifierDehumidifier, this.roomName + ' Dry', 'Dry')

		this.DryService.getCharacteristic(Characteristic.Active)
			.updateValue(this.stateManager.get.DryActive)
			.onSet(this.stateManager.set.DryActive)


		this.DryService.getCharacteristic(Characteristic.CurrentRelativeHumidity)
			.updateValue(this.stateManager.get.CurrentRelativeHumidity)

		this.DryService.getCharacteristic(Characteristic.CurrentHumidifierDehumidifierState)
			.updateValue(this.stateManager.get.CurrentHumidifierDehumidifierState)

		this.DryService.getCharacteristic(Characteristic.TargetHumidifierDehumidifierState)
			.setProps({
				minValue: 2,
				maxValue: 2,
				validValues: [Characteristic.TargetHumidifierDehumidifierState.DEHUMIDIFIER]
			})
			.updateValue(this.stateManager.get.TargetHumidifierDehumidifierState)
			.onSet(this.stateManager.set.TargetHumidifierDehumidifierState)

		if (this.capabilities.DRY.swing) {
			this.DryService.getCharacteristic(Characteristic.SwingMode)
				.updateValue(this.stateManager.get.DrySwing)
				.onSet(this.stateManager.set.DrySwing)
		}

		if (this.capabilities.DRY.fanSpeeds) {
			this.DryService.getCharacteristic(Characteristic.RotationSpeed)
				.updateValue(this.stateManager.get.DryRotationSpeed)
				.onSet(this.stateManager.set.DryRotationSpeed)
		}

	}

	removeDryService() {
		let DryService = this.accessory.getService(Service.HumidifierDehumidifier)
		if (DryService) {
			// remove service
			this.log.easyDebug(`Removing Dehumidifier Service from the ${this.roomName}`)
			this.accessory.removeService(DryService)
		}
	}

	updateHomeKit(state) {
		if (!state)
			return

		this.state = state
		
		// update measurements
		this.updateValue('HeaterCoolerService', 'CurrentTemperature', this.state.currentTemperature)
		// this.updateValue('HeaterCoolerService', 'CurrentRelativeHumidity', this.state.relativeHumidity)
		if (this.capabilities.DRY && !this.disableDry)
			this.updateValue('DryService', 'CurrentRelativeHumidity', 0)

		// if status is OFF, set all services to INACTIVE
		if (!this.state.active) {
			this.updateValue('HeaterCoolerService', 'Active', 0)
			this.updateValue('HeaterCoolerService', 'CurrentHeaterCoolerState', Characteristic.CurrentHeaterCoolerState.INACTIVE)

			if (this.FanService)
				this.updateValue('FanService', 'Active', 0)


			if (this.DryService) {
				this.updateValue('DryService', 'Active', 0)
				this.updateValue('DryService', 'CurrentHumidifierDehumidifierState', 0)
			}

			return
		}

		switch (this.state.mode) {
			case 'COOL':
			case 'HEAT':
			case 'AUTO':

				// turn on HeaterCoolerService
				this.updateValue('HeaterCoolerService', 'Active', 1)

				// update temperatures for HeaterCoolerService
				this.updateValue('HeaterCoolerService', 'HeatingThresholdTemperature', this.state.targetTemperature)
				this.updateValue('HeaterCoolerService', 'CoolingThresholdTemperature', this.state.targetTemperature)

				// update swing for HeaterCoolerService
				if (this.capabilities[this.state.mode].swing)
					this.updateValue('HeaterCoolerService', 'SwingMode', Characteristic.SwingMode[this.state.swing])

				// update fanSpeed for HeaterCoolerService
				if (this.capabilities[this.state.mode].fanSpeeds)
					this.updateValue('HeaterCoolerService', 'RotationSpeed', this.state.fanSpeed)

				// update filter characteristics for HeaterCoolerService
				if (this.filterService) {
					this.updateValue('HeaterCoolerService', 'FilterChangeIndication', Characteristic.FilterChangeIndication[this.state.filterChange])
					this.updateValue('HeaterCoolerService', 'FilterLifeLevel', this.state.filterLifeLevel)
				}

				// set proper target and current state of HeaterCoolerService
				if (this.state.mode === 'COOL') {
					this.updateValue('HeaterCoolerService', 'TargetHeaterCoolerState', Characteristic.TargetHeaterCoolerState.COOL)
					this.updateValue('HeaterCoolerService', 'CurrentHeaterCoolerState', Characteristic.CurrentHeaterCoolerState.COOLING)
				} else if (this.state.mode === 'HEAT') {
					this.updateValue('HeaterCoolerService', 'TargetHeaterCoolerState', Characteristic.TargetHeaterCoolerState.HEAT)
					this.updateValue('HeaterCoolerService', 'CurrentHeaterCoolerState', Characteristic.CurrentHeaterCoolerState.HEATING)
				} else if (this.state.mode === 'AUTO') {
					this.updateValue('HeaterCoolerService', 'TargetHeaterCoolerState', Characteristic.TargetHeaterCoolerState.AUTO)
					if (this.state.currentTemperature > this.state.targetTemperature)
						this.updateValue('HeaterCoolerService', 'CurrentHeaterCoolerState', Characteristic.CurrentHeaterCoolerState.COOLING)
					else
						this.updateValue('HeaterCoolerService', 'CurrentHeaterCoolerState', Characteristic.CurrentHeaterCoolerState.HEATING)
				}

				// turn off FanService
				if (this.FanService)
					this.updateValue('FanService', 'Active', 0)

				// turn off DryService
				if (this.DryService) {
					this.updateValue('DryService', 'Active', 0)
					this.updateValue('DryService', 'CurrentHumidifierDehumidifierState', 0)
				}
				break
			case 'FAN':
				if (this.FanService) {

					// turn on FanService
					this.updateValue('FanService', 'Active', 1)

					// update swing for FanService
					if (this.capabilities.FAN.swing)
						this.updateValue('FanService', 'SwingMode', Characteristic.SwingMode[this.state.swing])

					// update fanSpeed for FanService
					if (this.capabilities.FAN.fanSpeeds)
						this.updateValue('FanService', 'RotationSpeed', this.state.fanSpeed)
				}

				// turn off HeaterCoolerService
				this.updateValue('HeaterCoolerService', 'Active', 0)
				this.updateValue('HeaterCoolerService', 'CurrentHeaterCoolerState', Characteristic.CurrentHeaterCoolerState.INACTIVE)

				// turn off DryService
				if (this.DryService) {
					this.updateValue('DryService', 'Active', 0)
					this.updateValue('DryService', 'CurrentHumidifierDehumidifierState', 0)
				}

				break
			case 'DRY':
				if (this.DryService) {

					// turn on FanService
					this.updateValue('DryService', 'Active', 1)
					this.updateValue('DryService', 'CurrentHumidifierDehumidifierState', Characteristic.CurrentHumidifierDehumidifierState.DEHUMIDIFYING)

					// update swing for FanService
					if (this.capabilities.DRY.swing)
						this.updateValue('DryService', 'SwingMode', Characteristic.SwingMode[this.state.swing])

					// update fanSpeed for FanService
					if (this.capabilities.DRY.fanSpeeds)
						this.updateValue('DryService', 'RotationSpeed', this.state.fanSpeed)
				}

				// turn off HeaterCoolerService
				this.updateValue('HeaterCoolerService', 'Active', 0)
				this.updateValue('HeaterCoolerService', 'CurrentHeaterCoolerState', Characteristic.CurrentHeaterCoolerState.INACTIVE)

				// turn off FanService
				if (this.FanService)
					this.updateValue('FanService', 'Active', 0)

				break
		}

		// cache last state to storage
		this.storage.setItem('electra-state', this.cachedState)
	}

	updateValue (serviceName, characteristicName, newValue) {
		if (newValue !== 0 && newValue !== false && (typeof newValue === 'undefined' || !newValue)) {
			this.log.easyDebug(`${this.roomName} - WRONG VALUE -> '${characteristicName}' for ${serviceName} with VALUE: ${newValue}`)
			return
		}
		const minAllowed = this[serviceName].getCharacteristic(Characteristic[characteristicName]).props.minValue
		const maxAllowed = this[serviceName].getCharacteristic(Characteristic[characteristicName]).props.maxValue
		const validValues = this[serviceName].getCharacteristic(Characteristic[characteristicName]).props.validValues
		const currentValue = this[serviceName].getCharacteristic(Characteristic[characteristicName]).value

		if (validValues && !validValues.includes(newValue))
			newValue = currentValue
		if (minAllowed && newValue < minAllowed)
			newValue = currentValue
		else if (maxAllowed && newValue > maxAllowed)
			newValue = currentValue

		if (currentValue !== newValue) {
			this[serviceName].getCharacteristic(Characteristic[characteristicName]).updateValue(newValue)
			this.log.easyDebug(`${this.roomName} - Updated '${characteristicName}' for ${serviceName} with NEW VALUE: ${newValue}`)
		}
	}

	
}


module.exports = AirConditioner