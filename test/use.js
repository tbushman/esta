// Chromedriver is used by Selenium and requiring the module avoids having to
// download and install the executable from Google along with setting the path.
/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "chromedriver" }] */
let chromedriver = require('chromedriver');
var mocha = require('mocha');
let webdriver = require('selenium-webdriver'),
    By = webdriver.By,
    until = webdriver.until;

// Used to save screenshots.
const fs = require('fs');
const path = require('path');

var doesProjectPassTests = function(name, URL) {
	const elementTimeout = 60000;

  // If all of the project tests pass, this is set to true.
  let success = false;

  const chrome = require('selenium-webdriver/chrome');

  // Set up Chrome options. We use both "start-maximized" along with
  // "window-size" because some platforms prefer one or the other.
  let options = new chrome.Options();
  options.addArguments([
    'start-maximized',
    `window-size=${browserMaxWidth}x${browserMaxHeight}`,
    'no-sandbox'
  ]);
  options.setChromeBinaryPath(chromeBinaryPath);

  // Create the browser.
  var driver = new webdriver.Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
console.log(driver)
  // The following functions are defined below instead of outside this function
  // so we do not have to pass the 'driver' as a function parameter. It makes
  // the functions easier to use in a 'then' chain.

  // Locates an element and then clicks it.
  const clickElement = function(locator) {
    return driver.wait(
      until.elementLocated(locator),
      elementTimeout
    )
    .then(clickWhenVisible, errorFunc);
  };

  // Waits for an element to be visible, and then clicks it.
  const clickWhenVisible = function(element) {
    return driver.wait(
     until.elementIsVisible(element),
     elementTimeout
   )
   .then(function(element) {
     element.click();
     return element;
   },
   errorFunc);
  };

  // Waits for an element to have opacity of 1. Helps for waiting for elements
  // that fade in. Returns the element when the opacity reaches '1' so that
  // this can be chained with other promises.
  const waitOpacity = function(element) {
    return driver.wait(function() {
      return element.getCssValue('opacity')
      .then(function(opacity) {
        if (opacity === '1') {
          return element;
        } else {
          return false;
        }
      });
    });
  };

  // Handles errors.
  const errorFunc = function(error) {
    // Ignore unexpected alert error, log all others.
    if (error.name === 'UnexpectedAlertOpenError') {
      console.log('Ignoring UnexpectedAlertOpenError');
    } else {
      console.error(error);
    }
  };
	//it('There should be closing tags -- required for xml')
  // Test automation starts here.

  // Mac OS for some reason doesn't like the 'start-maximized' flag.
  // In some cases (e.g. Mac, headless Chrome) the "start-maximized" flag is
  // ignored, so we do this just in case.
  driver.manage().window().setPosition(0, 0);
  driver.manage().window().setSize(browserMaxWidth, browserMaxHeight);

  // Get the specified URL.
  driver.get(URL);
	//;
	
	driver.wait(
		until.elementLocated(By.id('vue')),
		elementTimeout
	).then(function(){
		describeOT()
	},
  errorFunc)
	//var doesProjectPassTests = doesProjectPass(process.env.DEVAPPURL);
	var chai = require('chai'),
			assert = chai.assert;

	// Selenium wrapper for Mocha testing. You can also add the following if
	// needed: after, afterEach, before, beforeEach, and xit.
	var seleniumMocha = require('selenium-webdriver/testing'),
			describe = seleniumMocha.describe,
			it = seleniumMocha.it;
	function describeOT(){
		describe('Ordinancer Tests', function() {
			var tests = [
				{
					name: 'Home',
					URL: 'http://localhost:8555/'
				}
			];
			// Mocha timeout. Two minutes should be enough for every page we test.
			this.timeout(120000);
			// Check mocha is loaded and populate test suite.
			let mochaCheck = setInterval(() => runCheck(), 50);
			var testRunner;
			function runCheck() {
				try {
					if (mocha) {
						//console.log(mocha)
						clearInterval(mochaCheck);
						mocha.setup({
							ui: 'bdd',
							reporter: 'spec',
							fullTrace: true
						});
						if (testRunner) {
							
						} else {
							testRunner = mocha.run();
						}
						tests.forEach(function(test) {
							it(
								`${test.name} at URL ${test.URL} should pass all tests`,
								function(done) {

								doesProjectPassTests(test.name, test.URL)
								.then(function(success) {
									assert.isOk(
										success,
										`${test.name} did not pass all tests.`
									);
									done();
								});
							});
						});
					}
				} catch (err) {
					console.warn('mocha not loaded yet');
				}
			}
			mochaCheck();
			
		});
		function homePageTests() {
			describe('#Export', function() {
				
				it(`The #vue section is xml compliant`,
				function() {
					const title = document.getElementById('vue');
					
					console.log(title)
					setTimeout(function(){
						
						if (title) {
							assert.isNotNull(
								title,
								'There should be an element with id="vue" '
							);
						} else {
							console.log(title)
						}
					},5000)
					
				});
			});
		}
		function testRunner(test){
			mocha.suite.suites = [];
			switch(test.name) {
				case 'Home':
					homePageTests();
					break;
				default:
					homePageTests();
			}
		}
	}
	/*return driver.quit()
  .then(function() {
    return success;
  });*/
}

