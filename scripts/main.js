window.onload = function () {
    UIController.populateMonsterTypeDropdown();
    UIController.renderTable();
    UIController.renderLogs();
    UIController.handleFocusEvents();
    
    // Saving to local storage every X seconds.
    setInterval(() => DataManager.saveGame(), 10000);
    setInterval(() => UIController.toggleLowHp(), 2000);
};

const attackModal = document.getElementById('modal-attack');
const conditionModal = document.getElementById('modal-conditions');

// Close modal when clicking outside of modal content
window.onclick = function (event) {
    if (attackModal.style.display === "block" && !attackModal.querySelector('.modal-content').contains(event.target)) {
        closeAttackModal();
    }
    if (conditionModal.style.display === "block" && !conditionModal.querySelector('.modal-content').contains(event.target)) {
        closeConditionsModal();
    }
};

// Close modal with Escape
window.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
        closeAttackModal();
        closeConditionsModal();
    }
});

