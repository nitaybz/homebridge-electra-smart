const ElectraApi = require('./electra/api')
const syncHomeKitCache = require('./electra/syncHomeKitCache')
const refreshState = require('./electra/refreshState')
const path = require('path')
const storage = require('node-persist')
const PLUGIN_NAME = 'homebridge-electra-smart'
const PLATFORM_NAME = 'ElectraSmart'

module.exports = (api) => {
	api.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, ElectraSmartPlatform)
}

class ElectraSmartPlatform {
	constructor(log, config, api) {

		this.cachedAccessories = []
		this.activeAccessories = []
		this.log = log
		this.api = api
		this.storage = storage
		this.refreshState = refreshState(this)
		this.syncHomeKitCache = syncHomeKitCache(this)
		this.name = config['name'] || PLATFORM_NAME
		this.disableFan = config['disableFan'] || false
		this.disableDry = config['disableDry'] || false
		this.debug = config['debug'] || false
		this.PLUGIN_NAME = PLUGIN_NAME
		this.PLATFORM_NAME = PLATFORM_NAME

		// ~~~~~~~~~~~~~~~~~~~~~ Electra Specials ~~~~~~~~~~~~~~~~~~~~~ //
		
		this.token = config['token']
		this.imei = config['imei']
		
		if (!this.token || !this.imei) {
			this.log('XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX  --  ERROR  --  XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX\n')
			this.log('Can\'t start homebridge-electra-smart plugin without "token" and "imei" !!\n')
			this.log('XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX\n')
			return
		}


		this.persistPath = path.join(this.api.user.persistPath(), '/../electra-persist')
		this.emptyState = {devices:{}}
		this.CELSIUS_UNIT = 'C'
		this.FAHRENHEIT_UNIT = 'F'
		let requestedInterval = config['statePollingInterval'] === 0 ? 0 : (config['statePollingInterval'] || 30) // default polling time is 30 seconds
		if (requestedInterval < 5) 
			requestedInterval = 5
		this.refreshDelay = 2000
		this.locations = []

		// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //

		this.setProcessing = false
		this.pollingTimeout = null
		this.processingState = false
		this.pollingInterval = requestedInterval ? (requestedInterval * 1000 - this.refreshDelay) : false

		// define debug method to output debug logs when enabled in the config
		this.log.easyDebug = (...content) => {
			if (this.debug) {
				this.log(content.reduce((previous, current) => {
					return previous + ' ' + current
				}))
			} else
				this.log.debug(content.reduce((previous, current) => {
					return previous + ' ' + current
				}))
		}
		
		this.api.on('didFinishLaunching', async () => {

			await this.storage.init({
				dir: this.persistPath,
				forgiveParseErrors: true
			})


			this.cachedState = await this.storage.getItem('electra-state') || this.emptyState
			if (!this.cachedState.devices)
				this.cachedState = this.emptyState
				
			this.ElectraApi = await ElectraApi(this)

			try {
				this.devices = await this.ElectraApi.getDevices()
				await this.storage.setItem('electra-devices', this.devices)
			} catch(err) {
				this.log('ERR:', err)
				this.devices = await this.storage.getItem('electra-devices') || []
			}
			
			this.syncHomeKitCache()

			if (this.pollingInterval)
				this.pollingTimeout = setTimeout(this.refreshState, this.pollingInterval)
			
		})

	}

	configureAccessory(accessory) {
		this.cachedAccessories.push(accessory)
	}

}
