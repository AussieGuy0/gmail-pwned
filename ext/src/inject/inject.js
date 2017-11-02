const readyStateCheckInterval = setInterval(function () {
    if (document.readyState === "complete") {
        clearInterval(readyStateCheckInterval);
        main();
    }
}, 10);

function main() {
    const jobQueue = new JobQueue(2000);
    const emailDivs = document.querySelectorAll("*[email]");

    emailDivs.forEach((emailDiv) => {
        const email = emailDiv.getAttribute('email');
        jobQueue.addJob(() => checkBreaches(email, emailDiv));

    });
}

function checkBreaches(email, emailDiv) {
    getBreaches(email).then((json) => {
        const breachedElement = document.createElement('span');
        if (json.length > 0) {
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
