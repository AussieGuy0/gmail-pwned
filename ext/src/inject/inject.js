const readyStateCheckInterval = setInterval(function () {
    if (document.readyState === "complete") {
        clearInterval(readyStateCheckInterval);
        main();
    }
}, 10);

class JobQueue {
    constructor(timeBetweenJobs) {
        this.timeInterval = timeBetweenJobs;
        this.queue = [];
        setInterval(() => {
            if (this.queue.length > 0) {
                const job = this.queue.shift();
                job();
            }
        }, this.timeInterval)
    }

    addJob(job) {
        if (!(job instanceof Function)) {
            throw Error('Job must be function');
        }
        this.queue.push(job);
        return job;
    }
}

const warnedDivs = [];
const jobQueue = new JobQueue(2000);
const imgClass = 'pwned-warning-icon';

function main() {
    const emailDivs = document.querySelectorAll("*[email]");

    emailDivs.forEach((emailDiv) => {
        const email = emailDiv.getAttribute('email');
        getBreachesAndInsertIcon(email, emailDiv);

    });

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            const node = mutation.target;
            if (node.children.length === 0) {
                handleElement(node);
            } else {
                const emailElements = node.querySelectorAll('*[email]');
                emailElements.forEach((emailElement) => handleElement(emailElement))
            }

            function handleElement(node) {
                if (node.hasAttributes() && node.getAttribute('email') != null && warnedDivs.indexOf(node) === -1) {
                    const email = node.getAttribute('email');
                    getBreachesAndInsertIcon(email, node);
                    warnedDivs.push(node);
                }

            }

        })
    });
    observer.observe(document.body, {childList: true, subtree: true})
}

function getBreachesAndInsertIcon(email, emailDiv) {
    if (emailDiv.querySelectorAll(`img.${imgClass}`).length > 0) { //emailDiv already has icon
        return;
    }

    const cached = localStorage.getItem(email);
    if (cached != null) {
        addBreachToDiv(JSON.parse(cached));
    } else {
        jobQueue.addJob(() => {
            fetchBreaches(email).then((json) => {
                "use strict";
                addBreachToDiv(json);
            });
        })
    }

    function addBreachToDiv(json) {
        if (json.length > 0) {
            const breachedElement = document.createElement('img');
            breachedElement.classList.add(imgClass);
            breachedElement.setAttribute('src', chrome.runtime.getURL('images/warning.png'));
            breachedElement.setAttribute('title', JSON.stringify(json));
            breachedElement.textContent = json.length + ' breaches';
            emailDiv.appendChild(breachedElement);

            const observer = new MutationObserver((e) => {
                "use strict";
                if (emailDiv.querySelectorAll(`img.${imgClass}`).length === 0) {
                    getBreachesAndInsertIcon(email, emailDiv);
                }
            });
            observer.observe(emailDiv, {childList: true});
        }

    }
}

const breachUrl = 'https://haveibeenpwned.com/api/v2/breachedaccount/';

function fetchBreaches(email) {
    return fetch(breachUrl + email)
        .then((response) => {
            if (response.status === 200) {
                return response.json();
            } else if (response.status = 404) {
                return [];
            }
        }).then((json) => {
            localStorage.setItem(email, JSON.stringify(json));
            return json;
        })
}


