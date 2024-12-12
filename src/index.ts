import express from "express";
import "dotenv/config";
import { QueryTweetsResponse, SearchMode, Tweet } from "agent-twitter-mod";
import { Scraper } from "agent-twitter-mod";
import puppeteer from "puppeteer";
import { Cookie } from "tough-cookie";
import axios from "axios";
import fs from "fs";
import * as path from "path";
const app = express();
const port = 3500;
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

const scraper = new Scraper();

type RequestFunction = () => Promise<any>;
class RequestQueue {
  private queue: RequestFunction[];
  constructor() {
    this.queue = [];
  }
  push(requestFunction: () => Promise<any>) {
    this.queue.push(requestFunction);
  }
  randomDelay(): Promise<void> {
    const max = 30;
    const min = 5;
    const delay = (Math.floor(Math.random() * (max - min + 1)) + min) * 1000;
    return new Promise((resolve) => setTimeout(resolve, delay));
  }
  exponentialBackoff(exp: number) {
    const delay = 2 ** exp;
    return new Promise((resolve) => setTimeout(resolve, delay));
  }
  async processRequest() {
    while (this.queue.length) {
      console.log("Queue-Length : ", this.queue.length);
      try {
        const requestFunction = this.queue[0];
        await this.randomDelay();
        await requestFunction();
        this.queue.shift();
        this.queue.push(interactionFunction);
      } catch (e) {
        this.exponentialBackoff(this.queue.length);
        console.log(
          "Backing off requests for " + 2 ** this.queue.length + "sec."
        );
      }
    }
  }
}

async function fetchMentionedTweets() {
  console.log("# fetching mentioned tweets....");
  const maxTweets = 10;
  const mentionedTweets: Tweet[] = [];
  try {
    const mentions = await scraper.fetchSearchTweets(
      `@${process.env.TWITTER_USERNAME}`,
      maxTweets,
      SearchMode.Latest
    );
    if (mentions) {
      for (const tweet of mentions.tweets) {
        if (tweet.username !== (process.env.TWITTER_USERNAME as string))
          mentionedTweets.push(tweet);
      }
      console.log("# recieved mentioned tweets - ", mentionedTweets.length);

      return mentionedTweets;
    }
  } catch (e) {
    console.log(e);
  }
}

async function loginAndSaveCookies() {
  let cookies: any;
  try {
    if (!process.env.TWITTER_USERNAME?.length)
      await scraper.login(
        process.env.TWITTER_USERNAME as string,
        process.env.TWITTER_PASSWORD as string
      );
    else
      await scraper.login(
        process.env.TWITTER_USERNAME as string,
        process.env.TWITTER_PASSWORD as string,
        process.env.TWITTER_EMAIL as string
      );
    cookies = await scraper.getCookies();

    // Save the cookies to a JSON file for future sessions
    fs.writeFileSync(
      path.resolve(__dirname, "cookies.json"),
      JSON.stringify(cookies)
    );
  } catch (e) {
    console.log("LOGIN ERROR");
    console.log(e);
  }
}

// Function to load cookies from the JSON file
async function loadCookies() {
  try {
    // Read cookies from the file system
    const cookiesData = fs.readFileSync(
      path.resolve(__dirname, "cookies.json"),
      "utf8"
    );
    const cookiesArray = JSON.parse(cookiesData);

    // Map cookies to the correct format (strings)
    const cookieStrings = cookiesArray.map((cookie: any) => {
      return `${cookie.key}=${cookie.value}; Domain=${cookie.domain}; Path=${
        cookie.path
      }; ${cookie.secure ? "Secure" : ""}; ${
        cookie.httpOnly ? "HttpOnly" : ""
      }; SameSite=${cookie.sameSite || "Lax"}`;
    });

    // Set the cookies for the current session
    await scraper.setCookies(cookieStrings);
    console.log("Cookies loaded and set.");
  } catch (error) {
    console.error("Error loading cookies:", error);
  }
}

//Handle Login - only require in case of cookie expiration & logout
async function ensureAuthenticated() {
  const loggedIn = await scraper.isLoggedIn();
  if (!loggedIn) {
    console.log("Logging In");
    if (fs.existsSync(path.resolve(__dirname, "cookies.json"))) {
      await loadCookies();
    } else {
      await loginAndSaveCookies();
    }
  }
}

async function getReply(mentionedTweets: Tweet[]) {
  try {
    const response = await axios.post(
      `${process.env.REPLY_WEBHOOK_URL}/api/agent/bogusbob/x-claude-webhook`,
      mentionedTweets,
      { timeout: 30000 }
    );
    return response;
  } catch (e) {
    console.log(e);
  }
}

//1.check if loggedIn, if not do login and save cookie;
//2.search for mentioned tweets.
//3.if got some, get it replied by hitting the webhook
async function interactionFunction() {
  await ensureAuthenticated();
  const mentionedTweets = await fetchMentionedTweets();
  if (mentionedTweets) {
    await getReply(mentionedTweets);
  }
}

async function main() {
  const twitterRequestQueue = new RequestQueue();
  twitterRequestQueue.push(interactionFunction);
  twitterRequestQueue.processRequest();
}

async function newContentGenerationPerDay() {
  const response = await fetch(`${process.env.POST_CONTENT_WEBHOOK_URL}/api/agent/bogusbob/tweet-cron`)
}

main();

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
