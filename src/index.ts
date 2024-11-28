import express from "express";
import "dotenv/config";
import cron from "node-cron";
import { QueryTweetsResponse, SearchMode, Tweet } from "agent-twitter-client";
import { Scraper } from "agent-twitter-client";
const app = express();
const port = 3500;

type TweetWebhookRequest =  {
  tweets: Tweet[],
  cookies: any
}

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

const scraper = new Scraper();
let cookies: any;

async function login() {
  const isLoggedIn = await scraper.isLoggedIn();
  console.log(isLoggedIn)
  if (!isLoggedIn) {
    try {
      await scraper.login("shreyanshsahu00", "Shrey@27022002");
    } catch (e) {
      console.log("LOGIN ERROR")
      console.log(e);
    }
  }
  // Get current session cookies
  cookies = await scraper.getCookies();
  // Set current session cookies
  console.log(cookies)
  await scraper.setCookies(cookies);
}

async function getMentions(username: string) {
  try {
    const mentions = await scraper.fetchSearchTweets(
      username,
      10,
      SearchMode.Latest
    );
    return mentions;
  } catch (e) {
    console.log(e);
  }
  return null;
}

async function replyToTweet(mentions: QueryTweetsResponse) {
  try {
    for (const tweet of mentions.tweets) {
      await scraper.sendTweet(
        "Hello there, this is an auto-generated reply, testing the API.",
        tweet.id
      );
    }
  } catch (e) {
    console.log(e);
  }
}

async function checkMentions() {
  const mentions = await getMentions("@" + "shreyanshsahu00");
  if (mentions === null) return;
  console.log(mentions);
  replyToTweet(mentions);
  // generateReplyToTweets(mentions)
}

// async function generateReplyToTweets (mentions: QueryTweetsResponse) {

// }

async function main() {
  await login();
  setInterval(() => checkMentions(), 60000);
  checkMentions();
}

main();

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
