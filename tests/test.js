const { Builder, By, until } = require('selenium-webdriver');
const assert = require('assert');
const sourceHTML = 'file:///' + __dirname + '/../index.html'; 

let driver;

async function setup() {
    driver = await new Builder().forBrowser('chrome').build();
    await driver.get(sourceHTML);
}

async function tearDown() {
    await driver.quit();
}

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

async function testAddMonster() {
    let driver = await new Builder().forBrowser('chrome').build();

    try {
        // Load your local HTML file
        await driver.get(sourceHTML); // Adjust this path if needed

        const initialMonsters = await driver.findElements(By.css('.creature-row'));
        const initialCount = initialMonsters.length;

        // Set up the inputs
        await driver.findElement(By.id('type')).sendKeys('algox-guard'); // Set type
        await driver.findElement(By.id('level')).clear();
        await driver.findElement(By.id('level')).sendKeys('2'); // Set level
        await driver.findElement(By.id('standee-number')).sendKeys('1'); // Set standee number

        // Click the "Add Monster" button
        let addMonsterButton = await driver.findElement(By.css('.add-char button.initiative:nth-of-type(2)'));
        await addMonsterButton.click();

        // Wait until a new creature is added to the DOM
        await driver.wait(async () => {
            let currentMonsters = await driver.findElements(By.css('.creature-row'));
            return currentMonsters.length > 0; // Assuming you expect at least one monster to be present
        }, 10000, "Timeout waiting for new monster to be added.");

        // Verify if a new creature has been added
        const finalMonsters = await driver.findElements(By.css('.creature-row'));
        const finalCount = finalMonsters.length;

        if (finalCount > initialCount) {
            console.log("Test passed: A new monster was successfully added.");
        } else {
            console.log("Test failed: No new monster was added.");
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await driver.quit(); // Ensure the browser closes after the test
    }
}
// Main function to run all tests sequentially
async function runAllTests() {
    await setup();

    try {
        await testAlertForMissingType();
        await testCreatureContainerHasContent();
        await testAddMonster();
    } catch (error) {
        console.error("Test failed:", error);
    } finally {
        await tearDown();
    }
}

// Run the tests
runAllTests();
