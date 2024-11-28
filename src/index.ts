import express from "express";
import "dotenv/config";
import { QueryTweetsResponse, SearchMode, Tweet } from "agent-twitter-client";
import { Scraper } from "agent-twitter-client";
import axios from "axios";
const app = express();
const port = 3500;
let mentions: QueryTweetsResponse | null = null;
// type TweetWebhookRequest = {
//   tweets: Tweet[];
//   cookies: any;
// };

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

const scraper = new Scraper();
let cookies: any;

async function login() {
  const isLoggedIn = await scraper.isLoggedIn();
  console.log(isLoggedIn);
  if (!isLoggedIn) {
    try {
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
  // Set current session cookies
  console.log(cookies);
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
      const response = await axios.post(
        "https://39b2-146-190-241-210.ngrok-free.app/api/agent/test/x-claude-webhook",
        { tweets: mentions?.tweets, cookies: cookies },
        { timeout: 100000 }
      );
      console.log(response.data)
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
  setInterval(() => checkMentions(), 20000);
  checkMentions();
}

main();

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
