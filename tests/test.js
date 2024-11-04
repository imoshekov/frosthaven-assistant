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

async function addMonster(driver, monster) {
    // Set up the inputs
    await driver.findElement(By.id('type')).sendKeys(monster.type); // Set type
    await driver.findElement(By.id('level')).clear();
    await driver.findElement(By.id('level')).sendKeys(monster.level); // Set level
    await driver.findElement(By.id('standee-number')).sendKeys(monster.standee); // Set standee number

    // Click the "Add Monster" button
    const addMonsterButton = await driver.findElement(By.css('.add-char button.initiative:nth-of-type(2)'));
    await addMonsterButton.click();
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
    // let driver = await new Builder().forBrowser('chrome').build();

    try {
        // Load your local HTML file
        await driver.get(sourceHTML); // Adjust this path if needed

        const initialMonsters = await driver.findElements(By.css('.creature-row'));
        const initialCount = initialMonsters.length;
        await addMonster(driver, {
            type: 'algox-guard',
            level: '2',
            standee: '1'
        });

        // Wait until a new creature is added to the DOM
        await driver.wait(async () => {
            let currentMonsters = await driver.findElements(By.css('.creature-row'));
            return currentMonsters.length > 0; // Assuming you expect at least one monster to be present
        }, 10000, "Timeout waiting for new monster to be added.");

        // Verify if a new creature has been added
        const finalMonsters = await driver.findElements(By.css('.creature-row'));
        const finalCount = finalMonsters.length;

        if (finalCount > initialCount) {
            console.log("Test passed: a new monster was successfully added.");

        } else {
            console.log("Test failed: no new monster was added.");
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

async function testAttackModalDisplay() {
    try {
        // Navigate to the page containing the HTML
        await driver.get(sourceHTML); // Update this with the correct path
        // Wait for the page to load
        await addMonster(driver, {
            type: 'algox-guard',
            level: '2',
            standee: '1'
        });

        // Find the 'attack-image' button for the non-aggressive character
        const attackButton = await driver.findElement(By.id('attack-img-0')); // Adjust index as needed
        await attackButton.click();

        const targetButton = await driver.findElement(By.id('target-img-4')); // Adjust index as needed
        await targetButton.click();

        // Wait for the modal to be displayed
        const modal = await driver.wait(until.elementLocated(By.id('modal-attack')), 5000);

        // Validate that the modal is displayed
        let isModalDisplayed = await modal.isDisplayed();
        if (isModalDisplayed) {
            console.log('Test passed: attack Modal is displayed as expected.');
        } else {
            console.log('Test failed: attack Modal is NOT displayed.');
        }
    } catch (error) {
        console.error('Test failed:', error);
    }
}

// Main function to run all tests sequentially
async function runAllTests() {
    await setup();

    try {
        await testAlertForMissingType();
        await testCreatureContainerHasContent();
        await testAddMonster();
        await testAttackModalDisplay();
    } catch (error) {
        console.error("Test failed:", error);
    } finally {
        await tearDown();
    }
}

// Run the tests
runAllTests();
