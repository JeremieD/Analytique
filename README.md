# Analytique
Lightweight analytics system, originally for [jeremiedupuis.com](https://jeremiedupuis.com).


## Getting Started
To run your own Analytique server, you will need [Node.js](https://nodejs.org), optionnaly with [PM2](https://pm2.keymetrics.io).

### Configuration
After cloning this repo on your machine, you will need to create `config.json` at the root. That file will eventually look like this:
```json
{
	"server": {
		"hostname": "localhost",
		"port": 8000,
		"compressionEnabled": false
	},

	"users": {
		"username": "passwordHash"
	},

	"analytics": {
		"ipGeoToken": "token"
	},

	"origins": {
		"hostname": {
			"allowedUsers": [ "jeremie" ],
			"focusCountries": [ "CA" ],
			"errorPagePatterns": [ "Erreur" ],
			"excludeClientIPs": [ "104.221.122.236" ],
			"excludeCountries": [ "CN" ]
		}
	}
}

```
The `server` section is where you can specify parameters for the Node.js server instance.

The `users` section contains the list of users allowed to log into the Analytique client interface. The key is the username and the value is the password hash. Use the hash function in `client/resources/scripts/login.js` to create new users.

The `analytics` section contains parameters for the analytics processor. You will at least want to use your own [ipinfo.io](ipinfo.io) token.

The `origins` section specifies the domains from which this Analytique server will receive data. See the [Adding Origins](#adding-origins) section for details.

Finally, you will want to change line 20 of `client/beaconSender.js` so that it uses your own domain name. Simply replace `analytique.jeremiedupuis.com` with your server’s address.

**Note**: If at any point you need to change the configuration file, you will need to restart the server.

### Starting the server

To start the server, type `node server.js` in your terminal, assuming you are already inside the folder. If you have PM2 installed, you can also execute `start` to start the server as a PM2 process.

## Adding Origins
To add a new origin from which to receive data, add a field to the `origins` section of `config.json`. Only beacons from those origins will be accepted by the server. Furthermore, only users in the `allowedUsers` field will be able to access that origin from the Analytique client.

`focusCountries` is a list of country codes that you want to fetch city data for.

`errorPagePatterns` is a list of strings that is matched against page titles to determine if it is an error page.

The `excludeClientIPs` field contains a list of IP addresses that you want to ignore for that origin. You can put your own IP address if it is a site that you regularly test, for example.

`excludeCountries` is a list of country codes that you want to exclude from your sessions data. For example, if pretty much all traffic from China on your site is spam, you can exclude it with the value `CN`.

Now that the Analytique server can receive data, you will need to send the beacon from your site. For that, simply add this code inside the HTML `head` element of every page that you want to track.
```html
<script defer src="your.analytiqueserver.domain/collect"></script>
```
Check that line 20 of `client/beaconSender.js` is pointing to the correct address and you should be good to go!
