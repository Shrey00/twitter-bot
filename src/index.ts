import express from "express";
import "dotenv/config";
import { QueryTweetsResponse, SearchMode, Tweet } from "agent-twitter-client";
import { Scraper } from "agent-twitter-client";
import { Cookie } from "tough-cookie";
import axios from "axios";
const app = express();
const port = 3500;
let mentions: QueryTweetsResponse | null = null;
type TweetWebhookRequest = {
  tweets: Tweet[];
  cookies: (string | Cookie)[];
};

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

const scraper = new Scraper();
let cookies: any;

async function login() {
  const isLoggedIn = await scraper.isLoggedIn();
  if (!isLoggedIn) {
    try {
      if(!process.env.TWITTER_USERNAME?.length)
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
    } catch (e) {
      console.log("LOGIN ERROR");
      console.log(e);
    }
  }
  // Get current session cookies
  cookies = await scraper.getCookies();
  await scraper.setCookies(cookies);
}

async function getMentions(username: string) {
  try {
    mentions = await scraper.fetchSearchTweets(username, 5, SearchMode.Latest);
    return mentions;
  } catch (e) {
    console.log(e);
  }
  return null;
}

async function replyToTweet() {
  try {
    if (mentions) {
      const payload : TweetWebhookRequest = { tweets: mentions?.tweets, cookies: cookies }
      const response = await axios.post(
        "agents.makerdock.xyz/api/agent/etienne/x-claude-webhook",
        payload,
        { timeout: 100000 }
      );
    }
  } catch (e) {
    console.log(e);
  }
}

async function checkMentions() {
  const mentions = await getMentions("@" + process.env.TWITTER_USERNAME);
  if (mentions === null) return;
  replyToTweet();
}


async function main() {
  await login();
  setInterval(() => checkMentions(), 30000);
  // checkMentions();
}

main();

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
