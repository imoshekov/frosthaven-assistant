const { Builder, By, until } = require('selenium-webdriver');
const assert = require('assert');
const sourceHTML = 'file:///' + __dirname + '/../index.html';

let driver;

async function setup() {
    if (process.env.GITHUB_ACTIONS) {
        driver = await new Builder()
            .forBrowser('chrome')
            .usingServer('http://localhost:4444/wd/hub')  // Use GitHub Actions server if specified
            .build();
    }
    else {
        driver = await new Builder().forBrowser('chrome').build();
        await driver.get(sourceHTML);
    }
}

async function tearDown() {
    await driver.quit();
}

async function addMonster(driver, monster) {
    await driver.findElement(By.id('type')).sendKeys(monster.type);
    await driver.findElement(By.id('level')).clear();
    await driver.findElement(By.id('level')).sendKeys(monster.level);
    await driver.findElement(By.id('standee-number')).sendKeys(monster.standee);

    // Click the "Add Monster" button
    const addMonsterButton = await driver.findElement(By.css('.add-char button.initiative:nth-of-type(2)'));
    await addMonsterButton.click();
}

async function openAttackModal(attackerId = 0, defenderId = 4) {
    const attackButton = await driver.findElement(By.id(`attack-img-${attackerId}`));
    await attackButton.click();

    const targetButton = await driver.findElement(By.id(`target-img-${defenderId}`));
    await targetButton.click();
}

async function testCreatureContainerHasContent() {
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

    await addMonster(driver, {
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

async function testAttackModalDisplay() {
    await driver.get(sourceHTML);

    await addMonster(driver, {
        type: 'algox-guard',
        level: '2',
        standee: '1'
    });

    await openAttackModal();

    // Wait for the modal to be displayed
    const modal = await driver.wait(until.elementLocated(By.id('modal-attack')), 5000);

    // Validate that the modal is displayed
    let isModalDisplayed = await modal.isDisplayed();

    assert.ok(isModalDisplayed, "attack modal is NOT displayed.");
    console.log('Test passed: attack modal is displayed as expected.');
}

async function testDamageApplication() {
    await driver.get(sourceHTML);
    await addMonster(driver, {
        type: 'algox-guard',
        level: '2',
        standee: '1'
    });

    let characterHPStat = await driver.findElement(By.id('char-hp-4'));
    const originalHPValue = parseInt(await characterHPStat.getAttribute('value'));

    await openAttackModal(0, 4);

    const damageInput = await driver.findElement(By.id('attack-input'));
    await damageInput.clear();
    await damageInput.sendKeys('3');

    // Click the "OK" button to apply damage
    const applyDamageButton = await driver.findElement(By.css('#modal-attack .modal-content .initiative'));
    await applyDamageButton.click();

    // Retrieve the updated HP after damage is applied
    const updatedHPValue = parseInt(await characterHPStat.getAttribute('value'));

    assert.ok((originalHPValue - updatedHPValue) === 3, "damage is not applied correctly.");
    console.log('Test passed: damage is applied correctly.');

}

async function testMonsterIsKilled() {
    await driver.get(sourceHTML);
    await addMonster(driver, {
        type: 'algox-guard',
        level: '1',
        standee: '1'
    });

    const initialMonsters = await driver.findElements(By.css('.creature-row'));
    const initialMonstersCount = initialMonsters.length;

    let characterHPStat = await driver.findElement(By.id('char-hp-4'));
    const originalHPValue = parseInt(await characterHPStat.getAttribute('value'));

    await openAttackModal(0, 4);

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

async function runAllTests() {
    await setup();

    try {
        await testAlertForMissingType();
        await testCreatureContainerHasContent();
        await testAddMonster();
        await testAttackModalDisplay();
        await testDamageApplication();
        await testMonsterIsKilled();
    } catch (error) {
        console.error("Test failed:", error);
    } finally {
        await tearDown();
    }
}

runAllTests();
