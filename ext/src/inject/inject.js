const readyStateCheckInterval = setInterval(function () {
    if (document.readyState === "complete") {
        clearInterval(readyStateCheckInterval);
        main();
    }
}, 10);

const warnedDivs = [];

function main() {
    const jobQueue = new JobQueue(2000);
    const emailDivs = document.querySelectorAll("*[email]");

    emailDivs.forEach((emailDiv) => {
        const email = emailDiv.getAttribute('email');
        jobQueue.addJob(() => checkBreaches(email, emailDiv));

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
                    jobQueue.addJob(() => checkBreaches(email, node));
                    warnedDivs.push(node);
                }

            }

        })
    });
    observer.observe(document.body, {childList: true, subtree: true})
}

function checkBreaches(email, emailDiv) {
    getBreaches(email).then((json) => {
        if (json.length > 0) {
            const breachedElement = document.createElement('img');
            breachedElement.classList.add('pwned-warning-icon');
            breachedElement.setAttribute('src', chrome.runtime.getURL('images/warning.png'));
            breachedElement.setAttribute('title', JSON.stringify(json));
            breachedElement.textContent = json.length + ' breaches';
            emailDiv.appendChild(breachedElement);
        }
    });
}

const breachUrl = 'https://haveibeenpwned.com/api/v2/breachedaccount/';

function getBreaches(email) {
    const cached = localStorage.getItem(email);
    if (cached != null) {
        return new Promise((resolved) => {
            resolved(JSON.parse(cached));
        })
    } else {
        return fetch(breachUrl + email)
            .then((response) => {
                if (response.status === 200) {
                    return response.json();
                } else if (response.status = 404) {
                    return [];
                    // return new Promise((resolved) => resolved([]));
                }
            }).then((json) => {
                localStorage.setItem(email, JSON.stringify(json));
                return json;
            })
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
    }


}
