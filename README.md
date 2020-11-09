<img src="branding/electra_homebridge.png" width="500px">



# homebridge-electra-smart

[![Downloads](https://img.shields.io/npm/dt/homebridge-electra-smart.svg?color=critical)](https://www.npmjs.com/package/homebridge-electra-smart)
[![Version](https://img.shields.io/npm/v/homebridge-electra-smart)](https://www.npmjs.com/package/homebridge-electra-smart)<br>
<!-- [![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins) [![Homebridge Discord](https://img.shields.io/discord/432663330281226270?color=728ED5&logo=discord&label=discord)](https://discord.gg/yguuVAX)<br> -->
<!-- [![certified-hoobs-plugin](https://badgen.net/badge/HOOBS/Certified/yellow)](https://plugins.hoobs.org?ref=10876) [![hoobs-support](https://badgen.net/badge/HOOBS/Support/yellow)](https://support.hoobs.org?ref=10876) -->


[Homebridge](https://github.com/nfarina/homebridge) plugin for Electra Smart A/C

<img src="branding/product.jpg?v2" width="300px">

### Requirements

<img src="https://img.shields.io/badge/node-%3E%3D10.17-brightgreen"> &nbsp;
<img src="https://img.shields.io/badge/homebridge-%3E%3D0.4.4-brightgreen"> &nbsp;
<img src="https://img.shields.io/badge/iOS-%3E%3D11.0.0-brightgreen">

check with: `node -v` & `homebridge -V` and update if needed

# Installation

<!-- This plugin is Homebridge verified and HOOBS certified and can be easily installed and configured through their UI. -->

**To use this plugin you must provide `token` and `imei`** which can be obtain in 2 different ways:

1. Using the latest Homebridge config UI version (v4.32.0), you can obtain `token` and `imei` easily through the plugin settings and fill all the needed configuration.

2. After installing the plugin, open the terminal and run the command: `electra-extract`. follow the instructions to get the token & imei.

\* All methods require to have your phone (the one that was signed in to Electra Smart)

---------

1. Install homebridge using: `sudo npm install -g homebridge --unsafe-perm`
2. Install this plugin using: `sudo npm install -g homebridge-electra-smart`
3. Run the command `electra-extract` in terminal and follow instructions to extract token and imei.
3. Update your configuration file. See `config-sample.json` in this repository for a sample.

\* install from git: `sudo npm install -g git+https://github.com/nitaybz/homebridge-electra-smart.git`


## Config file

#### Easy config (required):

``` json
"platforms": [
    {
        "platform": "ElectraSmart",
        "imei": "2b950000*************",
        "token": "**************************"
    }
]
```

#### Advanced config (optional):

``` json
"platforms": [
    {
        "platform": "ElectraSmart",
        "imei": "2b950000*************",
        "token": "**************************",
        "disableFan": false,
        "disableDry": false,
        "minTemperature": 16,
        "maxTemperature": 30,
        "swingDirection": "both",
        "statePollingInterval": 30,
        "debug": false
    }
]
```


### Configurations Table

|             Parameter            |                       Description                       | Required |  Default |   type   |
| -------------------------------- | ------------------------------------------------------- |:--------:|:--------:|:--------:|
| `platform`                 | always "ElectraSmart"                                            |     ✓    |     -    |  String  |
| `imei`                 | Generated IMEI: obtain from terminal command - `electra-extract`       |     ✓    |     -    |  String  |
| `token`                 | Access Token: obtain from terminal command - `electra-extract`       |     ✓    |     -    |  String  |
| `disableFan`               |  When set to `true`, it will disable the FAN accessory        |          |  `false` |  Boolean |
| `disableDry`               |  When set to `true`, it will disable the DRY accessory        |          |  `false` |  Boolean |
| `swingDirection`               |  Choose what kind of swing you would like to control in HomeKit. can be `"vertical"`, `"horizontal"` or `"both"`        |          |  `"both"` |  Boolean |
| `minTemperature`               |  Minimum Temperature to show in HomeKit Control         |          |  `16` |  Integer |
| `maxTemperature`               |  Maximum Temperature to show in HomeKit Control        |          |  `30` |  Integer |
| `debug`       |  When set to `true`, the plugin will produce extra logs for debugging purposes        |          |  `false` |  Boolean  |

### Fan speeds & "AUTO" speed
Since HomeKit control over fan speed is with a slider between 0-100, the plugin converts the steps you have in the Electra app to values between 1 to 100, when 100 is highest and 1 is lowest. Setting the fan speed to 0, should actually set it to "AUTO" speed.

*Available fan speeds: AUTO, LOW, MED, HIGH*

### Swing
Swing support is added automatically if supported.
Since HomeKit only have one control for swing, you can choose which swing type you would like HomeKit to control: vertical, horizontal or both (default).

### Issues & Debug
If you experience any issues with the plugins please refer to the [Issues](https://github.com/nitaybz/homebridge-electra-smart/issues) tab <!-- or [electra-smart Discord channel](https://discord.gg/yguuVAX) --> and check if your issue is already described there, if it doesn't, please create a new issue with as much detailed information as you can give (logs are crucial).<br>

if you want to even speed up the process, you can add `"debug": true` to your config, which will give me more details on the logs and speed up fixing the issue.

-------------------------------------------

## Support homebridge-electra-smart

**homebridge-electra-smart** is a free plugin under the GNU license. it was developed as a contribution to the homebridge/hoobs community with lots of love and thoughts.
Creating and maintaining Homebridge plugins consume a lot of time and effort and if you would like to share your appreciation, feel free to "Star" or donate. 

<a target="blank" href="https://www.paypal.me/nitaybz"><img src="https://img.shields.io/badge/PayPal-Donate-blue.svg?logo=paypal"/></a><br>
<a target="blank" href="https://www.patreon.com/nitaybz"><img src="https://img.shields.io/badge/PATREON-Become a patron-red.svg?logo=patreon"/></a><br>
<a target="blank" href="https://ko-fi.com/nitaybz"><img src="https://img.shields.io/badge/Ko--Fi-Buy%20me%20a%20coffee-29abe0.svg?logo=ko-fi"/></a>