"use strict";
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
const agent_twitter_client_1 = require("agent-twitter-client");
const agent_twitter_client_2 = require("agent-twitter-client");
const axios_1 = __importDefault(require("axios"));
const app = (0, express_1.default)();
const port = 3500;
let mentions = null;
// type TweetWebhookRequest = {
//   tweets: Tweet[];
//   cookies: any;
// };
app.use(express_1.default.json());
app.get("/", (req, res) => {
    res.send("Hello, World!");
});
const scraper = new agent_twitter_client_2.Scraper();
let cookies;
function login() {
    return __awaiter(this, void 0, void 0, function* () {
        const isLoggedIn = yield scraper.isLoggedIn();
        console.log(isLoggedIn);
        if (!isLoggedIn) {
            try {
                yield scraper.login(process.env.TWITTER_USERNAME, process.env.TWITTER_PASSWORD, process.env.TWITTER_EMAIL);
            }
            catch (e) {
                console.log("LOGIN ERROR");
                console.log(e);
            }
        }
        // Get current session cookies
        cookies = yield scraper.getCookies();
        // Set current session cookies
        console.log(cookies);
        yield scraper.setCookies(cookies);
    });
}
function getMentions(username) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            mentions = yield scraper.fetchSearchTweets(username, 5, agent_twitter_client_1.SearchMode.Latest);
            return mentions;
        }
        catch (e) {
            console.log(e);
        }
        return null;
    });
}
function replyToTweet() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (mentions) {
                const response = yield axios_1.default.post("https://39b2-146-190-241-210.ngrok-free.app/api/agent/yggdraisil/x-claude-webhook", { tweets: mentions === null || mentions === void 0 ? void 0 : mentions.tweets, cookies: cookies }, { timeout: 600000 });
                console.log(response.data);
            }
        }
        catch (e) {
            console.log(e);
        }
    });
}
function checkMentions() {
    return __awaiter(this, void 0, void 0, function* () {
        const mentions = yield getMentions("@" + process.env.TWITTER_USERNAME);
        if (mentions === null)
            return;
        replyToTweet();
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        yield login();
        // setInterval(() => checkMentions(), 20000);
        checkMentions();
    });
}
main();
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
//# sourceMappingURL=index.js.map