// https://gridjs.io/
const gridData = DataManager.getCharacters().slice();
const grid = new gridjs.Grid({
    columns: [{
        id: 'name',
        name: 'Name'
     }, {
        id: 'hp',
        name: 'HP'
     }],
    search: true,
    sort: true,
    resizable: true,
    fixedHeader: true,
    style: {
        table: {
          border: '3px solid #ccc'
        },
        th: {
          'background-color': '#ccc',
          color: '#000',
          'border-bottom': '3px solid #ccc',
          'text-align': 'center'
        },
        td: {
          'text-align': 'center'
        }
      },
    data:gridData
  }).render(document.getElementById("grid"));

function addGridData(){
    const update = {name:"Bonera Bonerchick",hp:5};
    gridData.push(update);
    grid.updateConfig({
        data: gridData
    }).forceRender();
}

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

// Close modal if clicking outside of modal content
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
