const { Builder, By, until } = require('selenium-webdriver');
const assert = require('assert');

let driver;

async function setup() {
    driver = await new Builder().forBrowser('chrome').build();
    await driver.get('file:///' + __dirname + '/../index.html');
}

async function tearDown() {
    await driver.quit();
}

// Test function 1: Check if 'creaturesTable' div has content
async function testCreatureContainerHasContent() {
    const creatureContainer = await driver.findElement(By.id('creaturesTable'));

    await driver.wait(async () => {
        const content = await creatureContainer.getAttribute('innerHTML');
        return content.trim().length > 0;
    }, 10000);

    const content = await creatureContainer.getAttribute('innerHTML');
    assert.ok(content.trim().length > 0, "The 'creaturesTable' div is empty");
    console.log("Test passed: 'creaturesTable' div has content");
}

// Test function 2: Example of another test (e.g., Check if an alert is shown)
async function testAlertForMissingType() {
    const addButton = await driver.findElement(By.xpath("//button[contains(@class, 'initiative') and text()='Add Monster']"));
    await addButton.click();

    await driver.wait(until.alertIsPresent(), 5000);
    const alert = await driver.switchTo().alert();
    const alertText = await alert.getText();
    assert.strictEqual(alertText, "Select monster type first");
    await alert.accept();
    console.log("Test passed: Correct alert is shown for missing monster type");
}

// Main function to run all tests sequentially
async function runAllTests() {
    await setup();

    try {
        await testCreatureContainerHasContent();
        await testAlertForMissingType();
        // Add more test functions here as needed
    } catch (error) {
        console.error("Test failed:", error);
    } finally {
        await tearDown();
    }
}

// Run the tests
runAllTests();
