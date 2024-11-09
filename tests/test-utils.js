const { By, until} = require('selenium-webdriver');

const TestUtils = {
    async  addMonster(driver, monster) {
        await driver.findElement(By.id('type')).sendKeys(monster.type);
        await driver.findElement(By.id('level')).clear();
        await driver.findElement(By.id('level')).sendKeys(monster.level);
        await driver.findElement(By.id('standee-number')).sendKeys(monster.standee);
    
        const addMonsterButton = await driver.findElement(By.css('.add-char button.initiative:nth-of-type(2)'));
        await addMonsterButton.click();
    },
    async openAttackModal(driver, attackTargetId = 0) {
        const targetButton = await driver.findElement(By.id(`attack-img-${attackTargetId}`));
        await driver.wait(until.elementIsVisible(targetButton), 10000, "attack-img is not visible");
        await targetButton.click();
    },
    async openConditionsModal(driver, characterIndex){
        const characterProfile = await driver.findElement(By.id(`character-skin-${characterIndex}`)); // Corrected line
        await driver.wait(until.elementIsVisible(characterProfile), 10000, "character-skin is not visible");
        await characterProfile.click();
    }
}

module.exports = TestUtils
