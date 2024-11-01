

const DataManager = {
    load(key) {
        return localStorage.getItem(key);
    },
    save() {
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
    clear() {
        localStorage.clear();
    },
    reset() {
        localStorage.clear();
        location.reload();
    },
    log(event) {
        const logLimit = 50;
        const li = document.createElement('li');
    
        const timeSpan = document.createElement('span');
        timeSpan.classList.add('log-time');
        timeSpan.textContent = `${new Date().toLocaleTimeString()} - `;
    
        const eventSpan = document.createElement('span');
        eventSpan.classList.add('log-event');
    
        const hashMatch = event.match(/#(.*?)#/);
    
        if (hashMatch) {
            const parts = event.split(hashMatch[0]);
            const beforeHash = parts[0];
            const afterHash = parts[1] || '';
    
            const hashSpan = document.createElement('span');
            hashSpan.textContent = hashMatch[1];
            hashSpan.classList.add('log-bold');
    
            eventSpan.textContent = beforeHash;
            eventSpan.appendChild(hashSpan);
            eventSpan.appendChild(document.createTextNode(afterHash));
            // Fallback if no hash-wrapped text
        } else {
            eventSpan.textContent = event;
        }
    
        li.appendChild(timeSpan);
        li.appendChild(eventSpan);
        
        const logContainer = document.getElementById('battle-log');
        logContainer.insertBefore(li, logContainer.firstChild);
    
        if (logContainer.childElementCount > logLimit) {
            logContainer.removeChild(logContainer.lastChild);
        }
    }
};


