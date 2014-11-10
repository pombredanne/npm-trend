npm-trend
=========

Get the download statistics of npm modules by crawling [www.npmjs.org](https://www.npmjs.org)

###Requirement
- Need mongodb installed.
- Cannot support Win32.

###Usage of crawler
Fill configuration for
	
	/lib/crawler/cl_config.json.template
	/lib/crawler/db_config.json.template

Start crawler with debug output

	npm start
	or
	node index.js --debug

Or start without debug output

	node index.js

###Launch web
With verbose log

	node lib/www/bin/www --verbose

Or with less log

	node lib/www/bin/www

###Test

	npm test

Note: Test is not stable enough. There is random failure. If meeting test failure, please run test more times to see if it fails every time.