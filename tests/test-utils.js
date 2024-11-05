const { By } = require('selenium-webdriver');

const TestUtils = {
    async  addMonster(driver, monster) {
        await driver.findElement(By.id('type')).sendKeys(monster.type);
        await driver.findElement(By.id('level')).clear();
        await driver.findElement(By.id('level')).sendKeys(monster.level);
        await driver.findElement(By.id('standee-number')).sendKeys(monster.standee);
    
        const addMonsterButton = await driver.findElement(By.css('.add-char button.initiative:nth-of-type(2)'));
        await addMonsterButton.click();
    },
    async openAttackModal(driver, attackerId = 0, defenderId = 4) {
        const attackButton = await driver.findElement(By.id(`attack-img-${attackerId}`));
        await attackButton.click();
    
        const targetButton = await driver.findElement(By.id(`target-img-${defenderId}`));
        await targetButton.click();
    },
    async openConditionsModal(driver, characterIndex){
        const characterProfile = await driver.findElement(By.id(`character-skin-${characterIndex}`)); // Corrected line
        await characterProfile.click();
    }
}

module.exports = TestUtils
