"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
require("dotenv/config");
const agent_twitter_mod_1 = require("agent-twitter-mod");
const agent_twitter_mod_2 = require("agent-twitter-mod");
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const path = __importStar(require("path"));
const app = (0, express_1.default)();
const port = 3500;
app.use(express_1.default.json());
app.get("/", (req, res) => {
    res.send("Hello, World!");
});
const scraper = new agent_twitter_mod_2.Scraper();
class RequestQueue {
    constructor() {
        this.queue = [];
    }
    push(requestFunction) {
        this.queue.push(requestFunction);
    }
    randomDelay() {
        const max = 30;
        const min = 5;
        const delay = (Math.floor(Math.random() * (max - min + 1)) + min) * 1000;
        return new Promise((resolve) => setTimeout(resolve, delay));
    }
    exponentialBackoff(exp) {
        const delay = 2 ** exp;
        return new Promise((resolve) => setTimeout(resolve, delay));
    }
    processRequest() {
        return __awaiter(this, void 0, void 0, function* () {
            while (this.queue.length) {
                console.log("Queue-Length : ", this.queue.length);
                try {
                    const requestFunction = this.queue[0];
                    yield this.randomDelay();
                    yield requestFunction();
                    this.queue.shift();
                    this.queue.push(interactionFunction);
                }
                catch (e) {
                    this.exponentialBackoff(this.queue.length);
                    console.log("Backing off requests for " + 2 ** this.queue.length + "sec.");
                }
            }
        });
    }
}
function fetchMentionedTweets() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("# fetching mentioned tweets....");
        const maxTweets = 10;
        const mentionedTweets = [];
        try {
            const mentions = yield scraper.fetchSearchTweets(`@${process.env.TWITTER_USERNAME}`, maxTweets, agent_twitter_mod_1.SearchMode.Latest);
            if (mentions) {
                for (const tweet of mentions.tweets) {
                    if (tweet.username !== process.env.TWITTER_USERNAME)
                        mentionedTweets.push(tweet);
                }
                console.log("# recieved mentioned tweets - ", mentionedTweets.length);
                return mentionedTweets;
            }
        }
        catch (e) {
            console.log(e);
        }
    });
}
function loginAndSaveCookies() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        let cookies;
        try {
            if (!((_a = process.env.TWITTER_USERNAME) === null || _a === void 0 ? void 0 : _a.length))
                yield scraper.login(process.env.TWITTER_USERNAME, process.env.TWITTER_PASSWORD);
            else
                yield scraper.login(process.env.TWITTER_USERNAME, process.env.TWITTER_PASSWORD, process.env.TWITTER_EMAIL);
            cookies = yield scraper.getCookies();
            // Save the cookies to a JSON file for future sessions
            fs_1.default.writeFileSync(path.resolve(__dirname, "cookies.json"), JSON.stringify(cookies));
        }
        catch (e) {
            console.log("LOGIN ERROR");
            console.log(e);
        }
    });
}
// Function to load cookies from the JSON file
function loadCookies() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Read cookies from the file system
            const cookiesData = fs_1.default.readFileSync(path.resolve(__dirname, "cookies.json"), "utf8");
            const cookiesArray = JSON.parse(cookiesData);
            // Map cookies to the correct format (strings)
            const cookieStrings = cookiesArray.map((cookie) => {
                return `${cookie.key}=${cookie.value}; Domain=${cookie.domain}; Path=${cookie.path}; ${cookie.secure ? "Secure" : ""}; ${cookie.httpOnly ? "HttpOnly" : ""}; SameSite=${cookie.sameSite || "Lax"}`;
            });
            // Set the cookies for the current session
            yield scraper.setCookies(cookieStrings);
            console.log("Cookies loaded and set.");
        }
        catch (error) {
            console.error("Error loading cookies:", error);
        }
    });
}
//Handle Login - only require in case of cookie expiration & logout
function ensureAuthenticated() {
    return __awaiter(this, void 0, void 0, function* () {
        const loggedIn = yield scraper.isLoggedIn();
        if (!loggedIn) {
            console.log("Logging In");
            if (fs_1.default.existsSync(path.resolve(__dirname, "cookies.json"))) {
                yield loadCookies();
            }
            else {
                yield loginAndSaveCookies();
            }
        }
    });
}
function getReply(mentionedTweets) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield axios_1.default.post(`${process.env.REPLY_WEBHOOK_URL}/api/agent/bogusbob/x-claude-webhook`, mentionedTweets, { timeout: 30000 });
            return response;
        }
        catch (e) {
            console.log(e);
        }
    });
}
//1.check if loggedIn, if not do login and save cookie;
//2.search for mentioned tweets.
//3.if got some, get it replied by hitting the webhook
function interactionFunction() {
    return __awaiter(this, void 0, void 0, function* () {
        yield ensureAuthenticated();
        const mentionedTweets = yield fetchMentionedTweets();
        if (mentionedTweets) {
            yield getReply(mentionedTweets);
        }
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const twitterRequestQueue = new RequestQueue();
        twitterRequestQueue.push(interactionFunction);
        twitterRequestQueue.processRequest();
    });
}
function newContentGenerationPerDay() {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield fetch(`${process.env.POST_CONTENT_WEBHOOK_URL}/api/agent/bogusbob/tweet-cron`);
    });
}
main();
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
//# sourceMappingURL=index.js.map