const readyStateCheckInterval = setInterval(function () {
    if (document.readyState === "complete") {
        clearInterval(readyStateCheckInterval);
        main();
    }
}, 10);

class Logger {
    log(msg) {
        if (DEBUG) {
            console.log(msg);
        }
    }
}
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

const DEBUG = true;
const logger = new Logger();
const imgClass = 'pwned-warning-icon';
const popupClass = 'pwned-breach-popup';
const breachUrl = 'https://haveibeenpwned.com/api/v2/breachedaccount/';

const warnedDivs = [];
const jobQueue = new JobQueue(2000);

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
        logger.log(`Getting ${email} breaches from cache`);
        addBreachToDiv(JSON.parse(cached));
    } else {
        logger.log(`Getting ${email} breaches from api`);
        jobQueue.addJob(() => {
            fetchBreaches(email).then((json) => {
                "use strict";
                addBreachToDiv(json);
            });
        })
    }

    function addBreachToDiv(breaches) {
        if (breaches.length > 0) {
            logger.log(`Icon added to: `);
            logger.log(emailDiv);
            const breachedIcon = document.createElement('img');
            breachedIcon.classList.add(imgClass);
            breachedIcon.setAttribute('src', chrome.runtime.getURL('images/warning.png'));
            breachedIcon.textContent = breaches.length + ' breaches';
            emailDiv.appendChild(breachedIcon);

            const div = createBreachInfoDiv(email, breachedIcon, breaches);
            breachedIcon.addEventListener('mouseenter', () => {
                document.body.appendChild(div);
            });

            breachedIcon.addEventListener('mouseleave', () => {
                document.body.removeChild(div);
            });

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

function createBreachInfoDiv(email, icon, breaches) {
    const div = document.createElement('div');
    div.classList.add(popupClass);

    div.innerHTML =
        `<h2>${email} breached! </h2>
        <p><strong>${email}</strong> has been in ${breaches.length} data breaches! </p>
        <footer>Data from <a>https://haveibeenpwned.com</a></footer>
        `
    const dimensions = icon.getBoundingClientRect();
    div.style.left = (dimensions.left + 20) + 'px';
    div.style.top = (dimensions.top + 10) + 'px';
    return div;
}
