const { Builder, Browser, By, until } = require('selenium-webdriver');
const assert = require('assert');
const chrome = require('selenium-webdriver/chrome');


const TestUtils  = require('./test-utils.js');
// const sourceHTML = 'file:///' + __dirname + '/../index.html';

let driver;

const sourceHTML = process.env.GITHUB_ACTIONS ?
    'http://localhost:8099/index.html' :
    'file:///' + __dirname + '/../index.html'; // Adjust this path as needed

async function setup() {
    let options = new chrome.Options();
    options.addArguments('headless'); // Enables headless mode
    options.addArguments('disable-gpu'); // Disables GPU acceleration (not necessary but recommended in headless mode)
    options.addArguments('window-size=1280x1024');
    if (process.env.GITHUB_ACTIONS) {
        driver = await new Builder()
            .forBrowser(Browser.CHROME)
            .setChromeOptions(options)
            .usingServer('http://localhost:4444/wd/hub')  // Use GitHub Actions server if specified
            .build();
    }
    else {
        driver = await new Builder().forBrowser('chrome')
            .build();
    }
}


async function testCreatureContainerHasContent() {
    await driver.get(sourceHTML);
    const creatureContainer = await driver.findElement(By.id('creaturesTable'));

    await driver.wait(async () => {
        const content = await creatureContainer.getAttribute('innerHTML');
        return content.trim().length > 0;
    }, 10000);

    const content = await creatureContainer.getAttribute('innerHTML');
    assert.ok(content.trim().length > 0, "The 'creaturesTable' div is empty");
    console.log("Test passed: 'creaturesTable' div has content.");
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
    await driver.get(sourceHTML);

    const initialMonsters = await driver.findElements(By.css('.creature-row'));
    const initialCount = initialMonsters.length;

    await TestUtils.addMonster(driver, {
        type: 'algox-guard',
        level: '2',
        standee: '1'
    });

    // Wait until a new creature is added to the DOM
    await driver.wait(async () => {
        let currentMonsters = await driver.findElements(By.css('.creature-row'));
        return currentMonsters.length > 0;
    }, 10000, "Timeout waiting for new monster to be added.");

    // Verify if a new creature has been added
    const finalMonsters = await driver.findElements(By.css('.creature-row'));
    const finalCount = finalMonsters.length;

    assert.ok(finalCount > initialCount, "no new monster was added.");
    console.log("Test passed: a new monster was successfully added.");
}

async function testAttackModalDisplayed() {
    await driver.get(sourceHTML);

    await TestUtils.addMonster(driver, {
        type: 'algox-guard',
        level: '2',
        standee: '1'
    });

    await TestUtils.openAttackModal(driver);

    // Wait for the modal to be displayed
    const modal = await driver.wait(until.elementLocated(By.id('modal-attack')), 5000);
    await driver.wait(until.elementIsVisible(modal), 5000, "modal-attack is not visible");
    // Validate that the modal is displayed
    let isModalDisplayed = await modal.isDisplayed();

    assert.ok(isModalDisplayed, "attack modal is NOT displayed.");
    console.log('Test passed: attack modal is displayed as expected.');
}

async function testBaseDamageApplication() {
    await driver.get(sourceHTML);
    await TestUtils.addMonster(driver, {
        type: 'algox-guard',
        level: '2',
        standee: '1'
    });

    let characterHPStat = await driver.findElement(By.id('char-hp-4'));
    const originalHPValue = parseInt(await characterHPStat.getAttribute('value'));

    await TestUtils.openAttackModal(driver,  4);

    const damageInput = await driver.findElement(By.id('attack-input'));
    await damageInput.clear();
    await damageInput.sendKeys('3');

    // Click the "OK" button to apply damage
    const applyDamageButton = await driver.findElement(By.css('#modal-attack .modal-content .initiative'));
    await applyDamageButton.click();

    // Retrieve the updated HP after damage is applied
    const updatedHPValue = parseInt(await characterHPStat.getAttribute('value'));

    assert.ok((originalHPValue - updatedHPValue) === 3, "damage is not applied correctly.");
    console.log('Test passed: base damage is applied correctly.');
}

async function testMonsterIsKilled() {
    await driver.get(sourceHTML);
    await TestUtils.addMonster(driver, {
        type: 'algox-guard',
        level: '1',
        standee: '1'
    });

    const initialMonsters = await driver.findElements(By.css('.creature-row'));
    const initialMonstersCount = initialMonsters.length;

    let characterHPStat = await driver.findElement(By.id('char-hp-4'));
    const originalHPValue = parseInt(await characterHPStat.getAttribute('value'));

    await TestUtils.openAttackModal(driver,  4);

    const damageInput = await driver.findElement(By.id('attack-input'));
    await damageInput.clear();
    await damageInput.sendKeys(originalHPValue);

    // Click the "OK" button to apply damage
    const applyDamageButton = await driver.findElement(By.css('#modal-attack .modal-content .initiative'));
    await applyDamageButton.click();

    // Retrieve the updated HP after damage is applied
    const updatedMonsters = await driver.findElements(By.css('.creature-row'));
    const updatedMonstersCount = updatedMonsters.length;

    assert.ok((initialMonstersCount - updatedMonstersCount) === 1, "monster has not been removed upon a kill");
    console.log('Test passed: monster has successfully been killed and removed from the game.');
}

async function testConditionsModalDisplayed() {
    await driver.get(sourceHTML);

    await TestUtils.addMonster(driver, {
        type: 'algox-priest',
        level: '1',
        standee: '1'
    });

    await TestUtils.openConditionsModal(driver, 4);

    // Wait for the modal to be displayed
    const modal = await driver.wait(until.elementLocated(By.id('modal-conditions')), 5000);

    // Validate that the modal is displayed
    let isModalDisplayed = await modal.isDisplayed();

    assert.ok(isModalDisplayed, "condition modal is NOT displayed.");
    console.log('Test passed: condition modal is displayed as expected.');
}

async function testConditionalDamageApplication() {
    await driver.get(sourceHTML);
    await TestUtils.addMonster(driver, {
        type: 'algox-priest',
        level: '1',
        standee: '1'
    });

    let characterHPStat = await driver.findElement(By.id('char-hp-4'));
    const originalHPValue = parseInt(await characterHPStat.getAttribute('value'));

    await TestUtils.openAttackModal(driver, 4);

    const damageInput = await driver.findElement(By.id('attack-input'));
    await damageInput.clear();
    await damageInput.sendKeys('3');

    // Click the "OK" button to apply damage
    const applyDamageButton = await driver.findElement(By.css('#modal-attack .modal-content .initiative'));
    await applyDamageButton.click();

    // Retrieve the updated HP after damage is applied
    const updatedHPValue = parseInt(await characterHPStat.getAttribute('value'));

    assert.ok((originalHPValue - updatedHPValue) === 2, "damage is not applied correctly.");
    console.log('Test passed: conditional damage is applied correctly.');
}

async function testConditionAdded() {
    await driver.get(sourceHTML);

    await TestUtils.addMonster(driver, {
        type: 'algox-guard',
        level: '1',
        standee: '1'
    });

    await TestUtils.openConditionsModal(driver, 4);

    // Wait for the modal to be fully visible
    const modal = await driver.wait(until.elementLocated(By.id('modal-conditions')), 10000);
    await driver.wait(until.elementIsVisible(modal), 10000); // Ensure the modal is visible

    // Wait for the armor input field to be visible and enabled
    const armorInput = await driver.wait(until.elementLocated(By.id('condition-armor')), 10000);

    // Use JavaScript to set the value directly
    await driver.executeScript("arguments[0].value = '1';", armorInput);

    // Click the OK button with retry logic
    const okButton = await driver.findElement(By.xpath("//button[contains(@class, 'condition-btn') and contains(text(), 'Single')]"));
    await okButton.click();

    // Wait for the condition to be applied and verify the changes
    await driver.wait(until.elementLocated(By.id('char-armor-4')), 10000); // Wait for the condition to be visible

    // Verify the visibility of the armor condition
    const charArmorDiv = await driver.findElement(By.id('char-armor-4'));
    const isVisible = await charArmorDiv.isDisplayed();
    assert.ok(isVisible, "charArmorDiv is not visible.");

    // Verify the image source
    const armorImageElement = await charArmorDiv.findElement(By.css('img.condition-image'));
    const imgSrc = await armorImageElement.getAttribute('src');
    assert.ok(imgSrc.includes('shield.svg'), "shield image source is incorrect.");
 

    // Verify the condition number
    const conditionNumberElement = await charArmorDiv.findElement(By.css('.armor-number'));
    const conditionNumber = await conditionNumberElement.getAttribute('value');

    assert.ok(conditionNumber === '1', "Condition number is incorrect.");
    console.log("Test passed: new condition added successfully.");
}

async function testInitiativeReset() {
    // Navigate to the page where your test is located
    await driver.get(sourceHTML);
    await driver.wait(until.elementLocated(By.css('.add-char .row .attack')), 10000);
    
    const nextRoundButton = await driver.findElement(By.css('.add-char .row .attack'));
    await nextRoundButton.click();

    const initiativeInputs = await driver.wait(
        until.elementsLocated(By.css('.creature-column input[type="number"].initiative')),
        10000
    );

    for (let input of initiativeInputs) {
        await driver.wait(async () => {
            const value = await input.getAttribute('value');
            return value === '0';
        }, 5000, 'Initiative did not reset to 0 within the expected time');

        const resetValue = await input.getAttribute('value');
        assert.strictEqual(resetValue, '0', 'Initiative input was not reset to 0');
    }

    console.log("Test passed: all initiative inputs reset to 0 after clicking 'Next Round'");
}

async function tearDown() {
    await driver.quit();
}

async function runAllTests() {
    let hasFailed = false;
    await setup();

    try {
        await testCreatureContainerHasContent();
        await testAlertForMissingType();
        await testAddMonster();
        await testAttackModalDisplayed();
        await testBaseDamageApplication();
        await testMonsterIsKilled();
        await testConditionsModalDisplayed();
        await testConditionalDamageApplication();
        await testConditionAdded();
        await testInitiativeReset();
    } catch (error) {
        console.error("Test failed:", error);
        hasFailed = true;
        let screenshot = await driver.takeScreenshot();
        require('fs').writeFileSync('fail_screenshot.png', screenshot, 'base64');
        // const pageSource = await driver.getPageSource();
        // console.log(pageSource);  // Logs the page source for analysis
    } finally {
        await tearDown();
        if (hasFailed) {
            process.exit(1); // failure exit code to trigger failed workflow
        }
    }
}

runAllTests();
