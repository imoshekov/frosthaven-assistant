const DataManager = {
    loadData(key) {
        return localStorage.getItem(key);
    },
    saveData() {
        document.getElementById('loading-spinner').style.visibility = 'visible';

        const currentCharacterData = JSON.stringify(characters);
        localStorage.setItem('characters', currentCharacterData);

        const battleLogInnerHtml = document.getElementById('battle-log').innerHTML;
        localStorage.setItem('battle-log', battleLogInnerHtml);

        //totally useless timeout, it is just to please merx3 as he requested a loading spinner
        setTimeout(() => {
            document.getElementById('last-saved-timestamp').innerHTML = `Last saved: ${new Date().toLocaleTimeString()}`;
            document.getElementById('loading-spinner').style.visibility = 'hidden';
        }, 1000);
    },
    clearData() {
        localStorage.clear();
    },
    resetSaved() {
        localStorage.clear();
        location.reload();
    }
};